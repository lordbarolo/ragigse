-- Belt-and-suspenders: secret_token is already protected by REVOKE of table-level
-- SELECT/UPDATE from authenticated/anon (only service_role can read base table;
-- clients use ref_representation_requests_safe view which excludes secret_token).
-- Drop the now-unused base-table SELECT policy so the scanner stops flagging it,
-- and re-assert column-level revokes idempotently.

DROP POLICY IF EXISTS "Agency reads own org requests via safe view (no secret)" ON public.ref_representation_requests;

REVOKE SELECT ON public.ref_representation_requests FROM anon, authenticated;
REVOKE SELECT (secret_token) ON public.ref_representation_requests FROM anon, authenticated;
REVOKE UPDATE (secret_token) ON public.ref_representation_requests FROM anon, authenticated;

-- Ensure safe view (no secret_token) is the only client-facing read path
GRANT SELECT ON public.ref_representation_requests_safe TO anon, authenticated;