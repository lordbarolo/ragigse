import posthog from "posthog-js";
import { getConsent } from "@/lib/cookieConsent";

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
  opt_out_capturing_by_default: true,
  capture_pageview: false,
  capture_pageleave: true,
  cross_subdomain_cookie: true,
});

// Mark internal traffic with a super property
if (
  window.location.hostname === "localhost" ||
  window.location.hostname.includes("lovable")
) {
  posthog.register({ is_internal_traffic: true });
}

// Sync with any existing cookie consent on load
const existing = getConsent();
if (existing === "accepted") {
  posthog.opt_in_capturing();
} else if (existing === "rejected") {
  posthog.opt_out_capturing();
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
