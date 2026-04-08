-- Meta CLI sessions: allow Claude Code terminal to act on Meta Ads on behalf of the logged-in user
CREATE TABLE IF NOT EXISTS meta_cli_sessions (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid        REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  session_token text        UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  access_token  text        NOT NULL,
  account_id    text        NOT NULL,
  account_name  text,
  created_at    timestamptz DEFAULT now(),
  expires_at    timestamptz DEFAULT (now() + interval '2 hours')
);

ALTER TABLE meta_cli_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meta_cli_sessions_owner" ON meta_cli_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE UNIQUE INDEX meta_cli_sessions_token_idx ON meta_cli_sessions (session_token);
