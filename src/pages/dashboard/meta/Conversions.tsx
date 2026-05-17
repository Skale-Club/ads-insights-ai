import { useMemo } from 'react';
import { Target, ShoppingCart, UserPlus, MousePointer, Eye, Zap, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useMetaReport } from '@/hooks/useMetaReport';
import { useDashboard } from '@/contexts/DashboardContext';
import { cn } from '@/lib/utils';

interface ConversionsResponse {
  perCampaign: Array<{
    id: string;
    campaignId: string;
    campaignName: string;
    spend: number;
    impressions: number;
    clicks: number;
    purchases: number;
    leads: number;
    addToCart: number;
    purchaseValue: number;
    costPerPurchase: number;
    roas: number;
  }>;
  totals: {
    spend: number;
    impressions: number;
    clicks: number;
    addToCart: number;
    purchases: number;
    leads: number;
    purchaseValue: number;
    costPerPurchase: number;
    conversionRate: number;
    roas: number;
  };
}

interface PixelEvent {
  id: string;
  actionType: string;
  count: number;
  value: number;
  costPerAction: number;
  roas: number;
}

function fmt(n: number, type: 'currency' | 'number' | 'percent' | 'roas' = 'number'): string {
  if (type === 'currency') return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (type === 'percent') return `${n.toFixed(2)}%`;
  if (type === 'roas') return `${n.toFixed(2)}x`;
  return n.toLocaleString('en-US');
}

const ACTION_TYPE_LABELS: Record<string, string> = {
  'offsite_conversion.fb_pixel_purchase': 'Purchase',
  'offsite_conversion.fb_pixel_lead': 'Lead',
  'offsite_conversion.fb_pixel_add_to_cart': 'Add to Cart',
  'offsite_conversion.fb_pixel_view_content': 'View Content',
  'offsite_conversion.fb_pixel_initiate_checkout': 'Initiate Checkout',
  'offsite_conversion.fb_pixel_complete_registration': 'Complete Registration',
  'page_engagement': 'Page Engagement',
  'link_click': 'Link Click',
  'landing_page_view': 'Landing Page View',
};

