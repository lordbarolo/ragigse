import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Backward-compatible wrapper for salary-benchmark-engine.
 * Delegates to compensation-intelligence → salary_benchmark or salary_position capability.
 * Same request/response shape as before.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { occupation, sector, current_salary } = await req.json();

    if (!occupation || !sector) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: occupation, sector" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Choose capability based on whether current_salary is provided
    const hasSalary = current_salary && current_salary > 0;
    const capability = hasSalary ? "salary_position" : "salary_benchmark";

    // Forward client IP for rate limiting
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    const ciUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/compensation-intelligence`;
    const ciResponse = await fetch(ciUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        "x-forwarded-for": clientIp,
      },
      body: JSON.stringify({
        capability,
        params: {
          role: occupation,
          sector,
          ...(hasSalary ? { current_salary } : {}),
        },
        client_type: "anonymous_human",
      }),
    });

    const ciData = await ciResponse.json();

    // CI uses envelope format: { status, data, errors }
    if (!ciResponse.ok || ciData.status === "error" || ciData.errors?.length > 0) {
      const errorMsg = ciData.errors?.[0]?.message || ciData.message || ciData.error || "Benchmark calculation failed";
      const errorCode = ciData.errors?.[0]?.code || "";

      if (errorCode === "NO_DATA_FOUND" || errorCode === "ENTITY_NOT_RESOLVED") {
        return new Response(
          JSON.stringify({ error: "No benchmark data available" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: errorMsg }),
        { status: ciResponse.status >= 400 ? ciResponse.status : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map CI envelope response to legacy format
    const d = ciData.data;
    const roleName = d.role?.name || occupation;
    const geoName = d.geography?.name || null;

    const result: Record<string, unknown> = {
      occupation: roleName,
      sector,
      region: geoName,
      year: d.period ? parseInt(d.period, 10) : new Date().getFullYear(),
      source: ciData.source?.name || "SCB/Medlingsinstitutet",
      percentile_25: d.p25_salary,
      percentile_50: d.median_salary,
      percentile_75: d.p75_salary,
      below_threshold: d.below_threshold || false,
      sample_size: d.sample_size,
    };

    if (hasSalary) {
      result.current_salary = d.input_salary || current_salary;
      result.gap_vs_p75 = d.difference_amount;
      result.gap_pct = d.difference_percent;
      const absPct = Math.abs(d.difference_percent || 0);
      result.category = absPct <= 5 ? "small" : absPct <= 15 ? "medium" : "large";
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("salary-benchmark-engine wrapper error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
