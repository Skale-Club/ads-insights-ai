import { useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import type { ChatTransport, UIMessage, UIMessageChunk } from 'ai';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/integrations/supabase/client';

class AnalyzeAdsTransport implements ChatTransport<UIMessage> {
  constructor(
    private readonly options: {
      apiKey: string | null;
      model: string;
      campaignData: unknown;
    },
  ) {}

  async sendMessages({ messages, abortSignal }: { messages: UIMessage[]; abortSignal: AbortSignal | undefined; trigger: 'submit-message' | 'regenerate-message'; chatId: string; messageId: string | undefined; body?: object; headers?: HeadersInit; credentials?: RequestCredentials; metadata?: unknown; }): Promise<ReadableStream<UIMessageChunk>> {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-ads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      },
      signal: abortSignal,
      body: JSON.stringify({
        messages: messages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.parts.filter((part) => part.type === 'text').map((part) => ('text' in part ? part.text : '')).join(''),
        })),
        campaignData: this.options.campaignData,
        apiKey: this.options.apiKey,
        model: this.options.model,
        enableTools: true,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error('Failed to start AI SDK chat stream');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const messageId = crypto.randomUUID();
    const textPartId = crypto.randomUUID();

    return new ReadableStream<UIMessageChunk>({
      async start(controller) {
        controller.enqueue({ type: 'start', messageId });
        controller.enqueue({ type: 'start-step' });
        controller.enqueue({ type: 'text-start', id: textPartId });

        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          let newlineIndex = buffer.indexOf('\n');

          while (newlineIndex !== -1) {
            let line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);

            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (!line.startsWith('data: ')) {
              newlineIndex = buffer.indexOf('\n');
              continue;
            }

            const payload = line.slice(6).trim();
            if (!payload || payload === '[DONE]') {
              newlineIndex = buffer.indexOf('\n');
              continue;
            }

            try {
              const parsed = JSON.parse(payload);
              const delta = parsed?.choices?.[0]?.delta;

              if (typeof delta?.content === 'string') {
                controller.enqueue({ type: 'text-delta', id: textPartId, delta: delta.content });
              }

              if (Array.isArray(delta?.tool_calls)) {
                for (const toolCall of delta.tool_calls) {
                  const toolName = toolCall?.function?.name;
                  if (!toolName) continue;

                  controller.enqueue({
                    type: 'tool-input-available',
                    toolCallId: crypto.randomUUID(),
                    toolName,
                    input: toolCall?.function?.arguments ? JSON.parse(toolCall.function.arguments) : {},
                  });
                }
              }
            } catch {
              buffer = `${line}\n${buffer}`;
              break;
            }

            newlineIndex = buffer.indexOf('\n');
          }
        }

        controller.enqueue({ type: 'text-end', id: textPartId });
        controller.enqueue({ type: 'finish-step' });
        controller.enqueue({ type: 'finish', finishReason: 'stop' });
        controller.close();
      },
    });
  }

  async reconnectToStream() {
    return null;
  }
}

interface UseChatV2Options {
  apiKey: string | null;
  model: string;
  campaignData: unknown;
  enabled?: boolean;
}

export function useChatV2({ apiKey, model, campaignData, enabled = true }: UseChatV2Options) {
  const transport = useMemo(() => new AnalyzeAdsTransport({ apiKey, model, campaignData }), [apiKey, campaignData, model]);

  const chat = useChat({
    transport,
    messages: [],
  });

  return {
    ...chat,
    enabled,
  };
}
