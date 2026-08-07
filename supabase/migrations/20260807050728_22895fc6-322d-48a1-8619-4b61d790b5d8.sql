CREATE TABLE public.cv_optimizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  source_path TEXT,
  source_file_name TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  cv_markdown TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX cv_optimizations_user_idx ON public.cv_optimizations (user_id, created_at DESC);

GRANT SELECT ON public.cv_optimizations TO authenticated;
GRANT ALL ON public.cv_optimizations TO service_role;

ALTER TABLE public.cv_optimizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cv_optimizations_owner_select"
  ON public.cv_optimizations FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE public.registry_extract_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('hosp', 'ivo')),
  full_name TEXT NOT NULL,
  personnummer TEXT NOT NULL,
  price_ore INTEGER NOT NULL DEFAULT 3900,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX registry_extract_orders_user_idx ON public.registry_extract_orders (user_id, created_at DESC);

GRANT ALL ON public.registry_extract_orders TO service_role;

ALTER TABLE public.registry_extract_orders ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_my_registry_orders()
RETURNS TABLE (
  id UUID,
  doc_type TEXT,
  status TEXT,
  price_ore INTEGER,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, o.doc_type, o.status, o.price_ore, o.created_at
  FROM public.registry_extract_orders o
  WHERE o.user_id = auth.uid()
  ORDER BY o.created_at DESC
$$;

REVOKE ALL ON FUNCTION public.get_my_registry_orders() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_registry_orders() TO authenticated;

CREATE TRIGGER cv_optimizations_set_updated_at
  BEFORE UPDATE ON public.cv_optimizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER registry_extract_orders_set_updated_at
  BEFORE UPDATE ON public.registry_extract_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();