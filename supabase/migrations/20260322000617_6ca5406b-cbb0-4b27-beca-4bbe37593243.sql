CREATE TABLE public.price_nuggets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  category text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  change_type text NOT NULL DEFAULT 'info',
  effective_from date,
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  metadata jsonb
);

ALTER TABLE public.price_nuggets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active nuggets" ON public.price_nuggets
  FOR SELECT TO public USING (is_active = true);
