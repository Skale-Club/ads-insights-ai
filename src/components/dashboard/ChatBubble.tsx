import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, MessageSquare, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboard } from '@/contexts/DashboardContext';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useGoogleAdsReport } from '@/hooks/useGoogleAdsReport';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatSidebar } from './ChatSidebar';

interface UserAISettings {
  openai_api_key: string | null;
  preferred_model: string;
}

function normalizeModel(model: string | null | undefined): string {
  const m = String(model || '').trim();
  if (m.startsWith('gemini-')) return m;
  return 'gemini-2.5-flash';
}
export type ChatCampaignContext = unknown;

type ChatSession = {
  id: string;
  title: string;
  created_at: string;
  account_id?: string;
};

type ChatMsg = {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
};

type OverviewData = {
  spend: number;
  conversions: number;
  conversionsValue: number;
  impressions: number;
  clicks: number;
  cpa: number;
  roas: number;
  ctr: number;
};

type CampaignRow = {
  id: string;
  name: string;
  status: string;
  type: string;
  budget: number;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  cpa: number;
  roas?: number;
  conversionsValue?: number;
};

type KeywordRow = {
  id: string;
  keyword: string;
  matchType: string;
  status: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  ctr: number;
  cpa: number;
  qualityScore: number | null;
};

type SearchTermRow = {
  id: string;
  searchTerm: string;
  matchedKeyword: string;
  matchType: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  ctr: number;
  cpa: number;
  qualityScore: number | null;
};

function buildWelcomeMessage(accountName?: string): ChatMsg {
  if (accountName) {
    return {
      role: 'assistant',
      content: `Hi. I'm your Ads Insights AI for ${accountName}. Ask about performance, budget, keywords, or optimization opportunities.`,
    };
  }

  return {
    role: 'assistant',
    content: "Hi. I'm your Ads Insights AI. Select an account to start an analysis.",
  };
}

function normalizeAssistantMarkdown(content: string): string {
  let next = content.replace(/\r\n/g, '\n');

  // Avoid excessive vertical spacing from streamed chunks.
  next = next.replace(/\n{3,}/g, '\n\n');

  // Cap indentation so nested bullets/paragraphs don't keep drifting right.
  next = next.replace(/^\s{5,}/gm, '    ');

  // If the model accidentally wraps the full answer as quote blocks,
  // strip the quote markers to keep alignment consistent.
  const quoteLines = (next.match(/^\s*>\s?/gm) || []).length;
  if (quoteLines >= 3) {
    next = next.replace(/^\s*>\s?/gm, '');
  }

  return next.trim();
}

