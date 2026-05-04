// Marketplace step 1 — agent endpoint to create / counter / withdraw offers.
// Public (no auth) but every call logged in mp_agent_runs.
// Writes via service_role. Offers always start status='pending'.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-agent-id, x-agent-org",
};

const Body = z.object({
  action: z.enum(["create_offer", "counter", "withdraw"]),
  listing_id: z.string().uuid().optional(),
  parent_offer_id: z.string().uuid().optional(),
  response_token: z.string().min(16).optional(),
  offered_price_sek: z.number().int().min(100).max(5000).optional(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  hours_per_week: z.number().int().min(1).max(80).optional().nullable(),
  message_md: z.string().max(4000).optional().nullable(),
  agent_signature: z.string().max(2000).optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const agentId = req.headers.get("x-agent-id") ?? "";
  const agentOrg = req.headers.get("x-agent-org") ?? null;
  const agentContact = req.headers.get("x-agent-contact") ?? null;
  if (!agentId || agentId.length < 3) {
    return new Response(JSON.stringify({ error: "missing_x-agent-id" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
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

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const ip = req.headers.get("x-forwarded-for") ?? "";
  const ua = req.headers.get("user-agent") ?? "";
  const log = async (status: number, listingId: string | null, offerId: string | null, response: unknown) => {
    await admin.from("mp_agent_runs").insert({
      agent_id: agentId, listing_id: listingId, offer_id: offerId,
      action: data.action, request_payload: data, response_payload: response,
      status_code: status, client_ip: ip, user_agent: ua,
    });
  };

  // ---- create_offer ----
  if (data.action === "create_offer") {
    if (!data.listing_id || !data.offered_price_sek) {
      const r = { error: "missing_listing_id_or_price" };
      await log(400, data.listing_id ?? null, null, r);
      return new Response(JSON.stringify(r), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: listing } = await admin.from("mp_listings")
      .select("id,status").eq("id", data.listing_id).maybeSingle();
    if (!listing || listing.status !== "published") {
      const r = { error: "listing_not_open" };
      await log(404, data.listing_id, null, r);
      return new Response(JSON.stringify(r), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: inserted, error } = await admin.from("mp_offers").insert({
      listing_id: data.listing_id,
      agent_id: agentId,
      agent_org: agentOrg,
      agent_contact: agentContact,
      agent_signature: data.agent_signature ?? null,
      offered_price_sek: data.offered_price_sek,
      start_date: data.start_date ?? null,
      end_date: data.end_date ?? null,
      hours_per_week: data.hours_per_week ?? null,
      message_md: data.message_md ?? null,
      metadata: data.metadata ?? {},
    }).select().maybeSingle();
    if (error || !inserted) {
      const r = { error: error?.message ?? "insert_failed" };
      await log(500, data.listing_id, null, r);
      return new Response(JSON.stringify(r), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    await admin.from("mp_negotiation_events").insert({
      listing_id: data.listing_id, offer_id: inserted.id,
      actor_kind: "agent", actor_id: agentId, kind: "offer_created",
      payload: { offered_price_sek: inserted.offered_price_sek },
    });
    const r = {
      offer_id: inserted.id,
      response_token: inserted.response_token,
      status: inserted.status,
    };
    await log(200, data.listing_id, inserted.id, r);
    return new Response(JSON.stringify(r), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ---- withdraw / counter use response_token ----
  if (!data.response_token) {
    const r = { error: "missing_response_token" };
    await log(400, null, null, r);
    return new Response(JSON.stringify(r), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { data: offer } = await admin.from("mp_offers")
    .select("id,listing_id,agent_id,status").eq("response_token", data.response_token).maybeSingle();
  if (!offer || offer.agent_id !== agentId) {
    const r = { error: "offer_not_found_or_forbidden" };
    await log(404, null, null, r);
    return new Response(JSON.stringify(r), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (data.action === "withdraw") {
    await admin.from("mp_offers").update({ status: "withdrawn" }).eq("id", offer.id);
    await admin.from("mp_negotiation_events").insert({
      listing_id: offer.listing_id, offer_id: offer.id,
      actor_kind: "agent", actor_id: agentId, kind: "offer_withdrawn", payload: {},
    });
    const r = { offer_id: offer.id, status: "withdrawn" };
    await log(200, offer.listing_id, offer.id, r);
    return new Response(JSON.stringify(r), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (data.action === "counter") {
    if (!data.offered_price_sek) {
      const r = { error: "missing_offered_price_sek" };
      await log(400, offer.listing_id, offer.id, r);
      return new Response(JSON.stringify(r), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: counter, error } = await admin.from("mp_offers").insert({
      listing_id: offer.listing_id,
      parent_offer_id: offer.id,
      agent_id: agentId,
      agent_org: agentOrg,
      agent_contact: agentContact,
      offered_price_sek: data.offered_price_sek,
      start_date: data.start_date ?? null,
      end_date: data.end_date ?? null,
      hours_per_week: data.hours_per_week ?? null,
      message_md: data.message_md ?? null,
      metadata: data.metadata ?? {},
    }).select().maybeSingle();
    if (error || !counter) {
      const r = { error: error?.message ?? "insert_failed" };
      await log(500, offer.listing_id, offer.id, r);
      return new Response(JSON.stringify(r), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    await admin.from("mp_negotiation_events").insert({
      listing_id: offer.listing_id, offer_id: counter.id,
      actor_kind: "agent", actor_id: agentId, kind: "offer_countered",
      payload: { offered_price_sek: counter.offered_price_sek, parent_offer_id: offer.id },
    });
    const r = { offer_id: counter.id, response_token: counter.response_token, status: counter.status };
    await log(200, offer.listing_id, counter.id, r);
    return new Response(JSON.stringify(r), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "unknown_action" }), {
    status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
