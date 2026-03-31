import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AttachmentPreview } from '@/components/dashboard/ChatAttachments';
import { MessageActions } from '@/components/dashboard/MessageActions';
import { normalizeAssistantMarkdown, type ChatMessage } from './types';
import type { ToolCallPart } from '@/types/chat';

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  onRegenerate?: () => void;
  onEdit?: (content: string) => void;
}

function renderToolState(part: ToolCallPart) {
  const stateLabel: Record<ToolCallPart['state'], string> = {
    'input-available': 'Prepared',
    'approval-requested': 'Awaiting approval',
    'approval-responded': 'Approval received',
    'output-available': 'Completed',
    'output-denied': 'Denied',
  };

  return (
    <div className="mt-3 rounded-xl border bg-background/70 p-3 text-xs space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{part.toolName}</span>
        <Badge variant={part.state === 'output-denied' ? 'destructive' : 'secondary'}>{stateLabel[part.state]}</Badge>
      </div>
      <pre className="overflow-x-auto rounded-md bg-muted/70 p-2 text-[11px] whitespace-pre-wrap">{JSON.stringify(part.input, null, 2)}</pre>
      {part.output ? (
        <pre className="overflow-x-auto rounded-md bg-muted/70 p-2 text-[11px] whitespace-pre-wrap">{JSON.stringify(part.output, null, 2)}</pre>
      ) : null}
      {part.approval?.reason ? <p className="text-muted-foreground">{part.approval.reason}</p> : null}
    </div>
  );
}

export function MessageBubble({ message, isStreaming = false, onRegenerate, onEdit }: MessageBubbleProps) {
  const textPart = message.parts?.find((part) => part.type === 'text');
  const toolParts = (message.parts || []).filter((part): part is ToolCallPart => part.type.startsWith('tool-'));
  const renderedText = textPart && 'text' in textPart ? textPart.text : message.content;

  return (
    <div className={cn('flex flex-col gap-1', message.role === 'user' ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'group max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm',
          message.role === 'user'
            ? 'bg-primary text-primary-foreground whitespace-pre-wrap'
            : 'bg-muted/80 border border-border/40 whitespace-normal',
        )}
      >
        {message.role === 'assistant' ? (
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
                a: ({ ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
                blockquote: ({ ...props }) => <blockquote className="my-2 border-l-2 border-border/70 pl-3 text-foreground/90" {...props} />,
                table: ({ ...props }) => (
                  <div className="overflow-x-auto">
                    <table {...props} />
                  </div>
                ),
              }}
            >
              {normalizeAssistantMarkdown(renderedText)}
            </ReactMarkdown>
          </div>
        ) : (
          <>
            {message.attachments && message.attachments.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-2">
                {message.attachments.map((attachment) => (
                  <AttachmentPreview key={attachment.id} attachment={attachment} />
                ))}
              </div>
            ) : null}
            {message.content}
          </>
        )}

        {toolParts.map((part) => (
          <div key={part.toolCallId}>{renderToolState(part)}</div>
        ))}
      </div>

      <MessageActions
        messageContent={message.content}
        messageId={message.id}
        role={message.role}
        onRegenerate={message.role === 'assistant' ? onRegenerate : undefined}
        onEdit={message.role === 'user' ? onEdit : undefined}
        isStreaming={isStreaming}
        className="opacity-0 group-hover:opacity-100"
      />
    </div>
  );
}
