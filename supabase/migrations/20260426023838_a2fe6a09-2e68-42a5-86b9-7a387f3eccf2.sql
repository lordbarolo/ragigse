-- Aggregatorfunktion: returnerar månadsvolymer per (customer, region, role, specialization)
-- för de senaste 36 månaderna. Används av refresh-uppdragsradar-forecast.
CREATE OR REPLACE FUNCTION public.aggregate_calloff_monthly(
  _months_back integer DEFAULT 36
)
RETURNS TABLE (
  customer text,
  region text,
  role text,
  specialization text,
  year_month text,
  calloff_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ci.customer,
    ci.region,
    ci.role,
    COALESCE(ci.specialization, '') AS specialization,
    to_char(ci.calloff_date, 'YYYY-MM') AS year_month,
    COUNT(*) AS calloff_count
  FROM public.calloff_imports ci
  WHERE ci.calloff_date IS NOT NULL
    AND ci.calloff_date >= (CURRENT_DATE - (_months_back || ' months')::interval)
    AND ci.customer IS NOT NULL
    AND ci.role IS NOT NULL
  GROUP BY ci.customer, ci.region, ci.role, COALESCE(ci.specialization, ''), to_char(ci.calloff_date, 'YYYY-MM')
$$;

-- Endast service_role får anropa
REVOKE ALL ON FUNCTION public.aggregate_calloff_monthly(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.aggregate_calloff_monthly(integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aggregate_calloff_monthly(integer) TO service_role;