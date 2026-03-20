

## Uppdatera e-postgaten på AnalysisScreen

Ändringarna rör Phase 2 (paused_for_email) i `src/pages/AnalysisScreen.tsx`, raderna ~342–482.

### Ny layout-ordning (topp till botten)

1. **Status-badge** — "Analysen klar" (befintlig, behålls)
2. **Rubrik + punktlista** — "Din rapport innehåller" med kompaktare spacing
3. **Insight-rad** — neutral, faktabaserad: `"Skillnad mot regionens nivå: {X} kr/h"`
4. **E-postfält** med förklarande text ovanför
5. **CTA-knapp** — "Få hela analysen"
6. **Microcopy** — värde + trygghet
7. **Preview-kort** med ny "Skillnad"-rad
8. **Cost info-kort** (befintligt, behålls)

### Detaljerade ändringar

**Fil: `src/pages/AnalysisScreen.tsx`**

**Insight-rad (punkt 3)**
- Ersätt nuvarande "Du ligger X kr/h under"-nudge med neutral variant
- Visa alltid (oavsett under/över): `"Skillnad mot regionens nivå: {abs(high - userHourly)} kr/h"`
- Ta bort emoji. Använd en enkel `BarChart3`-ikon i muted stil
- Ingen färgkodning (amber/green) — neutral border/bg

**Punktlista (punkt 2)**
- Minska `space-y` från 2.5 till 2
- Minska icon-padding från `p-1.5` till `p-1`
- Behåll befintliga items

**Förklarande text ovanför e-postfält (punkt 4)**
- Ny rad: `"Vi skickar hela rapporten till din mail så att du kan spara och jämföra senare"`
- `text-[13px] text-foreground/50`

**CTA (punkt 5)**
- Text: "Få hela analysen" (redan på plats, behålls)

**Microcopy (punkt 6)**
- Rad 1: `"Få lokal jämförelse, verkliga ersättningsnivåer och argument för olika ersättningsnivåer"` (redan på plats)
- Rad 2: `"Ingen spam · Skickas direkt"` (redan på plats)

**Preview-kort (punkt 7)**
- Lägg till en tredje rad i prisjämförelsekortet: `"Skillnad"` med värde `"{X} kr/h"`
- Neutral stil, ingen amber/green-färgkodning
- Ersätt badge "Under marknad" / "Över marknad" med neutral text: `"Jämförelse"` eller ta bort helt
- Ersätt den avslutande genomsnittslöne-texten med enklare: `"Se fullständig analys i rapporten"`

### Copyprinciper
- Inga värdeladdade ord (underbetald, förlorar, ligger efter)
- Neutral, faktabaserad ton genomgående
- "Skillnad" istället för "gap" eller "under/över"

