// Marketplace step 1 — consultant upserts their own listing.
// Auth required (JWT). Owner-scoped writes via RLS.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const Body = z.object({
  id: z.string().uuid().optional(),
  role: z.string().min(2).max(120),
  specialization: z.string().max(160).optional().nullable(),
  region: z.string().max(80).optional().nullable(),
  kommun: z.string().max(80).optional().nullable(),
  available_from: z.string().optional().nullable(),
  available_to: z.string().optional().nullable(),
  hours_per_week: z.number().int().min(1).max(80).optional().nullable(),
  employment_type: z.enum(["anstalld", "foretagare"]).default("foretagare"),
  price_min_sek: z.number().int().min(100).max(5000),
  price_max_sek: z.number().int().min(100).max(5000),
  terms_md: z.string().max(4000).optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
  status: z.enum(["draft", "published", "paused", "closed"]).default("draft"),
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;
  if (!user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
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
  if (data.price_max_sek < data.price_min_sek) {
    return new Response(JSON.stringify({ error: "price_max_lt_min" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const row = {
    user_id: user.id,
    role: data.role,
    specialization: data.specialization ?? null,
    region: data.region ?? null,
    kommun: data.kommun ?? null,
    available_from: data.available_from ?? null,
    available_to: data.available_to ?? null,
    hours_per_week: data.hours_per_week ?? null,
    employment_type: data.employment_type,
    price_min_sek: data.price_min_sek,
    price_max_sek: data.price_max_sek,
    terms_md: data.terms_md ?? null,
    metadata: data.metadata ?? {},
    status: data.status,
  };

  let result;
  if (data.id) {
    const { data: r, error } = await supabase
      .from("mp_listings")
      .update(row)
      .eq("id", data.id)
      .eq("user_id", user.id)
      .select()
      .maybeSingle();
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    result = r;
  } else {
    const { data: r, error } = await supabase
      .from("mp_listings")
      .insert(row)
      .select()
      .maybeSingle();
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    result = r;
  }

  // Audit (service-role)
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  await admin.from("mp_negotiation_events").insert({
    listing_id: result?.id ?? null,
    actor_kind: "consultant",
    actor_id: user.id,
    kind: data.id ? "listing_updated" : "listing_created",
    payload: { status: row.status },
  });
  if (row.status === "published") {
    await admin.from("mp_negotiation_events").insert({
      listing_id: result?.id ?? null,
      actor_kind: "consultant",
      actor_id: user.id,
      kind: "listing_published",
      payload: {},
    });
  }

  return new Response(JSON.stringify({ listing: result }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
