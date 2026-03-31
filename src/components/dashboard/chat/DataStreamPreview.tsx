import { Badge } from '@/components/ui/badge';
import { useDataStream } from '@/contexts/DataStreamContext';

export function DataStreamPreview() {
  const { dataStream } = useDataStream();

  if (dataStream.length === 0) {
    return null;
  }

  const latest = dataStream.slice(-3);

  return (
    <div className="border-b bg-muted/20 px-4 py-2 flex flex-wrap gap-2 text-xs">
      {latest.map((part) => (
        <Badge key={part.id} variant="secondary" className="font-normal">
          {part.type === 'status' ? part.label : `${part.type}: ${'toolName' in part ? part.toolName : ''}`}
        </Badge>
      ))}
    </div>
  );
}
