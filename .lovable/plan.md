
## Daglig konverteringsfunnel (30 dagar)

Lägg till en ny sektion i admin-dashboarden som visar **konverteringsfunneln per dag** för de 4 stegen: `landing_viewed → survey_started → survey_completed → email_collected`.

### Datakälla
Datan finns redan i `useAdminAnalytics` → `data.timeSeries[]` (en post per dag med `events: Record<eventName, count>`). Ingen ny edge function behövs.

### Ny komponent: `src/components/admin/DailyConversionFunnel.tsx`
- Props: `data`, `loading`, `period`, `onRefresh` (samma signatur som `ConversionFunnel` och `DailyVisitors`).
- Filtrera `timeSeries` till senaste `period` dagarna (sortera fallande – senaste överst).
- Rendera som en kompakt tabell med kolumner:

```text
Datum      | Landning | Enkät start  | Enkät klar  | E-post  | CR (E-post/Landning)
2026-04-19 |   142    |   58 (41%)   |  31 (53%)   | 9 (29%) |  6,3%
2026-04-18 |    98    |   42 (43%)   |  22 (52%)   | 7 (32%) |  7,1%
...
TOTALT 30d |  3 421   | 1 280 (37%)  |  654 (51%)  | 187 (29%)|  5,5%
```

- Procenten i parentes = konvertering från föregående steg samma dag.
- Sista kolumn = total funnel-konvertering (e-post / landning) den dagen.
- Sista rad = aggregerad summa över hela perioden + viktad konverteringsgrad.
- Färgkodning: CR < 3% destructive, 3–6% yellow, > 6% primary (matchar befintlig stil).
- Sticky header, scrollbar yta (`max-h-[500px]`), responsiv (`overflow-x-auto`).

### Integration i `src/pages/Admin.tsx`
Importera och rendera direkt under befintlig `<ConversionFunnel ... />`:

```tsx
<DailyConversionFunnel
  data={analyticsData}
  loading={analyticsLoading}
  period={analyticsPeriod}
  onRefresh={refetchAnalytics}
/>
```

Återanvänder befintlig `PeriodSelector` (7/30/90d) – ingen ny period-state.

### Vad som inte ändras
- Inga DB-migrationer.
- Ingen ny edge function (befintlig `analytics-dashboard` returnerar redan `timeSeries`).
- Befintlig aggregerade `ConversionFunnel` behålls (kompletterar daglig vy).
- Intern trafik filtreras redan bort i `trackEvent.ts`.

### Filer som skapas/ändras
- **Skapa:** `src/components/admin/DailyConversionFunnel.tsx`
- **Ändra:** `src/pages/Admin.tsx` (1 import + 1 render-block)
