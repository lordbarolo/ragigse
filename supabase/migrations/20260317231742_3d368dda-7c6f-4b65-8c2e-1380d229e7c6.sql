
DROP TABLE IF EXISTS public.requests;

CREATE TABLE public.requests (
  request_id            integer       PRIMARY KEY,
  customer              text          NOT NULL,
  customer_type         text          NOT NULL,
  is_public             boolean       NOT NULL DEFAULT false,
  region                text,
  unit                  text,
  role                  text,
  specialization        text,
  created_at            date,
  deadline              date,
  response_window_days  integer,
  level                 text,
  winning_supplier      text,
  n_offers_reported     integer,
  rubrik_raw            text,
  n_offers              integer       NOT NULL DEFAULT 0,
  n_unique_suppliers    integer,
  price_min             numeric(8,2),
  price_median          numeric(8,2),
  price_max             numeric(8,2),
  price_std             numeric(8,2),
  pct_meets_scope       numeric(5,1),
  avg_req_score         numeric(5,1),
  avg_total_score       numeric(5,1),
  filled                boolean       NOT NULL DEFAULT false,
  contract_price        numeric(8,2),
  has_offers            boolean       NOT NULL DEFAULT false,
  inserted_at           timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read requests"
  ON public.requests FOR SELECT
  TO public
  USING (true);
