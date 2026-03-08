import { supabase } from "@/integrations/supabase/client";
import { posthog, isPostHogReady } from "@/lib/posthog";
import { getUtmParams, getCouponCode } from "@/lib/captureParams";

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
  | "time_on_page";

export function trackEvent(
  eventName: EventName,
  metadata?: Record<string, string | number | boolean | null>
) {
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

  // Send to PostHog (silent if not initialized)
  if (isPostHogReady()) {
    try { posthog.capture(eventName, enrichedMetadata); } catch { /* silent */ }
  }

  // Fire-and-forget to DB — don't block UI
  supabase
    .from("analytics_events")
    .insert([{
      event_name: eventName,
      lead_id: leadId || null,
      metadata: enrichedMetadata as Record<string, string | number | boolean | null>,
    }])
    .then(({ error }) => {
      if (error) console.warn("[trackEvent]", error.message);
    });
}
