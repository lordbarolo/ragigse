
CREATE TABLE public.audit_optins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_optins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous inserts on audit_optins"
  ON public.audit_optins
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
