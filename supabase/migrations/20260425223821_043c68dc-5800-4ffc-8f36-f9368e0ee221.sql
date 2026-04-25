UPDATE storage.buckets SET public = false WHERE id = 'imports';
DROP POLICY IF EXISTS "temp_public_read_imports_logos" ON storage.objects;