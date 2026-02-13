import { DollarSign, Target, TrendingUp, TrendingDown, MousePointerClick } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useGoogleAdsReport } from '@/hooks/useGoogleAdsReport';

interface OverviewData {
  spend: number;
  conversions: number;
  cpa: number;
  roas: number;
}

interface HeroMetricProps {
  title: string;
  value: string;
  change: number | null;
  icon: React.ReactNode;
  reverseColors?: boolean;
  highlight?: boolean;
  loading?: boolean;
}

function HeroMetric({ title, value, change, icon, reverseColors = false, highlight = false, loading = false }: HeroMetricProps) {
  if (loading) {
    return (
      <Card className="relative overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-6 w-32" />
            </div>
            <div className="rounded-xl p-3 bg-muted">{icon}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isPositive = change !== null && change > 0;
  const isGood = change !== null ? (reverseColors ? !isPositive : isPositive) : true;

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all hover:shadow-lg",
      highlight && "ring-2 ring-primary/20 bg-gradient-to-br from-primary/5 to-transparent"
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {change !== null ? (
              <div className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                isGood
                  ? "bg-success/10 text-success"
                  : "bg-destructive/10 text-destructive"
              )}>
                {isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {Math.abs(change).toFixed(1)}% vs last period
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-muted text-muted-foreground">
                No previous data
              </div>
            )}
          </div>
          <div className={cn(
            "rounded-xl p-3",
            highlight ? "bg-primary text-primary-foreground" : "bg-muted"
          )}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function calcChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function HeroMetrics() {
  const { data: current, isLoading: loadingCurrent } = useGoogleAdsReport<OverviewData>('overview');
  const { data: previous, isLoading: loadingPrevious } = useGoogleAdsReport<OverviewData>('overview', { usePreviousPeriod: true });

  const loading = loadingCurrent || loadingPrevious;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  const spend = current?.spend ?? 0;
  const conversions = current?.conversions ?? 0;
  const cpa = current?.cpa ?? 0;
  const roas = current?.roas ?? 0;

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
      <HeroMetric
        title="Total Spend"
        value={formatCurrency(spend)}
        change={previous ? calcChange(spend, previous.spend) : null}
        icon={<DollarSign className="h-5 w-5" />}
        loading={loading}
      />
      <HeroMetric
        title="Conversions"
        value={conversions.toLocaleString()}
        change={previous ? calcChange(conversions, previous.conversions) : null}
        icon={<Target className="h-5 w-5" />}
        highlight
        loading={loading}
      />
      <HeroMetric
        title="Cost per Conversion"
        value={formatCurrency(cpa)}
        change={previous ? calcChange(cpa, previous.cpa) : null}
        icon={<MousePointerClick className="h-5 w-5" />}
        reverseColors
        loading={loading}
      />
      <HeroMetric
        title="ROAS"
        value={`${roas.toFixed(1)}x`}
        change={previous ? calcChange(roas, previous.roas) : null}
        icon={<TrendingUp className="h-5 w-5" />}
        loading={loading}
      />
    </div>
  );
}
