/**
 * Automatiska säkerhetstester för RPC-grants (PostgREST /rest/v1/rpc/*).
 *
 * Syfte: verifiera att `anon` INTE kan anropa de RPC:er vi har revokat, och att
 * de fåtal RPC:er som medvetet är publika fortfarande fungerar — samt att de
 * inte läcker hemligheter.
 *
 * Kör: bun run test
 *   Anon-testerna kräver bara VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY.
 *   De authenticated-testerna körs bara om TEST_USER_EMAIL/TEST_USER_PASSWORD finns
 *   (skippas annars, så CI utan testkonto inte blir rött).
 */

import { describe, it, expect, beforeAll } from "vitest";

const env = (k: string): string | undefined =>
  (import.meta as unknown as { env?: Record<string, string> }).env?.[k] ??
  (typeof process !== "undefined" ? process.env?.[k] : undefined);

const SUPABASE_URL = env("VITE_SUPABASE_URL");
const ANON_KEY = env("VITE_SUPABASE_PUBLISHABLE_KEY") ?? env("VITE_SUPABASE_ANON_KEY");
const TEST_EMAIL = env("TEST_USER_EMAIL");
const TEST_PASSWORD = env("TEST_USER_PASSWORD");

const hasEnv = Boolean(SUPABASE_URL && ANON_KEY);

/** RPC:er som anon aldrig ska kunna anropa, med minimal (ofarlig) payload. */
const ANON_DENIED: Array<{ fn: string; body: Record<string, unknown> }> = [
  { fn: "create_org_with_admin", body: { _name: "sec-test", _org_number: "0000000000", _type: "agency" } },
  { fn: "approve_org_membership_request", body: { _request_id: "00000000-0000-0000-0000-000000000000" } },
  { fn: "reject_org_membership_request", body: { _request_id: "00000000-0000-0000-0000-000000000000" } },
  {
    fn: "create_document_share",
    body: {
      _document_ids: ["00000000-0000-0000-0000-000000000000"],
      _expires_in_hours: 1,
      _recipient_label: "sec-test",
      _recipient_email: "sec-test@example.com",
    },
  },
  { fn: "redact_avrop_intelligence_pii", body: {} },
  { fn: "mp_can_publish", body: { _user_id: "00000000-0000-0000-0000-000000000000" } },
  { fn: "ref_create_ping", body: { _reference_id: "00000000-0000-0000-0000-000000000000", _requester_name: "sec-test" } },
  { fn: "ref_get_ping_by_token", body: { _token: "sec-test-token" } },
  { fn: "ref_get_public_profile", body: { _profile_id: "00000000-0000-0000-0000-000000000000" } },
  { fn: "ref_get_reference_by_invite_token", body: { _token: "sec-test-token" } },
  { fn: "ref_log_profile_view", body: { _profile_id: "00000000-0000-0000-0000-000000000000", _fingerprint: "x", _referrer: "x" } },
  { fn: "ref_respond_to_ping", body: { _token: "sec-test-token", _status: "accepted" } },
  {
    fn: "ref_submit_reference",
    body: {
      _token: "sec-test-token",
      _giver_id: "00000000-0000-0000-0000-000000000000",
      _giver_name: "sec-test",
      _reference_text: "x",
      _competencies: [],
      _recommendation_score: 1,
    },
  },
  {
    fn: "ref_verify_imported_reference",
    body: {
      _token: "sec-test-token",
      _giver_id: "00000000-0000-0000-0000-000000000000",
      _giver_name: "sec-test",
      _comment: "x",
    },
  },
];

/**
 * Funktioner som ska ha EXECUTE för `authenticated` men vara nekade för `anon`.
 */
const AUTHENTICATED_ONLY: Array<{ fn: string; body: Record<string, unknown> }> = [];

/**
 * `ref_has_role` anropas av ~29 RLS-policyer och måste vara körbar även för
 * `anon`, annars kraschar publika läsningar med 42501 i stället för att
 * returnera tomt. Funktionen är SECURITY DEFINER och läser bara rolltabellen —
 * den svarar "false" för utloggade och ger inga nya rättigheter.
 */
const ANON_ALLOWED: Array<{ fn: string; body: Record<string, unknown> }> = [
  { fn: "ref_has_role", body: { _user_id: "00000000-0000-0000-0000-000000000000", _role: "admin" } },
];

/** Interna helpers som varken anon eller authenticated ska nå via RPC-lagret. */
const ALL_DENIED: Array<{ fn: string; body: Record<string, unknown> }> = [
  { fn: "ref_get_user_org_id", body: { _user_id: "00000000-0000-0000-0000-000000000000" } },
  { fn: "ref_calculate_trust_score", body: { p_profile_id: "00000000-0000-0000-0000-000000000000" } },
  { fn: "ref_calculate_profile_status", body: { p_profile_id: "00000000-0000-0000-0000-000000000000" } },
  { fn: "ref_refresh_attachability", body: { p_reference_id: "00000000-0000-0000-0000-000000000000" } },
];


