
-- Drop the overly permissive public INSERT policy on referrals
DROP POLICY IF EXISTS "Anyone can insert referrals" ON public.referrals;

-- Only service_role can insert referrals (via send-referral edge function)
CREATE POLICY "Service role inserts referrals"
  ON public.referrals
  FOR INSERT
  TO service_role
  WITH CHECK (true);
