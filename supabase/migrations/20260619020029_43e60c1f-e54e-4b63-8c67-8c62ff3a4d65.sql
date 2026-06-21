
-- 1) Fix Security Definer View: enforce security_invoker on security_audit_view
ALTER VIEW public.security_audit_view SET (security_invoker = on);

-- 2) Remove direct SELECT on ref_representation_requests base table (safe view exists)
DROP POLICY IF EXISTS "Agency reads own org requests via safe view" ON public.ref_representation_requests;

CREATE POLICY "Agency reads own org requests via safe view (no secret)"
ON public.ref_representation_requests
FOR SELECT
TO authenticated
USING (
  (organization_id = public.ref_get_user_org_id(auth.uid()) OR consultant_user_id = auth.uid())
);

-- Column-level: hide secret_token from authenticated; only service_role can read it
REVOKE SELECT (secret_token) ON public.ref_representation_requests FROM authenticated;
REVOKE UPDATE (secret_token) ON public.ref_representation_requests FROM authenticated;

-- 3) Hide invite_token on ref_references from authenticated (safe view + RPCs handle access)
REVOKE SELECT (invite_token) ON public.ref_references FROM authenticated;
REVOKE UPDATE (invite_token) ON public.ref_references FROM authenticated;

-- 4) Hide response_token on mp_offers from authenticated (listing owners only UPDATE other cols)
REVOKE SELECT (response_token) ON public.mp_offers FROM authenticated;
REVOKE UPDATE (response_token) ON public.mp_offers FROM authenticated;
