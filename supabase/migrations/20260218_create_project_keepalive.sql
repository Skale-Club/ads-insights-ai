-- Heartbeat row used by an external cron to keep the Supabase project active.
CREATE TABLE IF NOT EXISTS public.project_keepalive_heartbeat (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_heartbeat_hour_utc INTEGER NOT NULL DEFAULT (EXTRACT(HOUR FROM timezone('UTC', now()))::INTEGER),
  run_count BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.touch_project_keepalive()
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.project_keepalive_heartbeat (
    id,
    last_heartbeat_at,
    last_heartbeat_hour_utc,
    run_count,
    created_at,
    updated_at
  )
  VALUES (
    1,
    now(),
    EXTRACT(HOUR FROM timezone('UTC', now()))::INTEGER,
    1,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    last_heartbeat_at = EXCLUDED.last_heartbeat_at,
    last_heartbeat_hour_utc = EXCLUDED.last_heartbeat_hour_utc,
    run_count = public.project_keepalive_heartbeat.run_count + 1,
    updated_at = now();
$$;

REVOKE ALL ON FUNCTION public.touch_project_keepalive() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.touch_project_keepalive() TO service_role;
