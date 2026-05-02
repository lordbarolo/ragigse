---
name: PostHog internal traffic classification
description: Which hosts count as internal vs external for PostHog and analytics_events. Critical for dashboard accuracy.
type: constraint
---

**Internal hosts (NEVER tracked as real traffic):**
- `localhost`, `127.0.0.1`
- `*.lovableproject.com` (sandbox dev)
- hosts starting with `id-preview--` (Lovable iframe preview)

**External / production hosts (MUST be tracked):**
- `compcare.se`, `www.compcare.se` (custom domain)
- `preview--compcare-se.lovable.app` (published Lovable URL — this IS real production)
- Any other domain not in the internal list

**Why:** Earlier we naively used `hostname.includes("lovable")`, which matched the user's *published* production URL `preview--compcare-se.lovable.app`. That marked real users as internal traffic and made PostHog dashboards (with the standard "exclude internal" filter) drop to ~0 on days when most visitors hit the lovable.app URL instead of compcare.se. It also blocked `track-event` edge calls entirely from that URL, so `analytics_events` had no rows from those visits.

**How to apply:**
- Logic lives in TWO places — both must stay in sync:
  1. `src/lib/posthog.ts` — `posthog.register({ is_internal_traffic: true })` super-property
  2. `src/lib/trackEvent.ts` — `isInternalTraffic()` early-return guard
- Never use `hostname.includes("lovable")` — always use the explicit allow/deny list above.
- When adding a new dev/preview host pattern, add it to BOTH files.
- `posthog.unregister("is_internal_traffic")` is called on production hosts to scrub stale super-properties from a browser that previously visited a dev host.
