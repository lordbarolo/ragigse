
-- 1. Remove anon SELECT on ref_profiles
DROP POLICY IF EXISTS "Public profiles are readable" ON public.ref_profiles;

-- 2. Safe view for ref_references (hides invite_token, giver_email)
CREATE VIEW public.ref_references_safe
WITH (security_invoker = on) AS
  SELECT id, individual_id, giver_id, giver_name, workplace, relationship,
         period_start, period_end, status, reference_text, competencies,
         recommendation_score, confirmed_at, created_at, verification_level,
         last_confirmed_at, verified_at, expires_at, attachable,
         is_verification_only, document_url, document_name, revoked_at,
         bankid_signature_id
  FROM public.ref_references;

-- 3. Safe view for ref_pings (hides response_token)
CREATE VIEW public.ref_pings_safe
WITH (security_invoker = on) AS
  SELECT id, reference_id, requested_by, requester_name, status,
         sent_at, expires_at, responded_at, confirmed_until, created_at
  FROM public.ref_pings;

-- 4. Storage policies for imports bucket
CREATE POLICY "Admins can read imports"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'imports' AND public.ref_has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can upload imports"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'imports' AND public.ref_has_role(auth.uid(), 'admin'));

-- 5. Safe view for ref_representation_requests (hides secret_token)
CREATE VIEW public.ref_representation_requests_safe
WITH (security_invoker = on) AS
  SELECT id, agency_id, agency_name, organization_id, assignment_id,
         region, consultant_email, consultant_user_id, status, created_at,
         signed_at, bankid_ref, verification_id, payload
  FROM public.ref_representation_requests;

-- 6. Fix ref_get_user_org_id
CREATE OR REPLACE FUNCTION public.ref_get_user_org_id(_user_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT organization_id FROM public.org_members
  WHERE user_id = _user_id
  ORDER BY created_at ASC
  LIMIT 1
$function$;

-- 7. UPDATE policy for verifications bucket
CREATE POLICY "Users can update own verification files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'verifications' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 8. Set search_path on email queue functions
CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$function$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
 RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$function$;
