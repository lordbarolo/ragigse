/**
 * Dual-read-verifiering för Compcare Trust.
 *
 * Läser samma data från legacy-källorna (consultant_documents,
 * consultant_references) och från trust-kärnan (trust_credentials) och jämför
 * semantiskt relevanta fält. Avvikelser loggas strukturerat och append-only i
 * public.trust_dualread_discrepancies.
 *
 * Viktigt: legacy är fortsatt primär källa. Detta lager är endast observerande —
 * det skriver aldrig till trust_*, ändrar inget UI och påverkar inga produktflöden.
 * Endast serverside.
 */
import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export type DiscrepancyKind =
  | "missing_trust"
  | "missing_legacy"
  | "status_mismatch"
  | "assurance_mismatch"
  | "type_mismatch";

export type TrustSnapshotRow = {
  credential_id: string;
  legacy_table: string | null;
  legacy_ref_id: string | null;
  credential_type: string | null;
  status: string;
  assurance_level: string;
};

/** Förväntad projektion av en legacy-rad, enligt legacy-adaptern (migration 0013/0014). */
export type LegacySnapshotRow = {
  legacy_table: string;
  legacy_ref_id: string;
  expected_type: string;
  expected_status: string;
  expected_assurance: string;
};

export type DualReadSnapshot = {
  subject_user_id: string;
  trust: TrustSnapshotRow[];
  legacy: LegacySnapshotRow[];
};

export type Discrepancy = {
  subject_user_id: string;
  legacy_table: string;
  legacy_ref_id: string | null;
  credential_id: string | null;
  discrepancy_kind: DiscrepancyKind;
  expected_value: string | null;
  actual_value: string | null;
  detail_hash: string;
};

const key = (table: string, id: string) => `${table}:${id}`;

export function detailHash(
  kind: DiscrepancyKind,
  expected: string | null,
  actual: string | null,
): string {
  return createHash("sha256")
    .update(`${kind}|${expected ?? ""}|${actual ?? ""}`)
    .digest("hex");
}

/**
 * Samma mappning som legacy-adaptern trust_project_consultant_document använder.
 * Hålls medvetet identisk så att dual-read mäter faktiska avvikelser och inte
 * skillnader mellan två egna tolkningar.
 */
export function expectedDocumentProjection(
  docType: string | null,
  legacyStatus: string | null,
): { type: string; status: string; assurance: string } {
  const t = (docType ?? "").toLowerCase();
  const type =
    t === "hosp" || t === "hosp_extract"
      ? "hosp_extract"
      : t === "ivo" || t === "ivo_extract"
        ? "ivo_extract"
        : t === "legitimation"
          ? "swedish_healthcare_license"
          : t === "specialistbevis"
            ? "specialist_qualification"
            : t === "anstallningsintyg"
              ? "employment_attestation"
              : "consultant_document";

  const verified = ["verified", "approved"].includes((legacyStatus ?? "").toLowerCase());
  return {
    type,
    status: verified ? "active" : "pending",
    assurance: verified ? "document_verified" : "self_asserted",
  };
}

/** Samma mappning som trust_project_consultant_reference (migration 0014/0015). */
export function expectedReferenceProjection(): {
  type: string;
  status: string;
  assurance: string;
} {
  return { type: "employment_attestation", status: "pending", assurance: "self_asserted" };
}

/** Ren jämförelse. Inga IO-anrop, därför enkel att testa i båda riktningarna. */
export function compareDualRead(snapshot: DualReadSnapshot): Discrepancy[] {
  const out: Discrepancy[] = [];
  const subject = snapshot.subject_user_id;

  const trustByLegacy = new Map<string, TrustSnapshotRow>();
  for (const row of snapshot.trust) {
    if (row.legacy_table && row.legacy_ref_id) {
      trustByLegacy.set(key(row.legacy_table, row.legacy_ref_id), row);
    }
  }

  const legacyKeys = new Set(snapshot.legacy.map((r) => key(r.legacy_table, r.legacy_ref_id)));

  const push = (
    kind: DiscrepancyKind,
    legacy_table: string,
    legacy_ref_id: string | null,
    credential_id: string | null,
    expected: string | null,
    actual: string | null,
  ) => {
    out.push({
      subject_user_id: subject,
      legacy_table,
      legacy_ref_id,
      credential_id,
      discrepancy_kind: kind,
      expected_value: expected,
      actual_value: actual,
      detail_hash: detailHash(kind, expected, actual),
    });
  };

  // Legacy-rad som saknar projektion i trust.
  for (const legacy of snapshot.legacy) {
    const match = trustByLegacy.get(key(legacy.legacy_table, legacy.legacy_ref_id));
    if (!match) {
      push(
        "missing_trust",
        legacy.legacy_table,
        legacy.legacy_ref_id,
        null,
        `${legacy.expected_type}/${legacy.expected_status}/${legacy.expected_assurance}`,
        null,
      );
      continue;
    }
    if (match.credential_type !== legacy.expected_type) {
      push(
        "type_mismatch",
        legacy.legacy_table,
        legacy.legacy_ref_id,
        match.credential_id,
        legacy.expected_type,
        match.credential_type,
      );
    }
    if (match.status !== legacy.expected_status) {
      push(
        "status_mismatch",
        legacy.legacy_table,
        legacy.legacy_ref_id,
        match.credential_id,
        legacy.expected_status,
        match.status,
      );
    }
    if (match.assurance_level !== legacy.expected_assurance) {
      push(
        "assurance_mismatch",
        legacy.legacy_table,
        legacy.legacy_ref_id,
        match.credential_id,
        legacy.expected_assurance,
        match.assurance_level,
      );
    }
  }

  // Trust-rad som pekar på en legacy-rad som inte längre finns.
  for (const row of snapshot.trust) {
    if (!row.legacy_table || !row.legacy_ref_id) continue;
    if (!legacyKeys.has(key(row.legacy_table, row.legacy_ref_id))) {
      push(
        "missing_legacy",
        row.legacy_table,
        row.legacy_ref_id,
        row.credential_id,
        null,
        `${row.credential_type ?? "okänd"}/${row.status}/${row.assurance_level}`,
      );
    }
  }

  return out;
}

