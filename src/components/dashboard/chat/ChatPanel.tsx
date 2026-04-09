import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboard } from '@/contexts/DashboardContext';
import { useToast } from '@/hooks/use-toast';
import { features } from '@/config/features';
import { useDataStream } from '@/contexts/DataStreamContext';
import { useChatContext } from '@/hooks/use-chat-context';
import { useChatSession } from '@/hooks/use-chat-session';
import { useChatStream } from '@/hooks/use-chat-stream';
import { ChatSidebar } from '@/components/dashboard/ChatSidebar';
import { ToolApprovalDialog } from '@/components/dashboard/ToolApprovalDialog';
import { ChatHeader } from './ChatHeader';
import { DataStreamPreview } from './DataStreamPreview';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { normalizeModel } from './types';
import { supabase } from '@/integrations/supabase/client';
import type { ChatAttachment } from '@/components/dashboard/ChatAttachments';
import type { ToolApprovalRequest } from '@/types/chat';

export function ChatPanel({ campaignContext }: { campaignContext?: unknown }) {
  const { user, providerToken } = useAuth();
  const { selectedAccount, selectedMetaAccount, platform, setChatWidth } = useDashboard();
  const { toast } = useToast();
  const [metaAccessToken, setMetaAccessToken] = useState<string | null>(null);
  const { addDataPart, clearDataStream } = useDataStream();

  const [open, setOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState<number>(() => (typeof window === 'undefined' ? 1024 : window.innerWidth));
  const [panelWidth, setPanelWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return 420;
    const raw = window.localStorage.getItem('ai_chat_panel_width');
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? Math.max(420, parsed) : 420;
  });
  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return 256;
    const raw = window.localStorage.getItem('ai_chat_sidebar_width');
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? Math.max(100, parsed) : 256;
  });
  const [chatInput, setChatInput] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [pendingToolApproval, setPendingToolApproval] = useState<ToolApprovalRequest | null>(null);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [isProcessingAttachment, setIsProcessingAttachment] = useState(false);

  const resizeSessionRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const sidebarResizeRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const isMobile = windowWidth < 640;
  const minWidth = 280;
  const closeThreshold = 120;
  const maxWidth = useMemo(() => (isMobile ? windowWidth : Math.max(minWidth, Math.min(960, windowWidth - 24))), [isMobile, windowWidth]);

  const {
    aiSettings,
    sessionId,
    sessions,
    messages,
    setMessages,
    createSession,
    createNewChat,
    selectSession,
    deleteSession,
    archiveSession,
    persistMessage,
    updateSessionTitle,
  } = useChatSession({
    userId: user?.id,
    selectedAccountId: selectedAccount?.id,
    selectedAccountName: selectedAccount?.name,
  });

  useEffect(() => {
    if (aiSettings?.model) {
      setSelectedModel(normalizeModel(aiSettings.model));
    }
  }, [aiSettings?.model]);

  // Load Meta access token when platform switches to meta
  useEffect(() => {
    if (platform !== 'meta' || !user?.id) { setMetaAccessToken(null); return; }
    supabase
      .from('meta_connections')
      .select('access_token')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => setMetaAccessToken(data?.access_token ?? null));
  }, [platform, user?.id]);

  const effectiveContext = useChatContext(campaignContext, open);

  const { isStreaming, sendMessage, approveTool, denyTool, stop } = useChatStream({
    messages,
    setMessages,
    sessionId,
    createSession,
    persistMessage,
    updateSessionTitle,
    selectedAccountId: selectedAccount?.id,
    apiKey: aiSettings?.apiKey || null,
    model: selectedModel,
    effectiveContext,
    providerToken,
    platform,
    metaAccessToken,
    metaAccountId: selectedMetaAccount?.account_id ?? null,
    addDataPart,
    onApprovalRequest: setPendingToolApproval,
    toast,
  });

  const canChat = Boolean(aiSettings?.apiKey);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('ai_chat_sidebar_width', String(sidebarWidth));
  }, [sidebarWidth]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isMobile) {
      window.localStorage.setItem('ai_chat_panel_width', String(panelWidth));
    }
  }, [isMobile, panelWidth]);

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setChatWidth(0);
    } else {
      setChatWidth(open ? panelWidth : 70);
    }
  }, [isMobile, open, panelWidth, setChatWidth]);

  useEffect(() => {
    if (isMobile) return;
    setPanelWidth((current) => Math.min(Math.max(current, minWidth), maxWidth));
  }, [isMobile, maxWidth]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      if (!resizeSessionRef.current) return;

      const delta = resizeSessionRef.current.startX - event.clientX;
      const next = resizeSessionRef.current.startWidth + delta;

      if (next <= closeThreshold) {
        resizeSessionRef.current = null;
        setOpen(false);
        return;
      }

      setPanelWidth(Math.min(Math.max(next, minWidth), maxWidth));
    };

    const onPointerUp = () => {
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
    const onPointerMove = (event: PointerEvent) => {
      if (!sidebarResizeRef.current) return;
      const delta = event.clientX - sidebarResizeRef.current.startX;
      setSidebarWidth(Math.max(100, Math.min(480, sidebarResizeRef.current.startWidth + delta)));
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

  const handleSubmit = useCallback(async () => {
    if (!selectedAccount?.id) {
      toast({
        title: 'Select an account',
        description: 'Choose a Google Ads account before sending messages.',
        variant: 'destructive',
      });
      return;
    }

    const attachments = [...pendingAttachments];
    const nextInput = chatInput;
    setChatInput('');
    setPendingAttachments([]);
    setIsProcessingAttachment(true);
    clearDataStream();

    try {
      await sendMessage({
        text: nextInput,
        attachments,
      });
    } finally {
      setIsProcessingAttachment(false);
    }
  }, [chatInput, clearDataStream, pendingAttachments, selectedAccount?.id, sendMessage, toast]);

  const handleRegenerate = useCallback(async () => {
    const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user');
    if (!lastUserMessage) return;
    setChatInput(lastUserMessage.content);
    setPendingAttachments(lastUserMessage.attachments || []);
  }, [messages]);

  const handleEditMessage = useCallback((messageId: string, content: string) => {
    const index = messages.findIndex((message) => message.id === messageId);
    if (index === -1) return;
    setMessages(messages.slice(0, index));
    setChatInput(content);
    setPendingAttachments(messages[index].attachments || []);
  }, [messages, setMessages]);

  const railStyle = useMemo(() => {
    if (isMobile) return open ? { width: '100%' } : { width: 0, overflow: 'hidden' };
    return open ? { width: panelWidth, maxWidth } : { width: 70 };
  }, [isMobile, maxWidth, open, panelWidth]);

  return (
    <>
      {isMobile && !open ? (
        <Button className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg" onClick={() => setOpen(true)} size="icon">
          <MessageSquare className="h-5 w-5" />
        </Button>
      ) : null}

      <div
        className="fixed right-0 top-0 h-full z-40 bg-background border-l shadow-xl transition-[width] duration-300 ease-in-out"
        style={railStyle}
      >
        {!isMobile && open ? (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize chat panel"
            className="absolute left-0 top-0 z-50 h-full w-1.5 -ml-[3px] cursor-ew-resize touch-none select-none bg-transparent transition-colors hover:bg-foreground/10 active:bg-foreground/20"
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              event.preventDefault();
              event.stopPropagation();
              resizeSessionRef.current = { startX: event.clientX, startWidth: panelWidth };
            }}
          />
        ) : null}

        {!isMobile ? (
          <button
            className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-8 bg-background border border-border rounded-sm hover:bg-accent transition-all shadow-md z-50"
            onClick={() => setOpen(!open)}
            title={open ? 'Collapse chat' : 'Expand chat'}
          >
            {open ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronLeft className="h-4 w-4 text-muted-foreground" />}
          </button>
        ) : null}

        <div className="flex h-full overflow-hidden relative">
          <ChatSidebar
            isExpanded={open && showSidebar}
            isMobile={isMobile}
            width={sidebarWidth}
            sessions={sessions}
            activeSessionId={sessionId}
            onSelectSession={(sid) => {
              selectSession(sid);
              if (isMobile) setShowSidebar(false);
            }}
            onNewChat={() => {
              createNewChat();
              if (isMobile) setShowSidebar(false);
            }}
            onDeleteSession={deleteSession}
            onArchiveSession={archiveSession}
            onExpand={() => {
              setOpen(true);
              if (sidebarWidth < 200) setSidebarWidth(256);
            }}
          />

          {!isMobile && open && showSidebar ? (
            <div
              className="w-1.5 -ml-[3px] z-20 cursor-col-resize hover:bg-foreground/10 active:bg-foreground/20 transition-colors touch-none select-none relative h-full"
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                sidebarResizeRef.current = { startX: event.clientX, startWidth: sidebarWidth };
              }}
            >
              <button
                className="absolute left-[3px] top-[36px] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-8 bg-background border border-border rounded-sm hover:bg-accent transition-all shadow-md z-30"
                onClick={(event) => {
                  event.stopPropagation();
                  setShowSidebar(false);
                }}
                title="Collapse sidebar"
              >
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          ) : null}

          {!isMobile && open && !showSidebar ? (
            <div className="relative h-full w-0">
              <button
                className="absolute left-[3px] top-[32px] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-8 bg-background border border-border rounded-sm hover:bg-accent transition-all shadow-md z-30"
                onClick={() => setShowSidebar(true)}
                title="Expand sidebar"
              >
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          ) : null}

          {open ? (
            <div className="flex flex-col flex-1 h-full min-w-0 bg-background">
              <ChatHeader showSidebar={showSidebar} onShowSidebar={() => setShowSidebar(true)} onClose={() => setOpen(false)} />
              {features.dataStreamHandler ? <DataStreamPreview /> : null}

              <MessageList
                canChat={canChat}
                messages={messages}
                isStreaming={isStreaming}
                onSuggestedAction={setChatInput}
                onRegenerate={handleRegenerate}
                onEditMessage={handleEditMessage}
              />

              <ChatInput
                value={chatInput}
                onChange={setChatInput}
                onSubmit={handleSubmit}
                attachments={pendingAttachments}
                onAddAttachment={(attachment) => setPendingAttachments((current) => [...current, attachment])}
                onRemoveAttachment={(id) => setPendingAttachments((current) => current.filter((attachment) => attachment.id !== id))}
                canChat={canChat}
                isStreaming={isStreaming}
                isProcessingAttachment={isProcessingAttachment}
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
                onStop={stop}
              />
            </div>
          ) : null}
        </div>
      </div>

      {features.toolCalling ? (
        <ToolApprovalDialog
          request={pendingToolApproval}
          onApprove={() => {
            approveTool();
          }}
          onDeny={(_toolCallId, reason) => {
            denyTool(reason);
          }}
          isLoading={isStreaming}
        />
      ) : null}
    </>
  );
}
