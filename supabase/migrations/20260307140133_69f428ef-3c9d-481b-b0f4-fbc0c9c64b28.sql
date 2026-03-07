
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent', 'fixed', 'free')),
  discount_value integer NOT NULL DEFAULT 0,
  used boolean NOT NULL DEFAULT false,
  used_at timestamp with time zone,
  used_by_report_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  description text
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No public access to coupons" ON public.coupons FOR SELECT USING (false);
