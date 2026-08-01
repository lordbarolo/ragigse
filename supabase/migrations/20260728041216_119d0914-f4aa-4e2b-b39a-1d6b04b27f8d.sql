-- assignment_feedback INSERT: require request belongs to caller
DROP POLICY IF EXISTS "Users can insert own assignment feedback" ON public.assignment_feedback;
CREATE POLICY "Users can insert own assignment feedback"
ON public.assignment_feedback
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.ref_representation_requests r
    WHERE r.id = assignment_feedback.representation_request_id
      AND r.consultant_user_id = auth.uid()
  )
);

-- ref_verification_comments INSERT: require caller owns the reference
DROP POLICY IF EXISTS "Anyone can insert verification comments" ON public.ref_verification_comments;
CREATE POLICY "Reference owner can insert verification comments"
ON public.ref_verification_comments
FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.ref_references r
    WHERE r.id = ref_verification_comments.reference_id
      AND r.individual_id = auth.uid()
  )
);