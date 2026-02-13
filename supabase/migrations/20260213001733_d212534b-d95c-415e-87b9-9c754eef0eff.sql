
-- Locations table: maps kommun to zon and region
CREATE TABLE public.locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kommun TEXT NOT NULL,
  zon TEXT NOT NULL,
  region TEXT NOT NULL
);

-- Rates table: prices per profession and zone
CREATE TABLE public.rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  yrkeskategori TEXT NOT NULL,
  zon TEXT NOT NULL,
  timpris_kund INTEGER NOT NULL,
  typ TEXT NOT NULL,
  detaljer TEXT
);

-- Enable RLS (public read access for reference data)
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rates ENABLE ROW LEVEL SECURITY;

-- Anyone can read locations and rates (public reference data)
CREATE POLICY "Anyone can read locations" ON public.locations FOR SELECT USING (true);
CREATE POLICY "Anyone can read rates" ON public.rates FOR SELECT USING (true);

-- Create indexes for common lookups
CREATE INDEX idx_locations_kommun ON public.locations (kommun);
CREATE INDEX idx_rates_zon_typ ON public.rates (zon, typ);
