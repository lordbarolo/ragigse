
-- 1. AKUT: Fix referrals RLS — only allow read when filtering by token
DROP POLICY IF EXISTS "Anyone can read referral by token" ON public.referrals;
CREATE POLICY "Read referral by matching token only"
  ON public.referrals
  FOR SELECT
  TO anon, authenticated
  USING (false);

-- Instead, we create a security definer function for token lookup
CREATE OR REPLACE FUNCTION public.get_referral_by_token(_token text)
RETURNS TABLE(
  id uuid,
  lead_id uuid,
  referrer_email text,
  referee_email text,
  token text,
  clicked boolean,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.lead_id, r.referrer_email, r.referee_email, r.token, r.clicked, r.created_at
  FROM public.referrals r
  WHERE r.token = _token
$$;

-- 2. KRITISK: Lock down rates table — remove public read
DROP POLICY IF EXISTS "Anyone can read rates" ON public.rates;
CREATE POLICY "No public read on rates"
  ON public.rates
  FOR SELECT
  TO public
  USING (false);
