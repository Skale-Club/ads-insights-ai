import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMetaReport } from '@/hooks/useMetaReport';

interface AdSet {
  id: string;
  name: string;
  campaignId: string;
  status: string;
  targetingSummary: string;
  dailyBudget: number;
  startTime: string;
  endTime: string;
  spend: number;
  impressions: number;
  ctr: number;
  roas: number;
}

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVE: 'default',
  PAUSED: 'secondary',
  ARCHIVED: 'outline',
  DELETED: 'destructive',
};

function fmt(n: number, type: 'currency' | 'number' | 'percent' | 'roas' = 'number'): string {
  if (type === 'currency') return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (type === 'percent') return `${n.toFixed(2)}%`;
  if (type === 'roas') return `${n.toFixed(2)}x`;
  return n.toLocaleString('en-US');
}

type SortKey = keyof AdSet;

export default function MetaAdSetsPage() {
  const { data: adsets, isLoading } = useMetaReport<AdSet[]>('adsets');
  const [sortKey, setSortKey] = useState<SortKey>('spend');
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = [...(adsets ?? [])].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (typeof av === 'number' && typeof bv === 'number') return sortAsc ? av - bv : bv - av;
    return sortAsc
      ? String(av).localeCompare(String(bv))
      : String(bv).localeCompare(String(av));
  });

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? sortAsc ? <ChevronUp className="inline h-3 w-3" /> : <ChevronDown className="inline h-3 w-3" />
      : null;

  const thCls = 'text-right py-2 pr-4 cursor-pointer select-none hover:text-foreground';
  const handleSort = (k: SortKey) => {
    if (sortKey === k) setSortAsc((p) => !p);
    else { setSortKey(k); setSortAsc(false); }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight">Meta Ad Sets</h1>

      <Card>
        <CardHeader><CardTitle>All Ad Sets ({sorted.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs uppercase tracking-wide">
                    <th className="text-left py-2 pr-4">Name</th>
                    <th className="text-left py-2 pr-4">Status</th>
                    <th className="text-left py-2 pr-4">Targeting</th>
                    <th className="text-right py-2 pr-4">Daily Budget</th>
                    <th className={thCls} onClick={() => handleSort('spend')}>Spend <SortIcon k="spend" /></th>
                    <th className={thCls} onClick={() => handleSort('impressions')}>Impr. <SortIcon k="impressions" /></th>
                    <th className={thCls} onClick={() => handleSort('ctr')}>CTR <SortIcon k="ctr" /></th>
                    <th className={thCls} onClick={() => handleSort('roas')}>ROAS <SortIcon k="roas" /></th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((s) => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2 pr-4 font-medium max-w-[180px] truncate">{s.name}</td>
                      <td className="py-2 pr-4">
                        <Badge variant={statusVariant[s.status] ?? 'outline'}>{s.status}</Badge>
                      </td>
                      <td className="py-2 pr-4 text-xs text-muted-foreground max-w-[160px] truncate">{s.targetingSummary}</td>
                      <td className="text-right py-2 pr-4">{s.dailyBudget ? fmt(s.dailyBudget, 'currency') : '—'}</td>
                      <td className="text-right py-2 pr-4">{fmt(s.spend, 'currency')}</td>
                      <td className="text-right py-2 pr-4">{fmt(s.impressions)}</td>
                      <td className="text-right py-2 pr-4">{fmt(s.ctr, 'percent')}</td>
                      <td className="text-right py-2">{fmt(s.roas, 'roas')}</td>
                    </tr>
                  ))}
                  {sorted.length === 0 && (
                    <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No ad sets found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
