import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const REPORT_ID = "00000000-0000-0000-0000-000000000099";

Deno.test("Expired coupon is rejected with 410", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/redeem-coupon`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ code: "EXPIRED-TEST", report_id: REPORT_ID }),
  });
  const body = await res.json();
  assertEquals(res.status, 410);
  assertEquals(body.error, "Kupongkoden har gått ut");
});

Deno.test("Invalid coupon code is rejected with 404", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/redeem-coupon`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ code: "DOESNOTEXIST", report_id: REPORT_ID }),
  });
  const body = await res.json();
  assertEquals(res.status, 404);
  assertEquals(body.error, "Ogiltig kupongkod");
});

Deno.test("Valid coupon GRATIS500 unlocks report", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/redeem-coupon`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ code: "GRATIS500", report_id: REPORT_ID }),
  });
  const body = await res.json();
  assertEquals(res.status, 200);
  assertEquals(body.status, "unlocked");
});
