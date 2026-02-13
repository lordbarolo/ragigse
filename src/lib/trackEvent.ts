import { supabase } from "@/integrations/supabase/client";

type EventName =
  | "teaser_viewed"
  | "checkout_started"
  | "referral_sent"
  | "referral_confirmed"
  | "exit_intent_shown";

export function trackEvent(
  eventName: EventName,
  metadata?: Record<string, string | number | boolean | null>
) {
  const leadId = sessionStorage.getItem("leadId") || undefined;

  // Fire-and-forget — don't block UI
  supabase
    .from("analytics_events")
    .insert([{
      event_name: eventName,
      lead_id: leadId || null,
      metadata: metadata ?? {},
    }])
    .then(({ error }) => {
      if (error) console.warn("[trackEvent]", error.message);
    });
}
