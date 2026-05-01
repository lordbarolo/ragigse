---
name: Marketplace Isolation Rule
description: Hard isolation boundary for marketplace and agent-based negotiation work. Prevents any modification of v1.0 production code without explicit user approval.
type: constraint
---

All marketplace and agent-based-negotiation development MUST be isolated.

**Allowed namespaces (only):**
- DB tables: `mp_*` (e.g. `mp_listings`, `mp_offers`, `mp_negotiations`, `mp_agent_runs`)
- Edge functions: `marketplace-*` (e.g. `marketplace-create-listing`, `marketplace-agent-negotiate`)
- Routes: `/marketplace`, `/marketplace/*`
- Frontend code: `src/pages/marketplace/*`, `src/components/marketplace/*`, `src/hooks/marketplace/*`

**Dual feature gate (both must be true to render marketplace UI):**
1. Build-time: `VITE_FEATURE_MARKETPLACE=true`
2. Runtime: `app_settings.marketplace_enabled = true` (admin-only write, default `false`)

Use `useFeatureFlag("marketplace_enabled")` from `src/lib/featureFlags.ts` — never bypass.

**Forbidden without explicit user approval ("kör marketplace steg X" or equivalent):**
- ANY change to existing tables, RLS policies, triggers, functions, or cron jobs listed in `LAUNCH_SNAPSHOT.md`
- ANY change to existing edge functions
- ANY change to existing routes, pages, components, hooks, or shared libraries (except registering marketplace routes in `App.tsx` behind the flag and a single import of `featureFlags.ts`)
- "Smart" merging of marketplace logic into existing files
- "Passa på"-refactoring of unrelated code while doing marketplace work
- ALTER TABLE on any non-`mp_*` table
- New cron jobs without `mp_` prefix
- Reusing existing RLS policies — every `mp_*` table gets its own policies

**Diff-check before every marketplace change:** the list of modified files must contain only paths matching `mp_*`, `marketplace-*`, `/marketplace`, `src/(pages|components|hooks)/marketplace/*`, plus at most:
- `src/App.tsx` (route registration only, gated by feature flag)
- `src/lib/featureFlags.ts` (only if the flag system itself needs extension)

**Why:** Production traffic flows to compcare.se. v1.0 is frozen at the chat-message tagged "v1.0-launch". Any unintended change to v1.0 code — even "trivial" — is a regression risk. Marketplace work must be reversible by (a) chat-revert, (b) flipping the DB flag, or (c) dropping `mp_*` tables, with zero impact on v1.0.

**How to apply:** When the user requests marketplace/agent-negotiation work, check this rule first. If a proposed change touches anything outside the allowed namespaces, STOP and ask for explicit approval before proceeding. Never assume approval from earlier in the conversation extends to new files.
