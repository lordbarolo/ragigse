CREATE TABLE public.report_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  lead_id uuid NOT NULL,
  rating text NOT NULL,
  comment text,
  role text,
  zone text
);

ALTER TABLE public.report_feedback ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts
CREATE POLICY "Anyone can insert feedback"
  ON public.report_feedback
  FOR INSERT
  WITH CHECK (true);

-- No public reads
CREATE POLICY "No public reads on feedback"
  ON public.report_feedback
  FOR SELECT
  USING (false);