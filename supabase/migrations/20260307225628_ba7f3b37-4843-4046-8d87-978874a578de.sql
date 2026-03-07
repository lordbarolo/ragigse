
CREATE TABLE public.invoice_review_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text,
  zone text,
  status text NOT NULL DEFAULT 'new',
  contacted_at timestamptz,
  UNIQUE (lead_id)
);

ALTER TABLE public.invoice_review_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert invoice_review_leads"
  ON public.invoice_review_leads
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "No public reads on invoice_review_leads"
  ON public.invoice_review_leads
  FOR SELECT
  USING (false);
