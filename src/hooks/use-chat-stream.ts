import { useCallback, useRef, useState } from 'react';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabase } from '@/integrations/supabase/client';
import { features } from '@/config/features';
import { getErrorMessage } from '@/lib/errors';
import type { ChatAttachment } from '@/components/dashboard/ChatAttachments';
import type { ChatMessage } from '@/components/dashboard/chat/types';
import type { MessagePart, ToolApprovalRequest, ToolCallPart } from '@/types/chat';
import type { DataPart } from '@/contexts/DataStreamContext';
import { useChatV2 } from '@/hooks/use-chat-v2';

const TOOL_RISK_LEVEL: Record<string, 'low' | 'medium' | 'high'> = {
  // Google
  queryAdsData: 'low',
  addNegativeKeyword: 'low',
  adjustBid: 'medium',
  createBudget: 'medium',
  updateCampaignBudget: 'medium',
  enableCampaign: 'medium',
  pauseCampaign: 'high',
  // Meta
  queryMetaData: 'low',
  analyzeCreative: 'low',
  updateBudget: 'medium',
  // Meta — new (Phase 02)
  createCampaign: 'high',
  createAdSet: 'high',
  createAd: 'high',
  duplicateCampaign: 'medium',
  duplicateAdSet: 'medium',
  updateTargeting: 'medium',
  updateBidStrategy: 'medium',
  updateCreative: 'medium',
  updateSchedule: 'medium',
  createCustomAudience: 'high',
  createLookalikeAudience: 'high',
  batchPauseEnable: 'high',
  createSplitTest: 'medium',
};

const TOOL_DESCRIPTION: Record<string, string> = {
  // Google
  addNegativeKeyword: 'Add a negative keyword to prevent wasteful searches.',
  adjustBid: 'Adjust bid strategy or keyword investment.',
  pauseCampaign: 'Pause a campaign that is underperforming.',
  enableCampaign: 'Resume a paused campaign.',
  createBudget: 'Create a new shared budget.',
  updateCampaignBudget: 'Change the budget for a campaign.',
  queryAdsData: 'Retrieve additional Google Ads data.',
  // Meta
  queryMetaData: 'Retrieve additional Meta Ads data.',
  analyzeCreative: 'Analyse creative performance and suggest improvements.',
  updateBudget: 'Update the budget for a Meta ad set or campaign.',
  // Meta — new (Phase 02)
  createCampaign: 'Create a new Meta campaign (starts paused).',
  createAdSet: 'Create a new ad set under a Meta campaign.',
  createAd: 'Create a new ad under a Meta ad set (starts paused).',
  duplicateCampaign: 'Duplicate a Meta campaign (optionally including all ad sets and ads).',
  duplicateAdSet: 'Duplicate a Meta ad set, optionally to a different campaign.',
  updateTargeting: 'Update targeting (geo / age / interests / audiences) on a Meta ad set.',
  updateBidStrategy: 'Change Meta bid strategy on a campaign or ad set.',
  updateCreative: 'Swap creative copy, CTA, link, or asset on a Meta ad.',
  updateSchedule: 'Update Meta ad set start/end dates or dayparting.',
  createCustomAudience: 'Create a Meta custom audience (requires Meta App Review).',
  createLookalikeAudience: 'Create a Meta lookalike audience (requires Meta App Review).',
  batchPauseEnable: 'Pause or enable up to 50 Meta entities in one batch.',
  createSplitTest: 'Set up a Meta A/B split test (CREATIVE / AUDIENCE / PLACEMENT).',
};

interface UseChatStreamOptions {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  sessionId: string | null;
  createSession: (firstMessage?: string) => Promise<string | null>;
  persistMessage: (targetSessionId: string, message: ChatMessage) => Promise<void>;
  updateSessionTitle: (targetSessionId: string, messages: ChatMessage[]) => Promise<void>;
  selectedAccountId?: string;
  apiKey: string | null;
  model: string;
  effectiveContext: unknown;
  providerToken: string | null;
  platform?: 'google' | 'meta';
  metaAccessToken?: string | null;
  metaAccountId?: string | null;
  addDataPart: (part: Omit<DataPart, 'id' | 'createdAt'>) => void;
  onApprovalRequest: (request: ToolApprovalRequest | null) => void;
  toast: (input: { title: string; description: string; variant?: 'default' | 'destructive'; duration?: number }) => void;
}

