---
name: Retired modules
description: Produktspår som är avstängda och arkiverade i src/_archive — Ref-ID, Din data/Dokhus, Uppdragsradar, Agency, Marketplace, Fakturakontroll, Academy, AI-chatt
type: constraint
---

Konsolidering 2026-07-28 arkiverade följande spår till `src/_archive/`
(speglar gamla `src/`-strukturen, exkluderad från typecheck och bundling):

Ref-ID/Referly · Din data/Dokhus/Verify · Uppdragsradar/Reijdar · Agency/B2B ·
Marketplace · Fakturakontroll · Academy · Eget bolag · AI-chatt · demo-/experimentsidor ·
oanvända landing- och teaser-komponenter.

Raderade edge functions (kan återställas via History): get-verify-data,
get-shared-documents, download-shared-document, invoice-analyzer,
ai-consultant-coach, marketplace-* (4), redeem-coupon, radar-notify.

**Regler:**
- Bygg inte vidare på dessa spår utan att användaren explicit begär det.
- Föreslå dem inte spontant.
- DB-schemat är orört — produktionsdata finns kvar i `ref_*`, `verifications`,
  `invoice_*`, `mp_*`.
- Vid återupptagning: flytta tillbaka filerna, laga `@/`-imports, uppdatera
  `TERMINOLOGY.md` och `src/App.tsx`.

**Öppen fråga:** `src/data/skrPrices2026.ts` och `src/hooks/useContractRate.ts`
importeras inte av någon fil. De behölls som typad fallback. Priserna hämtas i
dag från `contract_version_rates` via `pricing-engine`/direkta queries samt
hårdkodade värden i rapportsidorna. Om 1:1-bindningen roll→pris ska garanteras
i koden behöver rapportsidorna kopplas till `useContractRate`.
