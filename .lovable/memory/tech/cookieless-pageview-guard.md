---
name: Cookieless pageview tracking guard
description: Cookieless PostHog config is locked. Guard tests block regressions on persistence, autocapture, pageviews, IP.
type: constraint
---

**Lås på cookie-fri sidvisningsspårning.** PostHog körs i memory-läge utan cookies/localStorage. Detta är kärnan i CompCares integritetsposition (se Privacy Policy 2026) och får aldrig byggas bort.

**Skyddet:**
- `src/lib/posthog.cookieless.test.ts` — statisk källkodskontroll av `src/lib/posthog.ts`:
  - `persistence: "memory"` (aldrig `"localStorage"` eller `"cookie"`)
  - `autocapture: false`
  - `capture_pageview: false` + `capture_pageleave: false` (manuell pageview via `trackPageview`)
  - `disable_session_recording: true`
  - `$ip: null` registrerad
  - `trackPageview` exporterad och anropar `$pageview`
  - `src/App.tsx` `ScrollToTop` anropar `trackPageview()` vid varje route-byte
- `src/lib/trackEvent.cookieless.test.ts` — runtime-test att events går till både PostHog och `track-event` edge function utan cookies.

**Vid ändring av posthog.ts:** kör `bunx vitest run src/lib/posthog.cookieless.test.ts` lokalt. Misslyckas det → fixa, försök aldrig kringgå guarden.

**Relaterat:** `mem://tech/posthog-internal-traffic` (vilka hosts som räknas som intern trafik).
