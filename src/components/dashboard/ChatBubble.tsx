import { DataStreamProvider } from '@/contexts/DataStreamContext';
import { ChatPanel } from '@/components/dashboard/chat/ChatPanel';

export type ChatCampaignContext = unknown;

export function ChatBubble({ campaignContext }: { campaignContext?: ChatCampaignContext }) {
  return (
    <DataStreamProvider>
      <ChatPanel campaignContext={campaignContext} />
    </DataStreamProvider>
  );
}
