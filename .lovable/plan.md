

## Fix PostHog: Internal Traffic Filter + GDPR Consent

### Problem
1. PostHog initializes immediately on import — no internal traffic guard, no consent check.
2. Cookie banner sets consent in localStorage but never calls PostHog opt-in/opt-out.

### Changes

**File 1: `src/lib/posthog.ts`** — Full rewrite
- Add `isInternalHost()` that checks for localhost, 127.0.0.1, lovable.app, lovableproject.com.
- Replace top-level `posthog.init(...)` with an exported `initPostHog()` function.
- `initPostHog()` skips entirely if internal host. Otherwise reads consent from `compcare_cookie_consent` localStorage key.
- Sets `opt_out_capturing_by_default: true` unless consent is `"accepted"`.
- Sets `persistence` to `localStorage+cookie` if accepted, `memory` otherwise.
- Remove the `console.log` line.
- Export `acceptTracking()` → calls `posthog.opt_in_capturing()`, sets persistence to `localStorage+cookie`, saves consent.
- Export `declineTracking()` → calls `posthog.opt_out_capturing()`, saves consent.
- Still export `posthog` as default for use in App.tsx pageview tracking.

**File 2: `src/main.tsx`** — Update import
- Replace `import "./lib/posthog"` with `import { initPostHog } from "./lib/posthog"` and call `initPostHog()`.

**File 3: `src/components/CookieBanner.tsx`** — Wire consent to PostHog
- Import `acceptTracking`, `declineTracking` from `@/lib/posthog`.
- `handleAccept`: call `acceptTracking()` (which also persists consent), then hide banner.
- `handleReject`: call `declineTracking()` (which also persists consent), then hide banner.
- Keep using `getConsent()` for visibility check (reading from same localStorage key).

**File 4: `src/lib/cookieConsent.ts`** — No changes needed (already works with the same key).

### Technical details
- The consent key stays `compcare_cookie_consent` — `posthog.ts` reads it directly from localStorage for the init check.
- `acceptTracking`/`declineTracking` both call `setConsent()` from cookieConsent.ts to keep a single source of truth.
- Using `persistence: 'memory'` before consent means PostHog can still function (for anonymous session data if needed) but won't persist any identifiers — fully GDPR compliant.

