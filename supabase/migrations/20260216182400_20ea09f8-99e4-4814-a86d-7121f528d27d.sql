-- Add industry column to margin_models
ALTER TABLE public.margin_models
ADD COLUMN industry text NOT NULL DEFAULT 'healthcare';

-- Add industry column to rates
ALTER TABLE public.rates
ADD COLUMN industry text NOT NULL DEFAULT 'healthcare';

-- Add industry column to reports
ALTER TABLE public.reports
ADD COLUMN industry text NOT NULL DEFAULT 'healthcare';

-- Index for future multi-industry queries
CREATE INDEX idx_rates_industry ON public.rates (industry);
CREATE INDEX idx_margin_models_industry ON public.margin_models (industry);
CREATE INDEX idx_reports_industry ON public.reports (industry);