-- 1) agent_api_keys / agent_user_tokens: same conditions, targeted TO authenticated
DROP POLICY IF EXISTS "Admins manage api keys" ON public.agent_api_keys;
CREATE POLICY "Admins manage api keys" ON public.agent_api_keys
  FOR ALL TO authenticated
  USING (ref_has_role(auth.uid(), 'admin'::ref_app_role))
  WITH CHECK (ref_has_role(auth.uid(), 'admin'::ref_app_role));

DROP POLICY IF EXISTS "Admins view all tokens" ON public.agent_user_tokens;
CREATE POLICY "Admins view all tokens" ON public.agent_user_tokens
  FOR SELECT TO authenticated
  USING (ref_has_role(auth.uid(), 'admin'::ref_app_role));

DROP POLICY IF EXISTS "Users create their own tokens" ON public.agent_user_tokens;
CREATE POLICY "Users create their own tokens" ON public.agent_user_tokens
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users revoke their own tokens" ON public.agent_user_tokens;
CREATE POLICY "Users revoke their own tokens" ON public.agent_user_tokens
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view their own tokens" ON public.agent_user_tokens;
CREATE POLICY "Users view their own tokens" ON public.agent_user_tokens
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 2) email tables: replace auth.role() checks with role-targeted policies
DROP POLICY IF EXISTS "Service role can insert send log" ON public.email_send_log;
DROP POLICY IF EXISTS "Service role can read send log" ON public.email_send_log;
DROP POLICY IF EXISTS "Service role can update send log" ON public.email_send_log;
CREATE POLICY "Service role manages send log" ON public.email_send_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage send state" ON public.email_send_state;
CREATE POLICY "Service role manages send state" ON public.email_send_state
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert suppressed emails" ON public.suppressed_emails;
DROP POLICY IF EXISTS "Service role can read suppressed emails" ON public.suppressed_emails;
CREATE POLICY "Service role manages suppressed emails" ON public.suppressed_emails
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3) consultant_references: same ownership rule, expressed directly via EXISTS
DROP POLICY IF EXISTS "Users can read own references" ON public.consultant_references;
CREATE POLICY "Users can read own references" ON public.consultant_references
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.consultant_profiles cp
    WHERE cp.id = consultant_references.consultant_id AND cp.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can insert own references" ON public.consultant_references;
CREATE POLICY "Users can insert own references" ON public.consultant_references
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.consultant_profiles cp
    WHERE cp.id = consultant_references.consultant_id AND cp.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can update own references" ON public.consultant_references;
CREATE POLICY "Users can update own references" ON public.consultant_references
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.consultant_profiles cp
    WHERE cp.id = consultant_references.consultant_id AND cp.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.consultant_profiles cp
    WHERE cp.id = consultant_references.consultant_id AND cp.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can delete own references" ON public.consultant_references;
CREATE POLICY "Users can delete own references" ON public.consultant_references
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.consultant_profiles cp
    WHERE cp.id = consultant_references.consultant_id AND cp.user_id = auth.uid()
  ));