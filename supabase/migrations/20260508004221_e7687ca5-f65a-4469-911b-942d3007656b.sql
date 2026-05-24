
-- Logga varje åtkomst till en delningslänk
CREATE TABLE public.document_share_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id uuid NOT NULL REFERENCES public.document_shares(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  document_id uuid,
  action text NOT NULL DEFAULT 'view'
);

CREATE INDEX idx_document_share_views_share ON public.document_share_views(share_id, viewed_at DESC);

ALTER TABLE public.document_share_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can read views of their shares"
ON public.document_share_views FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.document_shares ds
    WHERE ds.id = document_share_views.share_id
      AND ds.user_id = auth.uid()
  )
);

-- Logga åtkomst (anrops av edge function via service role; RLS bypassas)
CREATE OR REPLACE FUNCTION public.log_document_share_view(
  _token text,
  _ip text DEFAULT NULL,
  _user_agent text DEFAULT NULL,
  _document_id uuid DEFAULT NULL,
  _action text DEFAULT 'view'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _share_id uuid;
BEGIN
  SELECT id INTO _share_id FROM public.document_shares WHERE token = _token;
  IF _share_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.document_share_views (share_id, ip_address, user_agent, document_id, action)
  VALUES (_share_id, _ip, _user_agent, _document_id, COALESCE(_action,'view'));
END;
$$;

-- Lista ägarens delningar med visningar
CREATE OR REPLACE FUNCTION public.list_my_document_shares()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid();
        _result jsonb;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT COALESCE(jsonb_agg(row_to_jsonb(s) ORDER BY created_at DESC), '[]'::jsonb)
  INTO _result
  FROM (
    SELECT
      ds.id,
      ds.recipient_label,
      ds.created_at,
      ds.expires_at,
      ds.view_count,
      ds.last_viewed_at,
      array_length(ds.document_ids, 1) AS document_count,
      (ds.expires_at < now()) AS expired,
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'viewed_at', v.viewed_at,
          'ip_address', v.ip_address,
          'user_agent', v.user_agent,
          'document_id', v.document_id,
          'action', v.action
        ) ORDER BY v.viewed_at DESC)
        FROM public.document_share_views v
        WHERE v.share_id = ds.id
      ), '[]'::jsonb) AS views
    FROM public.document_shares ds
    WHERE ds.user_id = _uid
  ) s;

  RETURN _result;
END;
$$;
