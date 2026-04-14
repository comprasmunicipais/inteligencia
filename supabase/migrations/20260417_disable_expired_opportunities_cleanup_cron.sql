-- Disable automatic deletion of expired opportunities history.
-- Expired opportunities should remain archived in the database.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'cleanup_expired_opportunities'
  ) THEN
    PERFORM cron.unschedule('cleanup_expired_opportunities');
  END IF;
END;
$$;
