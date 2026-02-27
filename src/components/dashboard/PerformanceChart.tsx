import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useGoogleAdsReport } from '@/hooks/useGoogleAdsReport';
import { format, parseISO } from 'date-fns';
import { useState } from 'react';
import { Check } from 'lucide-react';

interface DailyData {
  date: string;
  conversions: number;
  spend: number;
  impressions: number;
  clicks: number;
}

type MetricKey = 'clicks' | 'impressions' | 'conversions' | 'spend' | 'ctr' | 'cpa';

interface MetricConfig {
  key: MetricKey;
  label: string;
  color: string;
}

const METRICS: MetricConfig[] = [
  { key: 'clicks', label: 'Clicks', color: '#22c55e' },
  { key: 'impressions', label: 'Impressions', color: '#3b82f6' },
  { key: 'conversions', label: 'Conversions', color: '#a855f7' },
  { key: 'spend', label: 'Cost', color: '#f97316' },
  { key: 'ctr', label: 'CTR', color: '#14b8a6' },
  { key: 'cpa', label: 'CPA', color: '#ec4899' },
];

const CURRENCY_METRICS: MetricKey[] = ['spend', 'cpa'];

function isMetricKey(value: string): value is MetricKey {
  return METRICS.some((metric) => metric.key === value);
}

export function PerformanceChart() {
  const { data: rawData, isLoading } = useGoogleAdsReport<DailyData[]>('daily_performance');
  const [enabledMetrics, setEnabledMetrics] = useState<MetricKey[]>(['clicks', 'impressions', 'conversions', 'spend']);

  const toggleMetric = (key: MetricKey) => {
    setEnabledMetrics(prev => 
      prev.includes(key) 
        ? prev.filter(m => m !== key)
        : [...prev, key]
    );
  };

  const chartData = (rawData || []).map((d) => {
    const clicks = d.clicks || 0;
    const conversions = d.conversions || 0;
    const impressions = d.impressions || 0;
    const spend = d.spend || 0;
    
    return {
      ...d,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      cpa: conversions > 0 ? spend / conversions : 0,
      date: (() => {
        try { return format(parseISO(d.date), 'MMM d'); } catch { return d.date; }
      })(),
    };
  });

  const formatMetricValue = (metric: MetricKey | null, value: number) => {
    if (metric && CURRENCY_METRICS.includes(metric)) {
      return `$${value.toFixed(2)}`;
    }

    if (metric === 'ctr') {
      return `${value.toFixed(2)}%`;
    }

    return Number.isInteger(value) ? value.toString() : value.toFixed(2);
  };

  const allEnabledAreCurrency = enabledMetrics.length > 0 && enabledMetrics.every((metric) => CURRENCY_METRICS.includes(metric));

  const renderArea = (metric: MetricConfig) => {
    if (!enabledMetrics.includes(metric.key)) return null;
    
    return (
      <Area
        key={metric.key}
        type="monotone"
        dataKey={metric.key}
        stroke={metric.color}
        strokeWidth={2}
        fillOpacity={1}
        fill={`url(#color${metric.label})`}
        name={metric.label}
      />
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Performance Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-4">
          {METRICS.map((metric) => (
            <Button
              key={metric.key}
              variant={enabledMetrics.includes(metric.key) ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleMetric(metric.key)}
              className="h-8 gap-1.5 text-xs font-medium"
              style={enabledMetrics.includes(metric.key) ? { backgroundColor: metric.color, borderColor: metric.color } : { borderColor: metric.color, color: metric.color }}
            >
              <Check className={`h-3 w-3 ${enabledMetrics.includes(metric.key) ? 'opacity-100' : 'opacity-0'}`} />
              {metric.label}
            </Button>
          ))}
        </div>
        <div className="h-[280px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Skeleton className="h-full w-full rounded-lg" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              No performance data for this period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  {METRICS.map((metric) => (
                    <linearGradient key={metric.key} id={`color${metric.label}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={metric.color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={metric.color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  className="text-xs fill-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  className="text-xs fill-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => {
                    const numericValue = Number(value) || 0;
                    if (allEnabledAreCurrency) {
                      return `$${numericValue.toFixed(0)}`;
                    }
                    return numericValue.toString();
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value, _name, item) => {
                    const numericValue = typeof value === 'number' ? value : Number(value);
                    const dataKey = typeof item?.dataKey === 'string' && isMetricKey(item.dataKey) ? item.dataKey : null;
                    const label = dataKey ? METRICS.find((metric) => metric.key === dataKey)?.label || _name : _name;
                    return [formatMetricValue(dataKey, Number.isFinite(numericValue) ? numericValue : 0), label];
                  }}
                />
                {METRICS.map(renderArea)}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
