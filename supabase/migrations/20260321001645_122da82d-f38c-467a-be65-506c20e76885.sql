
DROP POLICY IF EXISTS "Anyone can read salary benchmarks" ON public.salary_benchmarks_legacy;

CREATE POLICY "Service role only on salary_benchmarks_legacy"
  ON public.salary_benchmarks_legacy
  FOR SELECT
  TO service_role
  USING (true);
