-- Add A/B variant column to reports
ALTER TABLE public.reports ADD COLUMN ab_variant text NOT NULL DEFAULT 'A';

-- Index for analytics queries
CREATE INDEX idx_reports_ab_variant ON public.reports (ab_variant);
