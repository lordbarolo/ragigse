CREATE TABLE IF NOT EXISTS public.ref_user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.ref_app_role NOT NULL,
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.ref_user_roles TO authenticated;
GRANT ALL ON public.ref_user_roles TO service_role;

ALTER TABLE public.ref_user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own roles"
ON public.ref_user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage roles"
ON public.ref_user_roles
FOR ALL
TO authenticated
USING (public.ref_has_role(auth.uid(), 'admin'::public.ref_app_role))
WITH CHECK (public.ref_has_role(auth.uid(), 'admin'::public.ref_app_role));