import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_EVENTS = new Set([
  "landing_viewed",
  "survey_started",
  "survey_step_completed",
  "survey_completed",
  "teaser_viewed",
  "teaser_page_viewed",
  "teaser_scrolled",
  "report_viewed",
  "referral_sent",
  "referral_confirmed",
  "referral_unlock_shown",
  "exit_intent_shown",
  "coupon_redeemed",
  "report_section_viewed",
  "invoice_review_opted_in",
  "survey_step_viewed",
  "email_collected",
  "free_report_unlocked",
  "report_feedback",
  "report_feedback_comment",
  "time_on_page",
  "diagnosis_shown",
  "income_impact_shown",
  "email_gate_viewed",
  "email_submitted",
  "analysis_started",
  "analysis_email_pause",
  "analysis_completed",
  "share_preview_cta_clicked",
  "pdf_downloaded",
  "negotiation_started",
  "negotiation_message_sent",
  "negotiation_advice_received",
  "reijdar_chat_started",
  "reijdar_message_sent",
  "reijdar_advice_received",
  "fakturakontroll_page_viewed",
  "referenser_info_viewed",
  "verify_info_viewed",
  "login_clicked",
  "login_succeeded",
  "login_failed",
  "signup_completed",
  "reidar_clicked",
  "product_page_viewed",
  "product_cta_clicked",
  "survey_question_selected",
  "survey_custom_question_submitted",
  "b2b_landing_viewed",
  "fakturakontroll_interest_submitted",
  "negotiation_email_gate_completed",
  "chat_answer_reported",
  "fakturakontroll_ny_viewed",
  "fakturakontroll_uploaded",
  "fakturakontroll_confirmed",
  "fakturakontroll_completed",
]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Rate limit: 60 requests/hour per IP
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = await checkRateLimit(supabase, "track-event", clientIp, 60);
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    const { event_name, lead_id, metadata } = await req.json();

    if (!event_name || !ALLOWED_EVENTS.has(event_name)) {
      return new Response(
        JSON.stringify({ error: "Invalid event_name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate lead_id format if provided
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validLeadId = lead_id && uuidRegex.test(lead_id) ? lead_id : null;

    const { error } = await supabase
      .from("analytics_events")
      .insert([{
        event_name,
        lead_id: validLeadId,
        metadata: metadata || null,
      }]);

    if (error) {
      console.error("[track-event] insert error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to track event" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[track-event] error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
