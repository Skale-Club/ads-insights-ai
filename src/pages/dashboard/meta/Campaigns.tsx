import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMetaReport } from '@/hooks/useMetaReport';

interface Campaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  budgetType: string;
  budget: number;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  roas: number;
  results: number;
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

type SortKey = keyof Campaign;

export default function MetaCampaignsPage() {
  const { data: campaigns, isLoading } = useMetaReport<Campaign[]>('campaigns');
  const [sortKey, setSortKey] = useState<SortKey>('spend');
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = [...(campaigns ?? [])].sort((a, b) => {
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
      <h1 className="text-2xl font-bold tracking-tight">Meta Campaigns</h1>

      <Card>
        <CardHeader><CardTitle>All Campaigns ({sorted.length})</CardTitle></CardHeader>
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
                    <th className="text-left py-2 pr-4">Objective</th>
                    <th className="text-right py-2 pr-4">Budget</th>
                    <th className={thCls} onClick={() => handleSort('spend')}>Spend <SortIcon k="spend" /></th>
                    <th className={thCls} onClick={() => handleSort('impressions')}>Impr. <SortIcon k="impressions" /></th>
                    <th className={thCls} onClick={() => handleSort('ctr')}>CTR <SortIcon k="ctr" /></th>
                    <th className={thCls} onClick={() => handleSort('roas')}>ROAS <SortIcon k="roas" /></th>
                    <th className={thCls} onClick={() => handleSort('results')}>Results <SortIcon k="results" /></th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((c) => (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2 pr-4 font-medium max-w-[200px] truncate">{c.name}</td>
                      <td className="py-2 pr-4">
                        <Badge variant={statusVariant[c.status] ?? 'outline'}>{c.status}</Badge>
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground text-xs">{c.objective?.replace(/_/g, ' ')}</td>
                      <td className="text-right py-2 pr-4">
                        <span className="text-xs text-muted-foreground capitalize">{c.budgetType} </span>
                        {fmt(c.budget, 'currency')}
                      </td>
                      <td className="text-right py-2 pr-4">{fmt(c.spend, 'currency')}</td>
                      <td className="text-right py-2 pr-4">{fmt(c.impressions)}</td>
                      <td className="text-right py-2 pr-4">{fmt(c.ctr, 'percent')}</td>
                      <td className="text-right py-2 pr-4">{fmt(c.roas, 'roas')}</td>
                      <td className="text-right py-2">{fmt(c.results)}</td>
                    </tr>
                  ))}
                  {sorted.length === 0 && (
                    <tr><td colSpan={9} className="py-8 text-center text-muted-foreground">No campaigns found</td></tr>
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
