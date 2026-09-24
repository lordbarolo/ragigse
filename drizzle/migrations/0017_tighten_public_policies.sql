DROP POLICY IF EXISTS "Anyone can read price changes" ON public.price_changes;
CREATE POLICY "Authenticated can read price changes" ON public.price_changes FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Anyone can read calloff_history" ON public.calloff_history;
CREATE POLICY "Authenticated can read calloff_history" ON public.calloff_history FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Anyone can submit invoices" ON public.invoice_submissions;
CREATE POLICY "Users submit invoices with own email" ON public.invoice_submissions FOR INSERT TO authenticated WITH CHECK (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));