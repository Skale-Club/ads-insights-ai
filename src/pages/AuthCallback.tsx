import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>('Processando autenticação...');
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    const handleAuthCallback = async () => {
      // 1. Capture URL params for debug
      const hash = window.location.hash;
      const search = window.location.search;
      setDebugInfo({ hash, search });

      console.log('[AuthCallback] URL:', { hash, search });

      // 2. Check if we have a session
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('[AuthCallback] Error getting session:', error);
        setStatus(`Erro ao obter sessão: ${error.message}`);
        return;
      }

      if (session) {
        console.log('[AuthCallback] Session found:', session.user.email);
        setStatus('Sessão encontrada! Redirecionando...');
        
        // Wait a moment to show success message before redirecting
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      } else {
         console.log('[AuthCallback] No session found immediately. Waiting for onAuthStateChange...');
         // Listener for late auth state change
         const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('[AuthCallback] Auth State Change:', event);
            if (event === 'SIGNED_IN' && session) {
               setStatus('Login confirmado! Redirecionando...');
               setTimeout(() => navigate('/dashboard'), 1500);
            }
         });
         
         // Timeout fallback
         setTimeout(() => {
            if (!session) {
               setStatus('Nenhuma sessão detectada após aguardar. Verifique o console.');
            }
         }, 5000);

         return () => subscription.unsubscribe();
      }
    };

    handleAuthCallback();
  }, [navigate]);

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
          
          <div className="rounded-md bg-muted p-2 text-xs overflow-auto max-h-40">
            <p className="font-bold">Info de Debug:</p>
            <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
             <p className="mt-2 text-muted-foreground">Verifique o Console (F12) para logs detalhados.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