async function callRpc(fn: string, body: Record<string, unknown>, accessToken?: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY!,
      Authorization: `Bearer ${accessToken ?? ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, text };
}

/**
 * Blockerad = PostgREST nekar innan funktionskroppen körs:
 *   401/403 → permission denied for function
 *   404 + PGRST202 → funktionen är inte exponerad för rollen
 * 200 eller 400 (validerings-/körfel) betyder att anropet SLAPP IGENOM.
 */
function expectBlocked(fn: string, r: { status: number; text: string }) {
  const blocked =
    r.status === 401 ||
    r.status === 403 ||
    (r.status === 404 && /PGRST202|not find|does not exist/i.test(r.text)) ||
    /permission denied for function/i.test(r.text) ||
    /42501/.test(r.text);
  expect(
    blocked,
    `RPC ${fn} borde vara blockerad men svarade ${r.status}: ${r.text.slice(0, 300)}`,
  ).toBe(true);
}

describe.skipIf(!hasEnv)("RPC-grants · anon får inte anropa revokade funktioner", () => {
  for (const { fn, body } of ANON_DENIED) {
    it(`anon blockeras från ${fn}`, async () => {
      expectBlocked(fn, await callRpc(fn, body));
    });
  }
});

describe.skipIf(!hasEnv)("RPC-grants · interna helpers är stängda för alla API-roller", () => {
  for (const { fn, body } of ALL_DENIED) {
    it(`anon blockeras från ${fn}`, async () => {
      expectBlocked(fn, await callRpc(fn, body));
    });
  }
});

describe.skipIf(!hasEnv)("RPC-grants · EXECUTE för authenticated, nekad för anon", () => {
  for (const { fn, body } of AUTHENTICATED_ONLY) {
    it(`anon blockeras från ${fn}`, async () => {
      expectBlocked(fn, await callRpc(fn, body));
    });
  }
});

describe.skipIf(!hasEnv)("RPC-grants · ref_has_role är körbar för anon (RLS-beroende)", () => {
  for (const { fn, body } of ANON_ALLOWED) {
    it(`anon kan köra ${fn}`, async () => {
      const r = await callRpc(fn, body);
      const blocked =
        r.status === 401 ||
        r.status === 403 ||
        (r.status === 404 && /PGRST202|not find|does not exist/i.test(r.text)) ||
        /permission denied for function/i.test(r.text) ||
        /42501/.test(r.text);
      expect(blocked, `RPC ${fn} borde vara körbar men svarade ${r.status}: ${r.text.slice(0, 300)}`).toBe(false);
    });
  }
});


describe.skipIf(!hasEnv)("RPC-grants · medvetet publika funktioner fungerar och läcker inget", () => {
  it("get_feature_flag('marketplace_enabled') är läsbar för anon", async () => {
    const r = await callRpc("get_feature_flag", { _key: "marketplace_enabled" });
    expect(r.status, r.text.slice(0, 300)).toBe(200);
  });

  it("get_feature_flag läcker inte visitor_hash_salt", async () => {
    const r = await callRpc("get_feature_flag", { _key: "visitor_hash_salt" });
    // Whitelistad: nyckeln finns i app_settings men får aldrig returneras.
    expect(r.text).not.toMatch(/[A-Za-z0-9+/]{16,}/);
    expect(["null", '""', "false", ""]).toContain(r.text.trim().replace(/^"|"$/g, "") === "" ? "" : r.text.trim());
  });

  it("get_referral_by_token läcker inte referrer_email", async () => {
    const r = await callRpc("get_referral_by_token", { _token: "sec-test-token" });
    expect(r.text).not.toMatch(/referrer_email/i);
    expect(r.text).not.toMatch(/@/);
  });
});

// ── Authenticated: körs bara med ett testkonto i env ────────────────────────
let accessToken: string | undefined;
const canAuth = hasEnv && Boolean(TEST_EMAIL && TEST_PASSWORD);

describe.skipIf(!canAuth)("RPC-grants · authenticated får tillgång där det ska", () => {
  beforeAll(async () => {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: ANON_KEY! },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });
    const json = (await res.json()) as { access_token?: string };
    accessToken = json.access_token;
    expect(accessToken, "kunde inte logga in testanvändaren").toBeTruthy();
  });

  for (const { fn, body } of [...ANON_DENIED, ...AUTHENTICATED_ONLY]) {
    it(`authenticated når RPC-lagret för ${fn} (inte permission denied)`, async () => {
      const r = await callRpc(fn, body, accessToken);
      expect(
        /permission denied for function/i.test(r.text),
        `authenticated nekades ${fn}: ${r.text.slice(0, 300)}`,
      ).toBe(false);
    });
  }


  for (const { fn, body } of ALL_DENIED) {
    it(`authenticated blockeras fortfarande från ${fn}`, async () => {
      expectBlocked(fn, await callRpc(fn, body, accessToken));
    });
  }
});
