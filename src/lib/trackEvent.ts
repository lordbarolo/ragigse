import { supabase } from "@/integrations/supabase/client";
import { posthog } from "@/lib/posthog";
import { getUtmParams, getCouponCode } from "@/lib/captureParams";

function isInternalTraffic(): boolean {
  try {
    const h = window.location.hostname;
    if (h === "localhost" || h === "127.0.0.1") return true;
    if (h.endsWith(".lovableproject.com")) return true;
    if (h.endsWith(".lovable.app") && h.includes("-preview--")) return true;
  } catch { /* SSR safety */ }
  return false;
}

type EventName =
  | "landing_viewed"
  | "survey_started"
  | "survey_step_completed"
  | "survey_completed"
  | "teaser_viewed"
  | "checkout_started"
  | "payment_verified"
  | "report_viewed"
  | "referral_sent"
  | "referral_confirmed"
  | "referral_unlock_shown"
  | "exit_intent_shown"
  | "coupon_redeemed"
  | "paywall_viewed"
  | "paywall_scrolled"
  | "paywall_cta_clicked"
  | "payment_completed"
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
  | "reijdar_advice_received";

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
    ...(reportId ? { report_id: reportId } : {}),
    ...(abVariant ? { ab_variant: abVariant } : {}),
    ...(couponCode ? { coupon_code: couponCode } : {}),
    ...(utm ? { utm } : {}),
  };

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
