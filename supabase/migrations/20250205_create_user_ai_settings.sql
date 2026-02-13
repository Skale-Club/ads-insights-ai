 -- Create user_ai_settings table for storing OpenAI API keys and preferences
 CREATE TABLE IF NOT EXISTS public.user_ai_settings (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
   openai_api_key TEXT,
   preferred_model TEXT DEFAULT 'gpt-4o-mini',
   created_at TIMESTAMPTZ DEFAULT now(),
   updated_at TIMESTAMPTZ DEFAULT now()
 );
 
 -- Enable RLS
 ALTER TABLE public.user_ai_settings ENABLE ROW LEVEL SECURITY;
 
 -- Users can only access their own settings
 CREATE POLICY "Users can view their own AI settings"
   ON public.user_ai_settings
   FOR SELECT
   USING (auth.uid() = user_id);
 
 CREATE POLICY "Users can insert their own AI settings"
   ON public.user_ai_settings
   FOR INSERT
   WITH CHECK (auth.uid() = user_id);
 
 CREATE POLICY "Users can update their own AI settings"
   ON public.user_ai_settings
   FOR UPDATE
   USING (auth.uid() = user_id);
 
 CREATE POLICY "Users can delete their own AI settings"
   ON public.user_ai_settings
   FOR DELETE
   USING (auth.uid() = user_id);