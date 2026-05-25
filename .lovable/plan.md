# Säkerhetsrevision CompCare — 2026-05-25

## Mål
Producera `security-reports/2026-05-25-security-audit.md` enligt `AUDIT_TEMPLATE.md` + `AUDIT_BRIEF.md`, samt ZIP:a till `/mnt/documents/security-audit-2026-05-25.zip`. Inga kodändringar.

## Genomförande (i ordning)

**1. Metadata** — läs `package.json` version, datum 2026-05-25, första körning.

**2. Automatiserade verktyg (parallellt)**
- `security--run_security_scan`
- `supabase--linter`
- `code--dependency_scan`

**3. DEL 1 — RLS per tabell** (via `supabase--read_query`)
- `pg_tables` med `rowsecurity` för alla `public`-tabeller
- `pg_policies` — alla policies med `qual`, `with_check`, `roles`, `cmd`
- Tabeller utan policies (LEFT JOIN)
- Flagga: `USING (true)`, `FOR ALL` utan `WITH CHECK`, OR-on-nullable, anon-access

**4. DEL 2 — Storage buckets**
- `storage.buckets` + policies på `storage.objects` för `verifications`, `invoice_reviews`, `imports`
- `rg "\.storage\.from\(" src/` — verifiera `{user_id}/`-konvention

**5. DEL 3 — SECURITY DEFINER-funktioner**
- `pg_proc` där `prosecdef=true` i `public`
- `information_schema.routine_privileges` för anon/authenticated GRANTs
- Kontrollera `search_path` satt

**6. DEL 4 — Secrets**
- `rg -n "service_role|sk_live|SUPABASE_SERVICE_ROLE" src/ public/`
- Verifiera `.env` ej i git
- `rg "console\.log" supabase/functions/` — sök PII/secrets

**7. DEL 5 — Edge functions**
- Cross-reference `supabase/config.toml` mot `supabase/functions/*`
- Admin-functions: grep `requireAdmin` tidigt i handler
- CORS-wildcards inventering
- `verify_jwt` mismatch

**8. DEL 7 — Lovable Cloud-specifika kontroller**
- 7.1 Views: `pg_class` + `reloptions` för `security_invoker`, känsliga kolumnnamn
- 7.2 RLS-logik: regex på policies för förbjudna mönster
- 7.3 Triggers på `auth.*`: `information_schema.triggers`
- 7.4 `cron.job` + senaste runs
- 7.5 `pg_publication_tables` för realtime
- 7.6 Storage upload-paths (täckt i DEL 2)
- 7.7 Client-side bypass: `rg "localStorage.*admin|is_admin\s*="`
- 7.8 PII på publika token-routes: granska `/profil/:id`, `/samarbetsintyg/:id`, `/dela`, `/kampanj/:role`
- 7.9 Rate limiting: `ai_usage_logs` senaste 14d
- 7.10 CORS-inventering (täckt i DEL 5)

**9. DEL 8 — Dependencies** (från `code--dependency_scan`)

**10. DEL 6 — Diff** = N/A (första körning)

**11. Skriv rapport** till `security-reports/2026-05-25-security-audit.md` med alla fynd + sammanfattning (GRÖN/GUL/RÖD, KRITISKA/ALLVARLIGA/MÅTTLIGA/REKOMMENDATIONER per fynd: beskrivning, risk, vem, åtgärd, status).

**12. ZIP** till `/mnt/documents/security-audit-2026-05-25.zip` (rapporten + ev. tool-output-bilagor).

## Scope-respekt
- Endast säkerhetsgranskning i låsta områden (Fakturakontroll AI-prompts/modeller/regelmotor, compensation-engine) — inga förslag på logik/UX/AI-ändringar.
- Marketplace-isolation respekteras (`mp_*` granskas endast säkerhetsmässigt).
- Inga kodändringar görs — endast rapport + ZIP.

## Leverans
- `security-reports/2026-05-25-security-audit.md`
- `/mnt/documents/security-audit-2026-05-25.zip` (presentation-artifact)
- Kort sammanfattning i chatt med status + topp-fynd.
