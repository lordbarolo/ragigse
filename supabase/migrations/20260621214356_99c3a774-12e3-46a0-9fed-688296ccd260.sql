CREATE POLICY "Listing owners can read their offers"
  ON public.mp_offers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mp_listings l
      WHERE l.id = mp_offers.listing_id
        AND l.user_id = auth.uid()
    )
  );