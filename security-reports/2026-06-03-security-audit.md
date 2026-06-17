# CompCare — Säkerhetsrevision

## Metadata
- **Datum:** 2026-06-03
- **Projekt:** CompCare (Supabase ref `ubhhlunhdqbokjvwfebb`, EU)
- **Granskad av:** Lovable Agent (automatiserad körning enligt `AUDIT_TEMPLATE.md` + `AUDIT_BRIEF.md`)
- **Version:** package.json `0.0.0`
- **Tidigare rapport:** 2026-05-25 (9 dagar sedan)
- **Scope:** Lovable Cloud (Postgres + Storage + Edge Functions) + frontend. Inga kodändringar i denna körning.

---

## Automatiserade verktyg

| Verktyg | Resultat | Δ vs 5/25 |
|---|---|---|
| `security--run_security_scan` | **86 findings** — 0 ERROR, samtliga WARN | −2 (var 88) |
| `supabase--linter` | **82 issues** — endast WARN | −1 (var 83) |
| `code--dependency_scan` | ✅ Inga high/critical | = |

**Fördelning av findings (båda verktyg):**
- ~10 × `RLS Policy Always True` (service_role + publika SELECTs — by design)
- ~62 × `Public Can Execute SECURITY DEFINER Function` (token-RPCer + helpers, by design)
- ~10 × `Signed-In Users Can Execute SECURITY DEFINER Function` (user-bundna helpers, by design)
- 0 × `Security Definer View` ERROR (var 1 i 5/25 — verkar vara reklassificerad eller åtgärdad)

---

## DEL 1 — RLS per tabell

**Statistik (live):**
- Publika tabeller: **104**
- Tabeller utan RLS aktiverat: **0** ✅
- Totala policies: **202**

**Mönster:** Identisk struktur som 5/25 — service_role `USING (true)` är by design (endast tillgängligt via edge functions med `SUPABASE_SERVICE_ROLE_KEY`); publika SELECT `true` på referensdata utan PII; publika INSERT med rate-limit i edge functions. Inga OR-on-nullable. Inga `FOR ALL` utan båda `USING + WITH CHECK` på user-data.

**Status:** ✅ Oförändrat sedan 5/25.

---

## DEL 2 — Storage buckets

