import { useState } from 'react';
import { ChevronUp, ChevronDown, ImageOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMetaReport } from '@/hooks/useMetaReport';

interface Ad {
  id: string;
  name: string;
  adsetId: string;
  status: string;
  title: string;
  body: string;
  imageUrl: string | null;
  spend: number;
  impressions: number;
  ctr: number;
  cpc: number;
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

type SortKey = keyof Ad;

export default function MetaAdsPage() {
  const { data: ads, isLoading } = useMetaReport<Ad[]>('ads');
  const [sortKey, setSortKey] = useState<SortKey>('spend');
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = [...(ads ?? [])].sort((a, b) => {
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
      <h1 className="text-2xl font-bold tracking-tight">Meta Ads</h1>

      <Card>
        <CardHeader><CardTitle>All Ads ({sorted.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs uppercase tracking-wide">
                    <th className="text-left py-2 pr-4 w-12">Creative</th>
                    <th className="text-left py-2 pr-4">Headline / Body</th>
                    <th className="text-left py-2 pr-4">Status</th>
                    <th className={thCls} onClick={() => handleSort('spend')}>Spend <SortIcon k="spend" /></th>
                    <th className={thCls} onClick={() => handleSort('impressions')}>Impr. <SortIcon k="impressions" /></th>
                    <th className={thCls} onClick={() => handleSort('ctr')}>CTR <SortIcon k="ctr" /></th>
                    <th className={thCls} onClick={() => handleSort('cpc')}>CPC <SortIcon k="cpc" /></th>
                    <th className={thCls} onClick={() => handleSort('roas')}>ROAS <SortIcon k="roas" /></th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((ad) => (
                    <tr key={ad.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2 pr-4">
                        {ad.imageUrl ? (
                          <img
                            src={ad.imageUrl}
                            alt={ad.title}
                            className="h-10 w-10 rounded object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                            <ImageOff className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        {ad.title && <div className="font-medium truncate max-w-[200px]">{ad.title}</div>}
                        {ad.body && <div className="text-xs text-muted-foreground truncate max-w-[200px]">{ad.body}</div>}
                        {!ad.title && !ad.body && <span className="text-muted-foreground">{ad.name}</span>}
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant={statusVariant[ad.status] ?? 'outline'}>{ad.status}</Badge>
                      </td>
                      <td className="text-right py-2 pr-4">{fmt(ad.spend, 'currency')}</td>
                      <td className="text-right py-2 pr-4">{fmt(ad.impressions)}</td>
                      <td className="text-right py-2 pr-4">{fmt(ad.ctr, 'percent')}</td>
                      <td className="text-right py-2 pr-4">{fmt(ad.cpc, 'currency')}</td>
                      <td className="text-right py-2">{fmt(ad.roas, 'roas')}</td>
                    </tr>
                  ))}
                  {sorted.length === 0 && (
                    <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No ads found</td></tr>
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
