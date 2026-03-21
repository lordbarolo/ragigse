

## Plan: Filter out internal/preview traffic from analytics

### Problem
All analytics events — including your own visits from the Lovable preview environment and HMR reloads — are recorded in `analytics_events`. This inflates numbers and makes funnel data unreliable.

### Solution
Add a hostname check at the top of `trackEvent()`. If the current page is running on a known internal domain (Lovable preview, localhost), skip both the DB insert and the PostHog capture entirely.

### Changes

**File: `src/lib/trackEvent.ts`**
- Add a helper function `isInternalTraffic()` that checks `window.location.hostname` against:
  - `localhost`
  - `*.lovableproject.com` (old preview)
  - `*.lovable.app` subdomains containing `preview` (e.g. `id-preview--*.lovable.app`)
  - `127.0.0.1`
- Early-return from `trackEvent()` if `isInternalTraffic()` returns `true`
- This means zero noise from dev/preview sessions going forward

**No database changes needed** — existing polluted data stays but new data will be clean.

### What this does NOT affect
- Production traffic on `compcare.se` or `compcare.lovable.app` (published URL without "preview") will continue tracking normally
- PostHog is also silenced for internal traffic, keeping both systems consistent

