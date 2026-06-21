-- Fix overly permissive SELECT policy on app_settings
-- Non-public settings should not be readable by all authenticated users

DROP POLICY IF EXISTS "Authenticated can read app_settings" ON public.app_settings;

CREATE POLICY "Authenticated can read public app_settings"
  ON public.app_settings
  FOR SELECT
  TO authenticated
  USING (is_public = true);