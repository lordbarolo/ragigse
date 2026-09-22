-- Trust v1, steg 2 + 3: scope-baserad delning med hashade engångstokens
-- samt append-only åtkomstlogg.

CREATE TABLE public.trust_share_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_user_id uuid NOT NULL,
  token_hash text NOT NULL UNIQUE,
  token_prefix text NOT NULL,
  grant_kind text NOT NULL CHECK (grant_kind IN ('share_read','attestation','revalidation')),
  scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  audience_label text,
  audience_email text,
  expires_at timestamptz NOT NULL,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  revoked_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX trust_share_grants_subject_idx ON public.trust_share_grants (subject_user_id, revoked_at);
CREATE INDEX trust_share_grants_expires_idx ON public.trust_share_grants (expires_at);

REVOKE ALL ON public.trust_share_grants FROM anon, authenticated;
GRANT SELECT ON public.trust_share_grants TO authenticated;
GRANT ALL ON public.trust_share_grants TO service_role;
ALTER TABLE public.trust_share_grants ENABLE ROW LEVEL SECURITY;

-- Subjektet ser sina egna grants (token_hash är inte återvändbart).
CREATE POLICY "Subject reads own share grants" ON public.trust_share_grants
  FOR SELECT TO authenticated USING (subject_user_id = auth.uid());
CREATE POLICY "Admins read all share grants" ON public.trust_share_grants
  FOR SELECT TO authenticated USING (public.ref_has_role(auth.uid(), 'admin'::ref_app_role));
-- Ingen INSERT/UPDATE/DELETE-policy: allt går via SECURITY DEFINER-RPC.

-- Append-only åtkomstlogg. grant_id är nullable för att kunna logga 'not_found'.
CREATE TABLE public.trust_share_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_id uuid REFERENCES public.trust_share_grants(id) ON DELETE CASCADE,
  accessed_at timestamptz NOT NULL DEFAULT now(),
  ip_hash text,
  user_agent_hash text,
  outcome text NOT NULL CHECK (outcome IN ('granted','expired','revoked','scope_denied','exhausted','not_found')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX trust_share_access_log_grant_idx ON public.trust_share_access_log (grant_id, accessed_at DESC);

REVOKE ALL ON public.trust_share_access_log FROM anon, authenticated;
GRANT SELECT ON public.trust_share_access_log TO authenticated;
REVOKE ALL ON public.trust_share_access_log FROM service_role;
GRANT SELECT, INSERT ON public.trust_share_access_log TO service_role;
ALTER TABLE public.trust_share_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subject reads own share access log" ON public.trust_share_access_log
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trust_share_grants g
                 WHERE g.id = trust_share_access_log.grant_id
                   AND g.subject_user_id = auth.uid()));
CREATE POLICY "Admins read all share access log" ON public.trust_share_access_log
  FOR SELECT TO authenticated USING (public.ref_has_role(auth.uid(), 'admin'::ref_app_role));

CREATE OR REPLACE FUNCTION public.trust_share_log_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  RAISE EXCEPTION 'trust_share_access_log is append-only';
END;
$function$;

CREATE TRIGGER trust_share_log_no_update
BEFORE UPDATE ON public.trust_share_access_log
FOR EACH ROW EXECUTE FUNCTION public.trust_share_log_append_only();

CREATE TRIGGER trust_share_log_no_delete
BEFORE DELETE ON public.trust_share_access_log
FOR EACH ROW EXECUTE FUNCTION public.trust_share_log_append_only();

