import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { toast } from '@/hooks/use-toast';

interface OfflineContextType {
  isOnline: boolean;
  wasOffline: boolean;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

interface OfflineProviderProps {
  children: ReactNode;
}

export function OfflineProvider({ children }: OfflineProviderProps) {
  const isOnline = useOnlineStatus();
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      toast({
        title: 'You are offline',
        description: 'Some features may not be available until you reconnect.',
        variant: 'destructive',
      });
    } else if (wasOffline) {
      toast({
        title: 'Back online',
        description: 'All features are now available.',
      });
    }
  }, [isOnline, wasOffline]);

  return (
    <OfflineContext.Provider value={{ isOnline, wasOffline }}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline(): OfflineContextType {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}