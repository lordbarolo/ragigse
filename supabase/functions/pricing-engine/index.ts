import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  calculateSalaryRange,
  type EmploymentType,
  type MarginModel,
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

    // Fetch margin model from DB
    const { data: modelData } = await supabase
      .from("margin_models")
      .select("share_min, share_max, employer_factor, hours_per_month")
      .eq("name", "default")
      .eq("is_active", true)
      .limit(1)
      .single();

    const model: MarginModel | undefined = modelData
      ? {
          share_min: Number(modelData.share_min),
          share_max: Number(modelData.share_max),
          employer_factor: Number(modelData.employer_factor),
          hours_per_month: Number(modelData.hours_per_month),
        }
      : undefined;

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
    // For foretagare, market standard is 10% margin (share_min = 0.90)
    const effectiveModel: MarginModel | undefined = model
      ? (empType === "foretagare"
        ? { ...model, share_min: model.share_max }
        : model)
      : (empType === "foretagare"
        ? { share_min: 0.90, share_max: 0.90, employer_factor: 1.42, hours_per_month: 167 }
        : undefined);
    const range = calculateSalaryRange(timprisKund, empType, effectiveModel);
    const m = effectiveModel ?? { share_min: 0.85, share_max: 0.90, employer_factor: 1.42, hours_per_month: 167 };
    const factor = empType === "anstalld" ? m.employer_factor : 1;

    const result = {
      occupation: matchedOccupation,
      kommun,
      zon,
      region,
      employment_type: empType,
      rate_customer_sek_per_hour: timprisKund,
      consultant_share_min: m.share_min,
      consultant_share_max: m.share_max,
      employee_factor: factor,
      hours_per_month: m.hours_per_month,
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
