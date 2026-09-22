/**
 * Dual-read för Compcare Trust.
 *
 * Läser en konsults intyg från trust-kärnan OCH från legacy-tabellerna
 * (consultant_documents, consultant_references) och slår ihop dem till en
 * enda normaliserad vy. Trust är alltid source of truth: när en legacy-rad
 * redan är projicerad (legacy_table + legacy_ref_id) visas endast
 * trust-versionen.
 *
 * Endast serverside. Ändrar inget UI och skriver aldrig till databasen.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type TrustViewItem = {
  /** Trust credential-id när raden finns i trust-kärnan, annars null. */
  credential_id: string | null;
  /** Var raden lästes: trust-kärnan eller legacy-tabell som ännu inte projicerats. */
  read_source: "trust" | "legacy";
  legacy_table: string | null;
  legacy_ref_id: string | null;
  credential_type: string | null;
  credential_type_name: string | null;
  category: string | null;
  status: string;
  assurance_level: string;
  verified_at: string | null;
  created_at: string | null;
  label: string | null;
};

export type TrustViewResult = {
  items: TrustViewItem[];
  counts: {
    trust: number;
    legacy_only: number;
    /** Legacy-rader som redan finns i trust och därför inte dubbelräknas. */
    legacy_projected: number;
  };
};

const legacyKey = (table: string, id: string) => `${table}:${id}`;

/** Mappar legacy-dokumentstatus till trust-status utan att hitta på verifiering. */
function mapDocumentStatus(status: string | null): { status: string; assurance: string } {
  return status === "verified"
    ? { status: "active", assurance: "issuer_verified" }
    : { status: "pending", assurance: "self_asserted" };
}

export async function readSubjectTrustView(
  supabase: SupabaseClient,
  subjectUserId: string,
): Promise<TrustViewResult> {
  const [credentialsRes, documentsRes, profileRes] = await Promise.all([
    supabase
      .from("trust_credentials")
      .select(
        `id, status, assurance_level, verified_at, created_at, legacy_table, legacy_ref_id, metadata,
         trust_credential_types ( slug, display_name, category )`,
      )
      .eq("subject_user_id", subjectUserId)
      .is("revoked_at", null),
    supabase
      .from("consultant_documents")
      .select("id, doc_type, file_name, status, created_at")
      .eq("user_id", subjectUserId),
    supabase.from("consultant_profiles").select("id").eq("user_id", subjectUserId).maybeSingle(),
  ]);

  if (credentialsRes.error) {
    throw new Error(`trust dual-read: kunde inte läsa trust_credentials: ${credentialsRes.error.message}`);
  }

  const items: TrustViewItem[] = [];
  const projected = new Set<string>();

  for (const row of (credentialsRes.data ?? []) as unknown as Record<string, any>[]) {
    const type = row["trust_credential_types"] as Record<string, any> | null;
    const legacyTable = (row["legacy_table"] as string | null) ?? null;
    const legacyRefId = (row["legacy_ref_id"] as string | null) ?? null;
    if (legacyTable && legacyRefId) projected.add(legacyKey(legacyTable, legacyRefId));

    const metadata = (row["metadata"] ?? {}) as Record<string, unknown>;
    items.push({
      credential_id: String(row["id"]),
      read_source: "trust",
      legacy_table: legacyTable,
      legacy_ref_id: legacyRefId,
      credential_type: (type?.["slug"] as string | undefined) ?? null,
      credential_type_name: (type?.["display_name"] as string | undefined) ?? null,
      category: (type?.["category"] as string | undefined) ?? null,
      status: String(row["status"]),
      assurance_level: String(row["assurance_level"]),
      verified_at: (row["verified_at"] as string | null) ?? null,
      created_at: (row["created_at"] as string | null) ?? null,
      label:
        (metadata["file_name"] as string | undefined) ??
        (metadata["doc_type"] as string | undefined) ??
        (metadata["reference_name"] as string | undefined) ??
        (type?.["display_name"] as string | undefined) ??
        null,
    });
  }

  let legacyProjected = 0;
  let legacyOnly = 0;

  for (const doc of (documentsRes.data ?? []) as unknown as Record<string, any>[]) {
    const key = legacyKey("consultant_documents", String(doc["id"]));
    if (projected.has(key)) {
      legacyProjected += 1;
      continue;
    }
    const mapped = mapDocumentStatus((doc["status"] as string | null) ?? null);
    legacyOnly += 1;
    items.push({
      credential_id: null,
      read_source: "legacy",
      legacy_table: "consultant_documents",
      legacy_ref_id: String(doc["id"]),
      credential_type: "consultant_document",
      credential_type_name: "Konsultdokument",
      category: "document",
      status: mapped.status,
      assurance_level: mapped.assurance,
      verified_at: null,
      created_at: (doc["created_at"] as string | null) ?? null,
      label: (doc["file_name"] as string | null) ?? (doc["doc_type"] as string | null) ?? null,
    });
  }

  const consultantId = (profileRes.data as { id?: string } | null)?.id ?? null;
  if (consultantId) {
    const refsRes = await supabase
      .from("consultant_references")
      .select("id, reference_name, reference_org, created_at")
      .eq("consultant_id", consultantId);

    for (const ref of (refsRes.data ?? []) as unknown as Record<string, any>[]) {
      const key = legacyKey("consultant_references", String(ref["id"]));
      if (projected.has(key)) {
        legacyProjected += 1;
        continue;
      }
      legacyOnly += 1;
      items.push({
        credential_id: null,
        read_source: "legacy",
        legacy_table: "consultant_references",
        legacy_ref_id: String(ref["id"]),
        credential_type: "employment_attestation",
        credential_type_name: "Referens",
        category: "reference",
        status: "pending",
        assurance_level: "self_asserted",
        verified_at: null,
        created_at: (ref["created_at"] as string | null) ?? null,
        label: (ref["reference_name"] as string | null) ?? (ref["reference_org"] as string | null) ?? null,
      });
    }
  }

  items.sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));

  return {
    items,
    counts: {
      trust: items.filter((i) => i.read_source === "trust").length,
      legacy_only: legacyOnly,
      legacy_projected: legacyProjected,
    },
  };
}
