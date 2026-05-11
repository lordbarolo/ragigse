import posthog from "posthog-js";

const POSTHOG_KEY =
  (import.meta.env.VITE_POSTHOG_KEY as string | undefined) ??
  "phc_AFPm7q5MQPFhR8cNu3LiRapyRaanNZNKWN2hzZrRkDoY";

if (import.meta.env.DEV && !import.meta.env.VITE_POSTHOG_KEY) {
  console.warn(
    "[PostHog] VITE_POSTHOG_KEY saknas — använder fallback. Lägg till nyckeln i Workspace Settings → Build Secrets för att överstyra."
  );
}

posthog.init(POSTHOG_KEY, {
  api_host:
    (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ??
    "https://eu.i.posthog.com",
  ui_host: "https://eu.posthog.com",
  // Cookieless / consent-free setup:
  // - `persistence: "memory"` → no cookies or localStorage, no consent banner required (GDPR/ePrivacy compliant)
  // - `person_profiles: "identified_only"` → no person profile until we call posthog.identify(leadId)
  // Trade-off: distinct_id resets per tab/session, but our funnel is session-scoped and we identify leads.
  person_profiles: "identified_only",
  persistence: "memory",
  capture_pageview: true,
  capture_pageleave: true,
});

// Mark internal traffic with a super property.
// IMPORTANT: Only dev/preview hosts count as internal — the user's *published*
// Lovable URL (e.g. preview--compcare-se.lovable.app) is real production
// traffic and must be tracked. Keep this logic in sync with
// `isInternalTraffic()` in src/lib/trackEvent.ts.
const __hostname = window.location.hostname;
const __isInternal =
  __hostname === "localhost" ||
  __hostname === "127.0.0.1" ||
  __hostname.endsWith(".lovableproject.com") ||
  __hostname.startsWith("id-preview--");
if (__isInternal) {
  posthog.register({ is_internal_traffic: true });
} else {
  // Defensive: clear any stale super-property from a previous visit on a
  // dev host that left `is_internal_traffic=true` in the persisted PostHog
  // state when the same browser later visits production.
  posthog.unregister("is_internal_traffic");
}

if (import.meta.env.DEV) {
  console.log("PostHog loaded:", posthog.get_distinct_id());
}

// Production sanity log — verifies PostHog is active on the live domain
const __host = window.location.hostname;
if (__host === "compcare.se" || __host === "www.compcare.se") {
  console.info(
    "[PostHog] active on",
    __host,
    "distinct_id:",
    posthog.get_distinct_id(),
    "opted_in:",
    posthog.has_opted_in_capturing()
  );
}

export default posthog;
