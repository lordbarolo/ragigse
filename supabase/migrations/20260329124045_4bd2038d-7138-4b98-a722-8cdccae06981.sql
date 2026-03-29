
-- Add organization_id to ref_representation_requests for proper org isolation
ALTER TABLE public.ref_representation_requests
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);

-- Drop existing agency-user-level policies and replace with org-level ones
DROP POLICY IF EXISTS "Agency creates requests" ON public.ref_representation_requests;
DROP POLICY IF EXISTS "Agency reads own requests" ON public.ref_representation_requests;

-- Create a security definer function to get user's org id
CREATE OR REPLACE FUNCTION public.ref_get_user_org_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT staffing_agency_id FROM public.consultant_profiles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Agency can only see requests belonging to their organization
CREATE POLICY "Agency reads own org requests"
  ON public.ref_representation_requests FOR SELECT
  TO authenticated
  USING (
    organization_id = public.ref_get_user_org_id(auth.uid())
    OR consultant_user_id = auth.uid()
  );

-- Agency can only insert requests for their own organization  
CREATE POLICY "Agency inserts own org requests"
  ON public.ref_representation_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.ref_get_user_org_id(auth.uid())
  );

-- Create ref_access_logs table
CREATE TABLE IF NOT EXISTS public.ref_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type text NOT NULL,
  resource_id text NOT NULL,
  viewer_name text,
  viewer_org text,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ref_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert access logs"
  ON public.ref_access_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Only admins read access logs"
  ON public.ref_access_logs FOR SELECT
  TO authenticated
  USING (public.ref_has_role(auth.uid(), 'admin'));

-- Update handle_new_user to assign role from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _role public.ref_app_role;
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.consultant_profiles (user_id, onboarding_step)
  VALUES (NEW.id, 0)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.ref_profiles (id, email, full_name)
  VALUES (NEW.id, COALESCE(NEW.email, ''), COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;

  _role := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'role', '')::public.ref_app_role,
    'individual'
  );

  INSERT INTO public.ref_user_roles (user_id, role)
  VALUES (NEW.id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;
