
-- Remove the cron job for radar notifications
SELECT cron.unschedule('radar-notify-daily');

-- Drop the trigger that creates notifications on watchlist insert
DROP TRIGGER IF EXISTS radar_watchlist_notifications ON public.radar_watchlist;

-- Drop the trigger function
DROP FUNCTION IF EXISTS public.radar_create_notifications();
