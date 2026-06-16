import posthog from "posthog-js";

const POSTHOG_KEY =
  (import.meta.env.VITE_POSTHOG_KEY as string | undefined) ??
  "phc_AFPm7q5MQPFhR8cNu3LiRapyRaanNZNKWN2hzZrRkDoY";

if (import.meta.env.DEV && !import.meta.env.VITE_POSTHOG_KEY) {
  console.warn(
    "[PostHog] VITE_POSTHOG_KEY saknas — använder fallback. Lägg till nyckeln i Workspace Settings → Build Secrets för att överstyra."
  );
}

// Token/UUID redactor for sensitive URL paths (samarbetsintyg, signing,
// document shares, password reset, ref pings, public profiles…).
// We never want raw tokens or UUIDs leaving the browser via analytics.
const SENSITIVE_PATH_PREFIXES = [
  "/sign",
  "/samarbetsintyg",
  "/verify",
  "/dela",
  "/dokument",
  "/intyg",
  "/profil",
  "/ping",
  "/reset-password",
  "/r/", // referral landing
];
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const HEX_TOKEN_RE = /[0-9a-f]{24,}/gi;

function redactSensitiveUrl(value: unknown): unknown {
  if (typeof value !== "string") return value;
  let out = value;
  try {
    // If it's a URL, only operate on pathname+search
    const url = new URL(out, "https://x.local");
    const path = url.pathname;
    const needsRedact = SENSITIVE_PATH_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
    if (needsRedact) {
      url.pathname = path.replace(/\/[^/]+$/, "/[redacted]");
      url.search = "";
      out = value.startsWith("/") ? url.pathname : url.toString();
    }
  } catch { /* not a URL — fall through */ }
  out = out.replace(UUID_RE, "[uuid]").replace(HEX_TOKEN_RE, "[token]");
  return out;
}

// Reverse-proxy via vår egen Edge Function så adblockers inte blockerar anropen.
// Klienten skickar till `<supabase>/functions/v1/ph-proxy/*` och funktionen
// forwardar vidare till eu.i.posthog.com / eu-assets.i.posthog.com.
const __SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";
const __DEFAULT_PH_HOST = __SUPABASE_URL
  ? `${__SUPABASE_URL.replace(/\/$/, "")}/functions/v1/ph-proxy`
  : "https://eu.i.posthog.com";

posthog.init(POSTHOG_KEY, {
  api_host:
    (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ??
    __DEFAULT_PH_HOST,
  ui_host: "https://eu.posthog.com",
  persistence: "memory",           // Inga cookies eller localStorage
  autocapture: false,                // Stäng av automatisk event-capture
  capture_pageview: false,           // Vi hanterar pageviews manuellt
  capture_pageleave: false,
  disable_session_recording: true,
  loaded: (ph) => {
    // Spåra aldrig IP-adresser
    ph.register({ $ip: null });
  },
  before_send: (event) => {
    if (!event) return event;
    const props = event.properties || {};
    for (const k of ["$current_url", "$pathname", "$referrer", "$initial_current_url", "$initial_pathname", "$initial_referrer"]) {
      if (k in props) props[k] = redactSensitiveUrl(props[k]);
    }
    event.properties = props;
    return event;
  },
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
    posthog.get_distinct_id()
  );
}

export function trackPageview() {
  posthog.capture("$pageview");
}

export function trackEvent(event: string, properties?: Record<string, unknown>) {
  posthog.capture(event, properties);
}

/**
 * Skicka ett fångat fel till PostHog Error Tracking.
 * Tål allt (Error, string, unknown) och kraschar aldrig själv.
 */
export function captureError(error: unknown, context?: Record<string, unknown>) {
  try {
    const err =
      error instanceof Error
        ? error
        : new Error(typeof error === "string" ? error : JSON.stringify(error));
    posthog.captureException(err, context ?? {});
  } catch (e) {
    if (import.meta.env.DEV) console.warn("[captureError] failed", e);
  }
}

export default posthog;
