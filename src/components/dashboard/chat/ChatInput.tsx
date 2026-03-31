import { useEffect, useRef } from 'react';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatAttachments, type ChatAttachment } from '@/components/dashboard/ChatAttachments';
import { chatModels } from '@/lib/ai/models';
import { features } from '@/config/features';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  attachments: ChatAttachment[];
  onAddAttachment: (attachment: ChatAttachment) => void;
  onRemoveAttachment: (id: string) => void;
  canChat: boolean;
  isStreaming: boolean;
  isProcessingAttachment: boolean;
  selectedModel: string;
  onModelChange: (model: string) => void;
  onStop: () => void;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  attachments,
  onAddAttachment,
  onRemoveAttachment,
  canChat,
  isStreaming,
  isProcessingAttachment,
  selectedModel,
  onModelChange,
  onStop,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 44), 200)}px`;
  }, [value]);

  return (
    <div className="border-t p-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="flex flex-col gap-2"
      >
        <div className="flex items-center gap-2">
          <ChatAttachments
            attachments={attachments}
            onAddAttachment={onAddAttachment}
            onRemoveAttachment={onRemoveAttachment}
            disabled={!canChat || isStreaming || isProcessingAttachment}
          />

          {features.modelSelection ? (
            <Select value={selectedModel} onValueChange={onModelChange}>
              <SelectTrigger className="h-8 w-[190px] text-xs">
                <SelectValue placeholder="Model" />
              </SelectTrigger>
              <SelectContent>
                {chatModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>

        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                onSubmit();
              }

              if (event.key === 'Escape' && isStreaming) {
                event.preventDefault();
                onStop();
              }
            }}
            placeholder="Ask about your campaign performance..."
            disabled={!canChat || isStreaming || isProcessingAttachment}
            className="flex-1 resize-none overflow-y-auto min-h-[44px] max-h-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            rows={1}
          />

          <Button type="submit" disabled={!canChat || isStreaming || isProcessingAttachment || (!value.trim() && attachments.length === 0)}>
            {isProcessingAttachment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </form>
    </div>
  );
}
