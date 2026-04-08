import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboard } from '@/contexts/DashboardContext';

interface MetaCliSession {
  id: string;
  session_token: string;
  account_id: string;
  account_name: string | null;
  expires_at: string;
}

export function useMetaCliSession() {
  const { user } = useAuth();
  const { selectedMetaAccount } = useDashboard();
  const [session, setSession] = useState<MetaCliSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    supabase
      .from('meta_cli_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => { setSession(data ?? null); setLoading(false); });
  }, [user?.id]);

  const isExpired = session ? new Date(session.expires_at) < new Date() : false;
  const canActivate = !!selectedMetaAccount;

  const activate = async (): Promise<MetaCliSession | null> => {
    if (!user?.id || !selectedMetaAccount) return null;

    // Get Meta access token from meta_connections
    const { data: conn } = await supabase
      .from('meta_connections')
      .select('access_token')
      .eq('user_id', user.id)
      .single();

    if (!conn?.access_token) return null;

    setActivating(true);
    try {
      const { data, error } = await supabase
        .from('meta_cli_sessions')
        .upsert(
          {
            user_id: user.id,
            session_token: crypto.randomUUID(),
            access_token: conn.access_token,
            account_id: selectedMetaAccount.account_id,
            account_name: selectedMetaAccount.account_name,
            expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          },
          { onConflict: 'user_id' }
        )
        .select()
        .single();

      if (error) throw error;
      setSession(data);
      return data;
    } finally {
      setActivating(false);
    }
  };

  const revoke = async () => {
    if (!user?.id) return;
    await supabase.from('meta_cli_sessions').delete().eq('user_id', user.id);
    setSession(null);
  };

  return { session, loading, activating, isExpired, canActivate, activate, revoke };
}
