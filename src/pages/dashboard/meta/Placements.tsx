import { useMemo } from 'react';
import { Facebook, Instagram, MessageCircle, Globe, Loader2, DollarSign, Eye, Target, LayoutGrid } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useMetaReport } from '@/hooks/useMetaReport';
import { useDashboard } from '@/contexts/DashboardContext';

interface PlacementRow {
  id: string;
  publisherPlatform: string;
  platformPosition: string;
  impressionDevice: string;
  placementLabel: string;
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
  cpc: number;
  reach: number;
  frequency: number;
  conversions: number;
  roas: number;
}

function fmt(n: number, type: 'currency' | 'number' | 'percent' | 'roas' = 'number'): string {
  if (type === 'currency') return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (type === 'percent') return `${n.toFixed(2)}%`;
  if (type === 'roas') return `${n.toFixed(2)}x`;
  return n.toLocaleString('en-US');
}

const platformIcon: Record<string, typeof Facebook> = {
  facebook: Facebook,
  instagram: Instagram,
  messenger: MessageCircle,
  audience_network: Globe,
};

const platformLabel: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  messenger: 'Messenger',
  audience_network: 'Audience Network',
};

function PlatformBadge({ platform }: { platform: string }) {
  const Icon = platformIcon[platform] ?? Globe;
  const label = platformLabel[platform] ?? platform.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-5 w-5 text-muted-foreground" />
      <span className="text-base font-semibold">{label}</span>
    </div>
  );
}

function capitalize(str: string): string {
  return str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function MetaPlacementsPage() {
  const { selectedMetaAccount } = useDashboard();
  const { data: rows, isLoading, error } = useMetaReport<PlacementRow[]>('placements');
  const placements = rows ?? [];

  const grouped = useMemo(() => {
    const map = new Map<string, PlacementRow[]>();
    for (const row of placements) {
      const key = row.publisherPlatform;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }

    const groups = Array.from(map.entries()).map(([platform, items]) => {
      const sortedItems = [...items].sort((a, b) => b.spend - a.spend);
      const totalSpend = items.reduce((sum, r) => sum + r.spend, 0);
      const totalImpressions = items.reduce((sum, r) => sum + r.impressions, 0);
      const totalConversions = items.reduce((sum, r) => sum + r.conversions, 0);
      return { platform, items: sortedItems, totalSpend, totalImpressions, totalConversions };
    });

    return groups.sort((a, b) => b.totalSpend - a.totalSpend);
  }, [placements]);

  const totals = useMemo(() => ({
    spend: placements.reduce((sum, r) => sum + r.spend, 0),
    impressions: placements.reduce((sum, r) => sum + r.impressions, 0),
    clicks: placements.reduce((sum, r) => sum + r.clicks, 0),
    conversions: placements.reduce((sum, r) => sum + r.conversions, 0),
    placementCount: placements.length,
  }), [placements]);

  if (!selectedMetaAccount) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <Globe className="h-12 w-12 text-muted-foreground" />
        <div>
          <p className="font-medium">No Meta Ads account connected</p>
          <p className="text-sm text-muted-foreground mt-1">Connect your Meta account in Settings to get started.</p>
        </div>
        <Button asChild><Link to="/settings">Go to Settings</Link></Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading placements...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Placements</h1>
        <p className="text-muted-foreground text-sm">{selectedMetaAccount.account_name}</p>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-4">
            <p className="text-sm text-destructive font-medium">Error loading placements</p>
            <p className="text-xs text-muted-foreground mt-1">{(error as Error).message}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(totals.spend, 'currency')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Impressions</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(totals.impressions)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conversions</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(totals.conversions)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Placements</CardTitle>
            <LayoutGrid className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.placementCount}</div>
          </CardContent>
        </Card>
      </div>

      {grouped.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <LayoutGrid className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No placement data for this period</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your date range or check your Meta account connection.</p>
          </CardContent>
        </Card>
      ) : (
        grouped.map((group) => (
          <Card key={group.platform}>
            <CardHeader className="flex flex-row items-center justify-between">
              <PlatformBadge platform={group.platform} />
              <CardDescription className="text-sm">
                {fmt(group.totalSpend, 'currency')} spent · {fmt(group.totalConversions)} conv.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground text-xs uppercase tracking-wide">
                      <th className="text-left py-2 pr-4">Position</th>
                      <th className="text-left py-2 pr-4">Device</th>
                      <th className="text-right py-2 pr-4">Impr.</th>
                      <th className="text-right py-2 pr-4">Reach</th>
                      <th className="text-right py-2 pr-4">Freq.</th>
                      <th className="text-right py-2 pr-4">CTR</th>
                      <th className="text-right py-2 pr-4">CPC</th>
                      <th className="text-right py-2 pr-4">Spend</th>
                      <th className="text-right py-2 pr-4">Conv.</th>
                      <th className="text-right py-2">ROAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((r) => (
                      <tr key={`${r.platformPosition}-${r.impressionDevice}`} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2 pr-4 font-medium">{capitalize(r.platformPosition)}</td>
                        <td className="py-2 pr-4 text-muted-foreground text-xs">{capitalize(r.impressionDevice)}</td>
                        <td className="text-right py-2 pr-4">{fmt(r.impressions)}</td>
                        <td className="text-right py-2 pr-4">{fmt(r.reach)}</td>
                        <td className="text-right py-2 pr-4">{r.frequency.toFixed(2)}</td>
                        <td className="text-right py-2 pr-4">{fmt(r.ctr, 'percent')}</td>
                        <td className="text-right py-2 pr-4">{fmt(r.cpc, 'currency')}</td>
                        <td className="text-right py-2 pr-4">{fmt(r.spend, 'currency')}</td>
                        <td className="text-right py-2 pr-4">{fmt(r.conversions)}</td>
                        <td className="text-right py-2">{r.roas === 0 ? '-' : fmt(r.roas, 'roas')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
