import { BarChart3, DollarSign, FilterX, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { suggestedActions } from '@/types/chat';

const iconMap = {
    BarChart3,
    Search,
    FilterX,
    DollarSign,
};

interface SuggestedActionsProps {
    onActionClick: (prompt: string) => void;
    className?: string;
}

export function SuggestedActions({ onActionClick, className }: SuggestedActionsProps) {
    return (
        <div className={cn('flex flex-wrap gap-2', className)}>
            {suggestedActions.map((action, index) => {
                const Icon = iconMap[action.icon];
                return (
                    <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="h-auto flex-col items-start gap-1 py-2 px-3 text-left"
                        onClick={() => onActionClick(action.prompt)}
                    >
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            {Icon && <Icon className="size-3" />}
                            {action.label}
                        </span>
                    </Button>
                );
            })}
        </div>
    );
}
