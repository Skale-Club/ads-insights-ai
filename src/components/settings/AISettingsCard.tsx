import { useEffect, useState } from 'react';
import { Eye, EyeOff, Save, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isSupabaseConfigured } from '@/integrations/supabase/client';

interface UserAISettings {
  id: string;
  user_id: string;
  // Stored in DB as openai_api_key for backward compatibility; value is a Gemini API key.
  openai_api_key: string | null;
  preferred_model: string;
  created_at: string;
  updated_at: string;
}

const MASKED_KEY = '********';

const GEMINI_MODELS = [
  { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash (Preview)' },
  { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro (Preview)' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Stable)' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Stable)' },
];

const DEFAULT_MODEL = 'gemini-2.5-flash';

function normalizeModel(model: string | null | undefined): string {
  const m = String(model || '').trim();
  const allowed = new Set(GEMINI_MODELS.map((x) => x.value));
  if (allowed.has(m)) return m;
  return DEFAULT_MODEL;
}

export function AISettingsCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasExistingKey, setHasExistingKey] = useState(false);

  useEffect(() => {
    if (user?.id) loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadSettings = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('user_ai_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      const settings = data as UserAISettings | null;
      if (settings) {
        setHasExistingKey(!!settings.openai_api_key);
        setSelectedModel(normalizeModel(settings.preferred_model));
        if (settings.openai_api_key) setApiKey(MASKED_KEY);
      }
    } catch (error) {
      console.error('Error loading AI settings:', error);
      const msg = (error as any)?.message || String(error);
      if (msg.includes("Could not find the table 'public.user_ai_settings'")) {
        toast({
          title: 'Database not set up',
          description: 'Create table user_ai_settings in Supabase (run migration 20250205_create_user_ai_settings.sql).',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;

    if (apiKey && apiKey !== MASKED_KEY && apiKey.trim().length < 20) {
      toast({
        title: 'Invalid key',
        description: 'Your Gemini API key looks too short. Please verify and try again.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const updateData: any = {
        user_id: user.id,
        preferred_model: selectedModel,
        updated_at: new Date().toISOString(),
      };

      if (apiKey && apiKey !== MASKED_KEY) {
        updateData.openai_api_key = apiKey;
      }

      const { error } = await (supabase as any)
        .from('user_ai_settings')
        .upsert(updateData, { onConflict: 'user_id' });

      if (error) throw error;

      setHasExistingKey(true);
      if (apiKey && apiKey !== MASKED_KEY) setApiKey(MASKED_KEY);

      toast({
        title: 'Saved',
        description: 'Your AI settings were updated.',
      });
    } catch (error) {
      console.error('Error saving AI settings:', error);
      const msg =
        (error as any)?.message ||
        (error as any)?.error_description ||
        (error as any)?.hint ||
        'Could not save your settings. Please try again.';
      const friendly = msg.includes("Could not find the table 'public.user_ai_settings'")
        ? "Table public.user_ai_settings nao existe no seu Supabase. Rode a migration supabase/migrations/20250205_create_user_ai_settings.sql no SQL Editor."
        : msg;
      toast({
        title: 'Save failed',
        description: friendly,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleApiKeyChange = (value: string) => {
    if (apiKey === MASKED_KEY && value !== apiKey) setApiKey(value);
    else setApiKey(value);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          AI Settings
          {hasExistingKey && (
            <span className="flex items-center gap-1 text-sm font-normal text-success">
              <Check className="h-4 w-4" />
              Configured
            </span>
          )}
        </CardTitle>
        <CardDescription>
          Add your Gemini API key to enable AI chat and recommendations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isSupabaseConfigured ? (
          <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
            Supabase is not configured. Set <code className="font-mono">VITE_SUPABASE_URL</code> and{' '}
            <code className="font-mono">VITE_SUPABASE_PUBLISHABLE_KEY</code> in your environment.
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="api-key">Gemini API Key</Label>
          <div className="relative">
            <Input
              id="api-key"
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              placeholder="AIza..."
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowApiKey(!showApiKey)}
            >
              {showApiKey ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Get a Gemini API key at{' '}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              aistudio.google.com/app/apikey
            </a>
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="model">Model</Label>
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger id="model">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {GEMINI_MODELS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            More capable models are usually more accurate, but cost more.
          </p>
        </div>

        <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
