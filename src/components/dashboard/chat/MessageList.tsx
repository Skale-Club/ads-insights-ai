import { ArrowDown } from 'lucide-react';
import { SuggestedActions } from '@/components/dashboard/SuggestedActions';
import { useScrollToBottom } from '@/hooks/use-scroll-to-bottom';
import { features } from '@/config/features';
import { MessageBubble } from './MessageBubble';
import type { ChatMessage } from './types';

interface MessageListProps {
  canChat: boolean;
  messages: ChatMessage[];
  isStreaming: boolean;
  onSuggestedAction: (prompt: string) => void;
  onRegenerate: () => void;
  onEditMessage: (messageId: string, content: string) => void;
}

export function MessageList({ canChat, messages, isStreaming, onSuggestedAction, onRegenerate, onEditMessage }: MessageListProps) {
  const { containerRef, endRef, isAtBottom, scrollToBottom } = useScrollToBottom();

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin relative">
      {!canChat ? (
        <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
          Add your Gemini API key in Settings to enable chat.
        </div>
      ) : null}

      {features.suggestedActions && messages.length <= 1 && canChat && !isStreaming ? (
        <div className="mb-4">
          <SuggestedActions onActionClick={onSuggestedAction} />
        </div>
      ) : null}

      {messages.map((message, index) => (
        <MessageBubble
          key={message.id}
          message={message}
          isStreaming={isStreaming && index === messages.length - 1 && message.role === 'assistant'}
          onRegenerate={onRegenerate}
          onEdit={(content) => onEditMessage(message.id, content)}
        />
      ))}

      {isStreaming ? (
        <div className="flex justify-start">
          <div className="bg-muted rounded-lg px-4 py-2 flex items-center gap-1 min-h-[40px]">
            <div className="w-2 h-2 bg-foreground/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <div className="w-2 h-2 bg-foreground/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <div className="w-2 h-2 bg-foreground/60 rounded-full animate-bounce" />
          </div>
        </div>
      ) : null}

      {!isAtBottom && features.scrollToBottom ? (
        <button
          type="button"
          onClick={() => scrollToBottom('smooth')}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border bg-background p-2 shadow-lg hover:bg-accent transition-colors z-10"
          title="Scroll to bottom"
        >
          <ArrowDown className="size-4" />
        </button>
      ) : null}

      <div ref={endRef} />
    </div>
  );
}
