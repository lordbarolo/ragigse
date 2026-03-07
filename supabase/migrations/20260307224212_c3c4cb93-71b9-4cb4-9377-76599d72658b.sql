CREATE POLICY "Allow anonymous reads on audit_optins"
  ON public.audit_optins
  FOR SELECT
  TO anon, authenticated
  USING (true);