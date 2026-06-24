# Plan: Exakt roll → exakt SKR 2026-pris (ingen generisk "Specialistsjuksköterska")

## Utgångsläge (verifierat mot DB)

Tabellen `contract_version_rates` (version `v1.7`, effective 2026‑01‑01) innehåller redan rätt prisrader. Stämmer med din spec:

**Grupp HÖG — 770 / 824 / 880 kr/h (endast dessa fem roller):**
- Specialistsjuksköterska anestesi
- Specialistsjuksköterska intensivvård
- Specialistsjuksköterska operationssjukvård
- Distriktssjuksköterska
- Barnmorska

**Grupp MELLAN — 715 / 770 / 824 kr/h:** alla övriga "Specialistsjuksköterska …" + Skolsköterska.

**Grupp BAS — 616 / 660 / 715 kr/h:** Sjuksköterska (grund), Röntgensjuksköterska.

Problemet är inte data — det är att rapport-/kampanj-/AI-ytor använder hårdkodade siffror och att Survey kan resolva en roll till en generisk `"Specialistsjuksköterska"`-sträng som inte finns som prisrad. Det öppnar för att fel grupp visas.

## Mål

1. **Generiska "Specialistsjuksköterska" elimineras** som upplösbar roll. Survey kräver explicit subspecialitet.
2. **Alla pris-ytor** (rapport, kampanj, AI-coach, fakturakontroll, gauge) läser pris via **en enda lookup** med exakt rollmatchning mot `contract_version_rates`.
3. **Okänd roll → "Pris saknas — kontakta oss"** (inget spann, ingen fallback‑gissning).
4. **Test/CI-guard** som bryter bygget om en roll i UI saknar prisrad i v1.7.

## Arkitektur

Sanningskälla = DB (`contract_version_rates` v1.7 / v1.6). TS-fallback för SSR/offline och för bygg-tids‑guards.

```text
contract_version_rates  ──► useContractRate(role, zone)  ──► UI
       ▲                              │
       │                              ├── DB hit (primär)
       │                              └── TS fallback (src/data/skrPrices2026.ts)
       │
src/data/skrPrices2026.ts  ◄── speglas av migration, verifieras av guard-test
```

## Förändringar

### 1. `src/data/skrPrices2026.ts` (ny)
Typed lookup-tabell, en rad per kanonisk roll:
```ts
export type PriceGroup = "bas" | "mellan" | "hog";
export interface RolePrice { role: string; group: PriceGroup; zone1: number; zone2: number; zone3: number; contractVersion: "v1.6" | "v1.7"; }
export const SKR_2026_NURSE_PRICES: RolePrice[] = [/* exakt spegling av DB */];
export const PRICE_BY_ROLE: Record<string, RolePrice>;
```
Ingen "Specialistsjuksköterska" utan suffix.

### 2. `src/hooks/useContractRate.ts` (ny)
- Slår upp roll i `contract_version_rates` via supabase, cachas med react-query.
- Fallback till `PRICE_BY_ROLE` om DB‑anrop fallerar.
- Returnerar `{ status: "ok", zone1, zone2, zone3, group } | { status: "missing", role }`.

### 3. Rapportsidor (`SjukskoterskaReport`, `AnestesiReport`, ev. ny `BarnmorskaReport`, `DistriktReport`, `OperationReport`, `IntensivvardReport`)
- Ta bort hårdkodade `ZONES`-arrayer.
- Använd `useContractRate(role)`. Vid `status: "missing"` rendera `<PriceMissingCard role={...} />` istället för spann/gauge.
- Konsolidera "ANESTESI-mall" till EN rapportkomponent som tar roll som prop. Routern `/rapport/:slug` mappar slug → kanonisk roll via `specialitySlugs.ts`.

### 4. `src/components/Survey.tsx` + `src/lib/specialitySlugs.ts`
- **Ta bort** `__ovrig → "Specialistsjuksköterska"` i Survey (rad 181–183, 484–486). Ersätt med dropdown som kräver subspecialitet, plus alternativet "Min specialitet saknas" → leder till "Pris saknas, kontakta oss".
- `NURSE_SPECIALIZATION_MAP` får kommentar och en compile-time check att varje `resolvedRole` finns som nyckel i `PRICE_BY_ROLE`.

### 5. `src/hooks/useNegotiationChat.ts` + AI-coach‑prompt
- Sista regex‑fallbacken `/specialistsj.../ → "Specialistsjuksköterska"` (rad 54) tas bort. Ersätts med "okänd subspecialitet → be användaren välja en av N kända".
- AI-prompten får uttrycklig regel: använd ALDRIG ett generiskt specialistpris; om subspecialitet inte är känd → svara "Jag behöver veta din subspecialitet för att hämta rätt SKR-pris" + lista de fem höga vs övriga.

### 6. `Campaign.tsx` + `/kampanj/:role`
- Bygger kampanj-URL från `PRICE_BY_ROLE`-nycklarna. Slug som inte finns → 404 (inte fallback till generiskt spann).

### 7. Fakturakontroll
- `invoice-audit` edge function: vid roll‑detektion krävs exakt match mot `PRICE_BY_ROLE`. Saknas roll → status `needs_role_clarification`, ingen audit körs.

### 8. Guard-test (`src/__tests__/skrPrices2026.spec.ts`)
- Hämtar alla rader från `contract_version_rates` v1.7 vid CI och diff:ar mot `SKR_2026_NURSE_PRICES`. Bryter bygget vid drift.
- Verifierar att varje `resolvedRole` i `specialitySlugs.ts` finns i `PRICE_BY_ROLE`.
- Verifierar att strängen `"Specialistsjuksköterska"` inte förekommer som värde någonstans i `src/` utanför `skrPrices2026.ts` (whitelist), via en `rg`-baserad test.

### 9. Memory-uppdatering
- Uppdatera `mem://logic/role-based-contract-resolution` och `mem://data/standardized-role-definitions` med regeln: **"Generisk 'Specialistsjuksköterska' är förbjuden som upplöst roll. Alla priser bindes 1:1 mot exakt roll via `PRICE_BY_ROLE`."**

## Vad detta INTE rör

- Inga DB-migrationer behövs — priserna är redan korrekta i `contract_version_rates` v1.7.
- Inga ändringar i läkarpriser/v1.6.
- Marginalmodeller, OB-tillägg, jourpriser oförändrade.

## Acceptanskriterier

1. Sökning `rg '"Specialistsjuksköterska"' src/` ger 0 träffar utanför `skrPrices2026.ts` + Campaign-display-strängar.
2. Survey kan inte längre lämna roll = generisk specialistsjuksköterska.
3. Rapport för okänd roll renderar "Pris saknas — kontakta oss", inte ett gissat spann.
4. Guard-testet failar om någon lägger till en roll i UI utan motsvarande prisrad.
5. Anestesi/IVA/Operation/Distrikt/Barnmorska visar 770/824/880; alla övriga specialister visar 715/770/824; grund + röntgen visar 616/660/715. Verifierat på 3 rapport-routes via Playwright‑screenshot.

## Risker

- Survey‑UX ändras (ingen "övrig"-eskap). Mitigering: tydligt alternativ "Min specialitet saknas → kontakta oss".
- Befintliga leads/profiler i DB kan ha `role = "Specialistsjuksköterska"`. Plan: vid läsning behandlas som "missing" och användaren promptas att precisera vid nästa rapport-render. (Ingen massuppdatering av historik.)
