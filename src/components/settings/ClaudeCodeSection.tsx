import { useState } from 'react';
import { Terminal, CheckCircle, Clock, XCircle, Copy, Check, RefreshCw, Trash2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useCliSession } from '@/hooks/useCliSession';
import { SUPABASE_URL } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

export function ClaudeCodeSection() {
  const { session, loading, activating, isExpired, canActivate, activate, revoke } = useCliSession();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const configJson = session
    ? JSON.stringify({ supabase_url: SUPABASE_URL, session_token: session.session_token }, null, 2)
    : null;

  const handleActivate = async () => {
    try {
      const newSession = await activate();
      if (newSession) {
        toast({ title: 'Claude Code access activated', description: `Account: ${newSession.customer_name ?? newSession.customer_id}` });
      }
    } catch {
      toast({ title: 'Failed to activate', variant: 'destructive' });
    }
  };

  const handleRevoke = async () => {
    await revoke();
    toast({ title: 'Claude Code access revoked' });
  };

  const handleCopy = async () => {
    if (!configJson) return;
    await navigator.clipboard.writeText(configJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Config copied to clipboard', description: 'Paste it into .ads-cli-session.json in your project root' });
  };

  const statusBadge = () => {
    if (!session) return <Badge variant="secondary">Not configured</Badge>;
    if (isExpired) return <Badge variant="destructive">Expired</Badge>;
    return <Badge variant="default" className="bg-green-600 hover:bg-green-700">Active</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-primary" />
            <CardTitle>Claude Code Access</CardTitle>
          </div>
          {!loading && statusBadge()}
        </div>
        <CardDescription>
          Allow Claude Code in your terminal to read and modify your Google Ads account on your behalf.
          The session token expires 2 hours after activation.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {!canActivate && !loading && (
          <div className="flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>You need to be logged in and have a Google Ads account selected to activate CLI access.</span>
          </div>
        )}

        {session && !isExpired && (
          <div className="rounded-md border bg-muted/40 p-3 space-y-1 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Account: <span className="font-medium text-foreground">{session.customer_name ?? session.customer_id}</span></span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Expires {formatDistanceToNow(new Date(session.expires_at), { addSuffix: true })}</span>
            </div>
          </div>
        )}

        {session && isExpired && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <XCircle className="h-4 w-4 shrink-0" />
            <span>Session expired. Reactivate to continue using Claude Code with this account.</span>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={handleActivate}
            disabled={activating || !canActivate}
            size="sm"
          >
            {activating
              ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Activating…</>
              : session && !isExpired
                ? <><RefreshCw className="h-4 w-4 mr-2" />Refresh Session</>
                : <><Terminal className="h-4 w-4 mr-2" />Activate Claude Code Access</>
            }
          </Button>

          {session && (
            <Button variant="outline" size="sm" onClick={handleRevoke}>
              <Trash2 className="h-4 w-4 mr-2" />
              Revoke
            </Button>
          )}
        </div>

        {session && !isExpired && configJson && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Save this config to <code className="rounded bg-muted px-1 py-0.5 text-xs">.ads-cli-session.json</code> in your project root:
            </p>
            <div className="relative rounded-md border bg-muted/60 font-mono text-xs">
              <pre className="p-3 pr-10 overflow-x-auto">{configJson}</pre>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1 h-7 w-7"
                onClick={handleCopy}
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This file is automatically git-ignored. Keep it private — anyone with this token can make changes to your Google Ads account.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
