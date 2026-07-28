// E2E security tests: unauthenticated calls to get-report must not leak data.
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals, assertNotEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const ENDPOINT = `${SUPABASE_URL}/functions/v1/get-report`;
const RANDOM_UUID = "00000000-0000-0000-0000-0000000dead1";

// Optional: set TEST_LOCKED_REPORT_ID in .env to an existing report that has
// status != 'paid', email = null, unlocked_by_referral = false. If unset, that
// test is skipped.
const LOCKED_REPORT_ID = Deno.env.get("TEST_LOCKED_REPORT_ID") ?? "";

const SENSITIVE_KEYS = [
  "rate_customer_sek_per_hour",
  "percentiles",
  "average_monthly",
  "recommendation",
  "margin",
];

function anonHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
  };
}

function assertNoSensitive(payload: unknown, ctx: string) {
  const serialised = JSON.stringify(payload ?? {});
  for (const key of SENSITIVE_KEYS) {
    assert(
      !serialised.includes(`"${key}"`),
      `${ctx}: response leaked sensitive key "${key}" — payload=${serialised.slice(0, 400)}`,
    );
  }
}

Deno.test("get-report: missing report_id returns 400 with no data", async () => {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: anonHeaders(),
    body: JSON.stringify({}),
  });
  const body = await res.json();
  assertEquals(res.status, 400);
  assertEquals(body.error, "Missing report_id");
  assertEquals(body.result_json, undefined);
});

Deno.test("get-report: unknown report_id returns 404 with no data", async () => {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: anonHeaders(),
    body: JSON.stringify({ report_id: RANDOM_UUID }),
  });
  const body = await res.json();
  assertEquals(res.status, 404);
  assertEquals(body.error, "Report not found");
  assertEquals(body.result_json, undefined);
  assertEquals(body.email, undefined);
  assertEquals(body.access, undefined);
});

Deno.test("get-report: invalid access_token does not grant access on unknown report", async () => {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: anonHeaders(),
    body: JSON.stringify({ report_id: RANDOM_UUID, access_token: "not.a.valid.token" }),
  });
  const body = await res.json();
  assertEquals(res.status, 404);
  assertNoSensitive(body, "invalid token");
});

Deno.test({
  name: "get-report: locked report returns preview with no rates/percentiles/recommendation",
  ignore: !LOCKED_REPORT_ID,
  fn: async () => {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: anonHeaders(),
      body: JSON.stringify({ report_id: LOCKED_REPORT_ID }),
    });
    const body = await res.json();
    assertEquals(res.status, 200);
    assertEquals(body.access, "preview");
    assertEquals(body.email, null);
    assertNotEquals(body.result_json, undefined);
    assertNoSensitive(body.result_json, "locked preview");
  },
});
