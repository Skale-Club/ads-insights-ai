import { useState } from 'react';
import { Terminal, CheckCircle, Clock, XCircle, Copy, Check, RefreshCw, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useMetaCliSession } from '@/hooks/useMetaCliSession';
import { SUPABASE_URL } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

export function MetaClaudeCodeSection() {
  const { session, loading, activating, isExpired, canActivate, activate, revoke } = useMetaCliSession();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const configJson = session
    ? JSON.stringify({ supabase_url: SUPABASE_URL, session_token: session.session_token, platform: 'meta' }, null, 2)
    : null;

  const handleActivate = async () => {
    try {
      const newSession = await activate();
      if (newSession) {
        toast({ title: 'Meta Claude Code access activated', description: `Account: ${newSession.account_name ?? newSession.account_id}` });
      }
    } catch {
      toast({ title: 'Failed to activate', variant: 'destructive' });
    }
  };

  const handleRevoke = async () => {
    await revoke();
    toast({ title: 'Meta Claude Code access revoked' });
  };

  const handleCopy = async () => {
    if (!configJson) return;
    await navigator.clipboard.writeText(configJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusBadge = () => {
    if (!session) return <Badge variant="secondary">Not configured</Badge>;
    if (isExpired) return <Badge variant="destructive">Expired</Badge>;
    return <Badge variant="default">Active</Badge>;
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-primary" />
          <CardTitle>Meta Ads — Claude Code Access</CardTitle>
          <div className="ml-auto">{statusBadge()}</div>
        </div>
        <CardDescription>
          Enable Claude Code in your terminal to read and mutate Meta Ads on your behalf. Save the config to{' '}
          <code className="text-xs">.ads-meta-cli-session.json</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!canActivate && !session && (
          <p className="text-sm text-muted-foreground">Connect a Meta Ads account above to enable CLI access.</p>
        )}

        {(canActivate || session) && (
          <div className="flex gap-2">
            <Button onClick={handleActivate} disabled={activating || !canActivate} size="sm">
              <RefreshCw className={`mr-2 h-3 w-3 ${activating ? 'animate-spin' : ''}`} />
              {session && !isExpired ? 'Refresh Session' : 'Activate CLI Access'}
            </Button>
            {session && (
              <Button variant="outline" size="sm" onClick={handleRevoke}>
                <Trash2 className="mr-2 h-3 w-3" />
                Revoke
              </Button>
            )}
          </div>
        )}

        {session && !isExpired && configJson && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Expires {formatDistanceToNow(new Date(session.expires_at), { addSuffix: true })}</span>
            </div>
            <div className="relative rounded-md bg-muted p-3">
              <pre className="text-xs font-mono overflow-x-auto">{configJson}</pre>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 h-7 w-7"
                onClick={handleCopy}
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Save this to <code>.ads-meta-cli-session.json</code> in your project root (git-ignored).
            </p>
          </div>
        )}

        {session && isExpired && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <XCircle className="h-4 w-4" />
            <span>Session expired. Click Refresh Session to get a new one.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
