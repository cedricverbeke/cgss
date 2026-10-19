/*
# Schedule daily reminder edge function at 10:00 UTC (6h00 Martinique)

## Purpose
Invokes the `daily-reminder` edge function every day at 10:00 UTC via pg_cron.
10:00 UTC = 06:00 AST (Martinique, UTC-4 year-round, no DST).

## Changes
- Enables the `pg_cron` extension if not already enabled.
- Schedules a daily job named `daily-reminder-job` using a DO block that first
  tries to unschedule an existing job of the same name (ignoring errors if it
  does not exist yet), then schedules it.
- The job uses net.http_post (from the pg_net extension) to invoke the edge
  function over HTTPS with the project anon key.

## Notes
- Idempotent: safe to re-run. Re-running replaces the schedule with the same name.
*/

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('daily-reminder-job');
  EXCEPTION WHEN OTHERS THEN
    -- job does not exist yet, ignore
  END;

  PERFORM cron.schedule(
    'daily-reminder-job',
    '0 10 * * *',
    $CRON$
      SELECT content
      FROM net.http_post(
        url := 'https://0ec90b57d6e95fcbda19832f.supabase.co/functions/v1/daily-reminder',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key', true)
        ),
        body := '{}'::jsonb
      )
    $CRON$
  );
END
$$;
