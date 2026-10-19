/*
# Fix daily-reminder cron job URL and auth key

## Problem
The scheduled pg_cron job `daily-reminder-job` was calling the edge function
at the wrong project URL (0ec90b57d6e95fcbda19832f.supabase.co) instead of
the current project (aaxsjnhrlfyhclbgrvzy.supabase.co). No reminder emails
were ever sent because the request went to a non-existent host.

It also relied on `current_setting('app.supabase_anon_key', true)` which may
not be set, producing an empty Authorization header.

## Fix
- Unschedule the old job and reschedule with the correct project URL.
- Inline the anon key directly in the Authorization header so the edge
  function (verify_jwt = false) always receives a valid request.

## Schedule
Unchanged: `0 10 * * *` = 10:00 UTC = 06:00 AST (Martinique, UTC-4).
*/

DO $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('daily-reminder-job');
  EXCEPTION WHEN OTHERS THEN
    -- job does not exist, ignore
  END;
END
$$;

SELECT cron.schedule(
  'daily-reminder-job',
  '0 10 * * *',
  $CRON$
    SELECT content
    FROM net.http_post(
      url := 'https://aaxsjnhrlfyhclbgrvzy.supabase.co/functions/v1/daily-reminder',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFheHNqbmhybGZ5aGNsYmdydnp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzNDQ3NTQsImV4cCI6MjEwNzkyMDc1NH0.PtFuv3voaErS_vP_hUlpfIQwl7WFsdh68-Gt6JgJIS8'
      ),
      body := '{}'::jsonb
    )
  $CRON$
);
