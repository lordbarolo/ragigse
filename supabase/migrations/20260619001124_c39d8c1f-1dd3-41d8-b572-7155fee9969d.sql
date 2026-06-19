-- Lock base table to service_role only and route anon/authenticated reads via a filtering safe-view
DROP POLICY IF EXISTS "Public reads only explicitly shared partner calloffs" ON public.calloff_imports;

DROP VIEW IF EXISTS public.calloff_imports_public;

CREATE VIEW public.calloff_imports_public AS
SELECT
  id, imported_at, calloff_date,
  customer, customer_type, region, role, specialization, level,
  duration_weeks, unit,
  price_min, price_median, price_max,
  filled
FROM public.calloff_imports
WHERE partner_source IS NULL OR partner_share_data = true;

GRANT SELECT ON public.calloff_imports_public TO anon, authenticated;