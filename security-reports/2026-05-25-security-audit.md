# CompCare — Säkerhetsrevision

## Metadata
- **Datum:** 2026-05-25
- **Projekt:** CompCare (Supabase ref `ubhhlunhdqbokjvwfebb`, EU)
- **Granskad av:** Lovable Agent (automatiserad körning enligt `AUDIT_TEMPLATE.md` + `AUDIT_BRIEF.md`)
- **Version:** package.json `0.0.0` (versioneras ej i repo)
- **Tidigare rapport:** Första körning
- **Scope:** Lovable Cloud (Postgres + Storage + Edge Functions) + frontend. Inga kodändringar.

---

## Automatiserade verktyg

| Verktyg | Resultat |
|---|---|
| `security--run_security_scan` | 88 findings — 1 ERROR (Security Definer View), resterande WARN (RLS Always True på service_role-policies + en redundant policy). |
| `supabase--linter` | 83 issues — samma kategorier som ovan. |
| `code--dependency_scan` | ✅ Inga high/critical vulnerabilities. |

---

## DEL 1 — RLS per tabell

**RLS-status:** ✅ Samtliga 100+ tabeller i `public` har `rowsecurity = true`.
**Tabeller utan policies:** ✅ Inga (LEFT JOIN på `pg_policies` returnerade tom mängd).

**Mönster-flaggning (`USING (true)` / `WITH CHECK (true)`):**

