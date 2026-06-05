-- Remove table-level SELECT from authenticated and anon on raw token tables.
-- Safe views (ref_pings_safe, ref_references_safe) already exist for client access.
-- Edge functions use service_role and are unaffected.
-- This aligns ref_pings and ref_references with the existing ref_representation_requests pattern.

REVOKE SELECT ON public.ref_pings FROM authenticated;
REVOKE SELECT ON public.ref_pings FROM anon;

REVOKE SELECT ON public.ref_references FROM authenticated;
REVOKE SELECT ON public.ref_references FROM anon;