-- Skapa grant: rå token returneras exakt en gång, endast sha256-hash lagras.
CREATE OR REPLACE FUNCTION public.trust_create_share_grant(
  _grant_kind text,
  _scope jsonb DEFAULT '{}'::jsonb,
  _expires_in_hours integer DEFAULT 168,
  _audience_label text DEFAULT NULL,
  _audience_email text DEFAULT NULL,
  _max_uses integer DEFAULT NULL
)
RETURNS TABLE (id uuid, token text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _token text;
  _hash text;
  _hours integer;
  _row public.trust_share_grants;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Inloggning krävs';
  END IF;
  IF _grant_kind NOT IN ('share_read','attestation','revalidation') THEN
    RAISE EXCEPTION 'Ogiltig delningstyp';
  END IF;
  IF _max_uses IS NOT NULL AND _max_uses < 1 THEN
    RAISE EXCEPTION 'Ogiltigt antal användningar';
  END IF;

  _hours := LEAST(GREATEST(COALESCE(_expires_in_hours, 168), 1), 8760);
  _token := encode(extensions.gen_random_bytes(32), 'hex');
  _hash := encode(extensions.digest(_token, 'sha256'), 'hex');

  INSERT INTO public.trust_share_grants (
    subject_user_id, token_hash, token_prefix, grant_kind, scope,
    audience_label, audience_email, expires_at, max_uses, created_by
  ) VALUES (
    _uid, _hash, left(_token, 8), _grant_kind, COALESCE(_scope, '{}'::jsonb),
    _audience_label, _audience_email, now() + make_interval(hours => _hours),
    CASE WHEN _grant_kind = 'share_read' THEN _max_uses ELSE COALESCE(_max_uses, 1) END,
    _uid
  )
  RETURNING * INTO _row;

  RETURN QUERY SELECT _row.id, _token, _row.expires_at;
END;
$function$;

REVOKE ALL ON FUNCTION public.trust_create_share_grant(text, jsonb, integer, text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.trust_create_share_grant(text, jsonb, integer, text, text, integer) TO authenticated;

-- Återkalla grant (ägare eller admin).
CREATE OR REPLACE FUNCTION public.trust_revoke_share_grant(_grant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _is_admin boolean := false;
  _affected integer;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Inloggning krävs';
  END IF;
  _is_admin := public.ref_has_role(_uid, 'admin'::ref_app_role);

  UPDATE public.trust_share_grants
     SET revoked_at = COALESCE(revoked_at, now())
   WHERE id = _grant_id
     AND (subject_user_id = _uid OR _is_admin);

  GET DIAGNOSTICS _affected = ROW_COUNT;
  IF _affected = 0 THEN
    RAISE EXCEPTION 'Delningen hittades inte';
  END IF;
  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.trust_revoke_share_grant(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.trust_revoke_share_grant(uuid) TO authenticated;

-- Löser token -> grant, validerar och loggar. Endast service_role (publika rutter).
CREATE OR REPLACE FUNCTION public.trust_resolve_share_grant(
  _token text,
  _ip_hash text DEFAULT NULL,
  _user_agent_hash text DEFAULT NULL,
  _consume boolean DEFAULT true
)
RETURNS TABLE (
  grant_id uuid,
  subject_user_id uuid,
  grant_kind text,
  scope jsonb,
  outcome text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _hash text;
  _g public.trust_share_grants;
  _outcome text;
BEGIN
  IF _token IS NULL OR length(_token) < 16 THEN
    INSERT INTO public.trust_share_access_log (grant_id, ip_hash, user_agent_hash, outcome)
    VALUES (NULL, _ip_hash, _user_agent_hash, 'not_found');
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, NULL::text, NULL::jsonb, 'not_found'::text;
    RETURN;
  END IF;

  _hash := encode(extensions.digest(_token, 'sha256'), 'hex');
  SELECT * INTO _g FROM public.trust_share_grants WHERE token_hash = _hash;

  IF _g.id IS NULL THEN
    INSERT INTO public.trust_share_access_log (grant_id, ip_hash, user_agent_hash, outcome)
    VALUES (NULL, _ip_hash, _user_agent_hash, 'not_found');
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, NULL::text, NULL::jsonb, 'not_found'::text;
    RETURN;
  END IF;

  IF _g.revoked_at IS NOT NULL THEN
    _outcome := 'revoked';
  ELSIF _g.expires_at <= now() THEN
    _outcome := 'expired';
  ELSIF _g.max_uses IS NOT NULL AND _g.used_count >= _g.max_uses THEN
    _outcome := 'exhausted';
  ELSE
    _outcome := 'granted';
  END IF;

  IF _outcome = 'granted' AND _consume THEN
    UPDATE public.trust_share_grants SET used_count = used_count + 1 WHERE id = _g.id;
  END IF;

  INSERT INTO public.trust_share_access_log (grant_id, ip_hash, user_agent_hash, outcome)
  VALUES (_g.id, _ip_hash, _user_agent_hash, _outcome);

  IF _outcome <> 'granted' THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, NULL::text, NULL::jsonb, _outcome;
    RETURN;
  END IF;

  RETURN QUERY SELECT _g.id, _g.subject_user_id, _g.grant_kind, _g.scope, _outcome;
END;
$function$;

REVOKE ALL ON FUNCTION public.trust_resolve_share_grant(text, text, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trust_resolve_share_grant(text, text, text, boolean) TO service_role;