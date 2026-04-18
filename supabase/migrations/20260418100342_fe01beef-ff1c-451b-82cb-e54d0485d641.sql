-- Block direct client SELECT on base table to prevent secret_token exposure.
-- Clients must use ref_representation_requests_safe view (which excludes secret_token).
-- Service role (used by representation-request edge function) bypasses RLS and continues to work.

DROP POLICY IF EXISTS "Agency reads own org requests" ON public.ref_representation_requests;
DROP POLICY IF EXISTS "Consultant reads own requests" ON public.ref_representation_requests;

-- Ensure the safe view runs with invoker security so RLS-aware access flows through it,
-- and grant SELECT on the safe view to authenticated users.
ALTER VIEW public.ref_representation_requests_safe SET (security_invoker = on);

-- Recreate equivalent SELECT policies but ONLY exposing rows (clients should query the safe view).
-- We still need a SELECT policy on the base table for the safe view to return rows under security_invoker.
CREATE POLICY "Agency reads own org requests via safe view"
  ON public.ref_representation_requests
  FOR SELECT
  TO authenticated
  USING (
    (organization_id = public.ref_get_user_org_id(auth.uid()))
    OR (consultant_user_id = auth.uid())
  );

-- Revoke direct SELECT on base table from anon/authenticated to force usage of the safe view.
REVOKE SELECT ON public.ref_representation_requests FROM anon, authenticated;
GRANT SELECT ON public.ref_representation_requests_safe TO anon, authenticated;