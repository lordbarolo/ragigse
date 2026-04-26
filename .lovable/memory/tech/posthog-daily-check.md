---
name: PostHog Daily Health Check
description: Daily verification protocol for end-to-end PostHog tracking
type: preference
---

Daily PostHog tracking verification (run when user says "kör daglig check" or "morgonkoll"):

1. Call edge function `posthog-health-check` (admin-protected) — returns:
   - `analytics_events` count last 24h (must be > 0 with prod traffic)
   - Unique `lead_id` count last 24h
   - Top-5 event names last 24h
   - Warning if zero events on production domain

2. Verify in browser devtools on `compcare.se`:
   - `posthog.__loaded === true`
   - `landing_viewed` fires on `/`
   - Console shows `[PostHog] active on ...`

3. Confirm filters not over-blocking:
   - `is_internal_traffic` filter only matches localhost + lovable subdomains (NOT `compcare.se` or `www.compcare.se`)
   - `getConsent() === "accepted"` triggers `posthog.opt_in_capturing()`

4. Confirm identity sync: `posthog.identify()` runs in `useAuth.ts` on SIGNED_IN.

Report results with ✅/⚠️/❌ markers.
Run `security--run_security_scan` weekly (>7 days since last scan).
