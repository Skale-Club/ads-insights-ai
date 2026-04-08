import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, RefreshCw, Unlink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboard } from '@/contexts/DashboardContext';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';

const META_REDIRECT_URI = `${SUPABASE_URL}/functions/v1/meta-auth`;

function buildOAuthUrl(userId: string, metaAppId: string): string {
  const params = new URLSearchParams({
    client_id: metaAppId,
    redirect_uri: META_REDIRECT_URI,
    scope: 'ads_read,ads_management,business_management',
    state: userId,
    response_type: 'code',
  });
  return `https://www.facebook.com/v20.0/dialog/oauth?${params.toString()}`;
}

export function MetaAdsSection() {
  const { user } = useAuth();
  const { metaAccounts, setMetaAccounts, setSelectedMetaAccount } = useDashboard();
  const { toast } = useToast();

  const [connection, setConnection] = useState<{
    meta_user_name: string;
    expires_at: string;
  } | null>(null);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [metaAppId, setMetaAppId] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [hasCompany, setHasCompany] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.functions
      .invoke('get-platform-config')
      .then(({ data, error }) => {
        if (error || data?.error) {
          setConfigError(data?.error ?? error?.message ?? 'Meta App not configured');
        } else {
          setMetaAppId(data.metaAppId);
        }
      });
  }, []);

  // Load connection status + company check
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('meta_connections')
      .select('meta_user_name, expires_at')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => setConnection(data ?? null));

    supabase
      .from('companies')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setHasCompany(!!data));
  }, [user?.id]);

  // Handle OAuth return (settings?meta_connected=true)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('meta_connected') !== 'true' || !user?.id) return;
    // Remove the query param
    window.history.replaceState({}, '', window.location.pathname);
    // Reload connection info
    supabase
      .from('meta_connections')
      .select('meta_user_name, expires_at, access_token')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setConnection({ meta_user_name: data.meta_user_name, expires_at: data.expires_at });
        // Fetch and populate ad accounts
        fetchAccounts(data.access_token);
      });
  }, [user?.id]);

  const fetchAccounts = async (accessToken: string) => {
    if (!user?.id) return;
    setLoadingAccounts(true);
    try {
      const { data, error } = await supabase.functions.invoke('meta-accounts', {
        body: { accessToken, userId: user.id },
      });
      if (error || data?.error) throw new Error(data?.error ?? error?.message);
      const accounts = data.accounts ?? [];
      setMetaAccounts(accounts);
      if (accounts.length > 0) setSelectedMetaAccount(accounts[0]);
      toast({ title: `${accounts.length} Meta ad account(s) connected` });
    } catch (err) {
      toast({ title: 'Failed to load Meta accounts', description: String(err), variant: 'destructive' });
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleConnect = () => {
    if (!user?.id) return;
    if (!metaAppId) {
      toast({
        title: 'Meta App not configured',
        description: configError ?? 'Add META_APP_ID in Supabase Dashboard → Edge Functions → Secrets',
        variant: 'destructive',
      });
      return;
    }
    window.location.href = buildOAuthUrl(user.id, metaAppId);
  };

  const handleDisconnect = async () => {
    if (!user?.id) return;
    await supabase.from('meta_connections').delete().eq('user_id', user.id);
    await supabase.from('meta_accounts').delete().eq('user_id', user.id);
    setConnection(null);
    setMetaAccounts([]);
    setSelectedMetaAccount(null);
    toast({ title: 'Meta Ads disconnected' });
  };

  const handleRefreshAccounts = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('meta_connections')
      .select('access_token')
      .eq('user_id', user.id)
      .single();
    if (data?.access_token) fetchAccounts(data.access_token);
  };

  const isConnected = !!connection;
  const isExpired = connection ? new Date(connection.expires_at) < new Date() : false;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-blue-600 text-white text-xs font-bold">f</div>
          <CardTitle>Meta Ads</CardTitle>
          {isConnected && (
            <Badge variant={isExpired ? 'destructive' : 'default'} className="ml-auto">
              {isExpired ? 'Token Expired' : 'Connected'}
            </Badge>
          )}
        </div>
        <CardDescription>
          Connect your Facebook / Instagram ad accounts. Requires a Meta App with{' '}
          <code className="text-xs">ads_management</code> permission.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          <div className="space-y-3">
            {configError ? (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{configError}</span>
              </div>
            ) : !hasCompany ? (
              <div className="flex items-start gap-2 rounded-md bg-muted p-3 text-sm text-muted-foreground">
                <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>Save your <strong>Company Profile</strong> above before connecting Meta Ads.</span>
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-md bg-muted p-3 text-sm text-muted-foreground">
                <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>Not connected. Click below to authorize with Facebook.</span>
              </div>
            )}
            <Button onClick={handleConnect} disabled={!!configError || !hasCompany}>Connect Meta Ads</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              {isExpired ? (
                <XCircle className="h-4 w-4 text-destructive" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              <span>
                Connected as <strong>{connection.meta_user_name}</strong>
                {!isExpired && (
                  <span className="text-muted-foreground ml-1">
                    · expires {new Date(connection.expires_at).toLocaleDateString()}
                  </span>
                )}
                {isExpired && (
                  <span className="text-destructive ml-1">· Token expired</span>
                )}
              </span>
            </div>

            {isExpired && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">Session expired</p>
                  <p className="text-xs mt-0.5">Your Meta access token has expired. Reconnect to restore access.</p>
                </div>
                <Button size="sm" variant="destructive" onClick={handleConnect} disabled={!metaAppId}>
                  Reconnect
                </Button>
              </div>
            )}

            {metaAccounts.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Ad Accounts ({metaAccounts.length})
                </p>
                <div className="rounded-md border divide-y">
                  {metaAccounts.map((acc) => (
                    <div key={acc.account_id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <div>
                        <span className="font-medium">{acc.account_name}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{acc.account_id}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">{acc.currency}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleRefreshAccounts} disabled={loadingAccounts}>
                <RefreshCw className={`mr-2 h-3 w-3 ${loadingAccounts ? 'animate-spin' : ''}`} />
                Refresh Accounts
              </Button>
              <Button variant="outline" size="sm" onClick={handleDisconnect}>
                <Unlink className="mr-2 h-3 w-3" />
                Disconnect
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
