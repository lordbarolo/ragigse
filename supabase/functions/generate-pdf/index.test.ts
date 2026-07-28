// E2E security tests: unauthenticated calls to generate-pdf must not leak PDF data.
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const ENDPOINT = `${SUPABASE_URL}/functions/v1/generate-pdf`;
const RANDOM_UUID = "00000000-0000-0000-0000-0000000dead2";

// Optional: an existing locked report id (status != paid, email null,
// unlocked_by_referral false). If unset, that test is skipped.
const LOCKED_REPORT_ID = Deno.env.get("TEST_LOCKED_REPORT_ID") ?? "";

function anonHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
  };
}

async function assertNotPdf(res: Response, ctx: string) {
  const contentType = res.headers.get("content-type") ?? "";
  assert(
    !contentType.includes("application/pdf"),
    `${ctx}: unexpectedly received a PDF (content-type=${contentType})`,
  );
  // Drain body to avoid Deno resource leaks.
  const text = await res.text();
  assert(!text.startsWith("%PDF"), `${ctx}: response body starts with %PDF magic`);
}

Deno.test("generate-pdf: missing report_id returns 400", async () => {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: anonHeaders(),
    body: JSON.stringify({}),
  });
  assertEquals(res.status, 400);
  await assertNotPdf(res, "missing report_id");
});

Deno.test("generate-pdf: unknown report_id returns 404 without a PDF", async () => {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: anonHeaders(),
    body: JSON.stringify({ report_id: RANDOM_UUID }),
  });
  assertEquals(res.status, 404);
  await assertNotPdf(res, "unknown report");
});

Deno.test("generate-pdf: invalid access_token does not produce a PDF", async () => {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: anonHeaders(),
    body: JSON.stringify({ report_id: RANDOM_UUID, access_token: "not.a.valid.token" }),
  });
  assert(res.status === 403 || res.status === 404, `unexpected status ${res.status}`);
  await assertNotPdf(res, "invalid token");
});

Deno.test({
  name: "generate-pdf: locked report is rejected with 403 (no PDF leaked)",
  ignore: !LOCKED_REPORT_ID,
  fn: async () => {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: anonHeaders(),
      body: JSON.stringify({ report_id: LOCKED_REPORT_ID }),
    });
    assertEquals(res.status, 403);
    await assertNotPdf(res, "locked report");
  },
});
