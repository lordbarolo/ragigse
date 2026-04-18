-- Lock down org_members to prevent privilege escalation via direct INSERT.
-- Users may no longer self-insert with arbitrary organization_id / role.
-- Two safe paths remain:
--   1) create_org_with_admin(): atomically create an organization and add caller as admin
--   2) approve_org_membership_request(): an existing org admin approves a pending request,
--      which inserts the requesting user as 'member' (never admin)

-- 1. Drop the unsafe INSERT policy
DROP POLICY IF EXISTS "Users can insert own org membership" ON public.org_members;

-- 2. Helper: check if a user is admin of an org (SECURITY DEFINER avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role = 'admin'
  )
$$;

-- 3. Atomic: create organization and make the caller its admin
CREATE OR REPLACE FUNCTION public.create_org_with_admin(
  _name text,
  _org_number text DEFAULT NULL,
  _type text DEFAULT 'staffing_agency'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _org_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _name IS NULL OR length(trim(_name)) = 0 THEN
    RAISE EXCEPTION 'Organization name is required';
  END IF;

  INSERT INTO public.organizations (name, org_number, type)
  VALUES (trim(_name), NULLIF(trim(coalesce(_org_number,'')), ''), coalesce(_type, 'staffing_agency'))
  RETURNING id INTO _org_id;

  INSERT INTO public.org_members (user_id, organization_id, role)
  VALUES (_uid, _org_id, 'admin');

  RETURN _org_id;
END;
$$;

-- 4. Approve a pending membership request (admin-only); inserts requester as 'member'
CREATE OR REPLACE FUNCTION public.approve_org_membership_request(_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _req public.org_membership_requests%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _req FROM public.org_membership_requests WHERE id = _request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF _req.status <> 'pending' THEN
    RAISE EXCEPTION 'Request already resolved';
  END IF;

  IF NOT public.is_org_admin(_uid, _req.organization_id) THEN
    RAISE EXCEPTION 'Only org admins can approve membership requests';
  END IF;

  INSERT INTO public.org_members (user_id, organization_id, role)
  VALUES (_req.user_id, _req.organization_id, 'member')
  ON CONFLICT DO NOTHING;

  UPDATE public.org_membership_requests
  SET status = 'approved', resolved_at = now(), resolved_by = _uid
  WHERE id = _request_id;
END;
$$;

-- 5. Reject a pending membership request (admin-only)
CREATE OR REPLACE FUNCTION public.reject_org_membership_request(_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _req public.org_membership_requests%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _req FROM public.org_membership_requests WHERE id = _request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF _req.status <> 'pending' THEN
    RAISE EXCEPTION 'Request already resolved';
  END IF;

  IF NOT public.is_org_admin(_uid, _req.organization_id) THEN
    RAISE EXCEPTION 'Only org admins can reject membership requests';
  END IF;

  UPDATE public.org_membership_requests
  SET status = 'rejected', resolved_at = now(), resolved_by = _uid
  WHERE id = _request_id;
END;
$$;