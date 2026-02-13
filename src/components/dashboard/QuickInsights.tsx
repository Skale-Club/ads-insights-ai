import { Lightbulb, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useGoogleAdsReport } from '@/hooks/useGoogleAdsReport';

interface OverviewData {
  spend: number;
  conversions: number;
  cpa: number;
  roas: number;
  impressions: number;
  clicks: number;
  ctr: number;
}

interface Insight {
  type: 'success' | 'warning' | 'info';
  title: string;
  description: string;
  metric?: string;
}

function deriveInsights(current: OverviewData | undefined, previous: OverviewData | undefined): Insight[] {
  if (!current) return [];

  const insights: Insight[] = [];

  if (previous && previous.conversions > 0) {
    const convChange = ((current.conversions - previous.conversions) / previous.conversions) * 100;
    const convDiff = current.conversions - previous.conversions;
    if (convChange > 5) {
      insights.push({
        type: 'success',
        title: `Conversions up ${convChange.toFixed(1)}%`,
        description: 'Your recent optimizations are paying off!',
        metric: `+${convDiff.toFixed(0)} conversions`,
      });
    } else if (convChange < -5) {
      insights.push({
        type: 'warning',
        title: `Conversions down ${Math.abs(convChange).toFixed(1)}%`,
        description: 'Review your campaigns for potential issues.',
        metric: `${convDiff.toFixed(0)} conversions`,
      });
    }
  }

  if (previous && previous.ctr > 0) {
    const ctrChange = current.ctr - previous.ctr;
    if (ctrChange < -0.5) {
      insights.push({
        type: 'warning',
        title: 'CTR dropped',
        description: 'Consider refreshing your ad copy.',
        metric: `${ctrChange.toFixed(1)}%`,
      });
    } else if (ctrChange > 0.5) {
      insights.push({
        type: 'success',
        title: 'CTR improved',
        description: 'Your ads are getting more clicks!',
        metric: `+${ctrChange.toFixed(1)}%`,
      });
    }
  }

  if (previous && previous.cpa > 0 && current.cpa > 0) {
    const cpaChange = ((current.cpa - previous.cpa) / previous.cpa) * 100;
    if (cpaChange < -10) {
      insights.push({
        type: 'success',
        title: 'CPA improved',
        description: `Cost per conversion decreased by ${Math.abs(cpaChange).toFixed(0)}%.`,
        metric: `$${current.cpa.toFixed(2)}`,
      });
    } else if (cpaChange > 10) {
      insights.push({
        type: 'warning',
        title: 'CPA increased',
        description: `Cost per conversion rose by ${cpaChange.toFixed(0)}%.`,
        metric: `$${current.cpa.toFixed(2)}`,
      });
    }
  }

  if (insights.length === 0) {
    insights.push({
      type: 'info',
      title: 'Performance steady',
      description: 'No significant changes detected in this period.',
      metric: `${current.conversions} conversions`,
    });
  }

  return insights.slice(0, 3);
}

function InsightIcon({ type }: { type: Insight['type'] }) {
  switch (type) {
    case 'success':
      return <CheckCircle2 className="h-4 w-4 text-success" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-warning" />;
    default:
      return <Lightbulb className="h-4 w-4 text-primary" />;
  }
}

export function QuickInsights() {
  const { data: current, isLoading: loadingCurrent } = useGoogleAdsReport<OverviewData>('overview');
  const { data: previous, isLoading: loadingPrevious } = useGoogleAdsReport<OverviewData>('overview', { usePreviousPeriod: true });

  const loading = loadingCurrent || loadingPrevious;
  const insights = deriveInsights(current, previous);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Lightbulb className="h-4 w-4 text-primary" />
          Quick Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            {insights.map((insight, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-lg border p-4 transition-colors",
                  insight.type === 'success' && "border-success/30 bg-success/5",
                  insight.type === 'warning' && "border-warning/30 bg-warning/5",
                  insight.type === 'info' && "border-primary/30 bg-primary/5"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <InsightIcon type={insight.type} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="font-medium text-sm leading-tight">{insight.title}</p>
                    <p className="text-xs text-muted-foreground">{insight.description}</p>
                    {insight.metric && (
                      <p className={cn(
                        "text-xs font-semibold mt-2",
                        insight.type === 'success' && "text-success",
                        insight.type === 'warning' && "text-warning",
                        insight.type === 'info' && "text-primary"
                      )}>
                        {insight.metric}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
