-- Table to persist monthly security audit runs
CREATE TABLE IF NOT EXISTS public.security_audit_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'ok',
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  findings JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.security_audit_runs TO authenticated;
GRANT ALL ON public.security_audit_runs TO service_role;

ALTER TABLE public.security_audit_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit runs"
  ON public.security_audit_runs
  FOR SELECT
  TO authenticated
  USING (public.ref_has_role(auth.uid(), 'admin'::public.ref_app_role));

CREATE POLICY "Service role manages audit runs"
  ON public.security_audit_runs
  FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Security audit view: exposes catalog checks via SECURITY DEFINER so service_role can read them.
-- Returns one row per check_name with a jsonb payload.
CREATE OR REPLACE FUNCTION public.security_audit_checks()
RETURNS TABLE(check_name TEXT, payload JSONB)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT 'rls_disabled_tables'::TEXT, COALESCE(jsonb_agg(jsonb_build_object('tablename', tablename)), '[]'::jsonb)
  FROM pg_tables WHERE schemaname='public' AND rowsecurity=false

  UNION ALL
  SELECT 'tables_without_policies', COALESCE(jsonb_agg(jsonb_build_object('tablename', t.tablename)), '[]'::jsonb)
  FROM pg_tables t
  LEFT JOIN pg_policies p ON p.schemaname=t.schemaname AND p.tablename=t.tablename
  WHERE t.schemaname='public' AND t.rowsecurity=true AND p.policyname IS NULL
  GROUP BY ()

  UNION ALL
  SELECT 'secdef_without_search_path',
    COALESCE(jsonb_agg(jsonb_build_object('proname', p.proname)), '[]'::jsonb)
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.prosecdef=true
    AND NOT EXISTS (
      SELECT 1 FROM unnest(COALESCE(p.proconfig,'{}')) AS c
      WHERE c LIKE 'search_path=%'
    )

  UNION ALL
  SELECT 'permissive_rls_policies',
    COALESCE(jsonb_agg(jsonb_build_object(
      'tablename', tablename,
      'policyname', policyname,
      'cmd', cmd,
      'roles', array_to_string(roles, ',')
    )), '[]'::jsonb)
  FROM pg_policies
  WHERE schemaname='public'
    AND cmd IN ('UPDATE','DELETE','INSERT','ALL')
    AND (qual = 'true' OR with_check = 'true')

  UNION ALL
  SELECT 'or_on_nullable_policies',
    COALESCE(jsonb_agg(jsonb_build_object('tablename', tablename, 'policyname', policyname)), '[]'::jsonb)
  FROM pg_policies
  WHERE schemaname='public'
    AND (qual ~* 'is null\s+or' OR with_check ~* 'is null\s+or')

  UNION ALL
  SELECT 'definer_views',
    COALESCE(jsonb_agg(jsonb_build_object('viewname', c.relname)), '[]'::jsonb)
  FROM pg_class c
  JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind='v'
    AND NOT EXISTS (
      SELECT 1 FROM unnest(COALESCE(c.reloptions,'{}')) AS o
      WHERE o = 'security_invoker=on' OR o = 'security_invoker=true'
    )

  UNION ALL
  SELECT 'realtime_tables',
    COALESCE(jsonb_agg(jsonb_build_object('tablename', tablename)), '[]'::jsonb)
  FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public'

  UNION ALL
  SELECT 'extensions_in_public',
    COALESCE(jsonb_agg(jsonb_build_object('extname', e.extname)), '[]'::jsonb)
  FROM pg_extension e
  JOIN pg_namespace n ON n.oid=e.extnamespace
  WHERE n.nspname='public'

  UNION ALL
  SELECT 'cron_anon_jwt',
    COALESCE(jsonb_agg(jsonb_build_object('jobname', jobname)), '[]'::jsonb)
  FROM cron.job
  WHERE active=true
    AND command LIKE '%' || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' || '%'
$$;

-- Expose as a view so edge function can SELECT ... WHERE check_name = '...'
CREATE OR REPLACE VIEW public.security_audit_view
WITH (security_invoker = false) AS
SELECT * FROM public.security_audit_checks();

GRANT SELECT ON public.security_audit_view TO service_role;
REVOKE ALL ON public.security_audit_view FROM anon, authenticated, public;

REVOKE ALL ON FUNCTION public.security_audit_checks() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.security_audit_checks() TO service_role;