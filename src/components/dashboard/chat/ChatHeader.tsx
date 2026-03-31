import { MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatHeaderProps {
  showSidebar: boolean;
  onShowSidebar: () => void;
  onClose: () => void;
}

export function ChatHeader({ showSidebar, onShowSidebar, onClose }: ChatHeaderProps) {
  return (
    <div className="border-b p-4 flex flex-row items-center justify-between h-16">
      <div className="flex items-center gap-2">
        {!showSidebar && (
          <Button variant="ghost" size="icon" className="ml-1 bg-blue-100/70 hover:bg-blue-100" onClick={onShowSidebar} title="Show History">
            <MessageSquare className="h-5 w-5" />
          </Button>
        )}
        <h3 className="font-semibold text-sm">Chat with Data</h3>
      </div>

      <Button variant="ghost" size="icon" onClick={onClose} title="Close Chat">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
