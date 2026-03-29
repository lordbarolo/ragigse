
-- Allow authenticated users to insert into organizations (for agency onboarding)
CREATE POLICY "Authenticated can create organizations"
  ON public.organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow org members to insert their own membership (after creating org)
CREATE POLICY "Users can insert own org membership"
  ON public.org_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
