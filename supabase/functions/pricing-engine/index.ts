import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  calculateSalaryRange,
  estimateHourlySalary,
  SHARE_MIN,
  SHARE_MAX,
  HOURS_PER_MONTH,
  EMPLOYER_FACTOR,
  type EmploymentType,
} from "../_shared/calc.ts";

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
    const { occupation, kommun, employment_type } = await req.json();

    if (!occupation || !kommun || !employment_type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: occupation, kommun, employment_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Look up zone
    const { data: locData } = await supabase
      .from("locations")
      .select("zon, region")
      .eq("kommun", kommun)
      .limit(1);

    if (!locData || locData.length === 0) {
      return new Response(
        JSON.stringify({ error: "Unknown kommun" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { zon, region } = locData[0];

    // Look up rate
    const { data: rateData } = await supabase
      .from("rates")
      .select("timpris_kund, yrkeskategori, typ, detaljer")
      .eq("yrkeskategori", occupation)
      .eq("zon", zon)
      .limit(1);

    let timprisKund = 0;
    let matchedOccupation = occupation;

    if (rateData && rateData.length > 0) {
      timprisKund = rateData[0].timpris_kund;
      matchedOccupation = rateData[0].yrkeskategori;
    } else {
      // Fallback: find by typ
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
        JSON.stringify({ error: "No rate found for this occupation and zone" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const empType = employment_type as EmploymentType;
    const range = calculateSalaryRange(timprisKund, empType);
    const factor = empType === "anstalld" ? EMPLOYER_FACTOR : 1;

    const result = {
      occupation: matchedOccupation,
      kommun,
      zon,
      region,
      employment_type: empType,
      rate_customer_sek_per_hour: timprisKund,
      consultant_share_min: SHARE_MIN,
      consultant_share_max: SHARE_MAX,
      employee_factor: factor,
      hours_per_month: HOURS_PER_MONTH,
      recommended_hourly_min: range.hourly_min,
      recommended_hourly_max: range.hourly_max,
      recommended_monthly_min: range.monthly_min,
      recommended_monthly_max: range.monthly_max,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("pricing-engine error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
