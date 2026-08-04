# Åtgärdsplan 2026-08-04 — godkänd version med bindande justeringar

Fattade beslut (ifrågasätts inte):

1. `get-public-profile`: **avpubliceras**. RPC:n återskapas inte.
2. SSR-vs-SPA-utredningen utgår. Branchen `main` rörs aldrig; ingen merge `main` <-> `Augusta`.
3. Enda tillåtna nya användarvända texten: **"Prisdata kunde inte hämtas just nu."**

## Steg 1 — P0: RLS för inloggade (EGEN COMMIT, verifieras före allt annat)

a) Migrationsfil: `GRANT EXECUTE ON FUNCTION public.ref_has_role(uuid, ref_app_role) TO authenticated;` — endast `authenticated`, inte `anon`, inte `PUBLIC`.
b) Samma commit: flytta `ref_has_role` i `src/security/rpcGrants.test.ts` från `ALL_DENIED` till ny kategori "EXECUTE för authenticated, nekad för anon".
c) Verifiering som inloggad: `SELECT` mot `leads`, `tool_suggestions`, `organizations` ska ge rader/tom mängd — inte `42501 permission denied for function ref_has_role`.
d) Verifiering som anon: startsidans priser (`rates`-SELECT), lead-insättning i publika flödet och `/resultat`-flödet fungerar. Anon-fel mot admin-tabeller är förväntat (fail-closed) och OK — men publika flödet får inte vara påverkat.
e) Rapportera c) och d) innan nästa steg påbörjas.

## Steg 2 — P0: avpublicera `get-public-profile`

- Ta bort edge-funktionen.
- Ta bort referenser i `public/openapi.json`, `public/llms-full.txt`, `public/llms.txt`, `public/agent-index.json`.
- Verifiera med grep att inga träffar på `get-public-profile` finns kvar i `src/` eller `public/`.

## Steg 3 — P1: robust startsida

a) `try/catch` runt loadern i `src/routes/index.tsx`: vid fel renderas sidan utan prisdata, aldrig felsida.
b) `Rateraknare` / `RolltabellDark` visar exakt "Prisdata kunde inte hämtas just nu." när data saknas.
c) Verifiering: simulera att rates-queryn kastar och bekräfta att hero + innehåll fortfarande renderar.

## Steg 4 — P1: mejl/domänsynk (kod + env)

a) `APP_BASE_URL`-default → `https://vardbemanning.ai` i `send-transactional-email`, `send-password-recovery`, `save-email`, `send-followup-emails`.
b) Env-variabeln sätts i projektinställningar (utanför min åtkomst) — jag listar de exakta stegen.
c) Avsändardomänen förblir Resend-verifierade `compcare.se` tills `vardbemanning.ai` är verifierad.

## Steg 5 — P1: sitemap-städning (ingen layoutändring)

`scripts/generate-sitemap.ts` → ~19 URL:er:

- Ta bort `lonEntries()`; `noindex` på `/lon/$specialty/$city`.
- Ta bort `CAMPAIGN_ROLES` ur sitemapen; `noindex` på `/kampanj/$role` (sidorna behålls för utskick).
- Behåll `/rapport/sjukskoterska`; 301 från de fem alias-slugarna.
- Ta bort `/llms.txt` och `/openapi.json` ur sitemapen (annonseras i robots.txt).
- `/bollnas/lakare-alm` → `noindex`.

Kvar: `/`, `/vanliga-fragor`, `/faktasidor`, `/integritetspolicy`, 3 rapporter + 13 läkarspecialistrapporter.

## Steg 6 — skydd (reducerat scope)

a) Rate limit på `submitToolSuggestion`: per IP och per e-post, samma mönster som `home-assistant`.
b) Rate limit på `create-report`: per IP.
c) Bekräftelseflödet: `GET /api/public/bekrafta-forslag` → sida med POST-bekräftelse (knapptryck) så mejlskannrar inte auto-bekräftar; kvittens på startsidan via `?forslag=`.
d) Admin-krav på `parse-avrop` (samma `requireAdmin`-mönster som övriga admin-funktioner).
e) Ren filflytt `src/pages/demo/Startsida5c.tsx` → `src/pages/Startsida.tsx` + uppdaterade imports. Noll design-/copyändringar.
f) Uppdatera `scripts/e2e-smoketest.ts` till nuvarande startsideflöde.

**Struket:** HelmetProvider-borttagningen utgår. 21 aktiva sidor sätter meta via den Helmet-baserade SEO-komponenten; migrering till route-level `head()` hanteras som separat uppdrag. `HelmetProvider` och `SEO.tsx` rörs inte nu.

## Steg 7 — förstärkt skydd mot grants-fällan

Bygg ut `src/security/rpcGrants.test.ts` till en heltäckande allowlist: varje funktion i `public`-schemat med förväntade grants (`authenticated`/`anon`/`service_role`). Testet failar om en funktion saknas i listan, så varje ny databasfunktion tvingar explicit ställningstagande. Regeln dokumenteras även i projektminnet.

## Steg 8 — P3 (sist)

Oanvända variabler i `OvergangChatt.tsx`, presetcache i `home-assistant` 24h → 1h, fontstädning.

## Globala regler

- Steg 1 = egen commit + verifiering före allt annat. Övriga steg batchas i logiska commits per steg.
- Alla databasändringar via migrationsfiler.
- Rör inte: fakturakontrollflödet (`invoice-extract`/`invoice-analyzer`), marketplace-kod, BankID-flödet, branchen `main`.
- Ingen användarvänd text ändras utöver den godkända fallbacktexten.
- Ingen svepande REVOKE/säkerhetshärdning i detta uppdrag.
- Avslutas med verifieringsrapport per steg: vad som gjordes, vad som verifierades, avvikelser.
