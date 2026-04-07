DROP POLICY IF EXISTS "No public read on rates" ON public.rates;
CREATE POLICY "Authenticated can read rates" ON public.rates FOR SELECT TO authenticated USING (true);