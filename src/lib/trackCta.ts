import { trackEvent } from "@/lib/trackEvent";

/**
 * Lightweight CTA helper. Fires a single `cta_clicked` event with a
 * consistent shape so the admin funnel can group clicks by location/label
 * without needing one custom event per button.
 *
 *   trackCta("landing_nav", "Se din rapport", "/#roles")
 */
export function trackCta(
  location: string,
  label: string,
  destination?: string | null,
  extra?: Record<string, string | number | boolean | null>
) {
  trackEvent("cta_clicked", {
    location,
    label,
    destination: destination ?? null,
    ...(extra || {}),
  });
}
