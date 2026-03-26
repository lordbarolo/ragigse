
-- Create verifications storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('verifications', 'verifications', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to verifications bucket
CREATE POLICY "Authenticated users can upload verification docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'verifications' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow users to read their own verification docs
CREATE POLICY "Users can read own verification docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'verifications' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow users to delete their own verification docs
CREATE POLICY "Users can delete own verification docs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'verifications' AND (storage.foldername(name))[1] = auth.uid()::text);
