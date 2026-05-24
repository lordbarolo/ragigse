# CompCare — Säkerhetsrevision (mall)

> Kopiera denna fil till `security-reports/YYYY-MM-DD-security-audit.md` och fyll i.
> Kör parallellt: `supabase--linter` + `security--run_security_scan` + denna manuella checklista.

## Metadata
- **Datum:** YYYY-MM-DD
- **Projekt:** CompCare
- **Granskad av:** [namn]
- **Version:** [från `package.json`]
- **Tidigare rapport:** [datum eller "Första körning"]
- **Scope:** Lovable Cloud (Supabase EU) + frontend + edge functions

---

## DEL 1 — RLS-policies (per tabell)

För varje tabell i `public`:
- [ ] RLS enabled?
- [ ] SELECT-policy: vem? villkor? cross-user-läsning möjlig?
- [ ] INSERT-policy: `WITH CHECK` korrekt? `user_id = auth.uid()`?
- [ ] UPDATE-policy: `USING` + `WITH CHECK`?
- [ ] DELETE-policy: explicit eller saknas?
- [ ] Anon-access: avsiktlig?
- [ ] Flagga: `FOR ALL TO public`, `USING (true)`, `USING (col IS NULL OR ...)` på nullable.

Använd: `supabase--read_query` mot `pg_policies`.

---

## DEL 2 — Storage buckets

Per bucket (`verifications`, `invoice_reviews`, `imports`, ev. nya):
- [ ] Public/privat enligt avsikt?
- [ ] SELECT/INSERT/UPDATE/DELETE-policies finns?
- [ ] Path-konvention `{user_id}/...` enforced i policyn?
- [ ] Verifiera att **kod** uploadar till `{user_id}/...`, inte rotmappen (annars är policyn värdelös).
- [ ] Anon upload möjlig?

---

## DEL 3 — SECURITY DEFINER-funktioner

Lista alla `SECURITY DEFINER`-funktioner i `public`:
- [ ] Namn, syfte, vem anropar?
- [ ] `SET search_path` satt?
- [ ] GRANTs till anon/authenticated rimliga?
- [ ] Inputvalidering inne i funktionen?
- [ ] Motivering dokumenterad?

---

## DEL 4 — Exponerade nycklar & secrets

- [ ] `service_role` förekommer EJ i `/src` eller `public/`.
- [ ] Inga hårdkodade API-nycklar i frontend.
- [ ] `.env*` inte committad.
- [ ] **Git-historik:** `git log -p -S "service_role"` + `git log -p -S "sk_live"` + `git log -p -S "SUPABASE_SERVICE_ROLE"` — inga träffar.
- [ ] Inga secrets i edge function-loggar (kontrollera `console.log`).

---

## DEL 5 — Edge functions

Per function i `supabase/functions/*`:
- [ ] Auth-krav: matchar `verify_jwt` i `supabase/config.toml` avsikten?
- [ ] Publika functions: validerar input, rate-limitar, läcker inte interna fel.
- [ ] Admin-functions (`admin-*`): anropar `requireAdmin()` **tidigt** (inte bara importerar).
- [ ] CORS: `Access-Control-Allow-Origin` — `*` endast om medvetet (lista undantagen).
- [ ] Inga PII/secrets i `console.log`.
- [ ] `service_role` används endast där det krävs.

---

## DEL 6 — Diff mot föregående rapport

- **Nya fynd:** …
- **Åtgärdade fynd:** …
- **Kvarstående fynd:** … (ange ålder)
- **Trend:** förbättring/stagnation/regression.

---

## DEL 7 — Lovable Cloud-specifika kontroller

### 7.1 Views
Lista alla views i `public`:
- [ ] `security_invoker` värde (true = invoker, false = definer).
- [ ] Vilka kolumner exponeras — inga `raw_*`, `token`, `secret`?
- [ ] GRANTs till anon/authenticated.
- [ ] Safe-view-pattern följs för känslig data.

**Kända safe-zones (false positives, ignorera):**
- `calloff_imports_public` — medvetet `SECURITY DEFINER` (exponerar endast aggregat).
- `ref_*` token-views — publika via RPC, by design.

