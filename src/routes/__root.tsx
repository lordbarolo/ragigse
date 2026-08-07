import { useEffect, useRef } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
  useRouter,
  useLocation,
} from "@tanstack/react-router";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import CookieBanner from "@/components/CookieBanner";
import NotFound from "@/pages/NotFound";
import { trackPageview, captureError } from "@/lib/posthog";
import { captureParams } from "@/lib/captureParams";
import { initAuthIdentitySync } from "@/lib/identify";
import { initRageDeadClickTracking } from "@/lib/rageDeadClick";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import appCss from "@/styles.css?url";

// PostHog init snippet — ported verbatim from index.html <head>. Cookie-free
// memory persistence, manual pageviews, URL redaction, ph-proxy transport.
const POSTHOG_SNIPPET = `!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

(function () {
  var SENSITIVE = ["/sign","/samarbetsintyg","/verify","/dela","/dokument","/intyg","/profil","/ping","/reset-password","/r/"];
  var UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
  var HEX_RE = /[0-9a-f]{24,}/gi;
  function redact(value) {
    if (typeof value !== "string") return value;
    var out = value;
    try {
      var url = new URL(out, "https://x.local");
      var path = url.pathname;
      var hit = SENSITIVE.some(function (p) { return path === p || path.indexOf(p + "/") === 0; });
      if (hit) {
        url.pathname = path.replace(/\\/[^/]+$/, "/[redacted]");
        url.search = "";
        out = value.charAt(0) === "/" ? url.pathname : url.toString();
      }
    } catch (e) { /* not a URL */ }
    return out.replace(UUID_RE, "[uuid]").replace(HEX_RE, "[token]");
  }

  var h = window.location.hostname;
  var isInternal =
    h === "localhost" ||
    h === "127.0.0.1" ||
    h.slice(-20) === ".lovableproject.com" ||
    h.indexOf("id-preview--") === 0;

  window.posthog.init("phc_AFPm7q5MQPFhR8cNu3LiRapyRaanNZNKWN2hzZrRkDoY", {
    api_host: "https://ubhhlunhdqbokjvwfebb.supabase.co/functions/v1/ph-proxy",
    ui_host: "https://eu.posthog.com",
    persistence: "memory",
    opt_out_capturing_by_default: false,
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    disable_session_recording: true,
    loaded: function (ph) {
      ph.register({ $ip: null, is_internal_traffic: isInternal });
    },
    before_send: function (event) {
      if (!event) return event;
      var props = event.properties || {};
      var keys = ["$current_url","$pathname","$referrer","$initial_current_url","$initial_pathname","$initial_referrer"];
      for (var i = 0; i < keys.length; i++) {
        if (keys[i] in props) props[keys[i]] = redact(props[keys[i]]);
      }
      event.properties = props;
      return event;
    }
  });
  window.posthog.register({ $ip: null, is_internal_traffic: isInternal });
})();`;

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      { name: "theme-color", content: "#00D2E6" },
      { title: "vårdbemanning.ai – Lön & ramavtalspriser för vårdkonsulter" },
      {
        name: "description",
        content:
          "Jämför ditt erbjudande mot SKR:s ramavtalspriser i 290 kommuner. Gratis löneanalys för sjuksköterskor, barnmorskor och läkare.",
      },
      { name: "author", content: "vårdbemanning.ai" },
      { name: "google-site-verification", content: "pxkpIKa72d27kXJKDNy3NyavUthWqbvbZUbD1JHYLs0" },
      { property: "og:title", content: "vårdbemanning.ai – Lön & ramavtalspriser för vårdkonsulter" },
      {
        property: "og:description",
        content: "Jämför din ersättning mot offentliga ramavtalspriser. Anonymt och kostnadsfritt.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://vardbemanning.ai/" },
      { property: "og:locale", content: "sv_SE" },
      { property: "og:site_name", content: "vårdbemanning.ai" },
      { property: "og:image", content: "https://vardbemanning.ai/vardbemanning-og.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Vad betalar regionen för din kompetens?" },
      {
        name: "twitter:description",
        content: "Jämför din ersättning mot offentliga ramavtalspriser. Anonymt och kostnadsfritt.",
      },
      { name: "twitter:image", content: "https://vardbemanning.ai/vardbemanning-og.png" },
      { name: "robots", content: "index, follow" },
      { name: "msapplication-TileImage", content: "/mstile-270x270.png" },
      { name: "msapplication-TileColor", content: "#00D2E6" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Libre+Baskerville:wght@400;700&family=JetBrains+Mono:wght@400;500;700&display=swap",
      },
      { rel: "preconnect", href: "https://ubhhlunhdqbokjvwfebb.supabase.co", crossOrigin: "anonymous" },
      { rel: "preconnect", href: "https://eu.i.posthog.com", crossOrigin: "anonymous" },
      { rel: "dns-prefetch", href: "https://eu-assets.i.posthog.com" },
      { rel: "icon", href: "/favicon.ico", sizes: "48x48" },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
      { rel: "icon", type: "image/png", sizes: "48x48", href: "/favicon-48x48.png" },
      { rel: "icon", type: "image/png", sizes: "96x96", href: "/favicon-96x96.png" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/favicon-192x192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/favicon-512x512.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "mask-icon", href: "/safari-pinned-tab.svg", color: "#1D8F5C" },

    ],
    scripts: [
      { children: POSTHOG_SNIPPET },
      {
        id: "vtag-ai-js",
        async: true,
        src: "https://r2.leadsy.ai/tag.js",
        "data-pid": "2rrd2pKYIeTK5z2C",
        "data-version": "062024",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFound,
  errorComponent: RootErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

// Ported from App.tsx's <ScrollToTop /> — scroll reset, a11y focus and manual
// PostHog pageviews on every route change.
function ScrollToTop() {
  const { pathname } = useLocation();
  const isFirstRender = useRef(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!isFirstRender.current) {
      const main = document.getElementById("main-content");
      if (main) main.focus({ preventScroll: true });
    } else {
      isFirstRender.current = false;
    }
    trackPageview();
  }, [pathname]);

  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  // ported from main.tsx — browser-only init + global error reporting
  useEffect(() => {
    captureParams();
    initAuthIdentitySync();
    initRageDeadClickTracking();

    const onError = (event: ErrorEvent) => {
      captureError(event.error ?? event.message, {
        source: "window.onerror",
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      captureError(event.reason, { source: "unhandledrejection" });
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return (
    <>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <ScrollToTop />
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg"
            >
              Hoppa till innehåll
            </a>
            <main id="main-content" role="main" tabIndex={-1} aria-label="Huvudinnehåll">
              <Outlet />
            </main>
            <CookieBanner />
          </TooltipProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </>
  );
}

function RootErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-xl font-bold text-foreground">Sidan kunde inte laddas</h1>
        <p className="text-sm text-muted-foreground">
          Något gick fel på vår sida. Försök igen eller gå tillbaka till startsidan.
        </p>
        <div className="flex justify-center gap-3">
          <button
            className="text-sm font-semibold px-6 py-3 rounded-md bg-primary text-primary-foreground"
            onClick={() => {
              reset();
              router.invalidate();
            }}
          >
            Försök igen
          </button>
          <a
            href="/"
            className="text-sm font-semibold px-6 py-3 rounded-md border border-border text-foreground"
          >
            Till startsidan
          </a>
        </div>
      </div>
    </div>
  );
}
