import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, Loader2 } from 'lucide-react';
import { DataTable } from '@/components/dashboard/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboard } from '@/contexts/DashboardContext';
import { useGoogleAdsReport } from '@/hooks/useGoogleAdsReport';
import { cn } from '@/lib/utils';

interface Ad {
  id: string;
  name: string;
  adGroup: string;
  campaign: string;
  type: string;
  status: string;
  impressions: number;
  clicks: number;
  ctr: number;
  cost: number;
  conversions: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);

const formatNumber = (value: number) =>
  new Intl.NumberFormat('en-US').format(value);

export default function AdsPage() {
  const { selectedAccount } = useDashboard();
  const { data, isLoading } = useGoogleAdsReport<Ad[]>('ads');
  const adData = (data as Ad[] | undefined) || [];

  const stats = useMemo(() => {
    const totalCost = adData.reduce((sum, ad) => sum + ad.cost, 0);
    const totalClicks = adData.reduce((sum, ad) => sum + ad.clicks, 0);
    const totalConversions = adData.reduce((sum, ad) => sum + ad.conversions, 0);
    const avgCtr = adData.length > 0 ? adData.reduce((sum, ad) => sum + ad.ctr, 0) / adData.length : 0;
    return { totalCost, totalClicks, totalConversions, avgCtr, total: adData.length };
  }, [adData]);

  const columns: ColumnDef<Ad>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            Ad
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="max-w-[250px]">
            <p className="font-medium truncate">{row.getValue('name')}</p>
            <p className="text-xs text-muted-foreground truncate">{row.original.adGroup}</p>
          </div>
        ),
      },
      {
        accessorKey: 'type',
        header: ({ column }) => (
          <div className="text-center">
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
              Type
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ),
        cell: ({ row }) => (
          <div className="text-center">
            <Badge variant="outline">{row.getValue('type')}</Badge>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: ({ column }) => (
          <div className="text-center">
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
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
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
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
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
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
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
              CTR
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ),
        cell: ({ row }) => <div className="text-center">{`${(row.getValue('ctr') as number).toFixed(2)}%`}</div>,
      },
      {
        accessorKey: 'cost',
        header: ({ column }) => (
          <div className="text-center">
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
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
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
              Conv.
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ),
        cell: ({ row }) => <div className="text-center">{row.getValue('conversions')}</div>,
      },
    ],
    []
  );

  if (!selectedAccount) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Please select an account to view ads</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading ads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ads</h1>
        <p className="text-muted-foreground">
          View and analyze individual ad performance
        </p>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Ads</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(stats.totalCost)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg CTR</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.avgCtr.toFixed(2)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalConversions}</p>
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={adData}
        searchColumn="name"
        searchPlaceholder="Search ads..."
      />
    </div>
  );
}
