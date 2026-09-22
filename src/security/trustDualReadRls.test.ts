/**
 * Säkerhetstest för dual-read-avvikelseloggen.
 *
 * Avvikelseloggen får aldrig bli en väg runt RLS: anon ska inte kunna läsa eller
 * skriva, och inloggade utan admin-roll nekas av RLS-policyn.
 */
import { describe, it, expect } from "vitest";

const env = (k: string): string | undefined =>
  (import.meta as unknown as { env?: Record<string, string> }).env?.[k] ??
  (typeof process !== "undefined" ? process.env?.[k] : undefined);

const SUPABASE_URL = env("VITE_SUPABASE_URL");
const ANON_KEY = env("VITE_SUPABASE_PUBLISHABLE_KEY") ?? env("VITE_SUPABASE_ANON_KEY");
const hasEnv = Boolean(SUPABASE_URL && ANON_KEY);

const TABLE = "trust_dualread_discrepancies";

const headers = () => ({
  apikey: ANON_KEY as string,
  Authorization: `Bearer ${ANON_KEY as string}`,
  "Content-Type": "application/json",
});

describe.skipIf(!hasEnv)("trust_dualread_discrepancies — obehörig åtkomst nekas", () => {
  it("anon kan inte läsa loggen", async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?select=id&limit=1`, {
      headers: headers(),
    });
    expect([401, 403, 404]).toContain(res.status);
  });

  it("anon kan inte skriva till loggen", async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        subject_user_id: "00000000-0000-0000-0000-000000000000",
        legacy_table: "consultant_documents",
        discrepancy_kind: "missing_trust",
        detail_hash: "x",
      }),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).not.toBe(201);
  });

  it("anon kan inte radera i loggen", async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?legacy_table=eq.consultant_documents`, {
      method: "DELETE",
      headers: headers(),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
