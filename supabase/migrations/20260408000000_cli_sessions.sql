-- CLI sessions: allow Claude Code terminal to act on behalf of the logged-in user
CREATE TABLE IF NOT EXISTS cli_sessions (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid        REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  session_token text        UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  provider_token text       NOT NULL,
  customer_id   text        NOT NULL,
  customer_name text,
  created_at    timestamptz DEFAULT now(),
  expires_at    timestamptz DEFAULT (now() + interval '2 hours')
);

-- Only the owning user can read/write their sessions via the JS client
ALTER TABLE cli_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cli_sessions_owner" ON cli_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Index for fast lookup by session_token (used by edge function)
CREATE UNIQUE INDEX cli_sessions_token_idx ON cli_sessions (session_token);
