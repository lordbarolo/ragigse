
-- 1. mp_offers: revoke column-level access to response_token from client roles
REVOKE SELECT (response_token) ON public.mp_offers FROM authenticated;
REVOKE SELECT (response_token) ON public.mp_offers FROM anon;

-- 2. profiles: add explicit INSERT policy scoped to auth.uid()
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 3. ref_verified_domains: restrict reads to authenticated users
DROP POLICY IF EXISTS "Anyone can read verified domains" ON public.ref_verified_domains;
CREATE POLICY "Authenticated users can read verified domains"
  ON public.ref_verified_domains
  FOR SELECT
  TO authenticated
  USING (true);
REVOKE SELECT ON public.ref_verified_domains FROM anon;
