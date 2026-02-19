-- Security Advisor fix: ensure tables in the exposed public schema have RLS enabled.
ALTER TABLE IF EXISTS public.project_keepalive_heartbeat
  ENABLE ROW LEVEL SECURITY;
