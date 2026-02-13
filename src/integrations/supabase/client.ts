import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Supabase credentials must be provided via environment variables (.env.local)
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

// Create a mock client that does nothing when Supabase isn't configured
const createMockClient = (): SupabaseClient<Database> => {
  const mockAuth = {
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    signInWithOAuth: () => Promise.resolve({ data: { url: null, provider: 'google' as const }, error: new Error('Supabase not configured') }),
    signOut: () => Promise.resolve({ error: null }),
  };
  
  return { auth: mockAuth } as unknown as SupabaseClient<Database>;
};

export const supabase: SupabaseClient<Database> = isSupabaseConfigured
  ? createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        storageKey: 'supabase.auth.token',
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : createMockClient();
