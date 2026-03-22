DROP POLICY IF EXISTS "Anyone can read requests" ON public.requests;
CREATE POLICY "Anyone can read public requests" ON public.requests FOR SELECT TO public USING (is_public = true);