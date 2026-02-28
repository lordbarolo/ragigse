import { supabase } from "@/integrations/supabase/client";

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
  | "exit_intent_shown";

export function trackEvent(
  eventName: EventName,
  metadata?: Record<string, string | number | boolean | null>
) {
  const leadId = sessionStorage.getItem("leadId") || undefined;
  const reportId = sessionStorage.getItem("reportId") || undefined;
  const abVariant = sessionStorage.getItem("abVariant") || undefined;

  const enrichedMetadata: Record<string, string | number | boolean | null> = {
    ...(metadata ?? {}),
    ...(reportId ? { report_id: reportId } : {}),
    ...(abVariant ? { ab_variant: abVariant } : {}),
  };

  // Fire-and-forget — don't block UI
  supabase
    .from("analytics_events")
    .insert([{
      event_name: eventName,
      lead_id: leadId || null,
      metadata: enrichedMetadata,
    }])
    .then(({ error }) => {
      if (error) console.warn("[trackEvent]", error.message);
    });
}
