-- Add parts column to chat_messages
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS parts JSONB DEFAULT '[]';

-- Add index for faster querying
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages ( session_id, created_at );

