-- Drop the public INSERT policy and replace with service_role only
DROP POLICY IF EXISTS "Anyone can insert analytics events" ON public.analytics_events;

CREATE POLICY "Service role only inserts on analytics_events"
  ON public.analytics_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);