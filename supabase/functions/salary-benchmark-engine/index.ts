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

    const ciUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/compensation-intelligence`;
    const ciResponse = await fetch(ciUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
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

    // Map errors back to legacy format
    if (!ciResponse.ok || ciData.error) {
      const errorMsg = ciData.message || ciData.error || "Benchmark calculation failed";

      // "No benchmark data" → return 500 like the old function did
      if (ciData.error === "NO_BENCHMARK_DATA" || ciData.error === "ENTITY_NOT_RESOLVED") {
        return new Response(
          JSON.stringify({ error: "No benchmark data available" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: errorMsg }),
        { status: ciResponse.status >= 400 ? ciResponse.status : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map CI response to legacy format
    const d = ciData.data;
    const result: Record<string, unknown> = {
      occupation: d.occupation,
      sector: d.sector,
      region: d.region,
      year: d.year,
      source: d.source,
      percentile_25: d.percentile_25,
      percentile_50: d.percentile_50,
      percentile_75: d.percentile_75,
    };

    if (hasSalary) {
      result.current_salary = d.current_salary;
      result.gap_vs_p75 = d.gap_vs_p75;
      result.gap_pct = d.gap_pct;
      result.category = d.category;
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
