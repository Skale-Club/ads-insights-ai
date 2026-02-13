import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  providerToken: string | null;
  loading: boolean;
  isConfigured: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [providerToken, setProviderToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    let isInitialized = false;

    // Check for OAuth callback tokens in URL
    const hashParams = window.location.hash;
    const hasOAuthCallback = hashParams.includes('access_token') || hashParams.includes('error');
    console.log('[Auth] Mount - URL hash:', hashParams ? 'present' : 'none', 'OAuth callback:', hasOAuthCallback);

    // STEP 1: Set up auth state change listener
    // This handles ongoing changes after initial load
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!isMounted) return;

        console.log('[Auth] onAuthStateChange:', event, newSession?.user?.email ?? 'no session');

        // Always update session and user state
        setSession(newSession);
        setUser(newSession?.user ?? null);

        // Capture provider token from OAuth callback
        if (newSession?.provider_token) {
          console.log('[Auth] Provider token captured');
          setProviderToken(newSession.provider_token);
          // Store in sessionStorage for persistence during this session
          sessionStorage.setItem('google_provider_token', newSession.provider_token);
        }

        // Handle specific events
        if (event === 'SIGNED_OUT') {
          console.log('[Auth] User signed out');
          setProviderToken(null);
          sessionStorage.removeItem('google_provider_token');
          setLoading(false);
        }

        // For SIGNED_IN event (OAuth callback success), always set loading false
        if (event === 'SIGNED_IN') {
          console.log('[Auth] User signed in successfully');
          isInitialized = true;
          setLoading(false);
        }

        // If we're already initialized, ensure loading is false for any auth change
        if (isInitialized) {
          setLoading(false);
        }
      }
    );

    // STEP 2: Initialize auth state from storage
    const initializeAuth = async () => {
      try {
        console.log('[Auth] Getting session from storage...');
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('[Auth] Error getting session:', error);
        }

        if (!isMounted) return;

        console.log('[Auth] Initial session:', currentSession?.user?.email ?? 'no session');

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        // Prefer provider token from the current session when available (may differ from stale sessionStorage).
        if (currentSession?.provider_token) {
          setProviderToken(currentSession.provider_token);
          sessionStorage.setItem('google_provider_token', currentSession.provider_token);
        } else {
          // Restore provider token from sessionStorage if available
          const storedToken = sessionStorage.getItem('google_provider_token');
          if (storedToken) setProviderToken(storedToken);
        }
      } finally {
        if (isMounted) {
          isInitialized = true;
          setLoading(false);
          console.log('[Auth] Initialization complete');
        }
      }
    };

    initializeAuth();

    return () => {
      console.log('[Auth] Unmounting AuthProvider');
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array - only run once on mount

  const signInWithGoogle = useCallback(async () => {
    const redirectUrl = window.location.origin + '/auth/callback';

    console.log('[Auth] signInWithGoogle, redirect to:', redirectUrl);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        scopes: 'https://www.googleapis.com/auth/adwords',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  // Debug: log state changes
  useEffect(() => {
    console.log('[Auth] State:', { hasUser: !!user, hasSession: !!session, hasProviderToken: !!providerToken, loading, email: user?.email });
  }, [user, session, providerToken, loading]);

  return (
    <AuthContext.Provider value={{ user, session, providerToken, loading, isConfigured: isSupabaseConfigured, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
