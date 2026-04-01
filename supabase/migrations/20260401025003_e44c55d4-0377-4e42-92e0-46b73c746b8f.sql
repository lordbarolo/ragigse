
-- Add document columns to ref_references for imported documents
ALTER TABLE public.ref_references 
  ADD COLUMN IF NOT EXISTS document_url text,
  ADD COLUMN IF NOT EXISTS document_name text,
  ADD COLUMN IF NOT EXISTS is_verification_only boolean NOT NULL DEFAULT false;

-- Table for verification comments (visible in reference log)
CREATE TABLE public.ref_verification_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id uuid NOT NULL REFERENCES public.ref_references(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  author_name text NOT NULL DEFAULT '',
  comment text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ref_verification_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a comment (the reference giver via the verification form)
CREATE POLICY "Anyone can insert verification comments"
  ON public.ref_verification_comments FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

-- The reference owner (individual) can read comments on their references
CREATE POLICY "Reference owner can read comments"
  ON public.ref_verification_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ref_references r
      WHERE r.id = reference_id AND r.individual_id = auth.uid()
    )
  );

-- Comment author can read their own comments
CREATE POLICY "Comment author can read own comments"
  ON public.ref_verification_comments FOR SELECT
  TO authenticated
  USING (author_id = auth.uid());
