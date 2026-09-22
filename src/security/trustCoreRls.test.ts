/**
 * Säkerhetstester för Trust Core v1.
 *
 * Kör: bun run test
 * Kräver bara VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY (anon).
 *
 * Syfte: bevisa att ingen av de nya trust_*-tabellerna eller skrivfunktionerna
 * är åtkomliga för anon (ingen publik rå RLS-läsning, ingen anon-RPC).
 * Ägar-/admin-/append-only-beteendet verifieras på databasnivå (se
 * drizzle/migrations/0004–0007) eftersom det kräver två inloggade konton.
 */

import { describe, it, expect } from "vitest";

const env = (k: string): string | undefined =>
  (import.meta as unknown as { env?: Record<string, string> }).env?.[k] ??
  (typeof process !== "undefined" ? process.env?.[k] : undefined);

const SUPABASE_URL = env("VITE_SUPABASE_URL");
const ANON_KEY = env("VITE_SUPABASE_PUBLISHABLE_KEY") ?? env("VITE_SUPABASE_ANON_KEY");
const hasEnv = Boolean(SUPABASE_URL && ANON_KEY);

const TRUST_TABLES = [
  "trust_issuers",
  "trust_credential_types",
  "trust_credentials",
  "trust_claims",
  "trust_evidence",
  "trust_verification_events",
] as const;

const TRUST_RPCS = [
  {
    fn: "trust_create_self_asserted_credential",
    body: { _type_slug: "certification" },
  },
  {
    fn: "trust_transition_credential",
    body: {
      _credential_id: "00000000-0000-0000-0000-000000000000",
      _to_status: "active",
    },
  },
] as const;

const headers = () => ({
  apikey: ANON_KEY as string,
  Authorization: `Bearer ${ANON_KEY as string}`,
  "Content-Type": "application/json",
});

describe.skipIf(!hasEnv)("Trust Core v1 — anon har ingen åtkomst", () => {
  it.each(TRUST_TABLES)("anon kan inte läsa %s", async (table) => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=id&limit=1`, {
      headers: headers(),
    });
    expect([401, 403, 404]).toContain(res.status);
  });

  it.each(TRUST_TABLES)("anon kan inte skriva till %s", async (table) => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({}),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).not.toBe(201);
  });

  it.each(TRUST_RPCS)("anon kan inte anropa $fn", async ({ fn, body }) => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
    });
    expect([401, 403, 404]).toContain(res.status);
  });
});
