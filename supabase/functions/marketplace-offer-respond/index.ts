// Marketplace step 1 — listing owner accepts/rejects/counters an offer.
// Auth required. Owner-scoped.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const Body = z.object({
  offer_id: z.string().uuid(),
  decision: z.enum(["accepted", "rejected", "countered"]),
  message_md: z.string().max(4000).optional().nullable(),
  counter_price_sek: z.number().int().min(100).max(5000).optional(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "validation_failed", details: parsed.error.flatten() }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const data = parsed.data;

  // Verify ownership through join
  const { data: offer, error: oerr } = await supabase
    .from("mp_offers")
    .select("id, listing_id, status, mp_listings!inner(user_id)")
    .eq("id", data.offer_id)
    .maybeSingle();
  if (oerr || !offer) {
    return new Response(JSON.stringify({ error: "offer_not_found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  // RLS already enforces owner; double-check
  // @ts-ignore — embedded object
  if (offer.mp_listings.user_id !== u.user.id) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  if (data.decision === "countered") {
    if (!data.counter_price_sek) {
      return new Response(JSON.stringify({ error: "missing_counter_price_sek" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    await admin.from("mp_offers").update({
      status: "countered",
      responded_at: new Date().toISOString(),
      responded_message_md: data.message_md ?? null,
    }).eq("id", offer.id);
    await admin.from("mp_negotiation_events").insert({
      listing_id: offer.listing_id, offer_id: offer.id,
      actor_kind: "consultant", actor_id: u.user.id, kind: "offer_countered",
      payload: { counter_price_sek: data.counter_price_sek },
    });
  } else {
    await admin.from("mp_offers").update({
      status: data.decision,
      responded_at: new Date().toISOString(),
      responded_message_md: data.message_md ?? null,
    }).eq("id", offer.id);
    await admin.from("mp_negotiation_events").insert({
      listing_id: offer.listing_id, offer_id: offer.id,
      actor_kind: "consultant", actor_id: u.user.id,
      kind: data.decision === "accepted" ? "offer_accepted" : "offer_rejected",
      payload: {},
    });
  }

  return new Response(JSON.stringify({ ok: true, offer_id: offer.id, status: data.decision }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
