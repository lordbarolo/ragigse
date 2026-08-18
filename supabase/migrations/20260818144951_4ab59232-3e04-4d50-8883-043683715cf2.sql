SELECT cron.unschedule('seo-scan-weekly') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'seo-scan-weekly');

SELECT cron.schedule(
  'seo-scan-weekly',
  '20 4 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://project--f4c1323e-7c72-43ee-978e-fa632a197c62.lovable.app/api/public/seo-scan',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-seo-scan-key', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);

DO $$
DECLARE sid uuid;
BEGIN
  SELECT id INTO sid FROM vault.secrets WHERE name = 'seo_scan_secret';
  IF sid IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = sid;
  END IF;
END $$;