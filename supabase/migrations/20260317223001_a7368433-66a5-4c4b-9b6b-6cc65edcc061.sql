
CREATE TABLE public.requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text,
  customer text NOT NULL,
  customer_type text,
  role text NOT NULL,
  specialization text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  deadline date,
  region text NOT NULL,
  response_window_days integer,
  n_offers integer DEFAULT 0,
  price_min integer,
  price_median integer,
  price_max integer,
  filled boolean DEFAULT false,
  has_offers boolean DEFAULT false
);

ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read requests"
  ON public.requests FOR SELECT
  TO public
  USING (true);
