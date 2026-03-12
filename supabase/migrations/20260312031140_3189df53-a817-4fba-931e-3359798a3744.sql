
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS ob_share text;

CREATE TABLE IF NOT EXISTS public.followup_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  report_id uuid,
  email text NOT NULL,
  sequence_step integer NOT NULL DEFAULT 1,
  sent_at timestamptz,
  scheduled_for timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.followup_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No public access to followup_emails"
  ON public.followup_emails FOR SELECT TO public USING (false);