### 7.2 RLS-policy-logik (utöver DEL 1)
Sök efter:
- [ ] `USING (col IS NULL OR shared_flag = true)` på nullable → **förbjudet** ([RLS OR-on-Nullable Ban](mem://constraints/rls-or-on-nullable)).
- [ ] `USING (true)` / `WITH CHECK (true)`.
- [ ] `auth.uid()` jämförs med nullable kolumn → NULL-läckage.
- [ ] `FOR ALL` utan både `USING` och `WITH CHECK`.

### 7.3 Triggers på `auth.*`
- [ ] `handle_new_user`: whitelistar `raw_user_meta_data->>'role'` till `('individual','agency')`?
- [ ] Inga andra triggers på `auth.users`/`auth.identities` som ger privilegieeskalering?

### 7.4 `pg_cron`-jobb
- [ ] Lista alla: `SELECT * FROM cron.job;`
- [ ] Ägare = `postgres`? Vilken funktion? Privilegier rimliga?
- [ ] Kända: `aggregate_calloff_monthly`, `refresh-uppdragsradar-forecast`, posthog-health, followup-emails, watchdog.

### 7.5 Realtime-publikationer
- [ ] `SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';`
- [ ] Varje tabell: är schema-exponering OK? RLS gäller men metadata läcker.

### 7.6 Storage upload-konvention
- [ ] Sök i `/src` efter `.storage.from(...).upload(` — verifiera path börjar med `${user.id}/`.

### 7.7 Client-side auth-bypass
- [ ] Sök: `localStorage.*admin`, `sessionStorage.*admin`, `is_admin =`.
- [ ] Routes som endast skyddas av `ProtectedRoute` utan backend-RLS-motpart.
- [ ] Hårdkodade admin-emails i frontend.

### 7.8 PII på publika token-routes
Routes: `/profil/:id`, `/samarbetsintyg/:id`, `/dela`, `/kampanj/:role`, `/verify/:id`.
- [ ] Tokens läcker inte via `Referer` (använd `rel="noreferrer"` på externa länkar).
- [ ] PostHog `$current_url` maskar tokens.
- [ ] JSON-LD / OG-meta whitelistar fält (ingen email, telefon, personnummer).
- [ ] `ref_access_logs` loggar publika besök (medvetet).

### 7.9 Rate limiting
- [ ] `ai_usage_logs` quota (30/dag) — kan kringgås med flera konton? Acceptabelt?
- [ ] BankID-endpoints rate-limitade?
- [ ] `delete-account` idempotent + rate-limitad?

### 7.10 CORS per edge function
- [ ] Lista alla functions med `Access-Control-Allow-Origin: *`.
- [ ] Dokumentera vilka som är medvetet öppna (publika APIs) vs. borde låsas till `compcare.se`.

---

## DEL 8 — Beroenden & supply chain

- [ ] `npm audit` (eller `bun audit`) — kritiska/höga loggade.
- [ ] `package-lock.json` / `bun.lockb` integritet (ingen oväntad diff).
- [ ] `package.json` `overrides` — granska varför de finns.
- [ ] Outdated kritiska deps: `@supabase/*`, `react`, `vite`.

---

## DEL 9 — Automatiserade verktyg

Kör och bifoga output:
- [ ] `supabase--linter` — fångar: `function_search_path_mutable`, `auth_otp_long_expiry`, RLS disabled, extension i public, security_invoker mismatch.
- [ ] `security--run_security_scan` — Lovables interna scanner (PII, exposed tables, etc.).
- [ ] Manuell checklista ovan — fångar logik som verktyg missar.

---

## Sammanfattning

**Övergripande status:** [GRÖN / GUL / RÖD]

### KRITISKA FYND (åtgärda omedelbart)
För varje:
- **Fynd:** …
- **Risk:** …
- **Vem kan utnyttja:** anon / authenticated / admin
- **Åtgärd:** [exakt SQL/kod]
- **Status:** NY / KVARSTÅR FRÅN [datum] / ÅTGÄRDAD

### ALLVARLIGA FYND (åtgärda inom 7 dagar)
[samma format]

### MÅTTLIGA FYND (åtgärda inom 30 dagar)
[samma format]

### REKOMMENDATIONER
[förbättringar som inte är säkerhetsrisker]

---

**Spara som:** `security-reports/YYYY-MM-DD-security-audit.md`