export function useChatStream({
  messages,
  setMessages,
  sessionId,
  createSession,
  persistMessage,
  updateSessionTitle,
  selectedAccountId,
  apiKey,
  model,
  effectiveContext,
  providerToken,
  platform = 'google',
  metaAccessToken,
  metaAccountId,
  addDataPart,
  onApprovalRequest,
  toast,
}: UseChatStreamOptions) {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pendingToolCallRef = useRef<{ messageId: string; part: ToolCallPart; platform: 'google' | 'meta' } | null>(null);

  const aiSdkChat = useChatV2({
    apiKey,
    model,
    campaignData: effectiveContext,
    enabled: features.aiSdk,
  });

  const processAudioTranscription = useCallback(
    async (attachment: ChatAttachment): Promise<string> => {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/process-attachment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          type: 'audio',
          data: attachment.data,
          mimeType: attachment.mimeType,
          apiKey,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to transcribe audio');
      }

      const result = await response.json();
      return result.transcription || '';
    },
    [apiKey],
  );

  const createToolPart = useCallback((toolName: string, rawArguments: string): ToolCallPart => {
    let input: Record<string, unknown> = {};
    try {
      input = rawArguments ? (JSON.parse(rawArguments) as Record<string, unknown>) : {};
    } catch {
      input = { rawArguments };
    }

    return {
      type: `tool-${toolName}`,
      toolCallId: crypto.randomUUID(),
      toolName,
      input,
      state: 'approval-requested',
    };
  }, []);

  const streamChat = useCallback(
    async (chatMessages: ChatMessage[], signal?: AbortSignal) => {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-ads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        },
        signal,
        body: JSON.stringify({
          messages: chatMessages,
          campaignData: effectiveContext,
          apiKey,
          model,
          enableTools: true,
          platform,
          ...(platform === 'meta' && metaAccessToken && metaAccountId
            ? { metaAccessToken, metaAccountId }
            : {}),
          ...(platform === 'google' && providerToken && selectedAccountId
            ? { providerToken, customerId: selectedAccountId }
            : {}),
        }),
      });

      if (!response.ok) {
        let message = 'Failed to connect to AI service';
        try {
          const payload = await response.json();
          if (typeof payload?.error === 'string') {
            message = payload.error;
          }
        } catch {
          const text = await response.text();
          if (text) message = text;
        }
        throw new Error(message);
      }

      if (!response.body) {
        throw new Error('AI service returned an empty stream.');
      }

      return response.body;
    },
    [apiKey, effectiveContext, model, platform, providerToken, selectedAccountId, metaAccessToken, metaAccountId],
  );

  const updateAssistantMessage = useCallback(
    (assistantId: string, updater: (message: ChatMessage) => ChatMessage) => {
      setMessages((current) =>
        current.map((message) => (message.id === assistantId ? updater(message) : message)),
      );
    },
    [setMessages],
  );

  const sendMessage = useCallback(
    async ({ text, attachments = [] }: { text: string; attachments?: ChatAttachment[] }) => {
      if (!text.trim() && attachments.length === 0) return;
      if (!apiKey) throw new Error('Missing API key');

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      setIsStreaming(true);

      try {
        const processedAttachments = await Promise.all(
          attachments.map(async (attachment) => {
            if (attachment.type !== 'audio') return attachment;
            try {
              const transcription = await processAudioTranscription(attachment);
              return { ...attachment, transcription };
            } catch {
              return { ...attachment, transcription: '[Audio transcription failed]' };
            }
          }),
        );

        let persistedContent = text.trim();
        for (const attachment of processedAttachments) {
          if (attachment.type === 'audio' && attachment.transcription) {
            persistedContent += `\n\n[Audio message: ${attachment.transcription}]`;
          }
          if (attachment.type === 'csv' || attachment.type === 'excel') {
            persistedContent += `\n\n[Uploaded file: ${attachment.name}]\n${attachment.data}`;
          }
        }

        const userMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'user',
          content: text.trim(),
          attachments: processedAttachments.length > 0 ? processedAttachments : undefined,
        };

        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '',
          parts: [],
        };

        const optimisticMessages = [...messages, userMessage, assistantMessage];
        setMessages(optimisticMessages);

        const activeSessionId = sessionId ?? (await createSession(text.trim() || 'File attachment'));
        if (!activeSessionId) {
          throw new Error('Unable to create chat session');
        }

        await persistMessage(activeSessionId, {
          ...userMessage,
          content: persistedContent,
        });

        const stream = await streamChat([...messages, userMessage], controller.signal);
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let textBuffer = '';
        let assistantText = '';
        let assistantParts: MessagePart[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          textBuffer += decoder.decode(value, { stream: true });
          let newlineIndex = textBuffer.indexOf('\n');

          while (newlineIndex !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);

            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (!line.startsWith('data: ')) {
              newlineIndex = textBuffer.indexOf('\n');
              continue;
            }

            const payload = line.slice(6).trim();
            if (!payload || payload === '[DONE]') {
              newlineIndex = textBuffer.indexOf('\n');
              continue;
            }

            try {
              const parsed = JSON.parse(payload);
              const delta = parsed?.choices?.[0]?.delta;

              if (typeof delta?.content === 'string') {
                assistantText += delta.content;
                updateAssistantMessage(assistantMessage.id, (message) => ({
                  ...message,
                  content: assistantText,
                  parts: assistantParts.length > 0 ? [{ type: 'text', text: assistantText }, ...assistantParts] : undefined,
                }));
              }

              if (Array.isArray(delta?.tool_calls)) {
                for (const toolCall of delta.tool_calls) {
                  const toolName = toolCall?.function?.name;
                  if (!toolName) continue;

                  const toolPart = createToolPart(toolName, toolCall?.function?.arguments || '{}');
                  assistantParts = [...assistantParts, toolPart];
                  pendingToolCallRef.current = { messageId: assistantMessage.id, part: toolPart, platform };

                  updateAssistantMessage(assistantMessage.id, (message) => ({
                    ...message,
                    parts: [{ type: 'text', text: assistantText }, ...assistantParts],
                  }));

                  addDataPart({ type: 'tool-request', toolCallId: toolPart.toolCallId, toolName });
                  onApprovalRequest({
                    toolCallId: toolPart.toolCallId,
                    toolName,
                    input: toolPart.input,
                    description: TOOL_DESCRIPTION[toolName] || 'Tool execution requires approval.',
                    riskLevel: TOOL_RISK_LEVEL[toolName] || 'medium',
                  });
                }
              }
            } catch {
              textBuffer = `${line}\n${textBuffer}`;
              break;
            }

            newlineIndex = textBuffer.indexOf('\n');
          }
        }

        const finalAssistantMessage: ChatMessage = {
          ...assistantMessage,
          content: assistantText,
          parts: assistantParts.length > 0 ? [{ type: 'text', text: assistantText }, ...assistantParts] : undefined,
        };

        await persistMessage(activeSessionId, finalAssistantMessage);

        if (optimisticMessages.length >= 4 && optimisticMessages.length % 3 === 0) {
          await updateSessionTitle(activeSessionId, [...messages, userMessage, finalAssistantMessage]);
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          toast({
            title: 'Chat error',
            description: getErrorMessage(error),
            variant: 'destructive',
            duration: 5000,
          });
          setMessages(messages);
        }
      } finally {
        setIsStreaming(false);
      }
    },
    [addDataPart, apiKey, createSession, createToolPart, messages, onApprovalRequest, persistMessage, processAudioTranscription, sessionId, setMessages, streamChat, toast, updateAssistantMessage, updateSessionTitle],
  );

  const approveTool = useCallback(async () => {
    const pending = pendingToolCallRef.current;
    const isMeta = pending?.platform === 'meta';

    if (!pending) return;
    if (isMeta && (!metaAccessToken || !metaAccountId)) return;
    if (!isMeta && (!selectedAccountId || !providerToken)) return;

    onApprovalRequest(null);
    addDataPart({ type: 'status', label: `Executing ${pending.part.toolName}`, level: 'info' });

    let response: Response;

    if (isMeta) {
      // Map Gemini tool names to meta-mutate actions
      const toolName = pending.part.toolName;
      const input = pending.part.input as Record<string, unknown>;
      let action: string;
      const body: Record<string, unknown> = { accessToken: metaAccessToken, accountId: metaAccountId };

      // Read-only tools — no mutation, skip meta-mutate
      if (toolName === 'analyzeCreative' || toolName === 'queryMetaData') {
        addDataPart({ type: 'status', label: `${toolName}: read-only, no action needed`, level: 'info' });
        pendingToolCallRef.current = null;
        return;
      }

      // Status toggles (existing)
      if (toolName === 'pauseCampaign') {
        action = 'pauseCampaign';
        body.campaignId = input.campaignId;
      } else if (toolName === 'enableCampaign') {
        action = 'enableCampaign';
        body.campaignId = input.campaignId;
      } else if (toolName === 'updateBudget') {
        action = input.budgetType === 'lifetime' || input.targetType === 'campaign_lifetime' ? 'updateLifetimeBudget' : 'updateDailyBudget';
        body.adSetId = input.adSetId || (input.targetType === 'adset_daily' ? input.targetId : undefined);
        body.campaignId = input.campaignId || (input.targetType === 'campaign_lifetime' ? input.targetId : undefined);
        body.amountCents = input.amountCents ?? input.newAmountCents;
      }
      // Lifecycle creation
      else if (toolName === 'createCampaign') {
        action = 'createCampaign';
        body.name = input.name;
        body.objective = input.objective;
        body.dailyBudgetCents = input.dailyBudgetCents;
        body.lifetimeBudgetCents = input.lifetimeBudgetCents;
        body.bidStrategy = input.bidStrategy;
        body.status = 'PAUSED';
      } else if (toolName === 'createAdSet') {
        action = 'createAdSet';
        body.campaignId = input.campaignId;
        body.name = input.name;
        body.optimizationGoal = input.optimizationGoal;
        body.billingEvent = input.billingEvent ?? 'IMPRESSIONS';
        body.dailyBudgetCents = input.dailyBudgetCents;
        body.lifetimeBudgetCents = input.lifetimeBudgetCents;
        body.targeting = input.targeting;
        body.startTime = input.startTime;
        body.endTime = input.endTime;
      } else if (toolName === 'createAd') {
        action = 'createAd';
        body.adSetId = input.adSetId;
        body.name = input.name;
        body.creative = input.creative;
        body.status = 'PAUSED';
      }
      // Duplicate
      else if (toolName === 'duplicateCampaign') {
        action = 'duplicateCampaign';
        body.campaignId = input.campaignId;
        body.deep = input.deep === true;
      } else if (toolName === 'duplicateAdSet') {
        action = 'duplicateAdSet';
        body.adSetId = input.adSetId;
        body.campaignId = input.campaignId;
      }
      // Targeting & schedule
      else if (toolName === 'updateTargeting') {
        action = 'updateTargeting';
        body.adSetId = input.adSetId;
        body.targeting = input.targeting;
      } else if (toolName === 'updateSchedule') {
        action = 'updateSchedule';
        body.adSetId = input.adSetId;
        body.startTime = input.startTime;
        body.endTime = input.endTime;
        body.adsetSchedule = input.adsetSchedule;
      }
      // Bid strategy
      else if (toolName === 'updateBidStrategy') {
        action = 'updateBidStrategy';
        body.campaignId = input.campaignId;
        body.adSetId = input.adSetId;
        body.bidStrategy = input.bidStrategy;
        body.bidAmountCents = input.bidAmountCents;
      }
      // Creative
      else if (toolName === 'updateCreative') {
        action = 'updateCreative';
        body.adId = input.adId;
        body.creativeId = input.creativeId;
        body.creative = input.creative;
      }
      // Audiences (App Review-gated)
      else if (toolName === 'createCustomAudience') {
        action = 'createCustomAudience';
        body.name = input.name;
        body.audienceSourceType = input.audienceSourceType;
        body.audienceRules = input.audienceRules;
      } else if (toolName === 'createLookalikeAudience') {
        action = 'createLookalikeAudience';
        body.name = input.name;
        body.sourceAudienceId = input.sourceAudienceId;
        body.lookalikeSpec = input.lookalikeSpec;
      }
      // Batch
      else if (toolName === 'batchPauseEnable') {
        action = 'batchPauseEnable';
        body.entityIds = input.entityIds;
        body.entityType = input.entityType;
        body.status = input.status;
      }
      // Split test
      else if (toolName === 'createSplitTest') {
        action = 'createSplitTest';
        body.splitTestName = input.splitTestName;
        body.splitTestType = input.splitTestType;
        body.splitTestCells = input.splitTestCells;
      }
      // Unknown — surface to chat instead of silently dropping
      else {
        addDataPart({ type: 'status', label: `Unknown Meta tool: ${toolName}`, level: 'warning' });
        pendingToolCallRef.current = null;
        return;
      }

      response = await fetch(`${SUPABASE_URL}/functions/v1/meta-mutate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ ...body, action }),
      });
    } else {
      response = await fetch(`${SUPABASE_URL}/functions/v1/google-ads-execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          providerToken,
          customerId: selectedAccountId,
          toolName: pending.part.toolName,
          input: pending.part.input,
        }),
      });
    }

    const result = await response.json();
    const success = Boolean(result?.success);

    addDataPart({ type: 'tool-result', toolCallId: pending.part.toolCallId, toolName: pending.part.toolName, success });

    updateAssistantMessage(pending.messageId, (message) => ({
      ...message,
      parts: (message.parts || []).map((part) => {
        if (!('toolCallId' in part) || part.toolCallId !== pending.part.toolCallId) {
          return part;
        }

        return {
          ...part,
          state: success ? 'output-available' : 'output-denied',
          output: success ? result.data || result : { error: result.error || 'Tool execution failed' },
          approval: {
            id: crypto.randomUUID(),
            approved: success,
          },
        };
      }),
    }));

    pendingToolCallRef.current = null;

    if (success) {
      await sendMessage({
        text: `Tool ${pending.part.toolName} executed successfully with result: ${JSON.stringify(result.data || result)}. Summarize what changed and recommend next steps.`,
      });
    }
  }, [addDataPart, onApprovalRequest, platform, providerToken, selectedAccountId, metaAccessToken, metaAccountId, sendMessage, updateAssistantMessage]);

  const denyTool = useCallback((reason?: string) => {
    const pending = pendingToolCallRef.current;
    if (!pending) return;

    updateAssistantMessage(pending.messageId, (message) => ({
      ...message,
      parts: (message.parts || []).map((part) => {
        if (!('toolCallId' in part) || part.toolCallId !== pending.part.toolCallId) {
          return part;
        }

        return {
          ...part,
          state: 'output-denied',
          approval: {
            id: crypto.randomUUID(),
            approved: false,
            reason,
          },
        };
      }),
    }));

    addDataPart({ type: 'status', label: `Denied ${pending.part.toolName}`, level: 'warning' });
    pendingToolCallRef.current = null;
    onApprovalRequest(null);
  }, [addDataPart, onApprovalRequest, updateAssistantMessage]);

  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  return {
    aiSdkChat,
    isStreaming,
    sendMessage,
    approveTool,
    denyTool,
    stop,
  };
}
