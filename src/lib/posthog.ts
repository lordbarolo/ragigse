import { getConsent } from "@/lib/cookieConsent";

/**
 * PostHog laddas och initieras i <head> via snippet i index.html
 * (se kommentaren där). Denna modul initierar därför INGET själv — den
 * exponerar bara den redan initierade instansen på `window.posthog` plus
 * våra hjälpfunktioner.
 *
 * Konfigurationen (cookie-fri memory-persistence, autocapture av, manuella
 * pageviews, ingen session recording, $ip null, URL-redaktion, ph-proxy)
 * bor i index.html och skyddas av `posthog.cookieless.test.ts`.
 */

type PostHogLike = {
  capture: (event: string, properties?: Record<string, unknown>) => void;
  captureException: (error: Error, context?: Record<string, unknown>) => void;
  identify: (id?: string, props?: Record<string, unknown>) => void;
  alias: (alias: string, original?: string) => void;
  register: (props: Record<string, unknown>) => void;
  setPersonProperties: (
    props?: Record<string, unknown>,
    propsOnce?: Record<string, unknown>
  ) => void;
  isFeatureEnabled?: (key: string) => boolean | undefined;
  reset: (resetDeviceId?: boolean) => void;

  set_config: (config: Record<string, unknown>) => void;
  opt_in_capturing: () => void;
  opt_out_capturing: () => void;
  get_distinct_id: () => string | undefined;
  [key: string]: unknown;
};

const NOOP_METHODS = [
  "capture",
  "captureException",
  "identify",
  "alias",
  "register",
  "setPersonProperties",
  "reset",
  "set_config",
  "opt_in_capturing",
  "opt_out_capturing",
] as const;

/**
 * Fallback om snippeten inte hunnit köra (t.ex. i tester/SSR-liknande miljöer).
 * Head-snippeten sätter `window.posthog` synkront före appens bundle, så i
 * webbläsaren används alltid den riktiga instansen.
 */
function createStub(): PostHogLike {
  const stub = { get_distinct_id: () => undefined } as unknown as PostHogLike;
  for (const m of NOOP_METHODS) {
    (stub as Record<string, unknown>)[m] = () => undefined;
  }
  return stub;
}

const w = typeof window !== "undefined"
  ? (window as unknown as { posthog?: PostHogLike })
  : undefined;

if (w && !w.posthog) {
  // Snippeten saknas — logga i dev så det upptäcks direkt.
  if (import.meta.env.DEV) {
    console.warn("[PostHog] window.posthog saknas — head-snippeten i index.html kördes inte.");
  }
  w.posthog = createStub();
}

const posthog: PostHogLike = w?.posthog ?? createStub();

// build-marker:COMPCARE_BUILD_20260621_A — used to verify deploy pipeline picked up latest source
if (typeof window !== "undefined") {
  (window as unknown as { __COMPCARE_BUILD__?: string }).__COMPCARE_BUILD__ =
    "COMPCARE_BUILD_20260621_A";
}

if (import.meta.env.DEV) {
  console.log("PostHog loaded:", posthog.get_distinct_id());
}

// Production sanity log — verifies PostHog is active on the live domain
if (typeof window !== "undefined") {
  const host = window.location.hostname;
  if (host === "compcare.se" || host === "www.compcare.se") {
    console.info("[PostHog] active on", host, "distinct_id:", posthog.get_distinct_id());
  }
}

/**
 * Aktivera eller stäng av PostHog-persistens baserat på cookie-samtycke.
 * Vid accept uppgraderas lagringen till localStorage+cookie så distinct_id
 * återanvänds mellan sessioner. Vid avslag återställs memory + opt-out.
 */
export function applyAnalyticsConsent(accepted: boolean) {
  try {
    if (accepted) {
      posthog.set_config({ persistence: "localStorage+cookie" });
      posthog.opt_in_capturing();
    } else {
      posthog.opt_out_capturing();
      posthog.set_config({ persistence: "memory" });
    }
  } catch {
    /* swallow */
  }
}

if (getConsent() === "accepted") {
  applyAnalyticsConsent(true);
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
