-- Defense-in-depth: revoke unnecessary GRANTs on tables where all public RLS policies are USING (false).
-- Edge functions use service_role and are unaffected.

REVOKE SELECT, INSERT, UPDATE, DELETE ON public.leads FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.leads FROM authenticated;

REVOKE SELECT, UPDATE, DELETE ON public.analytics_events FROM anon;
REVOKE SELECT, UPDATE, DELETE ON public.analytics_events FROM authenticated;
-- Keep INSERT for anon/authenticated so client-side trackEvent() can write events
GRANT INSERT ON public.analytics_events TO anon;
GRANT INSERT ON public.analytics_events TO authenticated;

REVOKE SELECT, UPDATE, DELETE ON public.compensation_queries FROM anon;
REVOKE SELECT, UPDATE, DELETE ON public.compensation_queries FROM authenticated;
-- Keep INSERT so survey/report flow can log queries
GRANT INSERT ON public.compensation_queries TO anon;
GRANT INSERT ON public.compensation_queries TO authenticated;

-- service_role retains full access (untouched).