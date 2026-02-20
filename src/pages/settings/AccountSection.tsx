import { Eye, EyeOff, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDashboard } from '@/contexts/DashboardContext';
import { cn } from '@/lib/utils';

export function AccountSection() {
  const { selectedAccount, setSelectedAccount, accounts, hiddenAccountIds, toggleAccountHidden, unhideAllAccounts } = useDashboard();

  return (
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
  );
}
