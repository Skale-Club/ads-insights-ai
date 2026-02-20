import { useMemo, useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import {
  ArrowUpDown,
  Loader2,
  Target,
  MousePointerClick,
  Phone,
  ShoppingCart,
  UserPlus,
  FileDown,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Zap,
  Globe,
  Smartphone,
  BarChart3,
  Filter
} from 'lucide-react';
import { DataTable } from '@/components/dashboard/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDashboard } from '@/contexts/DashboardContext';
import { useGoogleAdsReport } from '@/hooks/useGoogleAdsReport';
import { cn } from '@/lib/utils';

interface Conversion {
  id: string;
  name: string;
  category: string;
  type: string;
  countingType: string;
  status: string;
  primaryForGoal: boolean;
  conversions: number;
  allConversions: number;
  cost: number;
  cpa: number;
  conversionRate: number;
  value: number;
  roas: number;
  hasConversions: boolean;
  campaign?: string;
  adGroup?: string;
}

interface OverviewData {
  spend: number;
  conversions: number;
  conversionsValue: number;
  impressions: number;
  clicks: number;
  cpa: number;
  roas: number;
  ctr: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);

const formatNumber = (value: number) =>
  new Intl.NumberFormat('en-US').format(value);

const categoryIcons: Record<string, React.ElementType> = {
  'Purchase': ShoppingCart,
  'Lead': UserPlus,
  'Sign Up': UserPlus,
  'Add to Cart': ShoppingCart,
  'Begin Checkout': ShoppingCart,
  'Subscribe': UserPlus,
  'Download': FileDown,
  'Page View': MousePointerClick,
  'Other': Target,
};

const typeIcons: Record<string, React.ElementType> = {
  'Website': Globe,
  'App Install': Smartphone,
  'App Action': Smartphone,
  'Phone Call': Phone,
  'Import': FileDown,
  'Analytics': BarChart3,
};

export default function ConversionsPage() {
  const { selectedAccount } = useDashboard();
  const { data, isLoading } = useGoogleAdsReport<Conversion[]>('conversions');
  const conversionData = (data as Conversion[] | undefined) || [];

  const { data: overviewData } = useGoogleAdsReport<OverviewData>('overview');

  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [selectedAdGroup, setSelectedAdGroup] = useState<string>('all');

  const campaigns = useMemo(() => {
    const uniqueCampaigns = [...new Set(conversionData.map(k => k.campaign).filter(Boolean))].sort();
    return uniqueCampaigns;
  }, [conversionData]);

  const adGroups = useMemo(() => {
    const filtered = selectedCampaign === 'all'
      ? conversionData
      : conversionData.filter(k => k.campaign === selectedCampaign);
    const uniqueAdGroups = [...new Set(filtered.map(k => k.adGroup).filter(Boolean))].sort();
    return uniqueAdGroups;
  }, [conversionData, selectedCampaign]);

  const filteredConversionData = useMemo(() => {
    let filtered = conversionData;
    if (selectedCampaign !== 'all') {
      filtered = filtered.filter(k => k.campaign === selectedCampaign || (!k.campaign && k.conversions === 0));
    }
    if (selectedAdGroup !== 'all') {
      filtered = filtered.filter(k => k.adGroup === selectedAdGroup || (!k.adGroup && k.conversions === 0));
    }

    const grouped = new Map<string, Conversion>();
    filtered.forEach(row => {
      if (!grouped.has(row.id)) {
        grouped.set(row.id, { ...row });
      } else {
        const existing = grouped.get(row.id)!;
        existing.conversions += row.conversions;
        existing.allConversions += row.allConversions;
        existing.value += row.value;
        existing.hasConversions = existing.hasConversions || row.hasConversions;
      }
    });

    return Array.from(grouped.values()).sort((a, b) => b.conversions - a.conversions);
  }, [conversionData, selectedCampaign, selectedAdGroup]);

  const handleCampaignChange = (value: string) => {
    setSelectedCampaign(value);
    setSelectedAdGroup('all');
  };

  const stats = useMemo(() => {
    const totalConversions = filteredConversionData.reduce((sum, c) => sum + c.conversions, 0);
    const totalValue = filteredConversionData.reduce((sum, c) => sum + c.value, 0);

    const overview = overviewData as OverviewData | undefined;
    const isFiltered = selectedCampaign !== 'all' || selectedAdGroup !== 'all';

    // Cost/CPA/ROAS from overview are only accurate at account level
    const totalCost = isFiltered ? 0 : (overview?.spend || 0);
    const avgCpa = isFiltered ? 0 : (overview?.cpa || (totalConversions > 0 ? totalCost / totalConversions : 0));
    const overallRoas = isFiltered ? 0 : (overview?.roas || (totalCost > 0 ? totalValue / totalCost : 0));

    const activeCount = filteredConversionData.filter(c => c.status === 'enabled').length;
    const receivingHits = filteredConversionData.filter(c => c.hasConversions).length;
    const notReceivingHits = filteredConversionData.filter(c => !c.hasConversions && c.status === 'enabled').length;
    return {
      totalConversions,
      totalCost,
      totalValue,
      avgCpa,
      overallRoas,
      activeCount,
      receivingHits,
      notReceivingHits,
      total: filteredConversionData.length
    };
  }, [filteredConversionData, overviewData, selectedCampaign, selectedAdGroup]);

  const byCategory = useMemo(() => {
    const categories: Record<string, { count: number; conversions: number; value: number }> = {};
    filteredConversionData.forEach(c => {
      const cat = c.category || 'Other';
      if (!categories[cat]) {
        categories[cat] = { count: 0, conversions: 0, value: 0 };
      }
      categories[cat].count++;
      categories[cat].conversions += c.conversions;
      categories[cat].value += c.value;
    });
    return Object.entries(categories).map(([name, data]) => ({
      name,
      ...data,
      Icon: categoryIcons[name] || Target,
    })).sort((a, b) => b.conversions - a.conversions);
  }, [conversionData]);

  const byType = useMemo(() => {
    const types: Record<string, { count: number; conversions: number; active: number }> = {};
    conversionData.forEach(c => {
      const type = c.type || 'Other';
      if (!types[type]) {
        types[type] = { count: 0, conversions: 0, active: 0 };
      }
      types[type].count++;
      types[type].conversions += c.conversions;
      if (c.status === 'enabled') types[type].active++;
    });
    return Object.entries(types).map(([name, data]) => ({
      name,
      ...data,
      Icon: typeIcons[name] || Target,
    })).sort((a, b) => b.conversions - a.conversions);
  }, [filteredConversionData]);

  const topPerformers = useMemo(() => {
    return [...filteredConversionData]
      .filter(c => c.conversions > 0)
      .sort((a, b) => b.conversions - a.conversions)
      .slice(0, 5);
  }, [filteredConversionData]);

  const needsAttention = useMemo(() => {
    return [...filteredConversionData]
      .filter(c => c.status === 'enabled' && !c.hasConversions)
      .sort((a, b) => b.cost - a.cost);
  }, [filteredConversionData]);

  const activeConversions = useMemo(() => {
    return filteredConversionData.filter(c => c.status === 'enabled');
  }, [filteredConversionData]);

  const columns: ColumnDef<Conversion>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            Conversion Action
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const Icon = categoryIcons[row.original.category] || Target;
          return (
            <div className="flex items-center gap-3 max-w-[280px]">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate">{row.getValue('name')}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{row.original.type}</span>
                  {row.original.primaryForGoal && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      Primary
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          );
        },
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
          const hasConv = row.original.hasConversions;
          return (
            <div className="flex flex-col items-center gap-1">
              <Badge
                variant={status === 'enabled' ? 'default' : 'secondary'}
                className={cn(
                  status === 'enabled' && 'bg-success hover:bg-success/90',
                  status === 'paused' && 'bg-warning hover:bg-warning/90'
                )}
              >
                {status}
              </Badge>
              {status === 'enabled' && (
                <span className={cn('text-[10px]', hasConv ? 'text-success' : 'text-warning')}>
                  {hasConv ? 'Receiving hits' : 'No hits'}
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'conversions',
        header: ({ column }) => (
          <div className="text-center">
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
              Conversions
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ),
        cell: ({ row }) => (
          <div className="text-center">
            <p className="font-semibold">{formatNumber(row.getValue('conversions'))}</p>
            <p className="text-xs text-muted-foreground">
              {row.original.conversionRate.toFixed(1)}% rate
            </p>
          </div>
        ),
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
        accessorKey: 'cpa',
        header: ({ column }) => (
          <div className="text-center">
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
              CPA
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ),
        cell: ({ row }) => {
          const cpa = row.getValue('cpa') as number;
          return <div className="text-center font-medium">{cpa > 0 ? formatCurrency(cpa) : '-'}</div>;
        },
      },
      {
        accessorKey: 'value',
        header: ({ column }) => (
          <div className="text-center">
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
              Value
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ),
        cell: ({ row }) => <div className="text-center">{formatCurrency(row.getValue('value'))}</div>,
      },
      {
        accessorKey: 'roas',
        header: ({ column }) => (
          <div className="text-center">
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
              ROAS
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ),
        cell: ({ row }) => {
          const roas = row.getValue('roas') as number;
          return (
            <div className="text-center">
              <span className={cn('font-semibold', roas >= 2 && 'text-success', roas < 1 && roas > 0 && 'text-destructive')}>
                {roas > 0 ? `${roas.toFixed(2)}x` : '-'}
              </span>
            </div>
          );
        },
      },
    ],
    []
  );

  if (!selectedAccount) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Please select an account to view conversions</p>
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
        <p className="text-muted-foreground">
          Monitor conversion actions, track performance, and identify tracking issues
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {campaigns.length > 0 && (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedCampaign} onValueChange={handleCampaignChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by campaign" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campaigns</SelectItem>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign} value={campaign}>
                    {campaign}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {adGroups.length > 0 && (
          <Select value={selectedAdGroup} onValueChange={setSelectedAdGroup}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by ad group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ad Groups</SelectItem>
              {adGroups.map((adGroup) => (
                <SelectItem key={adGroup} value={adGroup}>
                  {adGroup}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Main Stats */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Conversions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatNumber(stats.totalConversions)}</p>
            <p className="text-xs text-muted-foreground">{stats.activeCount} active actions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg CPA</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedCampaign !== 'all' ? (
              <p className="text-sm text-muted-foreground pt-1">Account-level only</p>
            ) : (
              <p className="text-2xl font-bold">{stats.avgCpa > 0 ? formatCurrency(stats.avgCpa) : '-'}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overall ROAS</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedCampaign !== 'all' ? (
              <p className="text-sm text-muted-foreground pt-1">Account-level only</p>
            ) : (
              <p className={cn('text-2xl font-bold', stats.overallRoas >= 2 && 'text-success', stats.overallRoas < 1 && stats.overallRoas > 0 && 'text-destructive')}>
                {stats.overallRoas > 0 ? `${stats.overallRoas.toFixed(2)}x` : '-'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tracking Status */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-success/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <CardTitle className="text-base">Receiving Hits</CardTitle>
            </div>
            <CardDescription>Conversion actions actively tracking</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <p className="text-3xl font-bold text-success">{stats.receivingHits}</p>
              <div className="flex-1">
                <Progress
                  value={stats.activeCount > 0 ? (stats.receivingHits / stats.activeCount) * 100 : 0}
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.activeCount > 0 ? Math.round((stats.receivingHits / stats.activeCount) * 100) : 0}% of active actions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(needsAttention.length > 0 && 'border-warning/20')}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              {needsAttention.length > 0 ? (
                <AlertCircle className="h-5 w-5 text-warning" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-success" />
              )}
              <CardTitle className="text-base">
                {needsAttention.length > 0 ? 'Needs Attention' : 'All Good!'}
              </CardTitle>
            </div>
            <CardDescription>
              {needsAttention.length > 0
                ? 'Active actions not receiving any hits'
                : 'All active conversion actions are tracking properly'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {needsAttention.length > 0 ? (
              <div className="space-y-2">
                {needsAttention.slice(0, 3).map(c => (
                  <div key={c.id} className="flex items-center justify-between text-sm">
                    <span className="truncate max-w-[200px]">{c.name}</span>
                    <span className="text-muted-foreground">{formatCurrency(c.cost)} spent</span>
                  </div>
                ))}
                {needsAttention.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    +{needsAttention.length - 3} more
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No issues detected
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* By Category and Type */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">By Category</CardTitle>
            <CardDescription>Conversions broken down by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {byCategory.map(({ name, count, conversions, value, Icon }) => (
                <div key={name} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">{name}</p>
                      <p className="text-sm font-semibold">{formatNumber(conversions)}</p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{count} action{count !== 1 ? 's' : ''}</span>
                      <span>{formatCurrency(value)} value</span>
                    </div>
                  </div>
                </div>
              ))}
              {byCategory.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No data</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">By Source</CardTitle>
            <CardDescription>Where conversions are coming from</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {byType.map(({ name, count, conversions, active, Icon }) => (
                <div key={name} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">{name}</p>
                      <p className="text-sm font-semibold">{formatNumber(conversions)}</p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{count} total</span>
                      <span className="text-success">{active} active</span>
                    </div>
                  </div>
                </div>
              ))}
              {byType.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No data</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      {topPerformers.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-warning" />
              <CardTitle>Top Performers</CardTitle>
            </div>
            <CardDescription>Highest converting actions this period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
              {topPerformers.map((conversion, index) => {
                const Icon = categoryIcons[conversion.category] || Target;
                return (
                  <div key={conversion.id} className="flex items-start gap-3 p-3 rounded-lg border">
                    <div className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold shrink-0',
                      index === 0 && 'bg-yellow-500/10 text-yellow-600',
                      index === 1 && 'bg-gray-200 text-gray-600',
                      index === 2 && 'bg-orange-500/10 text-orange-600',
                      index >= 3 && 'bg-muted text-muted-foreground'
                    )}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
                        <p className="font-medium truncate">{conversion.name}</p>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm">
                        <span className="font-semibold">{formatNumber(conversion.conversions)} conv.</span>
                        <span className="text-muted-foreground">{formatCurrency(conversion.cpa)} CPA</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Conversion Actions</CardTitle>
          <CardDescription>Complete list of configured conversion actions</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={activeConversions}
            searchColumn="name"
            searchPlaceholder="Search active actions..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
