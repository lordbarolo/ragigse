# Åtgärdsplan utifrån kodkontrollen 2026-08-04

Jag har verifierat de kritiska fynden mot produktionsdatabasen och koden innan planen skrevs. Bekräftat:

- `ref_has_role` har **inte** EXECUTE för `authenticated` eller `anon`, och **29 RLS-policyer** (public + storage) anropar funktionen → frågor kraschar i stället för att filtrera.
- `ref_get_public_profile` **finns inte** i databasen, men edge-funktionen `get-public-profile` anropar den (`index.ts:58`).
- `src/routes/index.tsx` blockerar varje sidvisning på `ensureQueryData(ratesQueryOptions)` utan try/catch.
- `scripts/generate-sitemap.ts` genererar fortfarande `/lon/*`, kampanjsidor, rapport-alias samt `llms.txt`/`openapi.json`.
- `__root.tsx` kör `HelmetProvider` parallellt med TanStack head.

## Steg 1 — P0: återställ RLS för inloggade (akut)

- Migration: `GRANT EXECUTE ON FUNCTION public.ref_has_role(uuid, ref_app_role) TO authenticated;` (endast `authenticated`, inte `anon`).
- Flytta `ref_has_role` från `ALL_DENIED` i `src/security/rpcGrants.test.ts` till en ny lista "tillåten för authenticated, nekad för anon", så testet inte återinför buggen.
- Verifiera efteråt med en faktisk `SELECT` som inloggad mot `leads`, `tool_suggestions`, `organizations`.

## Steg 2 — P0: `get-public-profile`

Rekommendation: **avpublicera** endpointen (Ref-ID är arkiverat, ingen aktiv publik profilvy finns).

- Ta bort edge-funktionen `get-public-profile`.
- Ta bort endpointen ur `public/openapi.json`, `public/llms-full.txt`, `public/llms.txt`, `public/agent-*`.

Alternativ om profilvyn ska tillbaka: återskapa RPC:n först — men det görs då som separat uppdrag.

## Steg 3 — P1: robust startsida

- Lägg `try/catch` runt loadern i `src/routes/index.tsx` så sidan renderas utan prisdata vid fel.
- `Rateraknare`/`useRates5c` visar neutral "prisdata kunde inte hämtas"-status i stället för krasch.

## Steg 4 — P1: sitemap-städning (ingen layoutändring)

Uppdatera `scripts/generate-sitemap.ts` till ~19 URL:er:

- Ta bort `lonEntries()` (2 552 URL:er) och sätt `noindex` på `/lon/$specialty/$city`.
- Ta bort `CAMPAIGN_ROLES` ur sitemapen + `noindex` på `/kampanj/$role` (sidorna behålls för utskick).
- Behåll `/rapport/sjukskoterska`; 301 från de fem alias-slugarna (`legitimerad-sjukskoterska`, `leg-sjukskoterska`, `leg-ssk`, `ssk`, `allmansjukskoterska`).
- Ta bort `/llms.txt` och `/openapi.json` ur sitemapen (annonseras i robots.txt).
- `/bollnas/lakare-alm` → `noindex`.

Kvar: `/`, `/vanliga-fragor`, `/faktasidor`, `/integritetspolicy`, 3 rapporter + 13 läkarspecialistrapporter.

## Steg 5 — P1: domänsynk i mejl

- Sätt `APP_BASE_URL`-default till `https://vardbemanning.ai` i `send-transactional-email`, `send-password-recovery`, `save-email`, `send-followup-emails` (länkar i mejl).
- Avsändardomänen förblir Resend-verifierade `compcare.se` tills `vardbemanning.ai` är verifierad i Resend — separat spår.

## Steg 6 — P2: skydd och städning

- Rate limit på `submitToolSuggestion` (per IP + per e-post, samma mönster som `home-assistant`) och på `create-report`.
- Bekräftelseflödet: `/api/public/bekrafta-forslag` → läs `?forslag=` på startsidan och visa kvittens; byt till POST-bekräftelse (klick på sida) så mejlskannrar inte auto-bekräftar.
- Admin-krav på `parse-avrop`.
- Ta bort `HelmetProvider` ur `__root.tsx` när inga aktiva sidor använder Helmet (inventeras först).
- Flytta `src/pages/demo/Startsida5c.tsx` → `src/pages/Startsida.tsx` (ren flytt, ingen designändring).
- Uppdatera `scripts/e2e-smoketest.ts` till nuvarande startsideflöde.

## Steg 7 — P3

Städa oanvända variabler i `OvergangChatt.tsx`, korta ner presetcachen i `home-assistant` till 1 h, samla fonter på rot-nivå.

## Beslut jag behöver från dig

1. `get-public-profile`: avpublicera (mitt förslag) eller återskapa RPC:n?
2. Steg 7 i rapporten (TanStack SSR vs SPA-revert) ligger utanför denna plan — vill du att jag utreder det separat?

## Teknisk not — dokumentera default privileges-fällan

`ALTER DEFAULT PRIVILEGES ... REVOKE FROM PUBLIC` gäller fortfarande, så varje ny databasfunktion saknar EXECUTE tills den GRANT:as explicit. Regeln skrivs in i projektminnet så alla framtida migrationer inkluderar explicita GRANT-rader (samma princip som tabell-GRANTs).
