
-- Admin-only access to lonekoll_avtal bucket
CREATE POLICY "Admins can manage lonekoll_avtal objects"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'lonekoll_avtal'
  AND public.ref_has_role(auth.uid(), 'admin'::public.ref_app_role)
)
WITH CHECK (
  bucket_id = 'lonekoll_avtal'
  AND public.ref_has_role(auth.uid(), 'admin'::public.ref_app_role)
);
