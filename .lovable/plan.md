## Mål
Skapa en återanvändbar säkerhetsrevisions-mall för CompCare som täcker alla 8 delar (de 5 ursprungliga + 3 CompCare-specifika tillägg som identifierades i förra svaret).

## Leverabel
En fil: `security-reports/AUDIT_TEMPLATE.md`

## Innehåll i mallen

**Metadata-block** (datum, projekt, granskare, version, tidigare rapport).

**DEL 1 — RLS-policies** (original)
- Alla tabeller + RLS on/off, SELECT/INSERT/UPDATE/DELETE-policies, cross-user-läsning, anon-läsning, flaggning av `FOR ALL TO public`.

**DEL 2 — Storage buckets** (original)
- Publik/privat, SELECT/INSERT/DELETE-policies, anon upload, cross-user file access.

**DEL 3 — SECURITY DEFINER-funktioner** (original)
- Namn, syfte, anropare, GRANTs, motivering.

**DEL 4 — Exponerade nycklar & secrets** (original + utökning)
- `service_role` i frontend, hårdkodade nycklar, `.env` i git, **+ `git log -p -S "service_role"` för commit-historik**.

**DEL 5 — Edge functions** (original + utökning)
- Auth, input-validering, anrops-kontroll, känsliga logs, **+ kryssa mot `supabase/config.toml` att `verify_jwt`-flagga matchar avsikt**, **+ verifiera `requireAdmin()` faktiskt anropas i alla `admin-*` functions**.

**DEL 6 — Jämförelse mot tidigare rapport** (original)
- Nya/åtgärdade/kvarstående fynd, trend.

**DEL 7 — Lovable Cloud-specifika kontroller** (NY)
- 7.1 **Views** — lista alla i `public`, `security_invoker` on/off, exponerade kolumner, GRANTs till anon/authenticated.
- 7.2 **RLS-policy-logik** — flagga `USING (col IS NULL OR ...)` på nullable, `USING (true)`, `FOR ALL` utan `WITH CHECK`, `auth.uid()` mot nullable kolumn.
- 7.3 **Triggers** — alla triggers på `auth.*`, särskilt `handle_new_user` (whitelist för `raw_user_meta_data->>'role'`).
- 7.4 **pg_cron-jobb** — lista alla, ägare, funktion, privilegier.
- 7.5 **Realtime-publikationer** — vilka tabeller i `supabase_realtime`.
- 7.6 **Storage upload-konvention** — verifiera kod uploadar till `{user_id}/...`, inte rotmappen.
- 7.7 **Client-side auth-bypass** — sök `localStorage`/`sessionStorage` för admin-flags, routes endast skyddade av `ProtectedRoute` utan RLS-motpart.
- 7.8 **PII på publika token-routes** — `/profil/:id`, `/samarbetsintyg/:id`, `/dela`, `/kampanj/:role`: tokens i Referer/analytics, PostHog PII, JSON-LD whitelist.
- 7.9 **Rate limiting** — AI-quota multi-account-bypass, BankID-endpoints, `delete-account`.
- 7.10 **CORS** — `Access-Control-Allow-Origin` per edge function, dokumentera medvetna `*`.

**DEL 8 — Beroenden & supply chain** (NY)
- `npm audit`, lockfile-integritet, `package.json` overrides, outdated critical deps.

**DEL 9 — Automatiserade verktyg** (NY)
- Kör parallellt: `supabase--linter` + intern `security--run_security_scan` + denna manuella check. Lista vilka klasser av buggar varje verktyg fångar.

**Rapport-format-block** (original)
- Sammanfattning, kritiska/allvarliga/måttliga fynd, rekommendationer, filsökväg `security-reports/YYYY-MM-DD-security-audit.md`.

**CompCare-specifika kända safe-zones** (för att slippa falska positiva)
- `calloff_imports_public` view är medvetet `SECURITY DEFINER` (vår fix).
- Token-views på `ref_*` är medvetet publika via RPC.
- Publika edge functions i `config.toml` (komplett lista) — validerar input internt.

## Vad jag INTE gör i denna plan
- Kör inte revisionen nu (det är en separat task).
- Ändrar inte den befintliga AUDIT_BRIEF.md (kompletterar med en ny fil).
