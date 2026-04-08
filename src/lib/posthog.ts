import posthog from "posthog-js";
import { getConsent } from "@/lib/cookieConsent";

posthog.init("phc_GiBn5CBOm72IrzgsdQRuUcK2mujk5Q0ZeI6hs8ixvwv", {
  api_host: "https://eu.i.posthog.com",
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

export default posthog;