/**
 * Hämtar dual-read-underlaget för ett subjekt. Läser endast de fält som behövs
 * för jämförelsen — inga filvägar, inga kontaktuppgifter, inget dokumentinnehåll.
 * RLS gäller för den klient som skickas in.
 */
export async function fetchDualReadSnapshot(
  supabase: SupabaseClient,
  subjectUserId: string,
): Promise<DualReadSnapshot> {
  const [credentialsRes, documentsRes, profileRes] = await Promise.all([
    supabase
      .from("trust_credentials")
      .select(
        "id, status, assurance_level, legacy_table, legacy_ref_id, trust_credential_types ( slug )",
      )
      .eq("subject_user_id", subjectUserId)
      .is("revoked_at", null),
    supabase.from("consultant_documents").select("id, doc_type, status").eq("user_id", subjectUserId),
    supabase.from("consultant_profiles").select("id").eq("user_id", subjectUserId).maybeSingle(),
  ]);

  if (credentialsRes.error) {
    throw new Error(`dual-read: kunde inte läsa trust_credentials: ${credentialsRes.error.message}`);
  }
  if (documentsRes.error) {
    throw new Error(`dual-read: kunde inte läsa consultant_documents: ${documentsRes.error.message}`);
  }

  const trust: TrustSnapshotRow[] = ((credentialsRes.data ?? []) as unknown as Record<string, any>[]).map(
    (row) => ({
      credential_id: String(row["id"]),
      legacy_table: (row["legacy_table"] as string | null) ?? null,
      legacy_ref_id: (row["legacy_ref_id"] as string | null) ?? null,
      credential_type:
        ((row["trust_credential_types"] as Record<string, any> | null)?.["slug"] as string | undefined) ??
        null,
      status: String(row["status"]),
      assurance_level: String(row["assurance_level"]),
    }),
  );

  const legacy: LegacySnapshotRow[] = [];
  for (const doc of (documentsRes.data ?? []) as unknown as Record<string, any>[]) {
    const expected = expectedDocumentProjection(
      (doc["doc_type"] as string | null) ?? null,
      (doc["status"] as string | null) ?? null,
    );
    legacy.push({
      legacy_table: "consultant_documents",
      legacy_ref_id: String(doc["id"]),
      expected_type: expected.type,
      expected_status: expected.status,
      expected_assurance: expected.assurance,
    });
  }

  const consultantId = (profileRes.data as { id?: string } | null)?.id ?? null;
  if (consultantId) {
    const refsRes = await supabase
      .from("consultant_references")
      .select("id")
      .eq("consultant_id", consultantId);
    if (refsRes.error) {
      throw new Error(`dual-read: kunde inte läsa consultant_references: ${refsRes.error.message}`);
    }
    const expected = expectedReferenceProjection();
    for (const ref of (refsRes.data ?? []) as unknown as Record<string, any>[]) {
      legacy.push({
        legacy_table: "consultant_references",
        legacy_ref_id: String(ref["id"]),
        expected_type: expected.type,
        expected_status: expected.status,
        expected_assurance: expected.assurance,
      });
    }
  }

  return { subject_user_id: subjectUserId, trust, legacy };
}

export type DualReadRunResult = {
  subject_user_id: string;
  compared: { trust: number; legacy: number };
  discrepancies: Discrepancy[];
  logged: number;
  already_logged: number;
};

/**
 * Loggar avvikelser append-only och idempotent. Kräver en service-role-klient
 * (tabellen har ingen INSERT-policy för klienter). Återkörning skapar inga
 * dubbletter tack vare unikt index på (subjekt, legacy-rad, kind, detail_hash).
 */
export async function recordDiscrepancies(
  serviceSupabase: SupabaseClient,
  discrepancies: Discrepancy[],
): Promise<{ logged: number; already_logged: number }> {
  let logged = 0;
  let already = 0;

  for (const d of discrepancies) {
    const { error } = await serviceSupabase.from("trust_dualread_discrepancies").insert(d as never);
    if (!error) {
      logged += 1;
      continue;
    }
    if (error.code === "23505") {
      already += 1;
      continue;
    }
    throw new Error(`dual-read: kunde inte logga avvikelse: ${error.message}`);
  }

  return { logged, already_logged: already };
}

/**
 * Kör dual-read för ett subjekt: hämta, jämför, logga. Observerande endast.
 * `readClient` styr RLS för läsningen, `serviceSupabase` används bara för loggen.
 */
export async function runDualRead(
  readClient: SupabaseClient,
  serviceSupabase: SupabaseClient,
  subjectUserId: string,
): Promise<DualReadRunResult> {
  const snapshot = await fetchDualReadSnapshot(readClient, subjectUserId);
  const discrepancies = compareDualRead(snapshot);
  const { logged, already_logged } = await recordDiscrepancies(serviceSupabase, discrepancies);
  return {
    subject_user_id: subjectUserId,
    compared: { trust: snapshot.trust.length, legacy: snapshot.legacy.length },
    discrepancies,
    logged,
    already_logged,
  };
}
