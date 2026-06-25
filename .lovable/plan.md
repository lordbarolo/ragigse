
# Plan: Faktor 1,42 → 1,38 + riskmarginal-copy

## Bakgrund
1,42 är idag en schablon för arbetsgivarkostnad (sociala avgifter + ITP1 + särskild löneskatt + AFA + buffert).
Strikt verklig nivå enligt `supabase/functions/_shared/calc.ts` ≈ 37,86 %.
Vi kompromissar på **1,38** (≈ 31,42 % AG-avg + 4,5 % ITP1 + 1,09 % löneskatt + 0,85 % AFA = 37,86 % — avrundat upp till 38 %).

## Steg 1 — Inventera alla förekomster
20 filer innehåller `1.42`. De delas i tre grupper:

**A. Beräkningskonstant (måste ändras):**
- `src/lib/calc.ts`
- `supabase/functions/_shared/calc.ts`
- `supabase/functions/compensation-intelligence/index.ts`
- `supabase/functions/ai-pricing-coach/index.ts`
- `supabase/functions/generate-pdf/index.ts`
- `supabase/functions/verify-constants/index.ts`
- `src/lib/priceRangeGuard.ts` (+ `.test.ts` — uppdatera asserts)

**B. Visad copy / UI-text (måste uppdateras parallellt):**
- `src/pages/SjukskoterskaReport.tsx`
- `src/pages/AllmanmedicinReport.tsx`
- `src/pages/AnalysisScreen.tsx`
- `src/pages/demo/LandingV2.tsx`
- `src/components/report/ConsultantTrackContent.tsx`
- `src/components/report/PersonalInsights.tsx`
- `src/components/landing/RoleCarousel.tsx`
- `src/components/demo/MarketSearchBox.tsx`
- `src/components/demo/HeroRateFinder.tsx`

**C. AI-agent-discovery (måste uppdateras för konsistens):**
- `public/llms.txt`, `public/llms-full.txt`, `public/ai-plugin.json`, `public/openapi.json`

**D. Historiska migrations:**
- `supabase/migrations/2026021…` och `2026051…` — **rörs ej** (historik).

## Steg 2 — Inför en central konstant
För att slippa magic numbers framöver:
- Lägg `EMPLOYER_FACTOR = 1.38` i `src/lib/calc.ts` och `supabase/functions/_shared/calc.ts`.
- Alla andra filer i grupp A importerar konstanten istället för att hårdkoda `1.42`.
- Edge functions kan inte importera från `src/`, så `_shared/calc.ts` blir sanningen för backend; frontend speglar med samma värde + en kommentar `// Synk med supabase/functions/_shared/calc.ts`.

## Steg 3 — Uppdatera tester
- `src/lib/priceRangeGuard.test.ts`: byt förväntade värden från `× 1.42` till `× 1.38`.
- Verifiera build + tester innan UI-copy uppdateras.

## Steg 4 — Uppdatera UI-copy parallellt med marginal-budskap
I varje fil i grupp B byts:
- siffran `1,42` → `1,38`
- texten "× 1,42 sociala avgifter" → "× 1,38 sociala avgifter (31,42 % arbetsgivaravgift + 4,5 % ITP1 + 1,09 % särskild löneskatt + 0,85 % AFA)"

**Ny mening (efter beslut idag) — läggs in i rapport- och resultatkomponenter där marginalen kommenteras:**

> "Marginalen kan i vissa fall vara lägre — t.ex. när bemannings­bolaget tar betalningsrisk, garanterar timmar eller bär kostnad för outnyttjad kapacitet."

Konkret placering:
- `SjukskoterskaReport.tsx` — under "Möjlig konsultersättning"-kortet (samma block där 528–561 kr/h visas).
- `AllmanmedicinReport.tsx` — motsvarande spann-block.
- `ConsultantTrackContent.tsx` — bredvid marginalförklaringen (85–92 %).

## Steg 5 — Uppdatera agent-discovery
- `public/llms.txt`, `llms-full.txt`, `ai-plugin.json`, `openapi.json`: `×1,42` → `×1,38`.
- I `llms-full.txt` rad 63–64: skriv om exempelräkningen med 1,38.

## Steg 6 — Uppdatera memories
- `mem://logic/margin-models` — byt `employer_factor 1.42` → `1.38`.
- `mem://index.md` Core: byt "Anställda × 1,42 / 167h" → "× 1,38 / 167h".

## Steg 7 — Verifiering
1. `tsgo` — typecheck.
2. `bunx vitest run` — alla guard-tester gröna.
3. Playwright snapshot på `/rapport/anestesisjukskoterska` — bekräfta nytt spann och nytt margintext-block.
4. `rg "1\.42|1,42"` — ska bara matcha historiska migrations + ev. icke-relevanta strängar.

## Risk-sammanfattning (från förra svaret)
Rekommenderad bruttolön ökar ~3 %, vilket vi medvetet accepterar nu eftersom (a) 1,42 var för konservativt, (b) ny copy förklarar att verkliga marginaler ändå kan variera när byrån tar risk. Fakturakontrollens beräkning påverkas men eftersom no-cure-no-pay räknas på återvunnet belopp, inte på faktor, är intäktsrisken försumbar.

## Leverans
Allt i steg 1–6 i en sammanhängande ändring. Inga andra refaktorer.