export function ChatBubble({ campaignContext }: { campaignContext?: ChatCampaignContext }) {
  const { user } = useAuth();
  const { selectedAccount, dateRange, dateRangePreset, setChatWidth } = useDashboard();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState<number>(() => (typeof window === 'undefined' ? 1024 : window.innerWidth));
  const isMobile = windowWidth < 640; // Tailwind's `sm`


  const DEFAULT_WIDTH = 420;
  const MIN_WIDTH = 280;
  const CLOSE_THRESHOLD = 120; // If the user drags it close to zero, treat as "closed".
  const MAX_WIDTH_CAP = 960;

  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
  const maxWidth = useMemo(() => {
    if (isMobile) return windowWidth;
    // Keep a little breathing room from the left edge.
    return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH_CAP, windowWidth - 24));
  }, [isMobile, windowWidth]);

  const [panelWidth, setPanelWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_WIDTH;
    const raw = window.localStorage.getItem('ai_chat_panel_width');
    const parsed = raw ? Number(raw) : NaN;
    // Never open smaller than the original design width; user can shrink during a session if they want.
    if (Number.isFinite(parsed) && parsed > 0) return Math.max(DEFAULT_WIDTH, parsed);
    return DEFAULT_WIDTH;
  });
  const lastOpenWidthRef = useRef<number>(panelWidth);
  const panelWidthRef = useRef<number>(panelWidth);
  const resizeSessionRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [aiSettings, setAiSettings] = useState<{ apiKey: string | null; model: string } | null>(null);

  // New state for sidebar
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return 256;
    const raw = window.localStorage.getItem('ai_chat_sidebar_width');
    const parsed = raw ? Number(raw) : NaN;
    return (Number.isFinite(parsed) && parsed > 0) ? Math.max(100, parsed) : 256;
  });
  const sidebarResizeRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('ai_chat_sidebar_width', String(sidebarWidth));
  }, [sidebarWidth]);

  // Report width to layout context for "push" effect
  useEffect(() => {
    if (isMobile) {
      setChatWidth(0); // On mobile, likely overlay, don't push content
    } else {
      setChatWidth(open ? panelWidth : 70);
    }
  }, [isMobile, open, panelWidth, setChatWidth]);

  useEffect(() => {
    // Track window width so we can clamp the sheet's width on resize.
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    panelWidthRef.current = panelWidth;
  }, [panelWidth]);

  useEffect(() => {
    if (isMobile) return;
    const next = clamp(panelWidthRef.current, MIN_WIDTH, maxWidth);
    if (next !== panelWidthRef.current) setPanelWidth(next);
  }, [isMobile, maxWidth]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isMobile) return;
    // Persist user-resized width.
    window.localStorage.setItem('ai_chat_panel_width', String(panelWidth));
  }, [panelWidth, isMobile]);

  useEffect(() => {
    // When opening, restore the last good width.
    if (!open) return;
    if (isMobile) return;

    // Ensure sufficient width if sidebar is open
    let seed = lastOpenWidthRef.current || panelWidthRef.current || DEFAULT_WIDTH;
    if (showSidebar) {
      seed = Math.max(seed, 640);
    }

    const desired = clamp(seed, MIN_WIDTH, maxWidth);
    setPanelWidth(desired);
  }, [open, isMobile, maxWidth, showSidebar]);

  useEffect(() => {
    // Resize drag handling for the left edge handle.
    if (typeof window === 'undefined') return;

    const onPointerMove = (e: PointerEvent) => {
      const session = resizeSessionRef.current;
      if (!session) return;

      // Dragging left increases width; dragging right decreases width.
      const delta = session.startX - e.clientX;
      const rawNext = session.startWidth + delta;

      if (rawNext <= CLOSE_THRESHOLD) {
        // Treat this as "closed" when collapsed near zero.
        resizeSessionRef.current = null;
        setOpen(false);
        return;
      }

      const next = clamp(rawNext, MIN_WIDTH, maxWidth);
      lastOpenWidthRef.current = next;
      setPanelWidth(next);
    };

    const onPointerUp = () => {
      if (!resizeSessionRef.current) return;
      resizeSessionRef.current = null;
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [maxWidth]);

  useEffect(() => {
    // Sidebar resize logic
    if (typeof window === 'undefined') return;

    const onPointerMove = (e: PointerEvent) => {
      if (!sidebarResizeRef.current) return;
      const delta = e.clientX - sidebarResizeRef.current.startX;
      const next = Math.max(100, Math.min(480, sidebarResizeRef.current.startWidth + delta));
      setSidebarWidth(next);
    };

    const onPointerUp = () => {
      sidebarResizeRef.current = null;
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    (supabase as any)
      .from('user_ai_settings')
      .select('openai_api_key, preferred_model')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }: { data: UserAISettings | null }) => {
        if (!data) return;
        setAiSettings({
          apiKey: data.openai_api_key,
          model: normalizeModel(data.preferred_model),
        });
      });
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    if (!selectedAccount?.id) {
      setSessionId(null);
      setSessions([]);
      setChatMessages([buildWelcomeMessage()]);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    let isMounted = true;

    const fetchSessionsForAccount = async (): Promise<ChatSession[]> => {
      const { data, error } = await (supabase as any)
        .from('chat_sessions')
        .select('id, title, created_at, account_id')
        .eq('user_id', user.id)
        .eq('account_id', selectedAccount.id)
        .eq('archived', false)
        .order('created_at', { ascending: false });

      if (!error && data) return data as ChatSession[];

      // Backward compatibility for databases without the `archived` column.
      const { data: fallbackData } = await (supabase as any)
        .from('chat_sessions')
        .select('id, title, created_at, account_id')
        .eq('user_id', user.id)
        .eq('account_id', selectedAccount.id)
        .order('created_at', { ascending: false });
      return (fallbackData || []) as ChatSession[];
    };

    const resetToAccountWelcome = () => {
      setSessionId(null);
      setChatMessages([buildWelcomeMessage(selectedAccount.name)]);
    };

    const loadSession = async () => {
      const loadedSessions = await fetchSessionsForAccount();
      if (!isMounted) return;

      setSessions(loadedSessions);

      if (loadedSessions.length > 0) {
        const sid = loadedSessions[0].id;
        setSessionId(sid);
        loadMessages(sid);
      } else {
        resetToAccountWelcome();
      }
    };

    loadSession();

    return () => {
      isMounted = false;
    };
  }, [user?.id, selectedAccount?.id]);

  const loadMessages = async (sid: string) => {
    const { data: msgs } = await (supabase as any)
      .from('chat_messages')
      .select('*')
      .eq('session_id', sid)
      .order('created_at', { ascending: true });

    if (msgs) {
      setChatMessages(msgs as ChatMsg[]);
    }
  };

  const generateChatTitle = (userMessage: string): string => {
    // Clean up the message and create a concise title
    const cleaned = userMessage
      .trim()
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .replace(/\s+/g, ' ') // Normalize spaces
      .slice(0, 60); // Max 60 chars

    return cleaned + (userMessage.length > 60 ? '...' : '');
  };

  const updateChatTitle = async (sessionId: string, messages: ChatMsg[]) => {
    // Extract key topics from recent messages
    const recentUserMessages = messages
      .filter(m => m.role === 'user')
      .slice(-3)
      .map(m => m.content)
      .join(' ');

    // Generate updated title
    const newTitle = generateChatTitle(recentUserMessages);

    // Update in database
    await (supabase as any)
      .from('chat_sessions')
      .update({ title: newTitle })
      .eq('id', sessionId);

    // Update local state
    setSessions((prev) =>
      prev.map(s => s.id === sessionId ? { ...s, title: newTitle } : s)
    );
  };

  const handleNewChat = async () => {
    console.log('handleNewChat called. Resetting and creating new session. Previous:', sessionId);
    if (abortControllerRef.current) abortControllerRef.current.abort();

    // Reset to welcome state first
    setChatMessages([buildWelcomeMessage(selectedAccount?.name)]);

    if (!selectedAccount?.id) {
      toast({
        title: 'Select an account',
        description: 'Choose a Google Ads account before creating a chat.',
        variant: 'destructive',
      });
      setSessionId(null);
      return;
    }

    // Create a new session immediately if user is authenticated
    if (user?.id) {
      try {
        const { data: newSession, error } = await (supabase as any)
          .from('chat_sessions')
          .insert({
            user_id: user.id,
            account_id: selectedAccount.id,
            title: 'New Chat',
          })
          .select()
          .single();

        if (error) {
          console.error('Failed to create new session:', error);
          toast({
            title: 'Session creation failed',
            description: 'Could not create a new chat session. Your messages will not be saved.',
            variant: 'destructive',
          });
          setSessionId(null);
        } else if (newSession) {
          const session = newSession as ChatSession;
          setSessionId(session.id);
          setSessions((prev) => [session, ...prev]);
          console.log('New session created:', session.id);
        }
      } catch (error) {
        console.error('Error creating session:', error);
        setSessionId(null);
      }
    } else {
      console.warn('No user ID available, cannot create session');
      setSessionId(null);
    }

    if (isMobile) setShowSidebar(false);
  };

  const handleSelectSession = (sid: string) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setSessionId(sid);
    loadMessages(sid);
    if (isMobile) setShowSidebar(false);
  };

  const handleDeleteSession = async (sid: string) => {
    await (supabase as any).from('chat_sessions').delete().eq('id', sid);
    setSessions((prev) => prev.filter((s) => s.id !== sid));
    if (sid === sessionId) {
      setSessionId(null);
      setChatMessages([buildWelcomeMessage(selectedAccount?.name)]);
    }
  };

  const handleArchiveSession = async (sid: string) => {
    try {
      // Try to use archived flag (soft delete)
      const { error } = await (supabase as any)
        .from('chat_sessions')
        .update({ archived: true })
        .eq('id', sid);

      if (error) {
        // If archived column doesn't exist yet, fallback to hard delete
        console.warn('Archived column not found, falling back to delete:', error);
        await (supabase as any).from('chat_sessions').delete().eq('id', sid);
      }
    } catch (err) {
      console.error('Error archiving session:', err);
      // Fallback to delete on any error
      await (supabase as any).from('chat_sessions').delete().eq('id', sid);
    }

    // Remove from local state
    setSessions((prev) => prev.filter((s) => s.id !== sid));

    toast({
      title: 'Chat archived',
      description: 'The conversation has been archived.',
    });

    if (sid === sessionId) {
      setSessionId(null);
      setChatMessages([buildWelcomeMessage(selectedAccount?.name)]);
    }
  };

  const toggleSidebar = () => {
    setShowSidebar((prev) => {
      const next = !prev;
      if (next && !isMobile) {
        setPanelWidth((w) => Math.max(w, 640));
      }
      return next;
    });
  };

  const canChat = useMemo(() => !!aiSettings?.apiKey, [aiSettings?.apiKey]);

  // Fetch context only when the chat is opened (reduces background API calls).
  const { data: overview } = useGoogleAdsReport<OverviewData>('overview', { enabled: open });
  const { data: campaigns } = useGoogleAdsReport<CampaignRow[]>('campaigns', { enabled: open });
  const { data: keywords } = useGoogleAdsReport<KeywordRow[]>('keywords', { enabled: open });
  const { data: searchTerms } = useGoogleAdsReport<SearchTermRow[]>('search_terms', { enabled: open });

  const builtContext = useMemo(() => {
    if (!selectedAccount) return null;
    const dateLabel =
      dateRangePreset === 'custom'
        ? `${dateRange.from.toISOString().slice(0, 10)}..${dateRange.to.toISOString().slice(0, 10)}`
        : dateRangePreset;

    const topCampaigns = (campaigns || [])
      .slice()
      .sort((a, b) => (b.spend || 0) - (a.spend || 0))
      .slice(0, 10)
      .map((c) => ({
        name: c.name,
        spend: c.spend,
        conversions: c.conversions,
        cpa: c.cpa,
        roas: c.roas ?? null,
        ctr: c.ctr,
      }));

    const topKeywords = (keywords || [])
      .slice()
      .sort((a, b) => (b.cost || 0) - (a.cost || 0))
      .slice(0, 15)
      .map((k) => ({
        keyword: k.keyword,
        matchType: k.matchType,
        spend: k.cost,
        conversions: k.conversions,
        cpa: k.cpa,
        ctr: k.ctr,
      }));

    const negCandidates = (searchTerms || [])
      .filter((t) => (t.conversions || 0) === 0)
      .filter((t) => (t.cost || 0) >= 5 || (t.clicks || 0) >= 25)
      .slice()
      .sort((a, b) => (b.cost || 0) - (a.cost || 0))
      .slice(0, 10)
      .map((t) => t.searchTerm);

    return {
      accountName: selectedAccount.name,
      accountId: selectedAccount.id,
      currencyCode: selectedAccount.currencyCode,
      dateRange: dateLabel,
      overallMetrics: overview || null,
      campaigns: topCampaigns,
      topKeywords,
      negativeKeywordSuggestions: negCandidates,
    };
  }, [selectedAccount, dateRange, dateRangePreset, overview, campaigns, keywords, searchTerms]);

  const effectiveContext = campaignContext ?? builtContext;

  useEffect(() => {
    if (!open) return;
    // Scroll to bottom when opening.
    queueMicrotask(() => bottomRef.current?.scrollIntoView({ block: 'end' }));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [chatMessages, open]);

  const streamChat = async (messages: ChatMsg[], apiKey: string, model: string, signal?: AbortSignal) => {
    const CHAT_URL = `${SUPABASE_URL}/functions/v1/analyze-ads`;

    const resp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      },
      signal,
      body: JSON.stringify({
        messages,
        campaignData: effectiveContext,
        apiKey,
        model,
      }),
    });

    if (!resp.ok) {
      let message = 'Failed to connect to AI service';
      const contentType = resp.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        try {
          const payload = await resp.json();
          if (typeof payload?.error === 'string' && payload.error.trim()) {
            message = payload.error;
          }
        } catch {
          // ignore parse errors and keep generic message
        }
      } else {
        try {
          const text = await resp.text();
          if (text.trim()) message = text.slice(0, 300);
        } catch {
          // ignore read errors and keep generic message
        }
      }

      throw new Error(message);
    }

    if (!resp.body) throw new Error('AI service returned an empty response stream.');

    return resp.body;
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    console.log('handleSendMessage called. Current sessionId:', sessionId);

    if (!selectedAccount?.id) {
      toast({
        title: 'Select an account',
        description: 'Choose a Google Ads account before sending messages.',
        variant: 'destructive',
      });
      return;
    }

    if (!aiSettings?.apiKey) {
      toast({
        title: 'Gemini key missing',
        description: 'Go to Settings and add your Gemini API key to enable chat.',
        variant: 'destructive',
      });
      return;
    }

    // Cancel previous stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const userMessageContent = chatInput.trim();
    setChatInput('');

    // Optimistic update
    const newMessages: ChatMsg[] = [...chatMessages, { role: 'user', content: userMessageContent }];
    setChatMessages(newMessages);
    setIsTyping(true);

    try {
      // Ensure session exists
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        // Generate a descriptive title from the first message
        const initialTitle = generateChatTitle(userMessageContent);

        const { data: newSession } = await (supabase as any)
          .from('chat_sessions')
          .insert({
            user_id: user?.id,
            account_id: selectedAccount.id,
            title: initialTitle,
          })
          .select()
          .single();

        if (newSession) {
          const session = newSession as ChatSession;
          currentSessionId = session.id;
          setSessionId(session.id);
          setSessions((prev) => [session, ...prev]);
        }
      }

      // Save user message
      if (currentSessionId) {
        await (supabase as any).from('chat_messages').insert({
          session_id: currentSessionId,
          role: 'user',
          content: userMessageContent,
        });
      }

      const stream = await streamChat(newMessages, aiSettings.apiKey, aiSettings.model, abortController.signal);
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      // Add empty assistant message.
      setChatMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      let currentBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;

            if (content) {
              currentBuffer += content;

              // Split logic
              if (currentBuffer.includes('\n\n')) {
                const parts = currentBuffer.split('\n\n');

                // Process all complete parts
                for (let i = 0; i < parts.length - 1; i++) {
                  const part = parts[i];
                  if (!part.trim()) continue; // Skip empty gaps

                  // 1. Update current bubble with the complete part
                  setChatMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: 'assistant', content: part };
                    return updated;
                  });

                  // 2. Persist this finished message Part
                  if (currentSessionId) {
                    // We don't await this to keep UI fluid, or we fire-and-forget?
                    // Better to await to ensure order? But we are in a loop.
                    // Fire and forget but catch error?
                    (supabase as any).from('chat_messages').insert({
                      session_id: currentSessionId,
                      role: 'assistant',
                      content: part,
                    }).then();
                  }

                  // 3. Start new bubble
                  setChatMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
                }

                // Reset buffer to the remainder
                currentBuffer = parts[parts.length - 1];
              }

              // Update the active bubble (remainder)
              setChatMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: currentBuffer };
                return updated;
              });
            }
          } catch {
            // Partial line; re-buffer.
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Save valid final assistant message (the remainder)
      if (currentSessionId && currentBuffer.trim()) {
        await (supabase as any).from('chat_messages').insert({
          session_id: currentSessionId,
          role: 'assistant',
          content: currentBuffer,
        });

        // Update chat title after every 3 messages
        if (chatMessages.length >= 4 && chatMessages.length % 3 === 1) {
          await updateChatTitle(currentSessionId, chatMessages);
        }
      }

    } catch (error) {
      if ((error as Error).name === 'AbortError') return;

      const message = error instanceof Error ? error.message : 'Failed to get AI response';
      toast({
        title: 'Chat error',
        description: message,
        variant: 'destructive',
        duration: 5000,
      });
      // Remove the user message on error.
      setChatMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsTyping(false);
    }
  };



  const messageList = useMemo(() => (
    <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin">
      {!canChat ? (
        <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
          Add your Gemini API key in Settings to enable chat.
        </div>
      ) : null}

      {chatMessages.map((msg, i) => (
        <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
          <div
            className={cn(
              'max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm',
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground whitespace-pre-wrap'
                : 'bg-muted/80 border border-border/40 whitespace-normal',
            )}
          >
            {msg.role === 'assistant' ? (
              <div
                className={cn(
                  'chat-markdown prose prose-sm max-w-none',
                  'prose-headings:my-2 prose-headings:font-semibold',
                  'prose-p:my-2 prose-p:leading-relaxed',
                  'prose-ul:my-2 prose-ol:my-2',
                  'prose-li:my-1',
                  'prose-hr:my-3',
                  'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
                  'prose-strong:text-foreground',
                  'prose-table:my-3',
                )}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ node, ...props }) => (
                      <a {...props} target="_blank" rel="noopener noreferrer" />
                    ),
                    blockquote: ({ node, ...props }) => (
                      <blockquote className="my-2 border-l-2 border-border/70 pl-3 text-foreground/90" {...props} />
                    ),
                    table: ({ node, ...props }) => (
                      <div className="overflow-x-auto">
                        <table {...props} />
                      </div>
                    ),
                  }}
                >
                  {normalizeAssistantMarkdown(msg.content)}
                </ReactMarkdown>
              </div>
            ) : (
              msg.content
            )}
          </div>
        </div>
      ))}

      {isTyping ? (
        <div className="flex justify-start">
          <div className="bg-muted rounded-lg px-4 py-2 flex items-center gap-1 min-h-[40px]">
            <div className="w-2 h-2 bg-foreground/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-foreground/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-foreground/60 rounded-full animate-bounce"></div>
          </div>
        </div>
      ) : null}

      <div ref={bottomRef} />
    </div>
  ), [chatMessages, isTyping, canChat]);

  // Determine effective width for the rail container
  const railStyle = useMemo(() => {
    if (isMobile) return open ? { width: '100%' } : { width: 0, overflow: 'hidden' };
    return open ? { width: panelWidth, maxWidth } : { width: 70 };
  }, [isMobile, open, panelWidth, maxWidth]);

  return (
    <>
      {/* Mobile Floating Button */}
      {isMobile && !open && (
        <Button
          className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg"
          onClick={() => setOpen(true)}
          size="icon"
        >
          <MessageSquare className="h-5 w-5" />
        </Button>
      )}

      {/* Persistent Rail / Chat Panel */}
      <div
        className={cn(
          "fixed right-0 top-0 h-full z-40 bg-background border-l shadow-xl transition-[width] duration-300 ease-in-out",
          !open && !isMobile && "hover:bg-muted/10" // subtle interact hint
        )}
        style={railStyle}
      >
        {/* Global Resize Handle (Left Edge of Panel) - Only active when OPEN and DESKTOP */}
        {!isMobile && open && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize chat panel"
            className="absolute left-0 top-0 z-50 h-full w-1.5 -ml-[3px] cursor-ew-resize touch-none select-none bg-transparent transition-colors hover:bg-foreground/10 active:bg-foreground/20"
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              e.preventDefault();
              e.stopPropagation();
              resizeSessionRef.current = { startX: e.clientX, startWidth: panelWidthRef.current };
            }}
            title="Drag to resize panel"
          />
        )}

        {/* Toggle Chevron on left edge of rail */}
        {!isMobile && (
          <button
            className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-8 bg-background border border-border rounded-sm hover:bg-accent transition-all shadow-md z-50"
            onClick={() => setOpen(!open)}
            title={open ? "Collapse chat" : "Expand chat"}
          >
            {open ? (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        )}

        <div className="flex h-full overflow-hidden relative">
          {/* Sidebar Component */}
          <ChatSidebar
            isExpanded={open && showSidebar} // Expanded only if Panel is OPEN and Sidebar is toggled ON
            isMobile={isMobile}
            width={sidebarWidth}
            sessions={sessions}
            activeSessionId={sessionId}
            onSelectSession={handleSelectSession}
            onNewChat={handleNewChat}
            onDeleteSession={handleDeleteSession}
            onArchiveSession={handleArchiveSession}
            onExpand={() => {
              setOpen(true);
              if (sidebarWidth < 200) setSidebarWidth(256);
            }}
          />

          {/* Sidebar Resize Handle (Internal) - Only active when OPEN, DESKTOP, and Sidebar is EXPANDED */}
          {!isMobile && open && showSidebar && (
            <div
              className="w-1.5 -ml-[3px] z-20 cursor-col-resize hover:bg-foreground/10 active:bg-foreground/20 transition-colors touch-none select-none relative h-full"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                sidebarResizeRef.current = { startX: e.clientX, startWidth: sidebarWidth };
              }}
              title="Drag to resize sidebar"
            >
              <button
                className="absolute left-[3px] top-[36px] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-8 bg-background border border-border rounded-sm hover:bg-accent transition-all shadow-md z-30 group-hover:scale-105"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSidebar(false);
                }}
                title="Collapse sidebar"
              >
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          )}

          {/* Sidebar expand button - shows when sidebar is collapsed */}
          {!isMobile && open && !showSidebar && (
            <div className="relative h-full w-0">
              <button
                className="absolute left-[3px] top-[32px] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-8 bg-background border border-border rounded-sm hover:bg-accent transition-all shadow-md z-30"
                onClick={() => setShowSidebar(true)}
                title="Expand sidebar"
              >
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          )}

          {/* Main Chat Content - Only visible when OPEN */}
          {open && (
            <div className="flex flex-col flex-1 h-full min-w-0 bg-background">
              <div className="border-b p-4 flex flex-row items-center justify-between space-y-0 h-16">
                <div className="flex items-center gap-2">
                  {!showSidebar && (
                    <Button variant="ghost" size="icon" className="ml-1 bg-blue-100/70 hover:bg-blue-100" onClick={() => setShowSidebar(true)} title="Show History">
                      <MessageSquare className="h-5 w-5" />
                    </Button>
                  )}
                  <h3 className="font-semibold text-sm">Chat with Data</h3>
                </div>

                {/* Close Panel Button */}
                <Button variant="ghost" size="icon" onClick={() => setOpen(false)} title="Close Chat">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Messages Area */}
              {messageList}

              {/* Input Area */}
              <div className="border-t p-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex gap-2"
                >
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask about your campaign performance..."
                    disabled={!canChat || isTyping}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={!canChat || isTyping || !chatInput.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
