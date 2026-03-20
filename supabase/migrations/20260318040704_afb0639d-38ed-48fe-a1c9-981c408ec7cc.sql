
ALTER TABLE public.ref_role_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read role profiles"
  ON public.ref_role_profiles FOR SELECT TO anon, authenticated
  USING (true);
