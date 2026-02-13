import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface KpiCardProps {
  title: string;
  value: string | number;
  previousValue?: string | number;
  change?: number;
  changeLabel?: string;
  format?: 'number' | 'currency' | 'percent';
  tooltip?: string;
  loading?: boolean;
  reverseColors?: boolean; // For metrics where lower is better (CPA, CPC)
}

export function KpiCard({
  title,
  value,
  previousValue,
  change,
  changeLabel = 'vs previous period',
  format = 'number',
  tooltip,
  loading = false,
  reverseColors = false,
}: KpiCardProps) {
  const formatValue = (val: string | number): string => {
    if (typeof val === 'string') return val;
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(val);
      case 'percent':
        return `${val.toFixed(2)}%`;
      default:
        return new Intl.NumberFormat('en-US').format(val);
    }
  };

  const getTrendIcon = () => {
    if (change === undefined || change === 0) return <Minus className="h-4 w-4" />;
    if (change > 0) return <TrendingUp className="h-4 w-4" />;
    return <TrendingDown className="h-4 w-4" />;
  };

  const getTrendColor = () => {
    if (change === undefined || change === 0) return 'text-muted-foreground';
    const isPositive = change > 0;
    const isGood = reverseColors ? !isPositive : isPositive;
    return isGood ? 'text-success' : 'text-destructive';
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-4 w-24 bg-muted rounded mb-3" />
          <div className="h-8 w-32 bg-muted rounded mb-2" />
          <div className="h-4 w-20 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const cardContent = (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-6">
        <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
        <p className="text-2xl font-bold tracking-tight">{formatValue(value)}</p>
        {change !== undefined && (
          <div className={cn('flex items-center gap-1 mt-2 text-sm', getTrendColor())}>
            {getTrendIcon()}
            <span className="font-medium">{Math.abs(change).toFixed(1)}%</span>
            <span className="text-muted-foreground ml-1">{changeLabel}</span>
          </div>
        )}
        {previousValue !== undefined && change === undefined && (
          <p className="text-sm text-muted-foreground mt-2">
            Previous: {formatValue(previousValue)}
          </p>
        )}
      </CardContent>
    </Card>
  );

  if (tooltip) {
    return (
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return cardContent;
}
