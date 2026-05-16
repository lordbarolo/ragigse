# Säkerhetsnät för pris- och beräkningsmodellen

Mål: göra det omöjligt för fel siffror eller fel formler att ligga osedda i prod i mer än en dag.

## Vad som byggs

### A. Sjuksköterskor v1.7 — baseline + nattlig kontroll
- Snapshotar nuvarande 87 rader från `contract_version_rates` till `rate_verification_baseline` (`source_note = 'Initial seed v1.7 2026-05-16'`).
- Generaliserar `verify-rates` så den loopar över **alla** aktiva `contract_versions` (idag Läkare v1.6 + Sjuksköterskor v1.7, imorgon ev. fler) och skriver en run per version.
- Befintlig pg_cron 03:00 ger nu täckning för båda katalogerna.

### B. Öppen läkar-diff (8 dagar)
- Rotorsak: baseline har felaktigt importerat värde (Hud Zon 3 = 1678 = samma som Zon 2; live har korrekta 1953). Bug i 2026-importen, inte i live.
- Bygger admin-knapp **"Granska och re-snapshota baseline"** i `RateVerification.tsx`:
  - Visar varje diff med både värden och kräver explicit godkännande per rad.
  - Vid godkännande: skriver om baseline-raden + loggar i ny tabell `rate_baseline_acknowledgments` (vem, när, varför, gammalt/nytt värde).
- Lägger **watchdog** `rate-mismatch-watchdog` (pg_cron daglig 09:00): om någon `rate_verification_runs` med `status='mismatch'` är äldre än 48 h och inte erkänd → POST till admin-mejl via `send-transactional-email`.

### C. Konstanter (marginaler, OB-faktorer, alias, zoner)
- Ny tabell `constants_verification_baseline` (key, expected_value JSONB, source_note).
- Seed med:
  - `margin.specialist.share_min/max` = 0.85 / 0.90
  - `margin.standard.share_min/max` = 0.80 / 0.85
  - `margin.anesthesia.share_min/max` = 0.82 / 0.88
  - `employer.factor` = 1.42
  - `hours.per_month` = 167
  - `ob.sjukskoterska.factor` = 1.3142
  - `role_aliases.count` = 117 (drift-detektor)
  - `locations.with_zon.count` / `locations.total.count` = 290/290
- Ny edge function `verify-constants`:
  - Läser `calc.ts`-konstanter (importerade via en delad `_shared/constants.ts` så client och edge har en sanning).
  - Räknar `role_aliases` och `locations.zon`.
  - Jämför mot `constants_verification_baseline`, skriver run i `constants_verification_runs` (samma schema som rates: status/diff_json/checksum).
- pg_cron 03:15 dagligen.
- Admin-UI: ny `<ConstantsVerification />` jämte `<RateVerification />` på admin-dashboard.

## Skyddsmekanismer

1. **Ingen tyst rättning**: baseline kan bara ändras via admin-erkännande (logg + RLS endast admin).
2. **Watchdog**: öppna diffar >48 h triggar mejl — den 8-dagars-luckan kan aldrig uppstå igen.
3. **Konstanter låsta**: drift i marginalmodeller eller alias-tabellen syns nästa natt.
4. **Generisk över versioner**: när nästa katalog (barnmorska, etc.) läggs in är allt vad som krävs ett baseline-snapshot — funktionen täcker resten.

## Filer som ändras/skapas
- Migration: `constants_verification_baseline`, `constants_verification_runs`, `rate_baseline_acknowledgments`, seed sjuksköterska v1.7 baseline + konstanter, pg_cron jobs.
- `supabase/functions/verify-rates/index.ts` — loop över aktiva versioner.
- `supabase/functions/verify-constants/index.ts` — ny.
- `supabase/functions/rate-mismatch-watchdog/index.ts` — ny.
- `supabase/functions/_shared/calc-constants.ts` — delad sanning.
- `src/components/admin/RateVerification.tsx` — re-baseline-knapp + per-versions-vy.
- `src/components/admin/ConstantsVerification.tsx` — ny.
- `src/pages/Admin.tsx` — visa ny komponent.

Kör?
