# Pågående arbete

Endast aktuellt arbete. Historik hör hemma i `CONSOLIDATION.md` eller `docs/archive/`.

## Klart 2026-07-28 — Konsolidering Fas 1–5

- Fas 1: `CONSOLIDATION.md` — inventering av 300 filer, 62 routes, 92 edge functions.
- Fas 2: beslut — arkivera i `src/_archive/`, ta bort alla redirects, utred prislogik, radera bekräftat döda functions.
- Fas 3: 114 filer arkiverade, 33 redirect-routes borttagna, 11 edge functions raderade, dokument arkiverade till `docs/archive/`.
- Fas 4: `TERMINOLOGY.md` skapad, `mem://index.md` reducerad från 72 till 13 poster.
- Fas 5: `README.md` omskriven, denna fil tömd.

## Öppna punkter

1. **Prislogik (från Fas 2).** `src/data/skrPrices2026.ts` och `src/hooks/useContractRate.ts`
   importeras inte av någon fil. Priserna kommer i dag från `contract_version_rates`
   via `pricing-engine`/direkta queries samt hårdkodade värden i rapportsidorna.
   Beslut kvarstår: koppla rapportsidorna till `useContractRate` eller ta bort fallbacken.
2. **Borttagna redirects.** Gamla publika URL:er (`/verify/:id`, `/b2b`, `/din-data` m.fl.)
   ger nu 404. Uppdatera `public/sitemap.xml` och `public/llms.txt` om de refererar dem.
3. **DB-schema.** Tabeller för arkiverade spår (`ref_*`, `verifications`, `invoice_*`, `mp_*`)
   är orörda och innehåller produktionsdata. Städning är ett separat, senare beslut.
