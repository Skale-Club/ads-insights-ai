import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useDashboard } from '@/contexts/DashboardContext';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { ChatBubble } from '@/components/dashboard/ChatBubble';

export function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { chatWidth } = useDashboard();

  return (
    <div className="flex h-screen bg-background">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div
        className="flex flex-1 flex-col overflow-hidden transition-[margin-right] duration-300 ease-in-out"
        style={{ marginRight: chatWidth }}
      >
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <Outlet />
        </main>
        <ChatBubble />
      </div>
    </div>
  );
}
