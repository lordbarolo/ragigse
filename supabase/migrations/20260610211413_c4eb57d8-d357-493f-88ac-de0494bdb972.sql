
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;

DROP POLICY IF EXISTS "Anyone can read org names" ON public.organizations;

CREATE POLICY "Members can read their organization"
ON public.organizations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.org_members m
    WHERE m.organization_id = organizations.id
      AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can read all organizations"
ON public.organizations
FOR SELECT
TO authenticated
USING (public.ref_has_role(auth.uid(), 'admin'::public.ref_app_role));

CREATE OR REPLACE FUNCTION public.search_staffing_agencies(query text)
RETURNS TABLE(id uuid, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, o.name
  FROM public.organizations o
  WHERE o.type = 'staffing_agency'
    AND char_length(coalesce(query, '')) >= 2
    AND o.name ILIKE '%' || query || '%'
  ORDER BY o.name
  LIMIT 20;
$$;

REVOKE ALL ON FUNCTION public.search_staffing_agencies(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_staffing_agencies(text) TO authenticated;
