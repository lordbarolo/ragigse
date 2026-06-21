-- Anon/authenticated should never read calloff_imports directly; only via the
-- column-restricted safe-view calloff_imports_public.
REVOKE SELECT ON public.calloff_imports FROM anon, authenticated;