| Bucket | Public | Path-konvention | Status |
|---|---|---|---|
| `verifications` | ❌ Privat | `{user_id}/...` enforced | UPDATE-policy `roles:{public}` (Fynd #2 från 5/25 — **KVARSTÅR**) |
| `invoice_reviews` | ❌ Privat | `{user_id}/...` enforced | ✅ |
| `imports` | ❌ Privat | Admin only | ✅ |

Upload-konvention i kod oförändrad sedan 5/25 — alla uploads börjar med `${user.id}/`.

---

## DEL 3 — SECURITY DEFINER-funktioner

- Antal: **37** i `public` ✅ (samma som 5/25)
- **Utan `search_path` satt: 0** ✅
- Alla ägs av `postgres`

Linterns 72 WARN för "Public/Signed-In can execute SECURITY DEFINER" är samma kategori som 5/25 — by design för token-RPC:er (`get_referral_by_token`, `ref_get_ping_by_token`, `get_document_share_by_token`, etc.) och user-bundna helpers (`ref_has_role`, `check_ai_rate_limit`, `create_document_share`, etc.). Granskning av RPC-output bekräftar att inga `raw_*`/`token`/`secret`-kolumner returneras.

---

## DEL 4 — Secrets

| Kontroll | Resultat |
|---|---|
| `service_role`/`sk_live`/`SUPABASE_SERVICE_ROLE` i `/src` eller `/public` | ✅ 0 träffar |
| `.env` committed med secrets | ✅ Endast publishable keys |
| Hårdkodade nycklar i frontend | ✅ Inga |
| PII i edge function-loggar | ⚠️ Email-loggning kvarstår (Fynd #3 från 5/25) |

Inventering av `secrets`-listan: alla förväntade secrets finns. `email_queue_service_role_key` finns i Vault och används av samtliga cron-jobb (se DEL 7.4).

---

## DEL 5 — Edge functions

**Inventering:** 78+ functions. Cross-reference mot `supabase/config.toml`:
- Admin-functions kör `requireAdmin()` tidigt ✅
- AI/coach-functions: `verify_jwt = true` ✅
- Publika lead-functions: `verify_jwt = false` med input-validering ✅
- Cron-triggade functions: nu skyddade via Vault service_role JWT (Fynd #1 åtgärdat)

**CORS:** ~73 functions med `Access-Control-Allow-Origin: *` — oförändrat. Rekommendation R1 från 5/25 kvarstår (separera publika vs authed-only).

---

## DEL 6 — Diff mot 2026-05-25

| Fynd | Status | Anteckning |
|---|---|---|
| **#1 Anon-JWT i pg_cron** | ✅ **ÅTGÄRDAT** | Samtliga 8 cron-jobb läser `email_queue_service_role_key` från Vault. Verifierat live i `cron.job.command`. |
| #2 `verifications.UPDATE` roles:{public} | ⏳ Kvarstår (15d) | Måttlig. SQL-fix dokumenterad. |
| #3 PII i edge-function-loggar (email) | ⏳ Kvarstår (15d) | Måttlig. Bekräfta retention ≤90d. |
| #4 PostHog URL-masking för token-routes | ⏳ Kvarstår (15d) | Måttlig. |

**Trend:** ✅ **Förbättring.** −2 scan-findings, −1 linter-issue, ALLVARLIG #1 stängd. Inga nya regressioner.

---

## DEL 7 — Lovable Cloud-specifika kontroller

### 7.1 Views
Oförändrat sedan 5/25: `calloff_imports_public` (medveten definer-vy), `ref_*_safe` (security_invoker on). Inga nya views.

### 7.2 RLS-logiska mönster
✅ Inga förbjudna OR-on-nullable. Inga nya `USING (true)` på UPDATE/DELETE/INSERT-policies för user-data.

### 7.3 Triggers på `auth.*`
`handle_new_user` (verifierad i db-functions): whitelistar `raw_user_meta_data->>'role'` till `('individual','agency')`, defaultar till `individual`. ✅ Ingen privilege escalation.

### 7.4 pg_cron-jobb (LIVE-status)

| Jobname | Schema | Auth-mönster | Status |
|---|---|---|---|
| `process-email-queue` | var 5s | Vault | ✅ |
| `send-followup-emails-daily` | 08:00 | Vault | ✅ (var anon — åtgärdat) |
| `verify-rates-nightly` | 03:00 | Vault | ✅ (åtgärdat) |
| `verify-constants-nightly` | 03:15 | Vault | ✅ (åtgärdat) |
| `rate-mismatch-watchdog-daily` | 09:00 | Vault | ✅ (åtgärdat) |
| `refresh-uppdragsradar-forecast-weekly` | Sön 03:00 | Vault | ✅ (åtgärdat) |
| `pipeline-health-watchdog-weekly` | Mån 06:30 | Vault | ✅ (åtgärdat) |
| `backtest-uppdragsradar-accuracy-monthly` | 5:e 02:00 | Vault | ✅ (åtgärdat) |

**8/8 jobb använder nu Vault-secret.** Fynd #1 från 5/25 stängt.

### 7.5 Realtime
Inga tabeller i `supabase_realtime`-publikationen. ✅

### 7.6 Storage upload-konvention
Oförändrad ✅

### 7.7 Client-side auth-bypass
0 träffar för `localStorage.*admin|sessionStorage.*admin|is_admin\s*=` ✅

### 7.8 PII på publika token-routes
Oförändrat sedan 5/25. PostHog-mask-kontroll (Fynd #4) kvarstår.

### 7.9 Rate limiting
`ai_usage_logs` kvot intakt. `delete-account` ej granskad denna körning (R4 från 5/25 kvarstår).

### 7.10 CORS
Oförändrat. R1 kvarstår.

---

## DEL 8 — Beroenden
✅ `code--dependency_scan`: inga high/critical sårbarheter.

---

## DEL 9 — Extensions
Oförändrat sedan 5/25. Alla extensions korrekt isolerade i `extensions`/`pgmq`/`vault`. Inga extensions i `public`. ✅

---

## Sammanfattning

### Övergripande status: **🟢 GRÖN→GUL**

Plattformen har **förbättrats sedan 5/25**. Den enda ALLVARLIGA fynden har åtgärdats helt. Tre MÅTTLIGA fynd kvarstår men ingen är blockerande för produktion. Inga KRITISKA, inga nya ALLVARLIGA.

### KRITISKA FYND
*Inga.*

### ALLVARLIGA FYND
*Inga nya. Fynd #1 från 5/25 stängt.*

### MÅTTLIGA FYND (kvarstår från 5/25 — 15 dagar gamla)

**Fynd #2 — `verifications.UPDATE` storage-policy `roles:{public}`**
- Risk: Låg (path-villkor skyddar fortfarande).
- Åtgärd: `ALTER POLICY "Users can update own verification files" ON storage.objects TO authenticated;`
- Status: KVARSTÅR från 2026-05-25.

**Fynd #3 — Email-adresser i edge function-loggar**
- Risk: Låg om retention ≤90d (GDPR).
- Åtgärd: Maska email i icke-audit-loggar, alternativt dokumentera retention explicit.
- Status: KVARSTÅR från 2026-05-25.

**Fynd #4 — PostHog URL-masking saknas/oklart för token-routes**
- Risk: Tokens kan exponeras i `$current_url`-events.
- Åtgärd: Verifiera `before_send`/`mask_personal_data_properties` i `src/lib/posthog.ts`; sätt `rel="noreferrer"` på externa länkar.
- Status: KVARSTÅR från 2026-05-25.

### REKOMMENDATIONER (kvarstår från 5/25)
- **R1:** CORS-inventering (publika vs authed-only).
- **R2:** Rate-limit på publika INSERT-routes.
- **R3:** Semver i `package.json`.
- **R4:** Audit av `delete-account` (rate-limit + idempotency).
- **R5:** ✅ Dokumentera Vault-pattern som standard för cron-triggade admin-functions — **uppnått i praktiken** denna sprint.

### Nya rekommendationer (denna körning)
- **R6:** Implementera `monthly-security-audit` edge function + pg_cron (görs i samma sprint som denna rapport). Producerar maskinläsbar baseline månadsvis och mejlar diff till `henrik@compcare.se`.

---

**Sparad som:** `security-reports/2026-06-03-security-audit.md`
