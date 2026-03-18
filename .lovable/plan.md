

## Problem

The current prediction logic uses a simple `daysSinceLast / avgInterval` ratio to determine status. This means a buyer who ordered the same role every January for 5 years but hasn't ordered in 24 months can still show as "high" probability -- which is misleading. Conversely, long historical patterns (e.g. seasonal buying in specific months) should *boost* confidence when recent activity also supports it.

## Approach: Recency Gate + Seasonal Boost

### 1. Recency gate (edge function)

Add a "recency check" that caps the maximum status based on how long ago the last activity was:

- **Last activity > 24 months ago** → max status = `watch`, regardless of pattern strength
- **Last activity 12-24 months ago** → max status = `medium`
- **Last activity < 12 months ago** → no cap, full algorithm applies

This prevents old-but-inactive combinations from appearing as "high probability".

### 2. Seasonal signal boost (edge function)

Check if the buyer historically places orders in the **current or next month** (using all available history, up to 5 years):

- Extract the month from each historical `calloff_date`
- Count how many times orders fell in the current month or next month
- If ≥ 2 seasonal matches exist and last activity < 24 months: boost status by one level (watch→medium, medium→high)

This rewards long history with clear seasonal patterns.

### 3. Dynamic copy (edge function)

Replace hardcoded "senaste 18 månader" strings:
- Calculate actual data span (oldest to newest entry per group)
- Use e.g. "senaste 3 åren" or "senaste 14 månaderna" dynamically
- Add seasonal reason text when applicable: "Historiskt mönster: uppdrag i mars 3 av senaste 5 år"

### 4. Update PredictionDetail copy (frontend)

In `PredictionDetail.tsx`, replace the hardcoded "senaste 12 månader" with the `historicalSignal` value from the API (which will now be dynamic).

## Files to change

- `supabase/functions/radar-predictions/index.ts` — recency gate, seasonal boost, dynamic copy
- `src/components/radar/PredictionDetail.tsx` — use API signal text instead of hardcoded "12 månader"

