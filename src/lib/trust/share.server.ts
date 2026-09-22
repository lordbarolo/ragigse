/**
 * Serverside hjälpfunktioner för scope-baserad trust-delning.
 * Används endast av publika rutter under /api/public/trust/*.
 * Inga råa tokens, IP-adresser eller user agents lagras.
 */
import { createHash } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type ShareScope = {
  credential_type_slugs?: string[];
  credential_ids?: string[];
  include_evidence?: boolean;
};

export function serviceClient(): SupabaseClient {
  return createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_SERVICE_ROLE_KEY"]!, {
    auth: { persistSession: false },
  });
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Hashar klientsignaler så loggen aldrig innehåller rå IP eller user agent. */
export function requestFingerprint(request: Request): { ipHash: string | null; uaHash: string | null } {
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;
  const ua = request.headers.get("user-agent");
  return {
    ipHash: ip ? sha256(ip) : null,
    uaHash: ua ? sha256(ua) : null,
  };
}

export const OUTCOME_MESSAGES: Record<string, string> = {
  not_found: "Länken är ogiltig.",
  expired: "Länken har upphört att gälla.",
  revoked: "Länken har återkallats.",
  exhausted: "Länken har redan använts.",
  scope_denied: "Länken ger inte åtkomst till den här uppgiften.",
};

export type ResolvedGrant = {
  grant_id: string;
  subject_user_id: string;
  grant_kind: string;
  scope: ShareScope | null;
};

/**
 * Löser token via databasen (hash-jämförelse server-side), konsumerar vid behov
 * och loggar utfallet. Returnerar null när åtkomst inte ska ges.
 */
export async function resolveGrant(
  supabase: SupabaseClient,
  request: Request,
  token: string,
  consume: boolean,
): Promise<{ grant: ResolvedGrant | null; outcome: string }> {
  const { ipHash, uaHash } = requestFingerprint(request);
  const { data, error } = await supabase.rpc("trust_resolve_share_grant", {
    _token: token,
    _ip_hash: ipHash,
    _user_agent_hash: uaHash,
    _consume: consume,
  });

  if (error) {
    console.error("trust-share: kunde inte lösa token", error.message);
    return { grant: null, outcome: "not_found" };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const outcome = (row?.outcome as string | undefined) ?? "not_found";
  if (outcome !== "granted" || !row?.grant_id) return { grant: null, outcome };

  return {
    grant: {
      grant_id: row.grant_id as string,
      subject_user_id: row.subject_user_id as string,
      grant_kind: row.grant_kind as string,
      scope: (row.scope ?? null) as ShareScope | null,
    },
    outcome,
  };
}

/** Publik projektion: aldrig kontaktuppgifter, aldrig interna id:n utöver credential-id. */
export type PublicCredential = {
  id: string;
  credential_type: string;
  credential_type_name: string;
  category: string;
  status: string;
  assurance_level: string;
  issuer: string | null;
  issuer_kind: string | null;
  verified_at: string | null;
  valid_from: string | null;
  valid_to: string | null;
  claims: Record<string, string | number | boolean | null>;
  evidence: { kind: string; collected_at: string; url?: string }[];
};

const BLOCKED_CLAIM_KEYS = new Set([
  "referee_phone",
  "referee_email",
  "phone",
  "email",
  "personnummer",
  "personal_identity_number",
]);

export async function readSharedCredentials(
  supabase: SupabaseClient,
  grant: ResolvedGrant,
): Promise<PublicCredential[]> {
  const scope = grant.scope ?? {};
  let query = supabase
    .from("trust_credentials")
    .select(
      `id, status, assurance_level, verified_at, valid_from, valid_to,
       trust_credential_types!inner ( slug, display_name, category ),
       trust_issuers ( display_name, issuer_kind ),
       trust_claims ( claim_key, value_text, value_num, value_date, value_bool ),
       trust_evidence ( evidence_kind, collected_at, storage_bucket, storage_path )`,
    )
    .eq("subject_user_id", grant.subject_user_id)
    .eq("status", "active")
    .is("revoked_at", null);

  const ids = scope.credential_ids ?? [];
  const slugs = scope.credential_type_slugs ?? [];
  if (ids.length > 0) query = query.in("id", ids);
  if (slugs.length > 0) query = query.in("trust_credential_types.slug", slugs);

  const { data, error } = await query;
  if (error) {
    console.error("trust-share: kunde inte läsa credentials", error.message);
    return [];
  }

  const today = new Date().toISOString().slice(0, 10);
  const rows = (data ?? []) as unknown as Record<string, any>[];
  const result: PublicCredential[] = [];

  for (const row of rows) {
    if (row["valid_to"] && String(row["valid_to"]) < today) continue;

    const claims: Record<string, string | number | boolean | null> = {};
    for (const claim of (row["trust_claims"] ?? []) as Record<string, any>[]) {
      const key = String(claim["claim_key"]);
      if (BLOCKED_CLAIM_KEYS.has(key)) continue;
      claims[key] =
        claim["value_text"] ??
        claim["value_num"] ??
        claim["value_date"] ??
        (claim["value_bool"] as boolean | null) ??
        null;
    }

    const evidence: PublicCredential["evidence"] = [];
    if (scope.include_evidence) {
      for (const ev of (row["trust_evidence"] ?? []) as Record<string, any>[]) {
        const item: PublicCredential["evidence"][number] = {
          kind: String(ev["evidence_kind"]),
          collected_at: String(ev["collected_at"]),
        };
        if (ev["storage_bucket"] && ev["storage_path"]) {
          const signed = await supabase.storage
            .from(String(ev["storage_bucket"]))
            .createSignedUrl(String(ev["storage_path"]), 600);
          if (signed.data?.signedUrl) item.url = signed.data.signedUrl;
        }
        evidence.push(item);
      }
    }

    const type = row["trust_credential_types"] as Record<string, any> | null;
    const issuer = row["trust_issuers"] as Record<string, any> | null;

    result.push({
      id: String(row["id"]),
      credential_type: String(type?.["slug"] ?? ""),
      credential_type_name: String(type?.["display_name"] ?? ""),
      category: String(type?.["category"] ?? ""),
      status: String(row["status"]),
      assurance_level: String(row["assurance_level"]),
      issuer: (issuer?.["display_name"] as string | undefined) ?? null,
      issuer_kind: (issuer?.["issuer_kind"] as string | undefined) ?? null,
      verified_at: (row["verified_at"] as string | null) ?? null,
      valid_from: (row["valid_from"] as string | null) ?? null,
      valid_to: (row["valid_to"] as string | null) ?? null,
      claims,
      evidence,
    });
  }

  return result;
}
