
CREATE OR REPLACE FUNCTION public.pg_columns_for_public()
RETURNS TABLE(table_name text, column_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog
AS $$
  SELECT c.table_name::text, c.column_name::text
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
$$;

REVOKE ALL ON FUNCTION public.pg_columns_for_public() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pg_columns_for_public() TO service_role;
