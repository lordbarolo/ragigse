
CREATE TABLE public.calloff_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer text NOT NULL,
  yrkeskategori text NOT NULL,
  zon text NOT NULL,
  location text NOT NULL,
  duration_weeks int,
  calloff_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.calloff_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read calloff_history"
  ON public.calloff_history
  FOR SELECT
  TO public
  USING (true);
