import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2, AlertCircle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboard } from '@/contexts/DashboardContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AdsLogo } from '@/components/icons/AdsLogo';

interface GoogleAdsAccount {
  id: string;
  customerId: string;
  name: string;
  currencyCode?: string;
  timeZone?: string;
  isManager?: boolean;
  status?: string;
}

export default function ConnectGoogleAdsPage() {
  const navigate = useNavigate();
  const { user, session, providerToken, signOut } = useAuth();
  const { setSelectedAccount, setAccounts } = useDashboard();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [localAccounts, setLocalAccounts] = useState<GoogleAdsAccount[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAccounts = async () => {
      if (!session?.access_token) {
        setLoading(false);
        return;
      }

      // Get provider token from state or sessionStorage
      const token = providerToken || sessionStorage.getItem('google_provider_token');

      if (!token) {
        setError('Google access token not found. Please sign in again.');
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching accounts with token:', token ? 'Token exists' : 'Token missing');
        const { data, error: fnError } = await supabase.functions.invoke('google-ads-accounts', {
          body: { providerToken: token },
        });

        if (fnError) {
          console.error('Supabase function error:', fnError);
          throw new Error(fnError.message);
        }

        console.log('Function Response Data:', data);

        if (data.error) {
          console.error('API data error:', data.error);
          throw new Error(data.error);
        }

        const fetchedAccounts = data.accounts || [];
        setLocalAccounts(fetchedAccounts);
        setAccounts(fetchedAccounts); // Store in context for TopBar
      } catch (err) {
        console.error('Error fetching accounts:', err);
        const message = err instanceof Error ? err.message : 'Failed to fetch accounts';
        setError(message);

        toast({
          title: 'Connection Failed',
          description: message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, [session, providerToken, toast]);
  // Also update context when localAccounts changes
  useEffect(() => {
    if (localAccounts.length > 0) {
      setAccounts(localAccounts);
    }
  }, [localAccounts, setAccounts]);

  const handleConnect = async () => {
    if (!selectedId) return;

    setConnecting(true);
    // Simulate connection
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const account = localAccounts.find((a) => a.id === selectedId);
    if (account) {
      setSelectedAccount({
        id: account.id,
        customerId: account.customerId,
        name: account.name,
        currencyCode: account.currencyCode,
        timeZone: account.timeZone,
        isManager: account.isManager,
      });
    }

    navigate('/dashboard/overview');
  };

  const handleLogout = async () => {
    sessionStorage.removeItem('google_provider_token');
    await signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Fetching your Google Ads accounts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-accent/20 p-4">
      <Card className="w-full max-w-lg animate-fade-in">
        <CardHeader className="relative">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-card shadow-sm border">
            <AdsLogo size="lg" />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
          <CardTitle className="text-xl text-center">Select Google Ads Account</CardTitle>
          <CardDescription className="text-center">
            Choose an account to analyze. You can switch accounts later from the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {localAccounts.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center animate-fade-in">
              <div className="mb-4 rounded-full bg-destructive/10 p-3">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-destructive">Connection Failed</h3>
              <div className="space-y-4 max-w-sm">
                <p className="text-sm text-muted-foreground">
                  {error || 'Unable to fetch Google Ads accounts. This is usually due to missing configuration.'}
                </p>

                <div className="rounded-md bg-muted p-4 text-left text-xs space-y-2">
                  <p className="font-semibold text-foreground">Troubleshooting Steps:</p>
                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                    <li>Check if <code className="bg-background px-1 rounded">GOOGLE_ADS_DEVELOPER_TOKEN</code> is set correctly.</li>
                    <li>Verify if <code className="bg-background px-1 rounded">GOOGLE_ADS_LOGIN_CUSTOMER_ID</code> is set to your MCC ID ({'7450827301'}) without dashes.</li>
                    <li>Ensure the Google Cloud Project has the Google Ads API enabled.</li>
                    <li>Try logging out and logging in again to refresh permissions.</li>
                  </ul>
                  {error && (
                    <div className="mt-2 p-2 bg-destructive/10 text-destructive rounded border border-destructive/20 overflow-auto max-h-24">
                      <p className="font-mono text-[10px]">{error}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 justify-center pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      sessionStorage.removeItem('google_provider_token');
                      navigate('/login');
                    }}
                  >
                    Try Different Account
                  </Button>
                  <Button
                    onClick={() => window.location.reload()}
                  >
                    Retry Connection
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {localAccounts.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => setSelectedId(account.id)}
                    className={`w-full flex items-center justify-between rounded-lg border p-4 transition-all hover:border-primary/50 ${selectedId === account.id
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border'
                      }`}
                  >
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{account.name}</p>
                        {account.isManager && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">MCC</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{account.customerId}</p>
                      {account.currencyCode && (
                        <p className="text-xs text-muted-foreground">{account.currencyCode} · {account.timeZone}</p>
                      )}
                    </div>
                    {selectedId === account.id && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <Button
                onClick={handleConnect}
                disabled={!selectedId || connecting}
                className="w-full"
                size="lg"
              >
                {connecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Continue to Dashboard'
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
