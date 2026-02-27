import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, Loader2, TrendingUp, Users, Smartphone, MapPin, Calendar } from 'lucide-react';
import { DataTable } from '@/components/dashboard/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDashboard } from '@/contexts/DashboardContext';
import { useGoogleAdsReport } from '@/hooks/useGoogleAdsReport';
import { cn } from '@/lib/utils';

interface Audience {
  id: string;
  name: string;
  type: string;
  status: string;
  reach: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cost: number;
  conversions: number;
  cpa: number;
}

interface DemographicData {
  id: string;
  name: string;
  type?: string;
  impressions: number;
  clicks: number;
  conversions: number;
  cost: number;
  ctr: number;
  cpa: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);

const formatNumber = (value: number) =>
  new Intl.NumberFormat('en-US').format(value);

const formatPercent = (value: number) =>
  `${value.toFixed(2)}%`;

export default function AudiencesPage() {
  const { selectedAccount } = useDashboard();
  const { data: audienceDataRaw, isLoading: loadingAudiences } = useGoogleAdsReport<Audience[]>('audiences');
  const { data: deviceData, isLoading: loadingDevice } = useGoogleAdsReport<DemographicData[]>('demographics_device');
  const { data: locationData, isLoading: loadingLocation } = useGoogleAdsReport<DemographicData[]>('demographics_location');

  const audienceData = (audienceDataRaw as Audience[] | undefined) || [];

  const audienceStats = useMemo(() => {
    const totalCost = audienceData.reduce((sum, a) => sum + a.cost, 0);
    const totalConversions = audienceData.reduce((sum, a) => sum + a.conversions, 0);
    const avgCpa = totalConversions > 0 ? totalCost / totalConversions : 0;
    return { totalCost, totalConversions, avgCpa, total: audienceData.length };
  }, [audienceData]);

  const deviceStats = useMemo(() => {
    const devices = (deviceData as DemographicData[] | undefined) || [];
    const totalCost = devices.reduce((sum, d) => sum + d.cost, 0);
    const totalConversions = devices.reduce((sum, d) => sum + d.conversions, 0);
    return { devices, totalCost, totalConversions };
  }, [deviceData]);

  const locationStats = useMemo(() => {
    const locations = (locationData as DemographicData[] | undefined) || [];
    const totalCost = locations.reduce((sum, l) => sum + l.cost, 0);
    const totalConversions = locations.reduce((sum, l) => sum + l.conversions, 0);
    return { locations, totalCost, totalConversions };
  }, [locationData]);

  const topAudiences = useMemo(() => {
    return [...audienceData]
      .filter(a => a.conversions > 0)
      .sort((a, b) => a.cpa - b.cpa)
      .slice(0, 5);
  }, [audienceData]);

  const columns: ColumnDef<Audience>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="-ml-4">
            Audience
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="max-w-[250px]">
            <p className="font-medium truncate">{row.getValue('name')}</p>
            <p className="text-xs text-muted-foreground">{row.original.type}</p>
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
              <Badge variant={status === 'enabled' ? 'default' : 'secondary'} className={cn(status === 'enabled' && 'bg-success hover:bg-success/90', status === 'paused' && 'bg-warning hover:bg-warning/90')}>
                {status}
              </Badge>
            </div>
          );
        },
      },
      {
        accessorKey: 'reach',
        header: ({ column }) => (
          <div className="text-center">
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
              Reach
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ),
        cell: ({ row }) => <div className="text-center">{formatNumber(row.getValue('reach'))}</div>,
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
        cell: ({ row }) => <div className="text-center">{formatPercent(row.getValue('ctr'))}</div>,
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
          return <div className="text-center">{cpa > 0 ? formatCurrency(cpa) : '-'}</div>;
        },
      },
    ],
    []
  );

  if (!selectedAccount) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Please select an account to view audiences</p>
      </div>
    );
  }

  const isLoading = loadingAudiences || loadingDevice || loadingLocation;

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading audiences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audiences & Demographics</h1>
        <p className="text-muted-foreground">Analyze audience targeting and demographic performance</p>
      </div>

      <Tabs defaultValue="audiences" className="space-y-4">
        <TabsList>
          <TabsTrigger value="audiences" className="gap-2">
            <Users className="h-4 w-4" />
            Audiences
          </TabsTrigger>
          <TabsTrigger value="devices" className="gap-2">
            <Smartphone className="h-4 w-4" />
            Devices
          </TabsTrigger>
          <TabsTrigger value="locations" className="gap-2">
            <MapPin className="h-4 w-4" />
            Locations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="audiences" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Audiences</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{audienceStats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(audienceStats.totalCost)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Conversions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{audienceStats.totalConversions}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg CPA</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{audienceStats.avgCpa > 0 ? formatCurrency(audienceStats.avgCpa) : '-'}</p>
              </CardContent>
            </Card>
          </div>

          {topAudiences.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-success" />
                  Top Performing Audiences
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topAudiences.map((audience, index) => (
                    <div key={audience.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                        <div>
                          <p className="font-medium">{audience.name}</p>
                          <p className="text-xs text-muted-foreground">{audience.type}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(audience.cpa)}</p>
                        <p className="text-xs text-muted-foreground">{audience.conversions} conversions</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <DataTable columns={columns} data={audienceData} searchColumn="name" searchPlaceholder="Search audiences..." />
        </TabsContent>

        <TabsContent value="devices" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(deviceStats.totalCost)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Conversions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{deviceStats.totalConversions}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Devices</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{deviceStats.devices.length}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Device Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {deviceStats.devices.map((device) => (
                  <div key={device.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{device.name}</span>
                      <span className="text-sm text-muted-foreground">{formatCurrency(device.cost)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${deviceStats.totalCost > 0 ? (device.cost / deviceStats.totalCost) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{formatNumber(device.impressions)} impr.</span>
                      <span>{formatNumber(device.clicks)} clicks</span>
                      <span>{device.conversions} conv.</span>
                      <span>{formatPercent(device.ctr)} CTR</span>
                    </div>
                  </div>
                ))}
                {deviceStats.devices.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No device data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(locationStats.totalCost)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Conversions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{locationStats.totalConversions}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Locations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{locationStats.locations.length}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Top Locations by Spend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {locationStats.locations.slice(0, 10).map((location, index) => (
                  <div key={location.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                      <div>
                        <p className="font-medium">{location.name}</p>
                        <p className="text-xs text-muted-foreground">{location.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(location.cost)}</p>
                      <p className="text-xs text-muted-foreground">{location.conversions} conversions</p>
                    </div>
                  </div>
                ))}
                {locationStats.locations.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No location data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
