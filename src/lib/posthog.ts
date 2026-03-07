import posthog from "posthog-js";

const POSTHOG_KEY = "phc_JD12v8i6S6QUMbiNAcxOcrm7lVX4iQTWCyBgOf6zuYG";
const POSTHOG_HOST = "https://eu.i.posthog.com";

export function initPostHog() {
  if (typeof window === "undefined") return;

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    persistence: "localStorage+cookie",
  });
}

export { posthog };
