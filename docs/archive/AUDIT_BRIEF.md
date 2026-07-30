# CompCare — Pre-Launch Audit Brief

> Underlag för extern kodgenomlysning (Claude Code) inför lansering. Källa till sanning är detta repo. Backend hanteras via Lovable Cloud (Supabase EU).

---

## 1. Produkt & arkitektur i korthet

**Stack**
- Frontend: React 18 + Vite + TypeScript + Tailwind (HSL semantic tokens), shadcn/ui, framer-motion
- Backend: Supabase (Postgres + Auth + Storage + Edge Functions i Deno), pg_cron för schemalagda jobb
- AI: Lovable AI Gateway (default `google/gemini-3-flash-preview`, eskalering till Pro vid behov)
- Analytics: PostHog (anonym tracking, EU-host)
- Email: Resend via PGMQ-kö

**Layouts (multi-tenant)**
- `ConsultantLayout` — inloggad konsult
- `AgencyLayout` — bemanningsföretag
- `PublicVerifyLayout` — publika delningsvyer
- ⚠️ Aldrig blanda dessa.

**Källfiler för arkitektur**
- `compcare-architecture.md` + `.mmd` (om de finns i repot — annars detta dokument)
- `supabase/migrations/` — komplett DB-schema + RLS-policies
- `supabase/functions/` — alla edge functions
- `supabase/config.toml` — `verify_jwt`-konfiguration per function
- `src/integrations/supabase/types.ts` — auto-genererad, speglar live-schema

---

## 2. Primära fokusområden för audit

### 2.1 RLS & dataåtkomst (HÖG PRIORITET)
- **Roller ligger i `user_roles`-tabell** med SECURITY DEFINER-funktion `has_role()`. Ska ALDRIG ligga på `profiles`.
- **Safe-view-mönster**: känsliga fält (invite_token, response_token, secrets) exponeras endast via dedikerade views/edge functions — aldrig via rå SELECT.
- Verifiera RLS på: `invoice_reviews`, `profiles`, `user_roles`, `ref_pings`, `ref_access_logs`, `calloff_imports`, `verify_*`-tabeller.
- Public reads ska bara finnas där det är medvetet (t.ex. publicerade rapporter, samarbetsintyg via token).

### 2.2 Edge Functions — auth & input-validering
Auditören bör särskilt granska:
- `requireAdmin` används korrekt i admin-endpoints (`admin-data`, `admin-review-action`)
- `service_role` läcker aldrig till klient
- `verify_jwt = false` är medvetet satt i `supabase/config.toml` (publika endpoints för leads, verifiering, webhooks, AI-chattar)
- Idempotency i `stripe-webhook`
- Rate limiting på AI-endpoints (`ai_usage_logs` — 30 calls/user/dag, admins exempt)

### 2.3 PII-läckage på publika routes
- `/profil/:id` — endast "Valvet" (verifierade dokument), inget annat PII
- `/rapport/*` — statiska SEO-rapporter, inga personuppgifter
- `/dela`, `/samarbetsintyg/:id`, `/dokhus-info` — token-baserade, granska att tokens inte leakar
- `/kampanj/:role` — använder `unique_id`, inga PII

### 2.4 Storage buckets
- `verifications` — **PRIVAT**. IVO/HOSP-dokument. Signed URLs (1 år).
- `invoice_reviews` — **PRIVAT**. Faktura/tidrapport-PDF:er.
- `imports` — **PRIVAT**. Lead-importfiler.
- Verifiera att inga är publika av misstag.

### 2.5 `handle_new_user`-trigger
- Granska att triggern **inte** kan användas för privilege escalation (t.ex. att klient sätter sin egen roll).
- Roller får endast tilldelas server-side via admin-funktion eller säker default.

### 2.6 BankID-scope (HÅRD REGEL)
Skarp BankID-signering tillåts ENDAST i verifieringsflödet:
- `/samarbetsintyg/:id` (Dokhus-flöde)
- Edge functions: `bankid-auth`, `bankid-collect`
- ⚠️ **ALDRIG** i signup, login, profilredigering, referensintygande eller referensverifiering. Termen "BankID" får inte heller synas i UI utanför detta flöde — använd "Digital signering".

### 2.7 Fakturakontroll — låst flöde (KRITISK)
Filer: `supabase/functions/invoice-extract/index.ts`, `supabase/functions/invoice-analyzer/index.ts`, `src/pages/consultant/FakturakontrollNy.tsx`.
Reviewern ska INTE föreslå ändringar i:
- AI-modell (låst till `google/gemini-2.5-flash`)
- System-prompts (PASS1/PASS2)
- Match-logik (`compareTidrapportPasses`)
- Confidence-trösklar i UI
- Regelmotor (A1–A8)

Reviewern får dock granska **säkerhet** (auth, input-validering, RLS, storage-policies, PII).

UX-regel: Användaren ska ENDAST se "vi återkommer inom 2 arbetsdagar". Inga interna resultat, ingen progress-info, ingen sammanfattning.

