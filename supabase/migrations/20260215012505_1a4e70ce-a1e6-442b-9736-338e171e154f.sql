
-- Contract version metadata
CREATE TABLE public.contract_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  catalog_name TEXT NOT NULL,
  version_label TEXT NOT NULL,
  effective_from DATE NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  UNIQUE(catalog_name, version_label)
);

ALTER TABLE public.contract_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read contract versions"
  ON public.contract_versions FOR SELECT
  USING (true);

-- Snapshot of rates per version
CREATE TABLE public.contract_version_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version_id UUID NOT NULL REFERENCES public.contract_versions(id) ON DELETE CASCADE,
  yrkeskategori TEXT NOT NULL,
  zon TEXT NOT NULL,
  typ TEXT NOT NULL,
  timpris_kund INTEGER NOT NULL,
  detaljer TEXT
);

ALTER TABLE public.contract_version_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read version rates"
  ON public.contract_version_rates FOR SELECT
  USING (true);

CREATE INDEX idx_version_rates_version ON public.contract_version_rates(version_id);
CREATE INDEX idx_version_rates_lookup ON public.contract_version_rates(yrkeskategori, zon);

-- Diff results between versions
CREATE TABLE public.price_changes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  old_version_id UUID REFERENCES public.contract_versions(id) ON DELETE SET NULL,
  new_version_id UUID NOT NULL REFERENCES public.contract_versions(id) ON DELETE CASCADE,
  yrkeskategori TEXT NOT NULL,
  zon TEXT NOT NULL,
  old_timpris INTEGER,
  new_timpris INTEGER NOT NULL,
  diff_abs INTEGER NOT NULL DEFAULT 0,
  diff_pct NUMERIC(6,2) NOT NULL DEFAULT 0,
  change_type TEXT NOT NULL DEFAULT 'unchanged',
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.price_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read price changes"
  ON public.price_changes FOR SELECT
  USING (true);

CREATE INDEX idx_price_changes_new_version ON public.price_changes(new_version_id);
CREATE INDEX idx_price_changes_type ON public.price_changes(change_type);
