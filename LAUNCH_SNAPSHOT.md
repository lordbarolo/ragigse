# LAUNCH SNAPSHOT — vårdbemanning.ai v1.0

**Date:** 2026-05-01
**Version tag:** `v1.0-launch`
**Purpose:** Frozen baseline of the product before marketplace / agent-based negotiation work begins. All marketplace development from this point onward is isolated behind feature flags and the `mp_*` / `marketplace-*` namespace. See `mem://constraints/marketplace-isolation.md`.

---

## 1. Active routes (from `src/App.tsx`)

### Public landing & auth
- `/` — LandingV2 (Kivra-stil hero med inline-form)
- `/b2b` — Index (B2B-vy)
- `/v1` — SalaryCheck (legacy)
- `/logga-in`, `/registrera`, `/aterstall-losenord`
- `/for-bemanningsforetag`, `/registrera/bemanning`

### Consultant (layout: ConsultantLayout)
- `/consultant/forhandla` — Negotiate (Löneassistenten)
- `/consultant/fakturakontroll`, `/consultant/fakturakontroll/ny`
- `/consultant/ersattning` — CompensationPreview
- `/consultant/profil` (auth-skyddad)
- `/consultant/referenser` (admin only)
- `/consultant/academy`

### Agency (layout: AgencyLayout, role: agency/admin)
- `/agency/dashboard`
- `/agency/market-edge` — Market Intelligence Terminal
- `/agency/intyg`

### Public Dokhus (layout: PublicVerifyLayout)
- `/samarbetsintyg/:applicationId`
- `/profil/:id` — PublicProfile (Valvet only)
- `/dokhus-info`
- Legacy redirects: `/verify/:id` → `/samarbetsintyg/:id`, `/verify-info` → `/dokhus-info`

### Public results & content
- `/resultat/:leadId` — AnalysisScreen
- `/rapport/anestesisjukskoterska` — static SEO
- `/rapport/:reportId` — dynamic report
- `/vanliga-fragor`, `/integritetspolicy`
- `/referens/:token`, `/ping/:token`, `/sign/:token`
- `/unsubscribe`, `/kampanj/:role`
- `/uppdragsradar` — UppdragsradarV2 (historical only)

### Protected & dev
- `/dela`, `/referenser-info`
- `/admin` (admin only)
- `/dev/theme-preview`, `/dev/analytics`, `/dev/e2e-test`
- `/demo`, `/demo/referenser`, `/demo/landing-v2`, `/demo/landing-extras`

---

## 2. Edge functions (from `supabase/config.toml`)

### Public (`verify_jwt = false`)
auth-email-hook, save-email, get-lead, validate-coupon, redeem-coupon, create-report, get-report, get-verify-data, get-public-profile, generate-pdf, send-referral, confirm-referral, send-password-recovery, handle-email-unsubscribe, handle-email-suppression, preview-transactional-email, analytics-dashboard, salary-insights, run-price-diff, pricing-engine, ci-capabilities, ci-roles, ci-geographies, ci-metrics, compensation-intelligence, reference-vault, radar-data, radar-import, radar-public-api, radar-predictions, radar-notify, get-avrop-predictions, uppdragsradar-chat, verify-rates, delete-account, send-followup-emails, check-feedback, feedback-stats, send-audit-confirmation, stripe-webhook, bankid-auth, bankid-collect, create-checkout, verify-payment

### Auth-gated (`verify_jwt = true`)
e2e-test, send-transactional-email, process-email-queue

### Admin-only (internal `requireAdmin` check)
admin-data, admin-review-action, parse-avrop, import-contract, backtest-uppdragsradar-accuracy, refresh-uppdragsradar-forecast, pipeline-health-watchdog, posthog-health-check, track-event, ai-consultant-coach, ai-pricing-coach, ai-explain-insight, ai-invoice-to-email, salary-negotiation-agent, representation-request, invoice-extract, invoice-analyzer

---

## 3. Storage buckets

| Bucket | Privacy | Purpose |
|---|---|---|
| `verifications` | PRIVATE | IVO/HOSP/CV docs (signed URLs, 1 yr) |
| `invoice_reviews` | PRIVATE | Invoice/timesheet PDFs |
| `imports` | PRIVATE | Lead import files |

---

## 4. Scheduled jobs (pg_cron)

- `refresh-uppdragsradar-forecast` — Sunday 03:00 (3-month horizon)
- `pipeline-health-watchdog` — Monday morning
- `posthog-health-check` — daily
- `send-followup-emails` — daily (day 3, 7, 14)
- `process-email-queue` — minute-based PGMQ
- `aggregate_calloff_monthly` — weekly aggregation

---

## 5. Database — feature flag added

- New table: `app_settings (key, value, updated_at, updated_by)`
- Seeded: `('marketplace_enabled', false)`
- RPC: `get_feature_flag(_key text) → jsonb` (SECURITY DEFINER, search_path=public)
- RLS: public SELECT (anon + authenticated); admin-only INSERT/UPDATE/DELETE via `ref_user_roles`

No other tables, policies, or functions were modified.

---

## 6. Rollback contract

If marketplace work goes wrong:
1. **Chat-revert** to the AI message tagged `v1.0-launch` → entire repo restored.
2. **DB-flag**: `UPDATE app_settings SET value='false' WHERE key='marketplace_enabled'` → marketplace UI disappears instantly without a deploy.
3. **DB-cleanup**: `DROP TABLE mp_*` is safe — no FKs from existing tables point into the marketplace namespace.

---

## 7. Isolation guarantee

From this point forward, marketplace and agent-based-negotiation work touches **only**:
- `mp_*` database tables
- `marketplace-*` edge functions
- `/marketplace/*` routes
- `src/pages/marketplace/*`, `src/components/marketplace/*`, `src/hooks/marketplace/*`

No file, table, policy, cron job, or edge function listed in sections 1–4 above will be modified without explicit user approval.
