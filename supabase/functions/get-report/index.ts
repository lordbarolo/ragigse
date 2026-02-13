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
    const { report_id } = await req.json();

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
      .single();

    if (error || !report) {
      return new Response(JSON.stringify({ error: "Report not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine access level
    const isPaid = report.status === "paid";
    const isReferralUnlocked = report.referral_unlock_granted === true;

    // Build response based on access level
    const response: Record<string, unknown> = {
      id: report.id,
      status: report.status,
      occupation: report.occupation,
      employment_type: report.employment_type,
      kommun: report.kommun,
      experience: report.experience,
      referral_unlock_granted: isReferralUnlocked,
    };

    if (isPaid || isReferralUnlocked) {
      // Full access
      response.result_json = report.result_json;
      response.access = "full";
    } else {
      // Preview: only expose inputs and partial market data for teaser
      const resultJson = report.result_json as Record<string, unknown> | null;
      if (resultJson) {
        response.result_json = {
          calc_version: resultJson.calc_version,
          inputs: resultJson.inputs,
          // Expose market rate for teaser bar chart
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
