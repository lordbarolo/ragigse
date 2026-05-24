CREATE POLICY "Users can update own invoice files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'invoice_reviews' AND (storage.foldername(name))[1] = (auth.uid())::text)
WITH CHECK (bucket_id = 'invoice_reviews' AND (storage.foldername(name))[1] = (auth.uid())::text);

CREATE POLICY "Users can delete own invoice files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'invoice_reviews' AND (storage.foldername(name))[1] = (auth.uid())::text);