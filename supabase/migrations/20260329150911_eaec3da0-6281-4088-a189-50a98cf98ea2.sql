
-- 1. FIX PRIVILEGE ESCALATION: Restrict handle_new_user to only allow safe roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _role public.ref_app_role;
  _raw_role text;
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

  -- SECURITY: Only allow 'individual' and 'agency' from signup metadata
  _raw_role := NULLIF(NEW.raw_user_meta_data->>'role', '');
  IF _raw_role IN ('individual', 'agency') THEN
    _role := _raw_role::public.ref_app_role;
  ELSE
    _role := 'individual';
  END IF;

  INSERT INTO public.ref_user_roles (user_id, role)
  VALUES (NEW.id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- 2. FIX ORG ISOLATION: Make organization_id NOT NULL with proper default
-- First, we need an org_members table for agency users since consultant_profiles is wrong
CREATE TABLE IF NOT EXISTS public.org_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own org membership"
  ON public.org_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role manages org members"
  ON public.org_members FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Replace ref_get_user_org_id to use org_members instead of consultant_profiles
CREATE OR REPLACE FUNCTION public.ref_get_user_org_id(_user_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT organization_id FROM public.org_members
  WHERE user_id = _user_id
  LIMIT 1
$function$;
