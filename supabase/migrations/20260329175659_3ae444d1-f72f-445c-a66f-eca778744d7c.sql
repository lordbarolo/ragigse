
CREATE TABLE public.org_membership_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid,
  UNIQUE(user_id, organization_id)
);

ALTER TABLE public.org_membership_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own membership requests"
  ON public.org_membership_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own membership requests"
  ON public.org_membership_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Org admins can view org membership requests"
  ON public.org_membership_requests FOR SELECT
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.org_members WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Org admins can update org membership requests"
  ON public.org_membership_requests FOR UPDATE
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.org_members WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Anyone can read org names"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (true);
