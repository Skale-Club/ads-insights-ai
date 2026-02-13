import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { matchTypeBadgeClass } from '@/lib/googleAdsUi';

export interface Keyword {
  id: string;
  keyword: string;
  matchType: 'exact' | 'phrase' | 'broad';
  status: 'enabled' | 'paused' | 'removed';
  impressions: number;
  clicks: number;
  ctr: number;
  avgCpc: number;
  cost: number;
  conversions: number;
  cpa: number;
  conversionRate: number;
  qualityScore?: number;
  searchImpressionShare?: number;
}

interface KeywordHighlightsProps {
  keywords: Keyword[];
  type: 'best' | 'worst';
}

export function KeywordHighlights({ keywords, type }: KeywordHighlightsProps) {
  const title = type === 'best' ? 'Best Performing Keywords' : 'Keywords Needing Attention';
  const description =
    type === 'best'
      ? 'Top performers by conversions and efficiency'
      : 'High spend with low returns or poor CTR';
  const Icon = type === 'best' ? TrendingUp : AlertCircle;
  const iconColor = type === 'best' ? 'text-success' : 'text-warning';

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-5 w-5', iconColor)} />
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {keywords.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No data available for the selected period
          </p>
        ) : (
          keywords.map((kw) => (
            <div
              key={kw.id}
              className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{kw.keyword}</p>
                  <Badge variant="outline" className={cn('text-xs capitalize', matchTypeBadgeClass(kw.matchType))}>
                    {kw.matchType}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  <span>{kw.conversions} conv.</span>
                  <span>{kw.ctr.toFixed(2)}% CTR</span>
                  {kw.qualityScore && <span>QS: {kw.qualityScore}/10</span>}
                </div>
              </div>
              <div className="text-right ml-4">
                <p className="font-semibold">{formatCurrency(kw.cost)}</p>
                <p className={cn('text-sm', type === 'best' ? 'text-success' : 'text-warning')}>
                  {formatCurrency(kw.cpa)} CPA
                </p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