### 2.8 Compensation-data
- ENDAST SKR-ramavtal + branschmarginal får användas för konsult-comp.
- ALDRIG SCB / Medlingsinstitutet för konsultlöner (SCB OK för **anställda** sjuksköterskor).
- ALDRIG AT-läkare. ALDRIG suggera lägre lön än användarens nuvarande.
- Inga sociala benchmarks ("topp 20%", peer-comparison) i UI.

### 2.9 Uppdragsradar
- ENDAST historiska avrop finns. UI får ALDRIG kommunicera "live", "pågående" eller "aktiva" uppdrag.
- Prognoser ska vara tydligt märkta som prognoser.
- Datakälla: `public.requests` / `calloff_imports` (30k+ rader).

---

## 3. Edge Functions — översikt (sanity-check `supabase/config.toml`)

Publika (`verify_jwt = false`) — granska input-validering noga:
```
auth-email-hook, save-email, get-lead, validate-coupon, redeem-coupon,
create-report, get-report, get-verify-data, get-public-profile,
generate-pdf, send-referral, confirm-referral, send-password-recovery,
handle-email-unsubscribe, handle-email-suppression, preview-transactional-email,
analytics-dashboard, salary-insights, run-price-diff, pricing-engine,
ci-capabilities, ci-roles, ci-geographies, ci-metrics, compensation-intelligence,
reference-vault, radar-data, radar-import, radar-public-api, radar-predictions,
radar-notify, get-avrop-predictions, uppdragsradar-chat, verify-rates,
delete-account, send-followup-emails, check-feedback, feedback-stats,
send-audit-confirmation, stripe-webhook, bankid-auth, bankid-collect
```

Auth-skyddade (`verify_jwt = true`):
```
e2e-test, send-transactional-email, process-email-queue
```

Admin-only (intern logik via `requireAdmin`):
```
admin-data, admin-review-action, parse-avrop, import-contract,
backtest-uppdragsradar-accuracy, refresh-uppdragsradar-forecast,
pipeline-health-watchdog, posthog-health-check, track-event,
ai-consultant-coach, ai-pricing-coach, ai-explain-insight,
ai-invoice-to-email, salary-negotiation-agent, representation-request,
invoice-extract, invoice-analyzer
```

---

## 4. Secrets (namn — värden hanteras i Lovable Cloud)

Reviewer behöver INTE värden, men ska kontrollera att:
- Inga hardcodade i kod / commit-historik
- Inga loggas via `console.log`
- Inga skickas till klient

Förväntade secrets:
```
LOVABLE_API_KEY              # AI Gateway
RESEND_API_KEY               # Email
STRIPE_SECRET_KEY            # Stripe webhook (idempotency krav)
STRIPE_WEBHOOK_SECRET
POSTHOG_API_KEY              # Server-side health checks
BANKID_*                     # Digital signering (verify-flöde)
SUPABASE_SERVICE_ROLE_KEY    # Endast i edge functions, aldrig klient
SUPABASE_URL
SUPABASE_ANON_KEY            # OK i klient
```

---

## 5. Schemalagda jobb (pg_cron)

Verifiera att dessa är aktiva och inte duplicerade:
- `refresh-uppdragsradar-forecast` — söndag 03:00, 3 mån horisont
- `pipeline-health-watchdog` — måndag morgon
- `posthog-health-check` — daglig
- `send-followup-emails` — daglig (dag 3, 7, 14)
- `process-email-queue` — minutbaserad PGMQ

---

## 6. Vad som INTE finns i repot

Reviewer behöver veta att följande INTE går att granska från koden ensam:
- **Auth providers, redirect URLs, email templates** — konfigurerat i Lovable Cloud-dashboard
- **Storage bucket policies** — kan finnas i migrations men dubbelkolla mot live
- **PostHog feature flags & dashboards** — externa
- **Resend domain config** — externt
- **DNS / custom domain** — `compcare.se`, `www.compcare.se`
- **Live secrets-värden**

---

## 7. Out-of-scope för auditen

Bedöm INTE följande som buggar (medvetna designval):
- Stripe report-payment-flöde är borttaget (webhook kvar för idempotency)
- IVO/HOSP saknar API → manuell uppladdning + admin-verifiering är by-design
- `verify_jwt = false` på publika endpoints (alla validerar input internt)
- Lovable preview-länkar har egen domän — separat från prod

---

## 8. Önskad output från reviewer

1. **Säkerhetsrisker**, sorterade efter severity (Critical → Low)
2. **RLS-gap** per tabell
3. **PII-exponering** per route
4. **Edge function input-validering** — saknade checks
5. **Performance / N+1** i kritiska flöden (`/`, `/resultat`, `/profil/:id`, `/consultant/fakturakontroll`)
6. **Tillgänglighet** (a11y) på primära konverteringssidor
7. **TypeScript strictness-gap** (vi kör inkrementell strict)

Tack på förhand 🙏
