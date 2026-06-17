-- Restrict column-level access to sensitive fields on ref_references.
-- Authenticated users (individual subject / giver) can still SELECT other columns
-- via the existing safe view, but cannot project giver_email or invite_token directly.
REVOKE SELECT (giver_email, invite_token) ON public.ref_references FROM authenticated;
REVOKE SELECT (giver_email, invite_token) ON public.ref_references FROM anon;