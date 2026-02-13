import { useMemo, useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, Pause, Play, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { DataTable } from '@/components/dashboard/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDashboard } from '@/contexts/DashboardContext';
import { useAuth } from '@/contexts/AuthContext';
import { useGoogleAdsReport } from '@/hooks/useGoogleAdsReport';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Campaign {
  id: string;
  name: string;
  status: 'enabled' | 'paused' | 'removed';
  type: string;
  budget: number;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  cpa: number;
  roas?: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);

const formatNumber = (value: number) =>
  new Intl.NumberFormat('en-US').format(value);

export default function CampaignsPage() {
  const { selectedAccount } = useDashboard();
  const { providerToken } = useAuth();
  const { data: campaigns, isLoading } = useGoogleAdsReport<Campaign[]>('campaigns');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const campaignData = campaigns || [];

  const handleToggleStatus = async (campaign: Campaign) => {
    const token = providerToken || sessionStorage.getItem('google_provider_token');
    if (!token || !selectedAccount) return;

    const newStatus = campaign.status === 'enabled' ? 'PAUSED' : 'ENABLED';
    setTogglingId(campaign.id);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('google-ads-mutate', {
        body: {
          providerToken: token,
          customerId: selectedAccount.id,
          action: 'updateCampaignStatus',
          campaignId: campaign.id,
          newStatus,
        },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      toast({
        title: 'Campaign updated',
        description: `"${campaign.name}" is now ${newStatus.toLowerCase()}.`,
      });

      // Refetch campaigns data
      queryClient.invalidateQueries({ queryKey: ['google-ads', 'campaigns'] });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast({
        title: 'Failed to update campaign',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setTogglingId(null);
    }
  };

  const columns: ColumnDef<Campaign>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            Campaign
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.getValue('name')}</p>
            <Badge variant="secondary" className="mt-1 text-xs capitalize">
              {row.original.type}
            </Badge>
          </div>
        ),
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
          const campaign = row.original;
          const isToggling = togglingId === campaign.id;
          const canToggle = campaign.status !== 'removed';

          return (
            <div className="text-center">
              <Button
                variant="ghost"
                size="sm"
                className="p-0 h-auto hover:bg-transparent"
                disabled={!canToggle || isToggling}
                onClick={() => handleToggleStatus(campaign)}
                title={canToggle ? `Click to ${campaign.status === 'enabled' ? 'pause' : 'enable'}` : ''}
              >
                <Badge
                  variant={campaign.status === 'enabled' ? 'default' : 'secondary'}
                  className={cn(
                    'cursor-pointer transition-opacity',
                    campaign.status === 'enabled' && 'bg-success hover:bg-success/90',
                    campaign.status === 'paused' && 'bg-warning hover:bg-warning/90',
                    isToggling && 'opacity-70'
                  )}
                >
                  {isToggling ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : campaign.status === 'enabled' ? (
                    <Play className="mr-1 h-3 w-3" />
                  ) : (
                    <Pause className="mr-1 h-3 w-3" />
                  )}
                  {isToggling
                    ? (campaign.status === 'enabled' ? 'Pausing...' : 'Enabling...')
                    : campaign.status}
                </Badge>
              </Button>
            </div>
          );
        },
      },
      {
        accessorKey: 'budget',
        header: ({ column }) => (
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              Budget
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ),
        cell: ({ row }) => <div className="text-center">{formatCurrency(row.getValue('budget'))}</div>,
      },
      {
        accessorKey: 'spend',
        header: ({ column }) => (
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              Spend
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ),
        cell: ({ row }) => <div className="text-center">{formatCurrency(row.getValue('spend'))}</div>,
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
        cell: ({ row }) => <div className="text-center">{formatNumber(row.getValue('conversions'))}</div>,
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
        accessorKey: 'roas',
        header: ({ column }) => (
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              ROAS
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ),
        cell: ({ row }) => {
          const roas = row.original.roas;
          return <div className="text-center">{roas ? `${roas.toFixed(1)}x` : '-'}</div>;
        },
      },
    ],
    [togglingId]
  );

  const handleExport = () => {
    const csv = [
      ['Campaign', 'Status', 'Type', 'Budget', 'Spend', 'Impressions', 'Clicks', 'CTR', 'Conversions', 'CPA', 'ROAS'],
      ...campaignData.map((c) => [
        c.name,
        c.status,
        c.type,
        c.budget,
        c.spend,
        c.impressions,
        c.clicks,
        c.ctr,
        c.conversions,
        c.cpa,
        c.roas || '',
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'campaigns.csv';
    a.click();
  };

  if (!selectedAccount) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Please select an account to view campaigns</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading campaigns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
        <p className="text-muted-foreground">
          Manage and analyze your campaign performance
        </p>
      </div>

      <DataTable
        columns={columns}
        data={campaignData}
        searchColumn="name"
        searchPlaceholder="Search campaigns..."
        onExport={handleExport}
      />
    </div>
  );
}
