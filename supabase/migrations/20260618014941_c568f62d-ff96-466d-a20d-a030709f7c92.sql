ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;
UPDATE public.app_settings SET is_public = true WHERE key = 'marketplace_enabled';
UPDATE public.app_settings SET is_public = false WHERE key = 'visitor_hash_salt';
DROP POLICY IF EXISTS "Anon can read app_settings via view" ON public.app_settings;
CREATE POLICY "Anon can read public app_settings" ON public.app_settings FOR SELECT TO anon USING (is_public = true);