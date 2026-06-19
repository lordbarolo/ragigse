## Punkt 2 — `calloff_imports` safe-view

### Nuläge
- `calloff_imports` har en RLS-policy `"Public reads only explicitly shared partner calloffs"` som ger **alla (anon + authenticated)** SELECT på rader där `partner_share_data = true`. Det exponerar alla 21 kolumner direkt, inklusive interna fält: `partner_source`, `raw_data`, `validation_flags`, `dedup_hash`, `partner_share_data`.
- Vyn `calloff_imports_public` (`security_invoker=on`) finns men inkluderar fortfarande `partner_source` + `partner_share_data` och förlitar sig på basens RLS för åtkomst.

### Användning (kontrollerad)
- **Klient (anon/authenticated):** endast `src/components/agency/MarketKpiRow.tsx` läser `calloff_imports_public` (kolumner: `calloff_date, region, filled`).
- **Edge functions:** läser bas-tabellen via `service_role` (radar-public-api, uppdragsradar-chat, radar-predictions, refresh-uppdragsradar-forecast, get-avrop-predictions, backtest-uppdragsradar-accuracy, agent-api-market-history). Påverkas inte.
- **Admin-listor:** `monthly-security-audit` allowlist innehåller `calloff_imports_public` — inget att ändra.

### Åtgärd (en migration)

```text
1. DROP POLICY "Public reads only explicitly shared partner calloffs"
   ON public.calloff_imports;
   → Bas-tabellen blir endast åtkomlig för service_role.

2. DROP VIEW IF EXISTS public.calloff_imports_public;
   CREATE VIEW public.calloff_imports_public AS
   SELECT
     id, imported_at, calloff_date,
     customer, customer_type, region, role, specialization, level,
     duration_weeks, unit,
     price_min, price_median, price_max,
     filled
   FROM public.calloff_imports
   WHERE partner_source IS NULL OR partner_share_data = true;
   → Definer-vy (utan security_invoker) som filtrerar rader och
     döljer partner_source, partner_share_data, raw_data,
     validation_flags, dedup_hash.

3. GRANT SELECT ON public.calloff_imports_public TO anon, authenticated;
```

### Verifiering
- Kör `supabase--linter` + `security--run_security_scan` efter migration.
- Smoke-test: `MarketKpiRow` på `/agency` ska fortsatt visa KPI-rad (samma kolumner används).
- Markera scanner-fyndet `calloff_imports_public_anonymous_reads_partner_source` som fixat med förklaring.

### Bakåtkompatibilitet
Klient-frågan i `MarketKpiRow.tsx` använder bara `calloff_date, region, filled` → påverkas inte. Inga edge functions läser via anon-rollen.