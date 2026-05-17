-- Short-lived nonces for Meta OAuth CSRF protection.
-- Replaces the unsafe pattern of passing user_id as the OAuth `state` param,
-- which let any attacker link their Meta token to a victim's account.

CREATE TABLE IF NOT EXISTS public.meta_oauth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nonce text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  used_at timestamptz
);

CREATE INDEX IF NOT EXISTS meta_oauth_states_nonce_idx
  ON public.meta_oauth_states (nonce)
  WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS meta_oauth_states_expires_idx
  ON public.meta_oauth_states (expires_at)
  WHERE used_at IS NULL;

ALTER TABLE public.meta_oauth_states ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert nonces only for themselves.
-- Edge functions use service role and bypass RLS for the consume step.
CREATE POLICY "users insert own oauth state"
  ON public.meta_oauth_states
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- No SELECT/UPDATE/DELETE policies — only service role reads/marks.
-- Authenticated users have no need to read these.

-- Best-effort cleanup helper (callable by service role).
-- Production should schedule this via pg_cron or a daily edge function.
CREATE OR REPLACE FUNCTION public.cleanup_expired_meta_oauth_states()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.meta_oauth_states
  WHERE expires_at < now() - interval '1 day'
     OR (used_at IS NOT NULL AND used_at < now() - interval '1 day');
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
