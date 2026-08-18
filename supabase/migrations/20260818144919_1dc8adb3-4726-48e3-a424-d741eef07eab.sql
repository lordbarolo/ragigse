DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'seo_scan_secret') THEN
    PERFORM vault.create_secret(encode(gen_random_bytes(32), 'hex'), 'seo_scan_secret', 'Delad hemlighet för /api/public/seo-scan');
  END IF;
END $$;

SELECT cron.unschedule('seo-scan-weekly') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'seo-scan-weekly');

SELECT cron.schedule(
  'seo-scan-weekly',
  '20 4 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://project--f4c1323e-7c72-43ee-978e-fa632a197c62.lovable.app/api/public/seo-scan',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-seo-scan-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'seo_scan_secret' LIMIT 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);