# Slutlig plan: Frys v1.0 + Marketplace Isolation

## 0. Direktiv som gäller från och med nu (memory-regel)

**Marketplace Isolation Rule** läggs in i `mem://index.md` som Core-regel så att alla framtida AI-sessioner respekterar den automatiskt:

> All marketplace- och agentbaserad-förhandlings-utveckling sker bakom `VITE_FEATURE_MARKETPLACE`-flag, i `mp_*`-tabeller och `marketplace-*` edge functions med `/marketplace`-route-prefix. Befintlig kod, routes, copy, DB-schema, RLS-policies, cron-jobb och edge functions rörs ALDRIG utan explicit OK från användaren. Default: flagga OFF i prod.

Detta är en hård regel — ingen tolkning, ingen "smart sammanslagning", inga "passa på"-refaktoreringar i befintliga filer.

## 1. De 9 godkända kritiska punkterna (sammanfattning)

Alla 9 punkter från tidigare review är inbakade i denna plan:
1. Feature flag både i klient (`VITE_FEATURE_MARKETPLACE`) och DB (`app_settings.marketplace_enabled`) — dubbelt skydd
2. Strikt namnrymd: `mp_*` för tabeller, `marketplace-*` för edge functions, `/marketplace/*` för routes
3. Inga `ALTER TABLE` på befintliga tabeller — endast nya `mp_*`-tabeller
4. Egna RLS-policies per `mp_*`-tabell, ingen återanvändning av existerande policies
5. Egna cron-jobb med `mp_`-prefix, befintliga jobb orörda
6. Diff-check före varje marketplace-PR: lista över rörda filer får inte innehålla något utanför `marketplace/`-, `mp_`- eller `/marketplace`-namnrymd (förutom router-registrering och flag-läsning)
7. Rollback via chat-revert + DB-flag + drop av `mp_*`-tabeller
8. `LAUNCH_SNAPSHOT.md` som baseline-dokumentation av v1.0
9. Memory-regel som persisterar direktivet över sessioner

## 2. Steg 0 — Leverabel innan marketplace-bygget startar

Tre konkreta saker, helt utan att röra befintlig produktkod:

### 2.1 `LAUNCH_SNAPSHOT.md`
Baseline-dokumentation i repo-roten:
- Lista över alla aktiva routes (från `src/App.tsx`)
- Lista över alla edge functions (från `supabase/config.toml`)
- Lista över alla aktiva pg_cron-jobb
- Lista över alla storage buckets + privacy-status
- Git/chat-revert-punkt: meddelandet märks "v1.0-launch"
- Datum + version

### 2.2 Feature flag-infrastruktur
Migration som skapar:
- `app_settings`-tabell: `key text primary key, value jsonb, updated_at timestamptz`
- Seed-rad: `('marketplace_enabled', 'false'::jsonb)`
- RLS: endast admin kan UPDATE; alla autentiserade kan SELECT på `marketplace_enabled`-raden via en safe-view eller security-definer-funktion `public.get_feature_flag(key text)`
- Klient-helper `src/lib/featureFlags.ts` som läser `VITE_FEATURE_MARKETPLACE` (build-time) OCH `marketplace_enabled` från DB (runtime). Båda måste vara true för att marketplace-UI ska visas.

Inget UI ändras i detta steg — bara infra.

### 2.3 Memory-regel
Skriv `mem://constraints/marketplace-isolation.md` med fullständig regel + reference den i Core-sektionen i `mem://index.md`.

## 3. Marketplace-bygget (kommer EFTER ditt OK på steg 0)

När du sagt "kör marketplace steg 1" startar isolerat arbete enligt:

### 3.1 Namnrymd (hård)
- DB-tabeller: `mp_listings`, `mp_offers`, `mp_negotiations`, `mp_agent_runs`, etc.
- Edge functions: `marketplace-create-listing`, `marketplace-agent-negotiate`, etc.
- Routes: `/marketplace`, `/marketplace/listing/:id`, `/marketplace/agent/:id`
- React-kod: `src/pages/marketplace/*`, `src/components/marketplace/*`, `src/hooks/marketplace/*`

### 3.2 Skydd mot läckage
- Marketplace-routes registreras i `App.tsx` bakom `if (featureFlag) { ... }`-block
- Inga marketplace-imports i befintliga komponenter
- Diff-check körs före varje commit: `git diff --name-only` får bara matcha tillåtna paths

### 3.3 Testbarhet
- `VITE_FEATURE_MARKETPLACE=true` lokalt + i preview
- `marketplace_enabled=false` i prod-DB tills du säger "lansera"
- Ingen "halvvägs"-exponering där en användare kan snubbla in

## 4. Rollback-vägar (tre lager)

1. **Chat-revert**: tillbaka till "v1.0-launch"-meddelandet → hela repot återställs
2. **DB-flag**: `UPDATE app_settings SET value='false' WHERE key='marketplace_enabled'` → marketplace försvinner instant utan deploy
3. **DB-cleanup**: `DROP TABLE mp_*` påverkar ingen befintlig data eftersom inga FK pekar in i existerande tabeller

## 5. Tekniska detaljer

**Filer som skapas i steg 0:**
- `LAUNCH_SNAPSHOT.md` (ny, repo-rot)
- `supabase/migrations/<timestamp>_app_settings.sql` (ny migration)
- `src/lib/featureFlags.ts` (ny helper)
- `mem://constraints/marketplace-isolation.md` (ny memory)
- `mem://index.md` (uppdaterad — Core + Memories-sektion)

**Filer som INTE rörs i steg 0:**
Alla andra. Inga ändringar i `App.tsx`, `Survey.tsx`, edge functions, RLS eller någon befintlig komponent.

**Säkerhetsgrind:**
Efter migrationen körs `security--run_security_scan` + `supabase--linter` för att säkra att `app_settings` har korrekt RLS och att inga nya warnings introducerats. Resultat loggas i chat före leverabel-bekräftelse.

## 6. Vad som händer när du säger "kör"

Jag växlar till build-mode och levererar exakt steg 0 (de tre artefakterna ovan), inget annat. Sen pausar jag och väntar på "kör marketplace steg 1" innan något i `mp_*`-namespace skapas.