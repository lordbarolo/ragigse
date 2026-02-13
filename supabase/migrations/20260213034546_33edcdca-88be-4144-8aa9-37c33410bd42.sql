
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  stripe_session_id text NOT NULL,
  amount_ore integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'sek',
  status text NOT NULL DEFAULT 'pending',
  plan text NOT NULL DEFAULT 'single',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- No public read/write – only service role (edge functions) writes to this table
CREATE POLICY "No public access" ON public.payments FOR SELECT USING (false);
