

# Säkerhets- & Tracking-protokoll inför trafiklansering

## Bakgrund
Inför trafikdrivning behöver vi två stående rutiner:
1. **Säkerhet**: Varje ändring ska säkerhetsgranskas direkt efter implementation.
2. **PostHog**: Daglig verifiering att tracking fungerar end-to-end.

## Del 1 — Säkerhetsprotokoll (sparas som memory)

Skapa `mem://security/change-protocol` som **Core-regel** så det appliceras på varje framtida ändring:

**Regel som sparas:**
> Efter varje kodändring: (1) analysera hur RLS, auth-flow, edge functions, exponerade endpoints eller publika data kan ha påverkats. (2) Vid osäkerhet — kör `security--run_security_scan` och `supabase--linter` direkt. (3) Logga fynd i chatten innan uppgiften markeras klar.

**Konkret checklista som triggas vid:**
- Nya/ändrade tabeller → kontrollera RLS-policies
- Nya edge functions → verifiera `requireAdmin`/auth-validering
- Nya publika routes → kontrollera att ingen PII läcker
- Storage-bucket-ändringar → verifiera privat/publik-status
- Ändringar i `handle_new_user` eller roll-tilldelning → granska privilege escalation-risk

**Index-uppdatering**: Lägg till en Core-rad: *"Efter varje ändring: säkerhetsanalys obligatorisk. Vid osäkerhet kör security scan + linter."*

## Del 2 — Daglig PostHog-hälsokontroll

### A. Skapa `mem://tech/posthog-daily-check`
Dokumentera daglig rutin:
1. Kontrollera att `posthog.__loaded === true` på produktionsdomän
2. Verifiera att `landing_viewed` triggar på `/`
3. Kontrollera att `track-event` edge function loggar till `analytics_events` (senaste 24h)
4. Verifiera att internal traffic-filtret (`is_internal_traffic`) inte blockerar produktionsbesökare
5. Kontrollera consent-flödet: `getConsent()` → `posthog.opt_in_capturing()`

### B. Skapa diagnostik-edge function `posthog-health-check`
En endpoint jag kan anropa dagligen som returnerar:
- Antal `analytics_events` senaste 24h (ska > 0 vid trafik)
- Antal unika `lead_id` senaste 24h
- Topp-5 event-namn senaste 24h
- Varning om noll events trots produktionsdomän

### C. Frontend sanity-logg (endast prod)
I `src/lib/posthog.ts`: lägg till en `console.info("[PostHog] active on", hostname, "distinct_id:", id)` som körs på prod-domän. Ger snabb verifiering i devtools om något brutits.

### D. Verifiera nuvarande PostHog-setup
Granska att:
- `VITE_POSTHOG_KEY` läses korrekt (fallback fungerar)
- `opt_out_capturing_by_default: true` + cookie-consent triggar `opt_in` korrekt
- `is_internal_traffic`-filtret i `trackEvent.ts` inte filtrerar bort `compcare.se` eller `www.compcare.se` (kontrollerat: filtrerar endast localhost + lovable-domäner ✓)
- `posthog.identify()` körs vid login (bekräftat i `useAuth.ts` ✓)

## Del 3 — Initial baseline-säkerhetsscan

Kör direkt efter godkännande:
1. `security--run_security_scan` — fullständig scan
2. `supabase--linter` — DB-linter
3. Åtgärda kvarvarande `USING (true)`-policies från förra granskningen:
   - `campaigns` INSERT → kräv admin-roll
   - `orgs` INSERT → behåll publik (org-skapande sker före auth ibland) ELLER kräv `authenticated`
   - `leads` INSERT/UPDATE/DELETE → INSERT publikt OK (lead capture), men UPDATE/DELETE ska kräva admin
   - `ref_profile_views` / `ref_access_logs` INSERT → behåll publikt (audit-loggar)

## Tekniska detaljer

**Filer som ändras/skapas:**
- `mem://security/change-protocol` (ny memory)
- `mem://tech/posthog-daily-check` (ny memory)
- `mem://index.md` (uppdatera Core + Memories-lista)
- `src/lib/posthog.ts` (lägg till prod sanity-logg)
- `supabase/functions/posthog-health-check/index.ts` (ny edge function, admin-skyddad)
- DB-migration för RLS-skärpning på `campaigns`, `leads` UPDATE/DELETE

**Säkerhetsanalys efter implementation:**
- Ny edge function: skyddas med `requireAdmin` → ingen publik exponering av analytics-data
- RLS-skärpning: minskar attack surface utan att bryta lead capture-flöde
- Memory-regler: ingen kodpåverkan, men förstärker framtida granskningar

## Daglig rutin från och med imorgon

Varje gång du säger "kör daglig check" eller "morgonkoll":
1. Anropa `posthog-health-check` edge function
2. Rapportera event-count, unique leads, top events
3. Kör `security--run_security_scan` om det gått >7 dagar sedan senast
4. Rapportera resultat med tydlig ✅/⚠️/❌-status

