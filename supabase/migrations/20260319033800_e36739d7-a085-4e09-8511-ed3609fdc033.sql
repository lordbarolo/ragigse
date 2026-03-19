
-- Watchlist table for tracked assignments
CREATE TABLE public.radar_watchlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  competence TEXT NOT NULL,
  location TEXT NOT NULL,
  buyer TEXT NOT NULL,
  predicted_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.radar_watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own watchlist" ON public.radar_watchlist
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own watchlist" ON public.radar_watchlist
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own watchlist" ON public.radar_watchlist
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Notifications table for scheduled reminders
CREATE TABLE public.radar_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  watchlist_id UUID NOT NULL REFERENCES public.radar_watchlist(id) ON DELETE CASCADE,
  months_before INTEGER NOT NULL,
  scheduled_for DATE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.radar_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications" ON public.radar_notifications
  FOR SELECT TO authenticated
  USING (watchlist_id IN (SELECT id FROM public.radar_watchlist WHERE user_id = auth.uid()));

-- Function to auto-create 3 notification rows on watchlist insert
CREATE OR REPLACE FUNCTION public.radar_create_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.predicted_date IS NOT NULL THEN
    INSERT INTO public.radar_notifications (watchlist_id, months_before, scheduled_for)
    VALUES
      (NEW.id, 3, NEW.predicted_date - INTERVAL '3 months'),
      (NEW.id, 2, NEW.predicted_date - INTERVAL '2 months'),
      (NEW.id, 1, NEW.predicted_date - INTERVAL '1 month');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER radar_watchlist_notifications
  AFTER INSERT ON public.radar_watchlist
  FOR EACH ROW EXECUTE FUNCTION public.radar_create_notifications();
