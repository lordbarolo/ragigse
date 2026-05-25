DROP POLICY IF EXISTS "Users can update own verification files" ON storage.objects;

CREATE POLICY "Users can update own verification files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'verifications'
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'verifications'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);