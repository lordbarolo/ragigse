
-- 1. Fix audit_optins: remove public SELECT, restrict to service_role only
DROP POLICY "Allow anonymous reads on audit_optins" ON public.audit_optins;
CREATE POLICY "Service role only reads on audit_optins"
  ON public.audit_optins FOR SELECT
  TO service_role
  USING (true);

-- 2. Fix referrals: remove overly permissive UPDATE, replace with service_role only
DROP POLICY "Anyone can update referral clicked" ON public.referrals;
CREATE POLICY "Service role can update referrals"
  ON public.referrals FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Restrict margin_models: change from public to service_role only
DROP POLICY "Anyone can read active margin models" ON public.margin_models;
CREATE POLICY "Service role can read margin models"
  ON public.margin_models FOR SELECT
  TO service_role
  USING (true);
