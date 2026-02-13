
-- Create referrals table
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  referrer_email TEXT NOT NULL,
  referee_email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  clicked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (for creating referrals)
CREATE POLICY "Anyone can insert referrals"
  ON public.referrals FOR INSERT
  WITH CHECK (true);

-- Allow reading own referral by token (for the landing page)
CREATE POLICY "Anyone can read referral by token"
  ON public.referrals FOR SELECT
  USING (true);

-- Allow updating clicked status via token
CREATE POLICY "Anyone can update referral clicked"
  ON public.referrals FOR UPDATE
  USING (true)
  WITH CHECK (true);
