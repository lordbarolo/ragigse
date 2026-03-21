CREATE OR REPLACE FUNCTION public.top_kommuner(lim integer DEFAULT 7)
RETURNS TABLE(kommun text, cnt bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.kommun, COUNT(*) AS cnt
  FROM leads l
  WHERE l.kommun IS NOT NULL
  GROUP BY l.kommun
  ORDER BY cnt DESC
  LIMIT lim;
$$;