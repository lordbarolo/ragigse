-- 1. Make calloff_imports_public a security_invoker view (RLS already permits anon read of partner_share_data rows)
ALTER VIEW public.calloff_imports_public SET (security_invoker = on);

-- 2. Hide secret tokens from authenticated users (still accessible via service_role)
REVOKE SELECT (response_token) ON public.ref_pings FROM authenticated, anon;
REVOKE SELECT (secret_token) ON public.ref_representation_requests FROM authenticated, anon;

-- 3. Hide organization registration numbers from broad authenticated read
REVOKE SELECT (org_number) ON public.organizations FROM authenticated, anon;