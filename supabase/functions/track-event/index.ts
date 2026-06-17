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
  "signup_initiated",
  "signup_confirmed",
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
  "intyg_dashboard_viewed",
  "intyg_create_opened",
  "intyg_ai_extract_run",
  "intyg_create_submitted",
  "intyg_link_copied",
  "intyg_sign_page_viewed",
  "intyg_sign_confirmed",
  "assignment_feedback_shown",
  "assignment_feedback_snoozed",
  "assignment_feedback_submitted",
  "survey_prefill_failed",
  "hero_cta_clicked",
  "survey_mounted",
  "price_range_mismatch",
]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const userAgent = req.headers.get("user-agent") || null;
  const origin = req.headers.get("origin") || null;
  const referer = req.headers.get("referer") || null;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const logRejection = async (
    reason: string,
    event_name: string | null,
    lead_id: string | null,
    metadata: unknown
  ) => {
    console.warn("[track-event] rejected", {
      reason,
      event_name,
      lead_id,
      origin,
      referer,
      user_agent: userAgent,
      client_ip: clientIp,
    });
    try {
      await supabase.from("analytics_event_rejections").insert([{
        reason,
        event_name,
        lead_id: lead_id ? String(lead_id).slice(0, 100) : null,
        client_ip: clientIp,
        user_agent: userAgent,
        origin,
        referer,
        metadata: (metadata && typeof metadata === "object") ? metadata as object : null,
      }]);
    } catch (e) {
      console.error("[track-event] failed to log rejection", e);
    }
  };

  try {
    // Rate limit: 60 requests/hour per IP
    const rl = await checkRateLimit(supabase, "track-event", clientIp, 60);
    if (!rl.allowed) {
      await logRejection("rate_limited", null, null, { limit: 60 });
      return rateLimitResponse(rl, corsHeaders);
    }

    let body: any;
    try {
      body = await req.json();
    } catch (e) {
      await logRejection("invalid_json", null, null, { error: String(e) });
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { event_name, lead_id, metadata } = body || {};

    if (!event_name) {
      await logRejection("missing_event_name", null, lead_id ?? null, metadata);
      return new Response(
        JSON.stringify({ error: "Missing event_name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof event_name !== "string") {
      await logRejection("invalid_event_name_type", null, lead_id ?? null, { typeof: typeof event_name });
      return new Response(
        JSON.stringify({ error: "event_name must be a string" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!ALLOWED_EVENTS.has(event_name)) {
      await logRejection("unknown_event_name", event_name, lead_id ?? null, metadata);
      return new Response(
        JSON.stringify({ error: "Unknown event_name", event_name }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate lead_id format if provided
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validLeadId = lead_id && uuidRegex.test(lead_id) ? lead_id : null;
    if (lead_id && !validLeadId) {
      // Not fatal — we still record the event, but log the malformed id for visibility.
      await logRejection("invalid_lead_id_format", event_name, String(lead_id).slice(0, 100), metadata);
    }

    // Anonymous daily visitor hash: sha256(salt + ip + ua + YYYY-MM-DD).
    // Roterar varje dygn → kan inte spåra individer över tid och kräver
    // inget cookie-samtycke (ingen cookie sätts, ingen PII lagras).
    let visitor_day_hash: string | null = null;
    try {
      const { data: saltRow, error: saltErr } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "visitor_hash_salt")
        .maybeSingle();
      if (saltErr) console.warn("[track-event] salt fetch error", saltErr);
      const rawSalt = saltRow?.value;
      const salt = typeof rawSalt === "string" ? rawSalt : (rawSalt == null ? "" : String(rawSalt));
      console.log("[track-event] hash inputs", { has_salt: !!salt, salt_len: salt.length, ip: clientIp });
      if (salt && clientIp && clientIp !== "unknown") {
        const day = new Date().toISOString().slice(0, 10);
        const raw = `${salt}|${clientIp}|${userAgent ?? ""}|${day}`;
        const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
        visitor_day_hash = Array.from(new Uint8Array(buf))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      }
    } catch (e) {
      console.warn("[track-event] visitor_day_hash failed", e);
    }


    const { error } = await supabase
      .from("analytics_events")
      .insert([{
        event_name,
        lead_id: validLeadId,
        metadata: metadata || null,
        visitor_day_hash,
      }]);

    if (error) {
      console.error("[track-event] insert error:", error);
      await logRejection("insert_failed", event_name, validLeadId, { db_error: error.message });
      return new Response(
        JSON.stringify({ error: "Failed to track event" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }


    return new Response(
      JSON.stringify({ ok: true, debug_hash: visitor_day_hash ? visitor_day_hash.slice(0,8) : null, debug_ip: clientIp }),
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
