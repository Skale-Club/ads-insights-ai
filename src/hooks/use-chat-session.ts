import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { buildWelcomeMessage, normalizeModel, type ChatMessage, type ChatSession, type UserAISettings } from '@/components/dashboard/chat/types';

interface UseChatSessionOptions {
  userId?: string;
  selectedAccountId?: string;
  selectedAccountName?: string;
}

export function useChatSession({ userId, selectedAccountId, selectedAccountName }: UseChatSessionOptions) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [aiSettings, setAiSettings] = useState<{ apiKey: string | null; model: string } | null>(null);

  useEffect(() => {
    if (!userId) return;

    (supabase as never)
      .from('user_ai_settings')
      .select('openai_api_key, preferred_model')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }: { data: UserAISettings | null }) => {
        if (!data) return;
        setAiSettings({
          apiKey: data.openai_api_key,
          model: normalizeModel(data.preferred_model),
        });
      });
  }, [userId]);

  const loadMessages = useCallback(async (sid: string) => {
    const { data } = await (supabase as never)
      .from('chat_messages')
      .select('*')
      .eq('session_id', sid)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(
        (data as ChatMessage[]).map((message) => ({
          ...message,
          id: message.id || crypto.randomUUID(),
        })),
      );
    }
  }, []);

  useEffect(() => {
    if (!userId) return;

    if (!selectedAccountId) {
      setSessionId(null);
      setSessions([]);
      setMessages([buildWelcomeMessage()]);
      return;
    }

    let mounted = true;

    const loadSessions = async () => {
      const { data, error } = await (supabase as never)
        .from('chat_sessions')
        .select('id, title, created_at, account_id')
        .eq('user_id', userId)
        .eq('account_id', selectedAccountId)
        .eq('archived', false)
        .order('created_at', { ascending: false });

      const sessionsData = !error && data
        ? (data as ChatSession[])
        : (((await (supabase as never)
            .from('chat_sessions')
            .select('id, title, created_at, account_id')
            .eq('user_id', userId)
            .eq('account_id', selectedAccountId)
            .order('created_at', { ascending: false })).data || []) as ChatSession[]);

      if (!mounted) return;

      setSessions(sessionsData);

      if (sessionsData.length > 0) {
        setSessionId(sessionsData[0].id);
        await loadMessages(sessionsData[0].id);
      } else {
        setSessionId(null);
        setMessages([buildWelcomeMessage(selectedAccountName)]);
      }
    };

    loadSessions();

    return () => {
      mounted = false;
    };
  }, [userId, selectedAccountId, selectedAccountName, loadMessages]);

  const generateChatTitle = useCallback((input: string) => {
    const cleaned = input.trim().replace(/\n+/g, ' ').replace(/\s+/g, ' ').slice(0, 60);
    return cleaned + (input.length > 60 ? '...' : '');
  }, []);

  const createSession = useCallback(async (firstMessage?: string) => {
    if (!userId || !selectedAccountId) return null;

    const { data, error } = await (supabase as never)
      .from('chat_sessions')
      .insert({
        user_id: userId,
        account_id: selectedAccountId,
        title: firstMessage ? generateChatTitle(firstMessage) : 'New Chat',
      })
      .select()
      .single();

    if (error || !data) return null;

    const nextSession = data as ChatSession;
    setSessionId(nextSession.id);
    setSessions((current) => [nextSession, ...current]);
    return nextSession.id;
  }, [generateChatTitle, selectedAccountId, userId]);

  const createNewChat = useCallback(async () => {
    setMessages([buildWelcomeMessage(selectedAccountName)]);
    if (!selectedAccountId || !userId) {
      setSessionId(null);
      return null;
    }

    return createSession();
  }, [createSession, selectedAccountId, selectedAccountName, userId]);

  const selectSession = useCallback(async (sid: string) => {
    setSessionId(sid);
    await loadMessages(sid);
  }, [loadMessages]);

  const deleteSession = useCallback(async (sid: string) => {
    await (supabase as never).from('chat_sessions').delete().eq('id', sid);
    setSessions((current) => current.filter((session) => session.id !== sid));
    if (sid === sessionId) {
      setSessionId(null);
      setMessages([buildWelcomeMessage(selectedAccountName)]);
    }
  }, [selectedAccountName, sessionId]);

  const archiveSession = useCallback(async (sid: string) => {
    try {
      const { error } = await (supabase as never).from('chat_sessions').update({ archived: true }).eq('id', sid);
      if (error) {
        await (supabase as never).from('chat_sessions').delete().eq('id', sid);
      }
    } catch {
      await (supabase as never).from('chat_sessions').delete().eq('id', sid);
    }

    setSessions((current) => current.filter((session) => session.id !== sid));
    if (sid === sessionId) {
      setSessionId(null);
      setMessages([buildWelcomeMessage(selectedAccountName)]);
    }
  }, [selectedAccountName, sessionId]);

  const persistMessage = useCallback(async (targetSessionId: string, message: ChatMessage) => {
    await (supabase as never).from('chat_messages').insert({
      session_id: targetSessionId,
      role: message.role,
      content: message.content,
      parts: message.parts ?? [],
    });
  }, []);

  const updateSessionTitle = useCallback(async (targetSessionId: string, chatMessages: ChatMessage[]) => {
    const recent = chatMessages
      .filter((message) => message.role === 'user')
      .slice(-3)
      .map((message) => message.content)
      .join(' ');

    const title = generateChatTitle(recent);
    await (supabase as never).from('chat_sessions').update({ title }).eq('id', targetSessionId);
    setSessions((current) => current.map((session) => (session.id === targetSessionId ? { ...session, title } : session)));
  }, [generateChatTitle]);

  return {
    aiSettings,
    sessionId,
    setSessionId,
    sessions,
    setSessions,
    messages,
    setMessages,
    createSession,
    createNewChat,
    selectSession,
    deleteSession,
    archiveSession,
    loadMessages,
    persistMessage,
    updateSessionTitle,
  };
}
