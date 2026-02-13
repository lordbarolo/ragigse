import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      lead_id,
      email,
      occupation,
      employment_type,
      kommun,
      experience,
      current_salary,
      salary_type,
    } = await req.json();

    if (!email || !occupation || !employment_type || !kommun) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Look up zone from locations
    const { data: locData } = await supabase
      .from("locations")
      .select("zon")
      .eq("kommun", kommun)
      .limit(1);

    const zon = locData?.[0]?.zon || "Zon 1";

    // Look up rate for this occupation + zone
    const { data: rateData } = await supabase
      .from("rates")
      .select("timpris_kund, yrkeskategori, typ")
      .eq("yrkeskategori", occupation)
      .eq("zon", zon)
      .limit(1);

    let timprisKund = 0;
    if (rateData && rateData.length > 0) {
      timprisKund = rateData[0].timpris_kund;
    } else {
      // Fallback: find any rate matching occupation in any zone, then find same typ in user's zone
      const { data: anyRate } = await supabase
        .from("rates")
        .select("typ")
        .eq("yrkeskategori", occupation)
        .limit(1);

      if (anyRate && anyRate.length > 0) {
        const { data: zoneRate } = await supabase
          .from("rates")
          .select("timpris_kund")
          .eq("typ", anyRate[0].typ)
          .eq("zon", zon)
          .limit(1);

        if (zoneRate && zoneRate.length > 0) {
          timprisKund = zoneRate[0].timpris_kund;
        }
      }
    }

    if (timprisKund === 0) {
      return new Response(
        JSON.stringify({ error: "Could not find rate for this occupation and zone" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // A/B variant: 50/50 random assignment
    const abVariant = Math.random() < 0.5 ? "A" : "B";

    // Calculate result_json
    const isEmployee = employment_type === "anstalld";
    const hoursPerMonth = 167;
    const shareMin = 0.85;
    const shareMax = 0.90;
    const factor = isEmployee ? 1.42 : 1;

    const recommendedHourlyMin = Math.round((timprisKund * shareMin) / factor);
    const recommendedHourlyMax = Math.round((timprisKund * shareMax) / factor);
    const recommendedMonthlyMin = recommendedHourlyMin * hoursPerMonth;
    const recommendedMonthlyMax = recommendedHourlyMax * hoursPerMonth;

    const currentMonthly =
      salary_type === "hourly"
        ? (current_salary || 0) * hoursPerMonth
        : current_salary || 0;

    const resultJson = {
      calc_version: "v1",
      inputs: {
        location: kommun,
        occupation,
        employment_type,
        experience_years: experience ?? 0,
        current_salary_sek: current_salary || 0,
        salary_type: salary_type || "monthly",
      },
      market: {
        rate_customer_sek_per_hour: timprisKund,
      },
      recommendation: {
        consultant_share_min: shareMin,
        consultant_share_max: shareMax,
        employee_factor: factor,
        recommended_hourly_min: recommendedHourlyMin,
        recommended_hourly_max: recommendedHourlyMax,
        recommended_monthly_min: recommendedMonthlyMin,
        recommended_monthly_max: recommendedMonthlyMax,
        hours_per_month: hoursPerMonth,
      },
      delta: {
        monthly_vs_current_min: recommendedMonthlyMin - currentMonthly,
        monthly_vs_current_max: recommendedMonthlyMax - currentMonthly,
      },
    };

    // Insert report
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .insert({
        lead_id: lead_id || null,
        email,
        status: "preview",
        result_json: resultJson,
        occupation,
        employment_type,
        kommun,
        experience: experience ?? null,
        current_salary: current_salary ?? null,
        salary_type: salary_type || null,
        ab_variant: abVariant,
      })
      .select("id")
      .single();

    if (reportError) {
      console.error("Failed to create report:", reportError);
      return new Response(
        JSON.stringify({ error: "Failed to create report" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Report created: ${report.id} for ${email}`);

    return new Response(
      JSON.stringify({ report_id: report.id, ab_variant: abVariant }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Create report error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
