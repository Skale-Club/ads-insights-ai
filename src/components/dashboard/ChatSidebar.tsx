import { Archive, MessageSquare, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

type ChatSession = {
    id: string;
    title: string;
    created_at: string;
};

interface ChatSidebarProps {
    sessions: ChatSession[];
    activeSessionId: string | null;
    onSelectSession: (id: string) => void;
    onNewChat: () => void;
    onDeleteSession: (id: string) => void;
    onArchiveSession: (id: string) => void;
    onExpand?: () => void;
    isExpanded: boolean;
    isMobile?: boolean;
    width?: number;
    isResizing?: boolean;
}

export function ChatSidebar({
    sessions,
    activeSessionId,
    onSelectSession,
    onNewChat,
    onDeleteSession,
    onArchiveSession,
    onExpand,
    isExpanded,
    isMobile = false,
    width = 256,
    isResizing = false,
}: ChatSidebarProps) {
    // Use compact mode if collapsed OR if width is too small for full text
    const isCompact = !isExpanded || width < 150;

    const handleExpandInteraction = () => {
        if (isCompact && onExpand) {
            onExpand();
        }
    };

    return (
        <div
            className={cn(
                "border-r bg-muted/20 flex flex-col h-full",
                isResizing ? "transition-none" : "transition-all duration-300 ease-in-out",
                isCompact && "cursor-pointer hover:bg-muted/30"
            )}
            style={{ width: isExpanded ? width : 70 }}
            onClick={handleExpandInteraction}
        >
            <div className={cn("p-4 border-b flex items-center justify-center h-16", isCompact ? "px-2" : "")}>
                <Button
                    onClick={(e) => {
                        if (isCompact && onExpand) {
                            onExpand();
                        }
                        onNewChat();
                    }}
                    className={cn(
                        "gap-2",
                        !isCompact ? "w-full justify-start" : "h-10 w-10 p-0 justify-center"
                    )}
                    variant="outline"
                    title="New Chat"
                >
                    <Plus className="h-4 w-4" />
                    {!isCompact && <span>New Chat</span>}
                </Button>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-2 space-y-2">
                    {sessions.map((session) => (
                        <div
                            key={session.id}
                            className={cn(
                                'group flex items-center rounded-md text-sm transition-colors hover:bg-muted cursor-pointer relative',
                                !isCompact ? "justify-between px-3 py-2" : "justify-center py-3 px-0",
                                session.id === activeSessionId ? 'bg-muted font-medium' : 'text-muted-foreground'
                            )}
                            onClick={() => {
                                if (isCompact && onExpand) {
                                    onExpand();
                                }
                                onSelectSession(session.id);
                            }}
                            title={isCompact ? session.title : undefined}
                        >
                            {!isCompact ? (
                                <>
                                    <div className="flex flex-col gap-0.5 overflow-hidden">
                                        <span className="truncate">{session.title || 'Untitled Chat'}</span>
                                        <span className="text-xs text-muted-foreground/60">
                                            {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                                        </span>
                                    </div>
                                    <div className="flex gap-0.5">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onArchiveSession(session.id);
                                            }}
                                            title="Archive"
                                        >
                                            {/* Archive icon - triggers soft delete */}
                                            <Archive className="h-3 w-3 text-muted-foreground" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteSession(session.id);
                                            }}
                                            title="Delete"
                                        >
                                            <Trash2 className="h-3 w-3 text-destructive" />
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center gap-1 w-full">
                                    <MessageSquare className="h-4 w-4" />
                                    <span className="text-[10px] w-full text-center truncate px-1">
                                        {session.title?.slice(0, 3) || '...'}
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}

                    {sessions.length === 0 && (
                        <div className={cn("text-center text-xs text-muted-foreground py-4", !isExpanded && "hidden")}>
                            No history
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
