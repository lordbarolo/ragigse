CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read app_settings"
ON public.app_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anon can read app_settings"
ON public.app_settings FOR SELECT TO anon USING (true);

CREATE POLICY "Only admins can insert app_settings"
ON public.app_settings FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.ref_user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Only admins can update app_settings"
ON public.app_settings FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.ref_user_roles WHERE user_id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.ref_user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Only admins can delete app_settings"
ON public.app_settings FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.ref_user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_feature_flag(_key text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT value FROM public.app_settings WHERE key = _key
$$;

INSERT INTO public.app_settings (key, value)
VALUES ('marketplace_enabled', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;