
CREATE TABLE public.bug_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  page_url text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  description text NOT NULL,
  email text,
  user_id uuid,
  status text NOT NULL DEFAULT 'new'
);

ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

-- Anyone can submit bug reports
CREATE POLICY "Anyone can insert bug reports"
  ON public.bug_reports FOR INSERT
  TO public
  WITH CHECK (true);

-- Only service role can read (for admin dashboard via edge function)
CREATE POLICY "Service role reads bug reports"
  ON public.bug_reports FOR SELECT
  TO service_role
  USING (true);

-- Service role can update status
CREATE POLICY "Service role updates bug reports"
  ON public.bug_reports FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);
