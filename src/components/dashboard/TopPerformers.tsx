import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, TrendingUp, TrendingDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useGoogleAdsReport } from '@/hooks/useGoogleAdsReport';

interface KeywordData {
  id: string;
  keyword: string;
  conversions: number;
  conversionRate: number;
  cpa: number;
  cost: number;
  clicks: number;
}

interface Performer {
  name: string;
  conversions: number;
  conversionRate: number;
}

function PerformerRow({ performer, variant }: { performer: Performer; variant: 'best' | 'worst' }) {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={cn(
          "rounded-full p-1.5",
          variant === 'best' ? "bg-success/10" : "bg-destructive/10"
        )}>
          {variant === 'best' ? (
            <Star className="h-3.5 w-3.5 text-success" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-destructive" />
          )}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{performer.name}</p>
          <p className="text-xs text-muted-foreground">
            {performer.conversions} conversions · {performer.conversionRate.toFixed(1)}% rate
          </p>
        </div>
      </div>
    </div>
  );
}

export function TopPerformers() {
  const { data: keywords, isLoading } = useGoogleAdsReport<KeywordData[]>('keywords');

  const topPerformers: Performer[] = (keywords || [])
    .filter((k) => k.conversions > 0)
    .sort((a, b) => b.conversions - a.conversions)
    .slice(0, 3)
    .map((k) => ({ name: k.keyword, conversions: k.conversions, conversionRate: k.conversionRate }));

  const needsAttention: Performer[] = (keywords || [])
    .filter((k) => k.cost > 0 && k.clicks > 0)
    .sort((a, b) => b.cpa - a.cpa)
    .slice(0, 3)
    .map((k) => ({ name: k.keyword, conversions: k.conversions, conversionRate: k.conversionRate }));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <TrendingUp className="h-4 w-4 text-success" />
            Top Performers
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : topPerformers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-3">No keyword data available</p>
          ) : (
            topPerformers.map((performer, i) => (
              <PerformerRow key={i} performer={performer} variant="best" />
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <TrendingDown className="h-4 w-4 text-destructive" />
            Needs Attention
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : needsAttention.length === 0 ? (
            <p className="text-sm text-muted-foreground py-3">No keyword data available</p>
          ) : (
            needsAttention.map((performer, i) => (
              <PerformerRow key={i} performer={performer} variant="worst" />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
