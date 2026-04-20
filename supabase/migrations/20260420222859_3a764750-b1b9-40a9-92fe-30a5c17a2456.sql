-- Harden RLS on leads: keep INSERT public (lead capture), restrict UPDATE/DELETE to admin
DROP POLICY IF EXISTS "Anyone can update leads" ON public.leads;
DROP POLICY IF EXISTS "Public can update leads" ON public.leads;
DROP POLICY IF EXISTS "leads_update_public" ON public.leads;
DROP POLICY IF EXISTS "Allow public update on leads" ON public.leads;
DROP POLICY IF EXISTS "Anyone can delete leads" ON public.leads;
DROP POLICY IF EXISTS "Public can delete leads" ON public.leads;
DROP POLICY IF EXISTS "leads_delete_public" ON public.leads;
DROP POLICY IF EXISTS "Allow public delete on leads" ON public.leads;

CREATE POLICY "Admins can update leads"
  ON public.leads
  FOR UPDATE
  TO authenticated
  USING (public.ref_has_role(auth.uid(), 'admin'::public.ref_app_role))
  WITH CHECK (public.ref_has_role(auth.uid(), 'admin'::public.ref_app_role));

CREATE POLICY "Admins can delete leads"
  ON public.leads
  FOR DELETE
  TO authenticated
  USING (public.ref_has_role(auth.uid(), 'admin'::public.ref_app_role));