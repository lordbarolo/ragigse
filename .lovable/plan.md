

## Radar → Riktig data: Plan

### Nuläge

Radar-sidan har komplett UI (kort, filter, detaljvy) men kör på hårdkodad mockdata i `radarMockData.ts`. Databasen har **inga historiska avrop** — den innehåller bara avtalspriser per yrkeskategori/zon (`contract_version_rates`) och prisändringar (`price_changes`). Utan avropshistorik finns inget att förutse.

### Strategi

Skapa en `calloff_history`-tabell för historiska avrop och en Edge Function som analyserar mönster och genererar prognoser. Seed:a tabellen med realistisk data baserad på branschkunskap (säsongsvariation, regionala skillnader, frekvens per yrkeskategori). Frontenden hämtar prognoser från Edge Function istället för mockdata.

### Steg

**1. Ny tabell: `calloff_history`**
```sql
CREATE TABLE calloff_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer text NOT NULL,          -- "Region Västerbotten"
  yrkeskategori text NOT NULL,  -- matchar contract_version_rates
  zon text NOT NULL,
  location text NOT NULL,       -- "Umeå"
  duration_weeks int,
  calloff_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);
```
Publik SELECT-policy. Seed:a med ~80-100 rader som spänner 18 månader bakåt, fördelade över regioner och yrkeskategorier med realistiska intervall.

**2. Ny Edge Function: `radar-predictions`**
- Tar emot valfria filter: `competence`, `location`, `buyer`
- Grupperar `calloff_history` per buyer+yrkeskategori+location
- Beräknar: antal avrop, genomsnittligt intervall, senaste avrop, dagar sedan senaste
- Bestämmer status: `high` (dagar sedan > 80% av intervall), `medium` (50-80%), `watch` (< 50%)
- Genererar `forecastWindow`, `summary`, `reasons` baserat på beräknade värden
- Returnerar array med `Prediction`-objekt som matchar befintligt TypeScript-interface

**3. Frontend: Byt datakälla**
- `Radar.tsx`: Ersätt `MOCK_PREDICTIONS` med `useQuery` som anropar `radar-predictions` Edge Function
- `RadarFilters.tsx`: Hämta filtervärden från `calloff_history` (distinkta buyers, yrkeskategorier, locations) istället för hårdkodade listor
- `radarMockData.ts`: Behåll typedefinitioner (`Prediction`, `PredictionStatus` etc.) men ta bort mock-arrays

**4. Seed-data**
Infoga ~80 avrop spridda över:
- 6 yrkeskategorier (matchar `contract_version_rates`)
- 8-10 regioner (matchar `locations.region`)
- 18 månader (2024-09 → 2026-03)
- Realistiska mönster: högre frekvens i Stockholm/VGR, säsongstoppar vinter/sommar

### Filer som ändras
- **Ny migration**: `calloff_history`-tabell + RLS
- **Ny Edge Function**: `supabase/functions/radar-predictions/index.ts`
- **Redigera**: `src/pages/Radar.tsx` — `useQuery` istället för mockdata
- **Redigera**: `src/components/radar/RadarFilters.tsx` — dynamiska filtervärden
- **Redigera**: `src/components/radar/radarMockData.ts` — behåll typer, ta bort mock-arrays
- **Seed**: ~80-100 rader i `calloff_history`

