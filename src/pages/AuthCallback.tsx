import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

// Scrub OAuth-bearing fragments/queries from the URL so the access code or token
// does not linger in browser history, referrer headers, or server access logs.
function scrubOAuthArtifactsFromUrl() {
  if (typeof window === 'undefined') return;
  const clean = window.location.pathname;
  window.history.replaceState({}, '', clean);
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>('Processando autenticação...');
  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const [debugInfo, setDebugInfo] = useState<{ hadHash: boolean; hadSearch: boolean } | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      const hadHash = window.location.hash.length > 0;
      const hadSearch = window.location.search.length > 0;

      if (isLocalhost) {
        // Localhost-only debug: log only presence flags, never raw token/code values.
        setDebugInfo({ hadHash, hadSearch });
        console.log('[AuthCallback] callback received', { hadHash, hadSearch });
      }

      // Wait for Supabase to detect and consume the auth artifacts from the URL,
      // then scrub the URL before doing anything else.
      const { data: { session }, error } = await supabase.auth.getSession();
      scrubOAuthArtifactsFromUrl();

      if (error) {
        console.error('[AuthCallback] Error getting session');
        setStatus(`Erro ao obter sessão: ${error.message}`);
        return;
      }

      if (session) {
        console.log('[AuthCallback] Session established for', session.user.email);
        setStatus('Sessão encontrada! Redirecionando...');
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 1500);
        return;
      }

      console.log('[AuthCallback] No session yet, waiting for onAuthStateChange');
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          scrubOAuthArtifactsFromUrl();
          setStatus('Login confirmado! Redirecionando...');
          setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
        }
      });

      const timeout = setTimeout(() => {
        setStatus('Nenhuma sessão detectada após aguardar. Verifique o console.');
      }, 5000);

      return () => {
        subscription.unsubscribe();
        clearTimeout(timeout);
      };
    };

    handleAuthCallback();
  }, [navigate, isLocalhost]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Status do Login</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <p>{status}</p>
          </div>

          {isLocalhost && debugInfo && (
            <div className="rounded-md bg-muted p-2 text-xs overflow-auto max-h-40">
              <p className="font-bold">Info de Debug:</p>
              <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
              <p className="mt-2 text-muted-foreground">
                Tokens omitidos por segurança. Verifique o Console (F12) para logs detalhados.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