function prettyActionType(s: string): string {
  if (ACTION_TYPE_LABELS[s]) return ACTION_TYPE_LABELS[s];
  const stripped = s.replace('offsite_conversion.fb_pixel_', '');
  return stripped
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getEventIcon(actionType: string) {
  const lower = actionType.toLowerCase();
  if (lower.includes('purchase') || lower.includes('add_to_cart') || lower.includes('checkout')) {
    return ShoppingCart;
  }
  if (lower.includes('lead') || lower.includes('registration')) {
    return UserPlus;
  }
  if (lower.includes('view_content') || lower.includes('landing_page')) {
    return Eye;
  }
  if (lower.includes('link_click')) {
    return MousePointer;
  }
  return Target;
}

type SortKey = keyof ConversionsResponse['perCampaign'][number];

export default function MetaConversionsPage() {
  const { selectedMetaAccount } = useDashboard();
  const { data: conv, isLoading: cLoading, error: cError } = useMetaReport<ConversionsResponse>('conversions');
  const { data: events, isLoading: eLoading, error: eError } = useMetaReport<PixelEvent[]>('pixel-events');

  const isLoading = cLoading || eLoading;

  const sortedCampaigns = useMemo(() => {
    if (!conv?.perCampaign) return [];
    return [...conv.perCampaign].sort((a, b) => b.purchases - a.purchases);
  }, [conv]);

  const totals = conv?.totals;

  const funnelStages = useMemo(() => {
    if (!totals) return [];
    const impr = totals.impressions || 1;
    return [
      { label: 'Impressions', count: totals.impressions, pct: 100 },
      { label: 'Clicks', count: totals.clicks, pct: Math.min(100, (totals.clicks / impr) * 100) },
      { label: 'Add to Cart', count: totals.addToCart, pct: Math.min(100, (totals.addToCart / impr) * 100) },
      { label: 'Purchases', count: totals.purchases, pct: Math.min(100, (totals.purchases / impr) * 100) },
      { label: 'Leads', count: totals.leads, pct: Math.min(100, (totals.leads / impr) * 100) },
    ];
  }, [totals]);

  if (!selectedMetaAccount) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <Target className="h-12 w-12 text-muted-foreground" />
        <div>
          <p className="font-medium">No Meta Ads account connected</p>
          <p className="text-sm text-muted-foreground mt-1">Connect your Meta account in Settings to see conversion data.</p>
        </div>
        <Button asChild><Link to="/settings">Go to Settings</Link></Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading conversions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Conversions</h1>
        <p className="text-muted-foreground text-sm">{selectedMetaAccount.account_name}</p>
      </div>

      {(cError || eError) && (
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p className="text-sm">{(cError as Error)?.message || (eError as Error)?.message || 'Failed to load conversion data.'}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Funnel Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Conversion Funnel
          </CardTitle>
          <CardDescription>Impression-to-conversion drop-off across the funnel</CardDescription>
        </CardHeader>
        <CardContent>
          {!totals ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <div className="space-y-4">
              {funnelStages.map((stage) => (
                <div key={stage.label} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{stage.label}</span>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span>{fmt(stage.count)}</span>
                      <span className="w-14 text-right">{stage.pct.toFixed(2)}%</span>
                    </div>
                  </div>
                  <Progress value={stage.pct} className="h-2" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPI Grid */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Purchases</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmt(totals?.purchases ?? 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">{(totals?.conversionRate ?? 0).toFixed(2)}% conv. rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cost / Purchase</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmt(totals?.costPerPurchase ?? 0, 'currency')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Purchase Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmt(totals?.purchaseValue ?? 0, 'currency')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">ROAS</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn(
              'text-2xl font-bold',
              (totals?.roas ?? 0) >= 2 && 'text-success',
              (totals?.roas ?? 0) < 1 && (totals?.roas ?? 0) > 0 && 'text-destructive'
            )}>
              {fmt(totals?.roas ?? 0, 'roas')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Per-Campaign Conversions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Conversions by Campaign</CardTitle>
          <CardDescription>Sorted by purchases (highest first)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-xs uppercase tracking-wide">
                  <th className="text-left py-2 pr-4">Campaign</th>
                  <th className="text-right py-2 pr-4">Spend</th>
                  <th className="text-right py-2 pr-4">Impr.</th>
                  <th className="text-right py-2 pr-4">Clicks</th>
                  <th className="text-right py-2 pr-4">Add to Cart</th>
                  <th className="text-right py-2 pr-4">Purchases</th>
                  <th className="text-right py-2 pr-4">Leads</th>
                  <th className="text-right py-2 pr-4">Cost/Purchase</th>
                  <th className="text-right py-2">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {sortedCampaigns.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-2 pr-4 font-medium max-w-[200px] truncate">{c.campaignName}</td>
                    <td className="text-right py-2 pr-4">{fmt(c.spend, 'currency')}</td>
                    <td className="text-right py-2 pr-4">{fmt(c.impressions)}</td>
                    <td className="text-right py-2 pr-4">{fmt(c.clicks)}</td>
                    <td className="text-right py-2 pr-4">{fmt(c.addToCart)}</td>
                    <td className="text-right py-2 pr-4 font-semibold">{fmt(c.purchases)}</td>
                    <td className="text-right py-2 pr-4">{fmt(c.leads)}</td>
                    <td className="text-right py-2 pr-4">
                      {c.costPerPurchase > 0 ? fmt(c.costPerPurchase, 'currency') : '-'}
                    </td>
                    <td className="text-right py-2">
                      <span className={cn(
                        'font-semibold',
                        c.roas >= 2 && 'text-success',
                        c.roas < 1 && c.roas > 0 && 'text-destructive'
                      )}>
                        {c.roas > 0 ? fmt(c.roas, 'roas') : '-'}
                      </span>
                    </td>
                  </tr>
                ))}
                {sortedCampaigns.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-muted-foreground">
                      No campaign conversion data
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pixel Events List */}
      <Card>
        <CardHeader>
          <CardTitle>Pixel Events</CardTitle>
          <CardDescription>Events received from your Meta Pixel and conversion API</CardDescription>
        </CardHeader>
        <CardContent>
          {!events || events.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No pixel events captured. Verify your Meta Pixel is installed.
            </p>
          ) : (
            <div className="space-y-3">
              {events.map((e) => {
                const Icon = getEventIcon(e.actionType);
                return (
                  <div key={e.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{prettyActionType(e.actionType)}</p>
                      <p className="text-xs text-muted-foreground font-mono">{e.actionType}</p>
                    </div>
                    <div className="text-right shrink-0 space-y-0.5">
                      <p className="text-sm font-semibold">{fmt(e.count)} events</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {e.value > 0 && <span>Value: {fmt(e.value, 'currency')}</span>}
                        {e.costPerAction > 0 && <span>CPA: {fmt(e.costPerAction, 'currency')}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
