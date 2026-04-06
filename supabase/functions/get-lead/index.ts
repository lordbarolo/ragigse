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
    const { lead_id, external_id } = await req.json();

    if (!lead_id && !external_id) {
      return new Response(
        JSON.stringify({ error: "Missing lead_id or external_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate lead_id is a valid UUID to prevent enumeration
    if (lead_id) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (typeof lead_id !== "string" || !uuidRegex.test(lead_id)) {
        return new Response(
          JSON.stringify({ error: "Invalid lead_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Validate external_id length
    if (external_id && (typeof external_id !== "string" || external_id.length > 100)) {
      return new Response(
        JSON.stringify({ error: "Invalid external_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch lead by id or external_id
    let query = supabase
      .from("leads")
      .select("id, employment_type, yrke, kommun, experience, salary_type, current_salary, email");

    if (lead_id) {
      query = query.eq("id", lead_id);
    } else {
      query = query.eq("external_id", external_id);
    }

    const { data: lead, error: leadError } = await query.maybeSingle();

    if (leadError) {
      console.error("Failed to fetch lead:", leadError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch lead" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!lead) {
      return new Response(
        JSON.stringify({ error: "Lead not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the most recent report for this lead — never return full result_json here
    const { data: report } = await supabase
      .from("reports")
      .select("id, ab_variant, status, unlocked_by_referral")
      .eq("lead_id", lead_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        lead,
        report_id: report?.id || null,
        ab_variant: report?.ab_variant || "A",
        report_status: report?.status || null,
        unlocked_by_referral: report?.unlocked_by_referral || false,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Get lead error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
