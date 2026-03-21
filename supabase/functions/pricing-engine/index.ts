import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Backward-compatible wrapper for pricing-engine.
 * Delegates to compensation-intelligence → lookup_rate capability.
 * Same request/response shape as before.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { occupation, kommun, employment_type } = await req.json();

    if (!occupation || !kommun || !employment_type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: occupation, kommun, employment_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Forward client IP for rate limiting
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    // Delegate to compensation-intelligence
    const ciUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/compensation-intelligence`;
    const ciResponse = await fetch(ciUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        "x-forwarded-for": clientIp,
      },
      body: JSON.stringify({
        capability: "lookup_rate",
        params: {
          role: occupation,
          geography: kommun,
          employment_type,
        },
        client_type: "anonymous_human",
      }),
    });

    const ciData = await ciResponse.json();

    // If CI returned an error, map it back to legacy format
    if (!ciResponse.ok || ciData.error) {
      const errorMsg = ciData.message || ciData.error || "Calculation failed";
      const status = ciData.error === "NO_RATE_FOUND" ? 404
        : ciData.error === "ENTITY_NOT_RESOLVED" ? 404
        : ciResponse.status >= 400 ? ciResponse.status : 500;

      return new Response(
        JSON.stringify({ error: errorMsg }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map CI response back to legacy pricing-engine format
    const d = ciData.data;
    const result = {
      occupation: d.occupation,
      kommun: d.kommun,
      zon: d.zon,
      region: d.region,
      employment_type: d.employment_type,
      rate_customer_sek_per_hour: d.rate_customer_sek_per_hour,
      consultant_share_min: d.consultant_share_min,
      consultant_share_max: d.consultant_share_max,
      employee_factor: d.employee_factor,
      hours_per_month: d.hours_per_month,
      recommended_hourly_min: d.recommended_hourly_min,
      recommended_hourly_max: d.recommended_hourly_max,
      recommended_monthly_min: d.recommended_monthly_min,
      recommended_monthly_max: d.recommended_monthly_max,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("pricing-engine wrapper error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
