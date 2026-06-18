
CREATE OR REPLACE FUNCTION public.get_health_check_cron_token()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, vault
AS $$
  SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'health_check_cron_token' LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_health_check_cron_token() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_health_check_cron_token() TO service_role;
