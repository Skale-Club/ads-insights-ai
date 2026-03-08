import { useState } from 'react';
import { Check, Copy, Pencil, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface MessageActionsProps {
    messageContent: string;
    messageId: string;
    role: 'user' | 'assistant';
    onRegenerate?: () => void;
    onEdit?: (newContent: string) => void;
    isStreaming?: boolean;
    className?: string;
}

export function MessageActions({
    messageContent,
    messageId,
    role,
    onRegenerate,
    onEdit,
    isStreaming = false,
    className,
}: MessageActionsProps) {
    const [copied, setCopied] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(messageContent);
    const { toast } = useToast();

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(messageContent);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast({
                description: 'Copied to clipboard',
            });
        } catch (err) {
            toast({
                variant: 'destructive',
                description: 'Failed to copy to clipboard',
            });
        }
    };

    const handleEdit = () => {
        if (isEditing && onEdit && editContent !== messageContent) {
            onEdit(editContent);
        }
        setIsEditing(!isEditing);
    };

    const handleCancelEdit = () => {
        setEditContent(messageContent);
        setIsEditing(false);
    };

    return (
        <div className={cn('flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity', className)}>
            <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleCopy}
                title="Copy message"
            >
                {copied ? (
                    <Check className="size-3.5 text-green-500" />
                ) : (
                    <Copy className="size-3.5" />
                )}
            </Button>

            {role === 'user' && onEdit && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleEdit}
                    title="Edit message"
                >
                    <Pencil className="size-3.5" />
                </Button>
            )}

            {role === 'assistant' && onRegenerate && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={onRegenerate}
                    disabled={isStreaming}
                    title="Regenerate response"
                >
                    <RefreshCw className={cn('size-3.5', isStreaming && 'animate-spin')} />
                </Button>
            )}

            {isEditing && (
                <div className="flex items-center gap-1 ml-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleEdit}
                        className="h-7 text-xs"
                    >
                        Save
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelEdit}
                        className="h-7 text-xs"
                    >
                        Cancel
                    </Button>
                </div>
            )}
        </div>
    );
}
