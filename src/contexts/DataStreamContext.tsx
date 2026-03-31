import { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type DataPart =
  | { id: string; type: 'status'; label: string; level?: 'info' | 'success' | 'warning' | 'error'; createdAt: string }
  | { id: string; type: 'tool-request'; toolCallId: string; toolName: string; createdAt: string }
  | { id: string; type: 'tool-result'; toolCallId: string; toolName: string; success: boolean; createdAt: string }
  | { id: string; type: 'append-message'; message: string; createdAt: string };

interface DataStreamContextValue {
  dataStream: DataPart[];
  addDataPart: (part: Omit<DataPart, 'id' | 'createdAt'>) => void;
  clearDataStream: () => void;
}

const DataStreamContext = createContext<DataStreamContextValue | undefined>(undefined);

export function DataStreamProvider({ children }: { children: React.ReactNode }) {
  const [dataStream, setDataStream] = useState<DataPart[]>([]);

  const addDataPart = useCallback((part: Omit<DataPart, 'id' | 'createdAt'>) => {
    setDataStream((current) => [
      ...current,
      {
        ...part,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      } as DataPart,
    ]);
  }, []);

  const clearDataStream = useCallback(() => {
    setDataStream([]);
  }, []);

  const value = useMemo(() => ({ dataStream, addDataPart, clearDataStream }), [dataStream, addDataPart, clearDataStream]);

  return <DataStreamContext.Provider value={value}>{children}</DataStreamContext.Provider>;
}

export function useDataStream() {
  const context = useContext(DataStreamContext);
  if (!context) {
    throw new Error('useDataStream must be used within DataStreamProvider');
  }

  return context;
}
