
-- Analytics events table for conversion tracking
CREATE TABLE public.analytics_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name text NOT NULL,
  lead_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (tracking from frontend)
CREATE POLICY "Anyone can insert analytics events"
  ON public.analytics_events
  FOR INSERT
  WITH CHECK (true);

-- No public reads (query via service_role or SQL)
CREATE POLICY "No public reads on analytics"
  ON public.analytics_events
  FOR SELECT
  USING (false);

-- Index for querying by event name and time
CREATE INDEX idx_analytics_events_name_created ON public.analytics_events (event_name, created_at DESC);
CREATE INDEX idx_analytics_events_lead ON public.analytics_events (lead_id) WHERE lead_id IS NOT NULL;
