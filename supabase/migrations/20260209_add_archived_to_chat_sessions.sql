-- Add archived column to chat_sessions for soft-delete functionality
ALTER TABLE public.chat_sessions 
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

-- Add index for better query performance when filtering out archived chats
CREATE INDEX IF NOT EXISTS idx_chat_sessions_archived ON public.chat_sessions(archived);

-- Add RLS policy to allow users to update the archived status
DROP POLICY IF EXISTS "Users can update their own chat sessions" ON public.chat_sessions;
CREATE POLICY "Users can update their own chat sessions"
  ON public.chat_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);
