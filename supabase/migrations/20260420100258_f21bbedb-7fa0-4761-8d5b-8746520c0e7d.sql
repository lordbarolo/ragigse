-- Assignment feedback collected at start and end of representation assignments
CREATE TABLE public.assignment_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  representation_request_id UUID NOT NULL REFERENCES public.ref_representation_requests(id) ON DELETE CASCADE,
  feedback_stage TEXT NOT NULL CHECK (feedback_stage IN ('start', 'end')),
  -- Start-stage answers
  was_booked BOOLEAN,
  -- End-stage answers
  matched_contract BOOLEAN,
  deviation_notes TEXT,
  -- Invoice service interest collected at end
  invoice_service_interest BOOLEAN,
  -- Snooze / dismissal tracking
  snoozed_until TIMESTAMPTZ,
  dismissed_count INTEGER NOT NULL DEFAULT 0,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (representation_request_id, feedback_stage)
);

CREATE INDEX idx_assignment_feedback_user ON public.assignment_feedback(user_id);
CREATE INDEX idx_assignment_feedback_pending ON public.assignment_feedback(user_id, snoozed_until) WHERE responded_at IS NULL;

ALTER TABLE public.assignment_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own assignment feedback"
ON public.assignment_feedback
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update own assignment feedback"
ON public.assignment_feedback
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert own assignment feedback"
ON public.assignment_feedback
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role manages assignment feedback"
ON public.assignment_feedback
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE TRIGGER update_assignment_feedback_updated_at
BEFORE UPDATE ON public.assignment_feedback
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();