| Klass | Beskrivning | Bedömning |
|---|---|---|
| `service_role` ALL/INSERT med `true` | ~25 policies (radar, queue, pipeline, etc.) | ✅ By design — service_role körs endast i edge functions med `SUPABASE_SERVICE_ROLE_KEY`. |
| Publika referenslookups (`benchmark_rates`, `rates`, `geographies`, `geography_aliases`, `locations`, `capability_definitions`, `contract_versions`, `contract_version_rates`, `price_changes`, `calloff_history`, `role_aliases`, `ref_role_profiles`, `ref_verified_domains`) | SELECT `true` till `public/anon/authenticated` | ✅ Avsiktligt — referensdata utan PII. |
| Publika INSERT-policies (`leads`, `audit_optins`, `invoice_review_leads`, `bug_reports`, `chat_answer_reports`, `ref_access_logs`, `ref_profile_views`, `invoice_submissions`) | `WITH CHECK true` från `anon`/`authenticated` | ⚠️ Avsiktligt för leadflöden, men kräver rate-limit + input-sanering i edge functions (granska DEL 5). |
| `app_settings` SELECT `true` till `anon` | Feature flags läsbara publikt | ✅ Avsiktligt — endast feature flag values. |
| OR-on-nullable (`USING (col IS NULL OR ...)`) | ✅ Inga träffar | Följer [RLS OR-on-Nullable Ban](mem://constraints/rls-or-on-nullable). |
| `FOR ALL` utan både USING+WITH CHECK | ✅ Inga problemfall (service_role-policies har båda). | |

**Övriga policies** följer `auth.uid() = user_id`-mönster eller `ref_has_role(auth.uid(),'admin')`. Tjocka tabeller (`profiles`, `consultant_profiles`, `consultant_documents`, `ref_*`, `mp_*`, `invoice_*`) granskade — användarbundna och korrekta.

---

## DEL 2 — Storage buckets

| Bucket | Public | INSERT | SELECT | UPDATE | DELETE |
|---|---|---|---|---|---|
| `verifications` | ❌ Privat | `authenticated` + `{user_id}/…` | `authenticated` + `{user_id}/…` | ⚠️ `roles:{public}` + `{user_id}/…` | `authenticated` + `{user_id}/…` |
| `invoice_reviews` | ❌ Privat | `authenticated` + `{user_id}/…` | `authenticated` + `{user_id}/…` & `service_role` | `authenticated` + `{user_id}/…` | `authenticated` + `{user_id}/…` |
| `imports` | ❌ Privat | Admin only (`ref_has_role`) | Admin only | — | — |

**Upload-konvention i kod (verifierat):**
- ✅ `FakturakontrollNy.tsx:162` → `.upload(path, ...)` där `path` byggs som `${user.id}/...`.
- ✅ `referly/VerificationUpload.tsx`, `DocumentUpload.tsx`, `ImportVerifyModal.tsx` → `filePath` börjar med `user.id/`.

**⚠️ MÅTTLIG:** `verifications` UPDATE-policy har `roles:{public}` istället för `{authenticated}`. Path-villkoret skyddar fortfarande (anon har ingen `auth.uid()`), men är inkonsekvent och bör låsas till `authenticated` för tydlighet.

---

## DEL 3 — SECURITY DEFINER-funktioner

Antal: **37** i `public`. Alla har `SET search_path = public` ✅ och ägs av `postgres`.

Stickprov genomgånget:
- ✅ `handle_new_user` — whitelistar `raw_user_meta_data->>'role'` till `('individual','agency')`, default `individual`. **Ingen privilege escalation möjlig.**
- ✅ `ref_has_role` — standard recursion-säker mönster.
- ✅ `check_ai_rate_limit` — admin bypass via `ref_has_role`, korrekt.
- ✅ `mp_listings_enforce_publish_gate` — kräver `mp_can_publish` (BankID + ≥2 referenser).
- ✅ Token-RPC:er (`get_referral_by_token`, `ref_get_ping_by_token`, `get_document_share_by_token`, `ref_get_reference_by_invite_token`) returnerar endast nödvändiga fält, inga `raw_*`-kolumner.
- ✅ `create_document_share` validerar `auth.uid()`, kontrollerar dokumentägarskap, begränsar expiry till max 1 år.

GRANTs till `anon`/`authenticated` är begränsade till de funktioner som behöver vara publika (token-lookups, leads, etc.).

---

## DEL 4 — Secrets

| Kontroll | Resultat |
|---|---|
| `service_role`/`sk_live`/`SUPABASE_SERVICE_ROLE` i `/src` eller `/public` | ✅ 0 träffar |
| `.env`-fil committed | ✅ Endast publishable keys + URL (anon JWT-värdet är publikt by design) |
| Hårdkodade nycklar i frontend | ✅ Inga |
| `console.log` med PII i edge functions | ⚠️ Audit-loggar i `save-email`, `auth-email-hook`, `create-report` loggar email-adresser. **By design för audit-trail**, men säkerställ att log-retention följer GDPR (raderas inom 90d). |

**Förväntade secrets** (alla närvarande): `LOVABLE_API_KEY`, `RESEND_API_KEY` (+`_1` via connector), `STRIPE_SECRET_KEY`, `BANKID_*`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`.

---

## DEL 5 — Edge functions

**Inventering:** 78 functions i `supabase/functions/`. Cross-reference mot `supabase/config.toml`:

**Mismatch / saknas i config.toml** (default `verify_jwt = true`):
- `admin-data`, `admin-review-action`, `admin-survey-prefill-debug` — admin-only, JWT krävs ✅
- `parse-avrop`, `import-contract`, `track-event`, `posthog-health-check`, `analytics-event-coverage` — admin/intern ✅
- `ai-*` (consultant-coach, pricing-coach, explain-insight, invoice-to-email), `salary-negotiation-agent`, `representation-request`, `invoice-extract`, `invoice-analyzer`, `verify-document-name`, `get-shared-documents` — JWT krävs ✅
- `backtest-uppdragsradar-accuracy`, `pipeline-health-watchdog`, `refresh-uppdragsradar-forecast`, `verify-constants`, `verify-rates`, `rate-mismatch-watchdog` — triggas via pg_cron med anon-Bearer (se nedan).
- `marketplace-*` — bakom feature flag, JWT krävs ✅

**⚠️ ALLVARLIG fynd #1 — pg_cron-jobb använder anon JWT**

7 av 8 aktiva cron-jobb skickar `Authorization: Bearer <ANON_KEY>` i klartext i `cron.job.command`. Anon-nyckeln är publik, så det är **inget läckage**, men:

- Eftersom JWT är giltig passerar `verify_jwt`-grinden, och de listade functions saknar `requireAdmin()` i toppen (`pipeline-health-watchdog`, `backtest-uppdragsradar-accuracy`, `refresh-uppdragsradar-forecast`, `verify-constants`, `verify-rates`, `rate-mismatch-watchdog`).
- **Konsekvens:** Vem som helst med anon-nyckeln (= allmänheten) kan trigga jobben manuellt via curl.
- **Risk:** Låg → måttlig. Jobben är idempotenta admin-ops (rapport-aggregering, watchdog-mejl), men oavsiktlig trigger kan generera dubbla mejl/notiser eller stress-laster.
- **Åtgärd:** Antingen
  (a) flytta auth-bearer till Vault-secret (mönstret `process-email-queue` redan använder via `email_queue_service_role_key`), eller
  (b) lägg till `requireAdmin`-light som accepterar service_role JWT eller en delad hemlighet i header.
- **Status:** NY.

**CORS:** 73 av 78 functions sätter `Access-Control-Allow-Origin: *`. Acceptabelt för publika endpoints; granska om någon authed-only function (`admin-*`, `ai-*`) borde låsas till `compcare.se` för defense-in-depth.

**`requireAdmin`-stickprov** (`_shared/adminAuth.ts`) — ✅ implementation OK (kollar JWT → user → `ref_user_roles` via service role-klient, returnerar 401/403 tidigt).

---

## DEL 6 — Diff mot föregående rapport

N/A — första körningen.

---

## DEL 7 — Lovable Cloud-specifika kontroller

### 7.1 Views

| View | `security_invoker` | Bedömning |
|---|---|---|
| `calloff_imports_public` | ❌ false (definer) | ✅ Dokumenterad safe-zone — exponerar endast aggregat utan PII. |
| `ref_pings_safe` | ✅ on | OK |
| `ref_references_safe` | ✅ on | OK |
| `ref_representation_requests_safe` | ✅ on | OK |

Kolumn-scan: token/secret/raw_-kolumner finns endast på basetabeller (skyddade av RLS). Safe-views och token-RPCs exponerar dem aldrig direkt.

### 7.2 RLS-logiska mönster
Se DEL 1 — inga förbjudna OR-on-nullable, inga `FOR ALL` utan `WITH CHECK` på user-data, inga `auth.uid() = nullable_col` utan NOT NULL-skydd.

### 7.3 Triggers på `auth.*`
Direktquery mot `information_schema.triggers` returnerade tom mängd (begränsad åtkomst). `handle_new_user`-funktionen är dock korrekt skriven (whitelistar role). ✅

### 7.4 pg_cron-jobb
8 aktiva jobb, alla ägda av `postgres`:

| Jobname | Schema | Funktion |
|---|---|---|
| `process-email-queue` | var 5:e sekund | Vault-secret ✅ |
| `send-followup-emails-daily` | 08:00 | anon Bearer ⚠️ |
| `verify-rates-nightly` | 03:00 | anon Bearer ⚠️ |
| `verify-constants-nightly` | 03:15 | anon Bearer ⚠️ |
| `rate-mismatch-watchdog-daily` | 09:00 | anon Bearer ⚠️ |
| `refresh-uppdragsradar-forecast-weekly` | Söndag 03:00 | anon Bearer ⚠️ |
| `pipeline-health-watchdog-weekly` | Måndag 06:30 | anon Bearer ⚠️ |
| `backtest-uppdragsradar-accuracy-monthly` | 5:e kl 02:00 | anon Bearer ⚠️ |

Se fynd #1 i DEL 5.

### 7.5 Realtime
`pg_publication_tables` för `supabase_realtime` returnerade tom mängd. ✅ Inga realtime-tabeller exponerade.

### 7.6 Storage upload-konvention
Verifierad i DEL 2 ✅

### 7.7 Client-side auth-bypass
`rg "localStorage.*admin|sessionStorage.*admin|is_admin\s*="` på `src/` → ✅ **0 träffar**.

### 7.8 PII på publika token-routes
- `/profil/:id` — `ref_get_public_profile` returnerar full_name, specialty, bio, years_licensed, trust_score, references, documents (utan PII). ✅
- `/samarbetsintyg/:id`, `/dela`, `/dokhus-info` — token-baserade via RPC, inga PII i URL. ✅
- `/kampanj/:role` — använder `unique_id`. ✅
- ⚠️ Säkerställ att PostHog `$current_url`-mask konfigureras för `/samarbetsintyg/*`, `/verify/*`, `/dela/*`, `/p/*` så response_token/invite_token inte hamnar i analytics.

### 7.9 Rate limiting
- `ai_usage_logs` senaste 14d: endast 2 calls / 1 user → låg belastning, kvot-logik kan inte stresstestas på live-data nu.
- `check_ai_rate_limit` RPC ser korrekt ut (admins exempt, dagstart Europe/Stockholm).
- `delete-account` — bör verifieras separat för rate-limit (inte granskad i denna körning).

### 7.10 CORS
Se DEL 5 — 73 functions med wildcard. Lista bör underhållas separat för medvetet öppna vs. internt anropade.

---

## DEL 8 — Beroenden
✅ `code--dependency_scan`: inga high/critical sårbarheter. Inga overrides observerade.

---

## DEL 9 — Extensions

| Extension | Schema | Status |
|---|---|---|
| `pgcrypto`, `pg_net`, `pg_stat_statements`, `uuid-ossp` | `extensions` ✅ | Korrekt isolerade |
| `pgmq` | `pgmq` ✅ | OK |
| `supabase_vault` | `vault` ✅ | OK |

Inga extensions i `public`. ✅

---

## Sammanfattning

### Övergripande status: **🟡 GUL**

Plattformen är fundamentalt välkonfigurerad: RLS överallt, storage privata, secrets korrekt isolerade, ingen client-side admin-bypass, ingen PII-läckage i publika routes, inga kritiska beroenden-sårbarheter. Inga **KRITISKA** eller blockerande **ALLVARLIGA** fynd.

Den enda allvarligare frågan är **anon-Bearer i pg_cron-jobb** — funktionellt OK men öppnar för publik trigg av admin-ops.

---

### KRITISKA FYND (åtgärda omedelbart)
*Inga.*

### ALLVARLIGA FYND (åtgärda inom 7 dagar)

**Fynd #1 — Admin cron-jobb skyddas inte mot manuell publik trigg**
- **Beskrivning:** 7 av 8 pg_cron-jobb anropar functions med anon JWT som Bearer. Functions (`pipeline-health-watchdog`, `backtest-uppdragsradar-accuracy`, `refresh-uppdragsradar-forecast`, `verify-constants`, `verify-rates`, `rate-mismatch-watchdog`, `send-followup-emails`) saknar internt admin-skydd. Anon-nyckeln är publik → vem som helst kan trigga jobben via curl.
- **Risk:** Måttlig. Idempotenta ops men kan stressa AI-gateway / Resend-kvot eller skicka dubbla varningsmejl till admins.
- **Vem kan utnyttja:** anon (allmänheten).
- **Åtgärd:** Migrera till Vault-pattern (`vault.decrypted_secrets`) som `process-email-queue` använder. Alternativt lägg till delad header-hemlighet (`X-Cron-Secret`) som functions validerar mot `Deno.env.get('CRON_SHARED_SECRET')`.
- **Status:** NY.

### MÅTTLIGA FYND (åtgärda inom 30 dagar)

**Fynd #2 — `verifications.UPDATE` storage-policy har `roles:{public}` istället för `{authenticated}`**
- **Risk:** Låg (path-villkoret `(storage.foldername(name))[1] = auth.uid()::text` skyddar fortfarande — anon har ingen `auth.uid()`).
- **Åtgärd:** `ALTER POLICY "Users can update own verification files" ON storage.objects TO authenticated;`
- **Status:** NY.

**Fynd #3 — PII i edge-function-loggar (email-adresser)**
- **Beskrivning:** `save-email`, `auth-email-hook`, `create-report`, `send-followup-emails`, `handle-email-unsubscribe` loggar email i klartext för audit.
- **Risk:** Låg om log-retention är ≤90d (GDPR). Bekräfta i Lovable Cloud-inställningar.
- **Åtgärd:** Maska email till `a***@domain.tld` i icke-audit-loggar, eller dokumentera retention-policy explicit.
- **Status:** NY.

**Fynd #4 — PostHog URL-masking för token-routes saknas/oklart**
- **Beskrivning:** Routes `/samarbetsintyg/:id`, `/verify/:id`, `/p/:token`, `/dela/:token` har tokens i URL. PostHog default loggar `$current_url`.
- **Risk:** Tokens kan exponeras i PostHog-events och Referer-headers vid externa länkar.
- **Åtgärd:** (a) Verifiera `mask_personal_data_properties` / `before_send` hook i `src/lib/posthog.ts`. (b) Sätt `rel="noreferrer"` på externa länkar från dessa routes.
- **Status:** NY.

### REKOMMENDATIONER

- **R1:** CORS-inventering — separera medvetet öppna (publika lead/AI-endpoints) från authed-only (admin/AI-coach) och låsa de senare till `compcare.se` / `www.compcare.se`.
- **R2:** Rate-limit på publika INSERT-routes (`leads`, `audit_optins`, `bug_reports`, `chat_answer_reports`, `ref_access_logs`, `ref_profile_views`) — kontrollera att respektive edge function eller `rate_limit_log` täcker detta.
- **R3:** `package.json` version är `0.0.0` — överväg semver för spårbarhet i framtida audits.
- **R4:** Audit `delete-account` separat för rate-limit + idempotency.
- **R5:** Säkerställ att `process-email-queue` Vault-mönstret dokumenteras som standard för alla framtida cron-triggade admin-functions.

---

**Sparad som:** `security-reports/2026-05-25-security-audit.md`
