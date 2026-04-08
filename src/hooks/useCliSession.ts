import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboard } from '@/contexts/DashboardContext';

export interface CliSession {
  session_token: string;
  customer_id: string;
  customer_name: string | null;
  expires_at: string;
}

export function useCliSession() {
  const { user } = useAuth();
  const { selectedAccount } = useDashboard();
  const [session, setSession] = useState<CliSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);

  const providerToken = sessionStorage.getItem('google_provider_token');

  const fetchSession = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data } = await supabase
        .from('cli_sessions')
        .select('session_token, customer_id, customer_name, expires_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setSession(data ?? null);
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchSession(); }, [fetchSession]);

  const activate = useCallback(async (): Promise<CliSession | null> => {
    if (!user || !selectedAccount || !providerToken) return null;

    setActivating(true);
    try {
      // Upsert: one active session per user (delete old, insert new)
      await supabase.from('cli_sessions').delete().eq('user_id', user.id);

      const { data, error } = await supabase
        .from('cli_sessions')
        .insert({
          user_id: user.id,
          provider_token: providerToken,
          customer_id: selectedAccount.id,
          customer_name: selectedAccount.name ?? null,
        })
        .select('session_token, customer_id, customer_name, expires_at')
        .single();

      if (error || !data) throw error ?? new Error('Failed to create session');

      setSession(data);
      return data;
    } finally {
      setActivating(false);
    }
  }, [user, selectedAccount, providerToken]);

  const revoke = useCallback(async () => {
    if (!user) return;
    await supabase.from('cli_sessions').delete().eq('user_id', user.id);
    setSession(null);
  }, [user]);

  const isExpired = session
    ? new Date(session.expires_at) < new Date()
    : false;

  const canActivate = !!user && !!selectedAccount && !!providerToken;

  return { session, loading, activating, isExpired, canActivate, activate, revoke, refetch: fetchSession };
}
