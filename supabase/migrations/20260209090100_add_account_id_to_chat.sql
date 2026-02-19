-- Add account_id to chat_sessions to filter by context
ALTER TABLE public.chat_sessions 
ADD COLUMN IF NOT EXISTS account_id TEXT;

-- Update RLS if necessary (optional, but good practice to index)
CREATE INDEX IF NOT EXISTS idx_chat_sessions_account_id ON public.chat_sessions(account_id);
