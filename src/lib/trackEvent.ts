import { supabase } from "@/integrations/supabase/client";
import posthog from "@/lib/posthog";
import { getUtmParams, getCouponCode } from "@/lib/captureParams";


type EventName =
  | "landing_viewed"
  | "faktasidor_viewed"
  | "faktasidor_export_clicked"
  | "survey_started"
  | "survey_step_completed"
  | "survey_completed"
  | "teaser_viewed"
  | "teaser_page_viewed"
  | "teaser_scrolled"
  | "report_viewed"
  | "referral_sent"
  | "referral_confirmed"
  | "referral_unlock_shown"
  | "exit_intent_shown"
  | "coupon_redeemed"
  | "report_section_viewed"
  | "invoice_review_opted_in"
  | "survey_step_viewed"
  | "email_collected"
  | "free_report_unlocked"
  | "report_feedback"
  | "report_feedback_comment"
  | "time_on_page"
  | "diagnosis_shown"
  | "income_impact_shown"
  | "email_gate_viewed"
  | "email_submitted"
  | "signup_gate_viewed"
  | "analysis_started"
  | "analysis_email_pause"
  | "analysis_completed"
  | "share_preview_cta_clicked"
  | "pdf_downloaded"
  | "negotiation_started"
  | "negotiation_message_sent"
  | "negotiation_advice_received"
  | "reijdar_chat_started"
  | "reijdar_message_sent"
  | "reijdar_advice_received"
  | "fakturakontroll_page_viewed"
  | "referenser_info_viewed"
  | "verify_info_viewed"
  | "login_clicked"
  | "login_succeeded"
  | "login_failed"
  | "signup_completed"
  | "signup_initiated"
  | "signup_confirmed"
  | "reidar_clicked"
  | "product_page_viewed"
  | "product_cta_clicked"
  | "survey_question_selected"
  | "survey_custom_question_submitted"
  | "b2b_landing_viewed"
  | "fakturakontroll_interest_submitted"
  | "negotiation_email_gate_completed"
  | "chat_answer_reported"
  | "fakturakontroll_ny_viewed"
  | "fakturakontroll_uploaded"
  | "fakturakontroll_confirmed"
  | "fakturakontroll_completed"
  | "intyg_dashboard_viewed"
  | "intyg_create_opened"
  | "intyg_ai_extract_run"
  | "intyg_create_submitted"
  | "intyg_link_copied"
  | "intyg_sign_page_viewed"
  | "intyg_sign_confirmed"
  | "assignment_feedback_shown"
  | "assignment_feedback_snoozed"
  | "assignment_feedback_submitted"
  | "survey_prefill_failed"
  | "hero_cta_clicked"
  | "survey_mounted"
  | "price_range_mismatch"
  | "other_role_requested"
  | "cta_clicked"
  | "rage_click"
  | "dead_click"
  | "survey_abandoned"
  | "lonekoll_email_gate_completed"
  | "lonekoll_topic_selected"
  | "lonekoll_question_selected"
  | "lonekoll_answer_reported"
  | "lonekoll_missing_question_reported";

function isInternalTraffic(): boolean {
  const host = window.location.hostname;
  // Dev/preview hosts only. The user's *published* Lovable URL
  // (preview--compcare-se.lovable.app) is real production traffic.
  // Keep this in sync with src/lib/posthog.ts.
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".lovableproject.com") ||
    host.startsWith("id-preview--")
  );
}

export function trackEvent(
  eventName: EventName,
  metadata?: Record<string, string | number | boolean | null>
) {
  if (isInternalTraffic()) return;

  const leadId = sessionStorage.getItem("leadId") || undefined;

  const reportId = sessionStorage.getItem("reportId") || undefined;
  const abVariant = sessionStorage.getItem("abVariant") || undefined;
  const utm = getUtmParams();
  const couponCode = getCouponCode();

  const enrichedMetadata: Record<string, unknown> = {
    ...(metadata ?? {}),
    hostname: window.location.hostname,
    is_internal_traffic: isInternalTraffic(),
    ...(reportId ? { report_id: reportId } : {}),
    ...(abVariant ? { ab_variant: abVariant } : {}),
    ...(couponCode ? { coupon_code: couponCode } : {}),
    ...(utm ? { utm } : {}),
  };

  // Cookie-fri analytics: PostHog kör persistence:"memory" (inga cookies/localStorage).
  // Det är GDPR-säkert att fånga anonyma events utan samtycke. Vid avslag respekterar
  // vi det dock explicit och skickar ingenting.
  try {
    if (window.localStorage?.getItem("compcare_cookie_consent") === "rejected") return;
  } catch { /* localStorage kan vara blockerad — fortsätt ändå, vi spårar cookieless */ }

  // Send to PostHog (silent fail)
  try { posthog.capture(eventName, enrichedMetadata); } catch { /* silent */ }

  // Fire-and-forget via edge function — don't block UI
  supabase.functions
    .invoke("track-event", {
      body: {
        event_name: eventName,
        lead_id: leadId || null,
        metadata: enrichedMetadata,
      },
    })
    .then(({ error }) => {
      if (error) console.warn("[trackEvent]", error.message);
    });
}
