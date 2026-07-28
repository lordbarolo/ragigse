-- Email queue: only service_role should touch pgmq
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated, PUBLIC;

-- RLS helpers: used from policies (as definer), not by clients
REVOKE EXECUTE ON FUNCTION public.is_org_admin(uuid, uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ref_has_role(uuid, public.ref_app_role) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ref_get_user_org_id(uuid) FROM anon, authenticated, PUBLIC;

-- Trigger functions: never called directly
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_profile_email() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mp_listings_enforce_publish_gate() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.email_queue_wake() FROM anon, authenticated, PUBLIC;

-- Ref cache mutation: IDOR — move to server-only, wrap later with auth check
REVOKE EXECUTE ON FUNCTION public.ref_calculate_profile_status(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ref_calculate_trust_score(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ref_refresh_attachability(uuid) FROM anon, authenticated, PUBLIC;

-- Quota / count helpers: internal use only
REVOKE EXECUTE ON FUNCTION public.check_ai_rate_limit(uuid, integer) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.agent_api_count_today(uuid) FROM anon, authenticated, PUBLIC;