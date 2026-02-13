import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, Loader2 } from 'lucide-react';
import { DataTable } from '@/components/dashboard/DataTable';
import { KeywordHighlights, type Keyword } from '@/components/dashboard/KeywordHighlights';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboard } from '@/contexts/DashboardContext';
import { useGoogleAdsReport } from '@/hooks/useGoogleAdsReport';
import { cn } from '@/lib/utils';
import { matchTypeBadgeClass } from '@/lib/googleAdsUi';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);

const formatNumber = (value: number) =>
  new Intl.NumberFormat('en-US').format(value);

export default function KeywordsPage() {
  const { selectedAccount } = useDashboard();
  const { data: keywords, isLoading } = useGoogleAdsReport<Keyword[]>('keywords');

  const keywordData = keywords || [];

  const bestKeywords = useMemo(
    () =>
      [...keywordData]
        .filter((k) => k.conversions > 0)
        .sort((a, b) => a.cpa - b.cpa)
        .slice(0, 5),
    [keywordData]
  );

  const worstKeywords = useMemo(
    () =>
      [...keywordData]
        .filter((k) => k.cost > 100)
        .sort((a, b) => b.cpa - a.cpa)
        .slice(0, 5),
    [keywordData]
  );

  const matchTypeStats = useMemo(() => {
    const stats = { exact: { cost: 0, conv: 0 }, phrase: { cost: 0, conv: 0 }, broad: { cost: 0, conv: 0 } };
    keywordData.forEach((k) => {
      const mt = k.matchType as keyof typeof stats;
      if (stats[mt]) {
        stats[mt].cost += k.cost;
        stats[mt].conv += k.conversions;
      }
    });
    return stats;
  }, [keywordData]);

  const columns: ColumnDef<Keyword>[] = useMemo(
    () => [
      {
        accessorKey: 'keyword',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            Keyword
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="max-w-[300px]">
            <p className="font-medium truncate">{row.getValue('keyword')}</p>
          </div>
        ),
      },
      {
        accessorKey: 'matchType',
        header: ({ column }) => (
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              Match
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ),
        cell: ({ row }) => {
          const matchType = row.getValue('matchType') as string;
          return (
            <div className="text-center">
              <Badge variant="outline" className={cn('capitalize', matchTypeBadgeClass(matchType))}>
                {matchType}
              </Badge>
            </div>
          );
        },
      },
      {
        accessorKey: 'status',
        header: ({ column }) => (
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              Status
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ),
        cell: ({ row }) => {
          const status = row.getValue('status') as string;
          return (
            <div className="text-center">
              <Badge
                variant={status === 'enabled' ? 'default' : 'secondary'}
                className={cn(
                  status === 'enabled' && 'bg-success hover:bg-success/90',
                  status === 'paused' && 'bg-warning hover:bg-warning/90'
                )}
              >
                {status}
              </Badge>
            </div>
          );
        },
      },
      {
        accessorKey: 'impressions',
        header: ({ column }) => (
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              Impr.
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ),
        cell: ({ row }) => <div className="text-center">{formatNumber(row.getValue('impressions'))}</div>,
      },
      {
        accessorKey: 'clicks',
        header: ({ column }) => (
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              Clicks
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ),
        cell: ({ row }) => <div className="text-center">{formatNumber(row.getValue('clicks'))}</div>,
      },
      {
        accessorKey: 'ctr',
        header: ({ column }) => (
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              CTR
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ),
        cell: ({ row }) => <div className="text-center">{`${(row.getValue('ctr') as number).toFixed(2)}%`}</div>,
      },
      {
        accessorKey: 'avgCpc',
        header: ({ column }) => (
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              Avg CPC
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ),
        cell: ({ row }) => <div className="text-center">{formatCurrency(row.getValue('avgCpc'))}</div>,
      },
      {
        accessorKey: 'cost',
        header: ({ column }) => (
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              Cost
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ),
        cell: ({ row }) => <div className="text-center">{formatCurrency(row.getValue('cost'))}</div>,
      },
      {
        accessorKey: 'conversions',
        header: ({ column }) => (
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              Conv.
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ),
        cell: ({ row }) => <div className="text-center">{row.getValue('conversions')}</div>,
      },
      {
        accessorKey: 'cpa',
        header: ({ column }) => (
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              CPA
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ),
        cell: ({ row }) => {
          const cpa = row.getValue('cpa') as number;
          return <div className="text-center">{cpa > 0 ? formatCurrency(cpa) : '-'}</div>;
        },
      },
      {
        accessorKey: 'qualityScore',
        header: ({ column }) => (
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              QS
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ),
        cell: ({ row }) => {
          const qs = row.original.qualityScore;
          if (!qs) return <div className="text-center">-</div>;
          return (
            <div className="text-center">
              <span
                className={cn(
                  'font-medium',
                  qs >= 7 && 'text-success',
                  qs >= 4 && qs < 7 && 'text-warning',
                  qs < 4 && 'text-destructive'
                )}
              >
                {qs}/10
              </span>
            </div>
          );
        },
      },
    ],
    []
  );

  const handleExport = () => {
    const csv = [
      ['Keyword', 'Match Type', 'Status', 'Impressions', 'Clicks', 'CTR', 'Avg CPC', 'Cost', 'Conversions', 'CPA', 'Quality Score'],
      ...keywordData.map((k) => [
        k.keyword,
        k.matchType,
        k.status,
        k.impressions,
        k.clicks,
        k.ctr,
        k.avgCpc,
        k.cost,
        k.conversions,
        k.cpa,
        k.qualityScore || '',
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'keywords.csv';
    a.click();
  };

  if (!selectedAccount) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Please select an account to view keywords</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading keywords...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Keywords</h1>
        <p className="text-muted-foreground">
          Analyze keyword performance and identify optimization opportunities
        </p>
      </div>

      {/* Match Type Breakdown */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {(['exact', 'phrase', 'broad'] as const).map((type) => (
          <Card key={type}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium capitalize">{type} Match</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-2xl font-bold truncate">{formatCurrency(matchTypeStats[type].cost)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total spend</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-semibold">{matchTypeStats[type].conv}</p>
                  <p className="text-xs text-muted-foreground mt-1">Conversions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Best & Worst Keywords */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <KeywordHighlights keywords={bestKeywords} type="best" />
        <KeywordHighlights keywords={worstKeywords} type="worst" />
      </div>

      {/* Full Keywords Table */}
      <DataTable
        columns={columns}
        data={keywordData}
        searchColumn="keyword"
        searchPlaceholder="Search keywords..."
        onExport={handleExport}
      />
    </div>
  );
}
