// Marketplace step 1 — public, agent-readable listing endpoint.
// Returns a JSON-LD JobPosting-like resource for published listings only.
// No auth required. Logs every read in mp_agent_runs.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-agent-id",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  // path: /marketplace-listing-public/<id> OR ?id=<id>
  const parts = url.pathname.split("/").filter(Boolean);
  const id = parts[parts.length - 1] && parts[parts.length - 1] !== "marketplace-listing-public"
    ? parts[parts.length - 1]
    : url.searchParams.get("id");

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return new Response(JSON.stringify({ error: "missing_or_invalid_id" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: listing, error } = await admin
    .from("mp_listings")
    .select("id,role,specialization,region,kommun,available_from,available_to,hours_per_week,employment_type,price_min_sek,price_max_sek,currency,terms_md,verified_at_publish,published_at,status")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  const agentId = req.headers.get("x-agent-id") ?? "anonymous";
  const ip = req.headers.get("x-forwarded-for") ?? "";
  const ua = req.headers.get("user-agent") ?? "";

  await admin.from("mp_agent_runs").insert({
    agent_id: agentId,
    listing_id: listing?.id ?? null,
    action: "read_listing",
    request_payload: { id },
    response_payload: { found: !!listing },
    status_code: listing ? 200 : 404,
    client_ip: ip,
    user_agent: ua,
  });

  if (error || !listing) {
    return new Response(JSON.stringify({ error: "not_found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "@id": `${Deno.env.get("SUPABASE_URL")}/functions/v1/marketplace-listing-public/${listing.id}`,
    title: listing.role + (listing.specialization ? ` (${listing.specialization})` : ""),
    employmentType: listing.employment_type === "anstalld" ? "EMPLOYEE" : "CONTRACTOR",
    datePosted: listing.published_at,
    validThrough: listing.available_to,
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressRegion: listing.region,
        addressLocality: listing.kommun,
        addressCountry: "SE",
      },
    },
    baseSalary: {
      "@type": "MonetaryAmount",
      currency: listing.currency,
      value: {
        "@type": "QuantitativeValue",
        minValue: listing.price_min_sek,
        maxValue: listing.price_max_sek,
        unitText: "HOUR",
      },
    },
    workHours: listing.hours_per_week ? `${listing.hours_per_week}h/week` : undefined,
    description: listing.terms_md ?? undefined,
    identifier: { "@type": "PropertyValue", name: "compcare-listing-id", value: listing.id },
    additionalProperty: [
      { "@type": "PropertyValue", name: "dokhus_verified", value: listing.verified_at_publish },
    ],
    potentialAction: {
      "@type": "Action",
      name: "submitOffer",
      target: `${Deno.env.get("SUPABASE_URL")}/functions/v1/marketplace-agent-negotiate`,
    },
  };

  return new Response(JSON.stringify(jsonLd), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/ld+json" },
  });
});
