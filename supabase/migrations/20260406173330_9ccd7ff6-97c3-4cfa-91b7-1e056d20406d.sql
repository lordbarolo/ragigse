-- Add external_id column for MailerLite tracking
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS external_id text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_external_id ON public.leads (external_id) WHERE external_id IS NOT NULL;

-- Add source column for campaign tracking
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS source text;