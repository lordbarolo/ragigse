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
    const { report_id, auth_user_id } = await req.json();

    if (!report_id) {
      return new Response(JSON.stringify({ error: "Missing report_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: report, error } = await supabase
      .from("reports")
      .select("*")
      .eq("id", report_id)
      .maybeSingle();

    if (error || !report) {
      return new Response(JSON.stringify({ error: "Report not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine access level
    const isPaid = report.status === "paid";
    const isReferralUnlocked = report.unlocked_by_referral === true;
    const isOwner = auth_user_id && report.user_id === auth_user_id;

    // Build response based on access level
    const response: Record<string, unknown> = {
      id: report.id,
      lead_id: report.lead_id || null,
      status: report.status,
      occupation: report.occupation,
      employment_type: report.employment_type,
      kommun: report.kommun,
      experience: report.experience,
      email: report.email,
      ab_variant: report.ab_variant || "A",
      unlocked_by_referral: isReferralUnlocked,
    };

    if (isPaid || isReferralUnlocked) {
      // Full access
      response.result_json = report.result_json;
      response.access = "full";

      // Fetch zone comparisons for the same occupation type
      const resultJson = report.result_json as Record<string, unknown> | null;
      const occupation = report.occupation;

      if (occupation) {
        // Find the rate type matching this occupation
        const { data: matchingRates } = await supabase
          .from("rates")
          .select("yrkeskategori, zon, timpris_kund")
          .eq("yrkeskategori", occupation);

        if (!matchingRates || matchingRates.length === 0) {
          // Try matching by typ instead
          const { data: anyRate } = await supabase
            .from("rates")
            .select("typ")
            .eq("yrkeskategori", occupation)
            .limit(1);

          if (anyRate && anyRate.length > 0) {
            const { data: typeRates } = await supabase
              .from("rates")
              .select("yrkeskategori, zon, timpris_kund")
              .eq("typ", anyRate[0].typ);
            response.zone_comparisons = typeRates || [];
          }
        } else {
          response.zone_comparisons = matchingRates;
        }

        // Also get the user's zone from locations
        if (report.kommun) {
          const { data: loc } = await supabase
            .from("locations")
            .select("zon")
            .eq("kommun", report.kommun)
            .limit(1);
          if (loc && loc.length > 0) {
            response.user_zone = loc[0].zon;
          }
        }
      }
    } else {
      // Preview: only expose inputs and partial market data for teaser
      const resultJson = report.result_json as Record<string, unknown> | null;
      if (resultJson) {
        response.result_json = {
          calc_version: resultJson.calc_version,
          inputs: resultJson.inputs,
          market: resultJson.market,
        };
      }
      response.access = "preview";
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Get report error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
