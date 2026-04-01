
DROP FUNCTION IF EXISTS public.ref_get_reference_by_invite_token(text);

CREATE FUNCTION public.ref_get_reference_by_invite_token(_token text)
 RETURNS TABLE(id uuid, individual_id uuid, individual_name text, individual_specialty text, giver_email text, giver_id uuid, giver_name text, workplace text, relationship text, period_start text, period_end text, invite_token text, status ref_reference_status, reference_text text, competencies jsonb, recommendation_score integer, confirmed_at timestamp with time zone, created_at timestamp with time zone, is_verification_only boolean, document_url text, document_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    r.id, r.individual_id,
    p.full_name AS individual_name,
    p.specialty AS individual_specialty,
    r.giver_email, r.giver_id, r.giver_name, r.workplace, r.relationship,
    r.period_start, r.period_end, r.invite_token, r.status,
    r.reference_text, r.competencies, r.recommendation_score,
    r.confirmed_at, r.created_at,
    r.is_verification_only, r.document_url, r.document_name
  FROM public.ref_references r
  JOIN public.ref_profiles p ON p.id = r.individual_id
  WHERE r.invite_token = _token
$function$;
