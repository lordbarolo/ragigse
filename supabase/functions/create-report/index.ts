import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  calculateSalaryRange,
  monthlyDelta,
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
    const body = await req.json();
    const {
      lead_id,
      email,
      occupation,
      employment_type,
      kommun,
      experience,
      current_salary,
      salary_type,
      ob_share,
    } = body;

    // Audit logging
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    console.log(`[AUDIT] create-report | ip=${clientIp} | occupation=${occupation} | kommun=${kommun} | lead_id=${lead_id || "none"}`);

    if (!occupation || !employment_type || !kommun) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Price A/B test: 50/50 split between 49kr and 29kr
    const abVariant = Math.random() < 0.5 ? "price_49" : "price_29";

    // ── CONSULTANT TRACK (always — every analysis targets consultant rates) ───

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

    const m = model ?? { share_min: 0.85, share_max: 0.90, employer_factor: 1.42, hours_per_month: 167 };

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

    // Calculate using shared module with DB model
    const empType = employment_type as EmploymentType;
    // For foretagare: 8-15% margin (85-92% to consultant)
    const FORETAGARE_SHARE_MIN = 0.85;
    const FORETAGARE_SHARE_MAX = 0.92;
    const effectiveModel: MarginModel | undefined = model
      ? (empType === "foretagare"
        ? { ...model, share_min: FORETAGARE_SHARE_MIN, share_max: FORETAGARE_SHARE_MAX }
        : model)
      : (empType === "foretagare"
        ? { share_min: FORETAGARE_SHARE_MIN, share_max: FORETAGARE_SHARE_MAX, employer_factor: 1.42, hours_per_month: 167 }
        : undefined);
    const effectiveM = effectiveModel ?? m;
    const range = calculateSalaryRange(timprisKund, empType, effectiveModel);
    const factor = empType === "anstalld" ? effectiveM.employer_factor : 1;

    const currentMonthly =
      salary_type === "hourly"
        ? (current_salary || 0) * m.hours_per_month
        : current_salary || 0;

    const delta = monthlyDelta(range, currentMonthly);

    const resultJson = {
      calc_version: "v1",
      track: "consultant",
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
        consultant_share_min: effectiveM.share_min,
        consultant_share_max: effectiveM.share_max,
        employee_factor: factor,
        recommended_hourly_min: range.hourly_min,
        recommended_hourly_max: range.hourly_max,
        recommended_monthly_min: range.monthly_min,
        recommended_monthly_max: range.monthly_max,
        hours_per_month: m.hours_per_month,
      },
      delta: {
        monthly_vs_current_min: delta.min,
        monthly_vs_current_max: delta.max,
      },
    };

    // Insert report
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .insert({
        lead_id: lead_id || null,
        email: email || null,
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

    // Schedule followup drip emails if we have an email
    if (email && lead_id) {
      const now = new Date();
      const emails = [
        { sequence_step: 1, scheduled_for: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString() },
        { sequence_step: 2, scheduled_for: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() },
        { sequence_step: 3, scheduled_for: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString() },
      ];
      await supabase.from("followup_emails").insert(
        emails.map((e) => ({
          lead_id,
          report_id: report.id,
          email,
          ...e,
        }))
      );
      console.log(`Scheduled ${emails.length} followup emails for ${email}`);
    }

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
