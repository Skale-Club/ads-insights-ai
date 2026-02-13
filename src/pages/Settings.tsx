import { useState, useEffect } from 'react';
import { Check, X, AlertCircle, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDashboard } from '@/contexts/DashboardContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { AISettingsCard } from '@/components/settings/AISettingsCard';

interface EnvVar {
  name: string;
  description: string;
  required: boolean;
  isSet: boolean;
}

// Mock environment check - in production this would call the backend
const mockEnvVars: EnvVar[] = [
  {
    name: 'GOOGLE_CLIENT_ID',
    description: 'OAuth 2.0 Client ID from Google Cloud Console',
    required: true,
    isSet: false,
  },
  {
    name: 'GOOGLE_CLIENT_SECRET',
    description: 'OAuth 2.0 Client Secret',
    required: true,
    isSet: false,
  },
  {
    name: 'GOOGLE_ADS_DEVELOPER_TOKEN',
    description: 'Google Ads API Developer Token',
    required: true,
    isSet: false,
  },
  {
    name: 'GOOGLE_ADS_LOGIN_CUSTOMER_ID',
    description: 'MCC Account ID (without dashes)',
    required: false,
    isSet: false,
  },
  {
    name: 'APP_BASE_URL',
    description: 'Base URL for OAuth redirects',
    required: true,
    isSet: true,
  },
];

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { selectedAccount, setSelectedAccount, accounts, hiddenAccountIds, toggleAccountHidden, unhideAllAccounts } = useDashboard();
  const [envVars, setEnvVars] = useState<EnvVar[]>(mockEnvVars);

  const requiredMissing = envVars.filter((v) => v.required && !v.isSet);
  const allRequiredSet = requiredMissing.length === 0;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account, connections, and environment configuration
        </p>
      </div>

      {/* User Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-semibold">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <p className="font-medium">{user?.email || 'user@example.com'}</p>
              <p className="text-sm text-muted-foreground">Signed in with Google</p>
            </div>
          </div>
          <Button variant="outline" onClick={signOut}>
            Sign Out
          </Button>
        </CardContent>
      </Card>

      {/* Account Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Google Ads Account</CardTitle>
          <CardDescription>Select which account to analyze</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {accounts.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center border rounded-lg bg-muted/20">
              <p className="text-muted-foreground mb-2">No accounts found</p>
              <Button variant="outline" size="sm" asChild>
                <a href="/connect/google-ads">Connect Account</a>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Hidden accounts are removed from the account selector on the dashboard.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={unhideAllAccounts}
                  disabled={hiddenAccountIds.length === 0}
                >
                  Show all
                </Button>
              </div>

              {accounts.map((account) => {
                const isHidden = hiddenAccountIds.includes(account.id);
                const isSelected = selectedAccount?.id === account.id;

                return (
                  <div
                    key={account.id}
                    className={cn(
                      'w-full flex items-center justify-between rounded-lg border p-4 transition-all',
                      !isHidden && 'hover:border-primary/50',
                      isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border',
                      isHidden && 'opacity-60'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => !isHidden && setSelectedAccount(account)}
                      disabled={isHidden}
                      className={cn('flex-1 text-left', isHidden && 'cursor-not-allowed')}
                      title={isHidden ? 'This account is hidden' : 'Select account'}
                    >
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{account.name}</p>
                        {account.isManager && (
                          <Badge variant="secondary" className="text-xs">MCC</Badge>
                        )}
                        {isHidden && (
                          <Badge variant="outline" className="text-xs">Hidden</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{account.customerId}</p>
                      {account.currencyCode && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {account.currencyCode} {account.timeZone && `- ${account.timeZone}`}
                        </p>
                      )}
                    </button>

                    <div className="ml-3 flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleAccountHidden(account.id)}
                        title={isHidden ? 'Show account' : 'Hide account'}
                      >
                        {isHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        <span className="ml-2">{isHidden ? 'Show' : 'Hide'}</span>
                      </Button>

                      {isSelected && (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                          <Check className="h-4 w-4 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Settings */}
      <AISettingsCard />

      {/* Environment Variables Check */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Environment Configuration</CardTitle>
              <CardDescription>Required environment variables for Google Ads API</CardDescription>
            </div>
            <Badge variant={allRequiredSet ? 'default' : 'destructive'}>
              {allRequiredSet ? 'All Set' : `${requiredMissing.length} Missing`}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!allRequiredSet && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/5 p-4 mb-4">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Configuration Incomplete</p>
                <p className="text-sm text-muted-foreground">
                  Add the missing environment variables to enable Google Ads API integration.
                </p>
              </div>
            </div>
          )}

          {envVars.map((envVar) => (
            <div
              key={envVar.name}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full',
                    envVar.isSet ? 'bg-success/10' : 'bg-muted'
                  )}
                >
                  {envVar.isSet ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm font-medium">{envVar.name}</p>
                    {envVar.required && (
                      <Badge variant="outline" className="text-xs">
                        Required
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{envVar.description}</p>
                </div>
              </div>
            </div>
          ))}

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-3">
              For setup instructions, refer to the Google Ads API documentation:
            </p>
            <Button variant="outline" size="sm" asChild>
              <a
                href="https://developers.google.com/google-ads/api/docs/first-call/overview"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Google Ads API Setup Guide
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Note */}
      <Card>
        <CardHeader>
          <CardTitle>Privacy & Data</CardTitle>
          <CardDescription>How we handle your data</CardDescription>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-muted-foreground">
          <ul className="space-y-2 list-disc pl-4">
            <li>
              We only access the Google Ads data necessary to provide analysis and recommendations.
            </li>
            <li>
              Your OAuth tokens are encrypted and stored securely. They are never exposed to the browser.
            </li>
            <li>
              Campaign data is cached temporarily to reduce API calls and improve performance.
            </li>
            <li>
              You can disconnect your Google Ads account and delete all cached data at any time.
            </li>
            <li>
              We do not share your data with third parties or use it for any purpose other than providing this service.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
