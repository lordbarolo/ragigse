
-- 1. Create reports table
CREATE TABLE public.reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid REFERENCES public.leads(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'preview',
  paid_at timestamp with time zone,
  email text,
  result_json jsonb,
  occupation text,
  employment_type text,
  kommun text,
  experience integer,
  current_salary integer,
  salary_type text,
  referral_unlock_granted boolean NOT NULL DEFAULT false,
  referral_unlocked_at timestamp with time zone
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Only service_role can access reports
CREATE POLICY "No public access to reports"
  ON public.reports FOR SELECT
  USING (false);

-- 2. Add missing columns to payments
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS report_id uuid REFERENCES public.reports(id),
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

-- Make stripe_session_id unique for idempotency
ALTER TABLE public.payments
  ADD CONSTRAINT payments_stripe_session_id_unique UNIQUE (stripe_session_id);
