---
name: Tracking coverage requirement
description: Each landing page on /, /b2b etc must fire a *_viewed event on mount, otherwise PostHog/analytics_events go silent
type: preference
---

Varje publik landningssida (det som ligger på `/`, `/b2b`, `/for-bemanningsforetag`, eller någon annan rot-route) MÅSTE fyra ett namngivet `*_viewed`-event på mount via `trackEvent(...)`, annars dyker varken PostHog `landing_viewed` eller raden i `analytics_events` upp.

**Why:** När huvudsidan `/` byttes från `SalaryCheck` → `LandingV2` (april 2026) flyttades inte `trackEvent("landing_viewed")` med, vilket gjorde att DB:n hade 0 nya events i 3 dagar trots att Lovable-analytics rapporterade besökare. Det såg ut som att "PostHog var nere" — det var det inte; spårningen anropades aldrig.

**How to apply:**
1. När en ny landningssida läggs till på en rot-route i `src/App.tsx`, lägg in följande i komponentens topp:
   ```ts
   useTimeOnPage("<page-key>");
   useEffect(() => { trackEvent("<unique_event>"); }, []);
   ```
2. Lägg till eventnamnet i BÅDE:
   - `EventName`-typen i `src/lib/trackEvent.ts`
   - `ALLOWED_EVENTS` i `supabase/functions/track-event/index.ts`
3. Verifiera efter deploy: `SELECT count(*) FROM analytics_events WHERE created_at > now() - interval '5 minutes';` ska vara > 0 inom någon minut av att en besökare öppnar sidan i inkognito + accepterar cookies.

`App.tsx` har redan en global `posthog.capture('$pageview')` på route-byte i `ScrollToTop` — den fungerar som safety-net för PostHog men skriver INTE till `analytics_events`. Funnel-analysen i admin kräver de namngivna `*_viewed`-eventen.
