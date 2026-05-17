import { useMemo } from 'react';
import { Users, Smartphone, MapPin, Globe, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useMetaReport } from '@/hooks/useMetaReport';
import { useDashboard } from '@/contexts/DashboardContext';

interface AudienceRow {
  id: string;
  label: string;
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
  cpc: number;
  conversions: number;
  costPerConversion: number;
  roas: number;
}

interface AudiencesResponse {
  ageGender: AudienceRow[];
  region: AudienceRow[];
  device: AudienceRow[];
  publisher: AudienceRow[];
}

function fmt(n: number, type: 'currency' | 'number' | 'percent' | 'roas' = 'number'): string {
  if (type === 'currency') return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (type === 'percent') return `${n.toFixed(2)}%`;
  if (type === 'roas') return `${n.toFixed(2)}x`;
  return n.toLocaleString('en-US');
}

function BreakdownTable({ rows, labelHeader }: { rows: AudienceRow[]; labelHeader: string }) {
  if (rows.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No data for this breakdown</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground text-xs uppercase tracking-wide">
            <th className="text-left py-2 pr-4">{labelHeader}</th>
            <th className="text-right py-2 pr-4">Impr.</th>
            <th className="text-right py-2 pr-4">Clicks</th>
            <th className="text-right py-2 pr-4">CTR</th>
            <th className="text-right py-2 pr-4">Spend</th>
            <th className="text-right py-2 pr-4">Conv.</th>
            <th className="text-right py-2 pr-4">CPA</th>
            <th className="text-right py-2">ROAS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
              <td className="py-2 pr-4 font-medium">{r.label}</td>
              <td className="text-right py-2 pr-4">{fmt(r.impressions)}</td>
              <td className="text-right py-2 pr-4">{fmt(r.clicks)}</td>
              <td className="text-right py-2 pr-4">{fmt(r.ctr, 'percent')}</td>
              <td className="text-right py-2 pr-4">{fmt(r.spend, 'currency')}</td>
              <td className="text-right py-2 pr-4">{fmt(r.conversions)}</td>
              <td className="text-right py-2 pr-4">{r.costPerConversion > 0 ? fmt(r.costPerConversion, 'currency') : '-'}</td>
              <td className="text-right py-2">{r.roas > 0 ? fmt(r.roas, 'roas') : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MetaAudiencesPage() {
  const { selectedMetaAccount } = useDashboard();
  const { data, isLoading, error } = useMetaReport<AudiencesResponse>('audiences');

  const stats = useMemo(() => {
    const all = [...(data?.ageGender ?? []), ...(data?.region ?? []), ...(data?.device ?? []), ...(data?.publisher ?? [])];
    const totalSpend = all.reduce((s, r) => s + r.spend, 0);
    const totalConv = all.reduce((s, r) => s + r.conversions, 0);
    return {
      totalSpend,
      totalConv,
      ageGenderCount: data?.ageGender?.length ?? 0,
      regionCount: data?.region?.length ?? 0,
    };
  }, [data]);

  if (!selectedMetaAccount) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <Users className="h-12 w-12 text-muted-foreground" />
        <div>
          <p className="font-medium">No Meta Ads account connected</p>
          <p className="text-sm text-muted-foreground mt-1">Connect your Meta account in Settings to see audience data.</p>
        </div>
        <Button asChild><Link to="/settings">Go to Settings</Link></Button>
      </div>
    );
  }

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
        <h1 className="text-2xl font-bold tracking-tight">Audiences &amp; Demographics</h1>
        <p className="text-muted-foreground text-sm">{selectedMetaAccount.account_name}</p>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">Failed to load audience data: {(error as Error).message}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmt(stats.totalSpend, 'currency')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Conversions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmt(stats.totalConv)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Age/Gender Segments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.ageGenderCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Regions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.regionCount}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="age-gender" className="space-y-4">
        <TabsList>
          <TabsTrigger value="age-gender" className="gap-2"><Users className="h-4 w-4" />Age &amp; Gender</TabsTrigger>
          <TabsTrigger value="region" className="gap-2"><MapPin className="h-4 w-4" />Region</TabsTrigger>
          <TabsTrigger value="device" className="gap-2"><Smartphone className="h-4 w-4" />Device</TabsTrigger>
          <TabsTrigger value="publisher" className="gap-2"><Globe className="h-4 w-4" />Publisher</TabsTrigger>
        </TabsList>

        <TabsContent value="age-gender">
          <Card><CardHeader><CardTitle>Performance by Age &amp; Gender</CardTitle></CardHeader><CardContent>
            {isLoading ? <Skeleton className="h-40 w-full" /> : <BreakdownTable rows={data?.ageGender ?? []} labelHeader="Age &amp; Gender" />}
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="region">
          <Card><CardHeader><CardTitle>Performance by Region</CardTitle></CardHeader><CardContent>
            {isLoading ? <Skeleton className="h-40 w-full" /> : <BreakdownTable rows={data?.region ?? []} labelHeader="Region" />}
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="device">
          <Card><CardHeader><CardTitle>Performance by Device</CardTitle></CardHeader><CardContent>
            {isLoading ? <Skeleton className="h-40 w-full" /> : <BreakdownTable rows={data?.device ?? []} labelHeader="Device" />}
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="publisher">
          <Card><CardHeader><CardTitle>Performance by Publisher Platform</CardTitle></CardHeader><CardContent>
            {isLoading ? <Skeleton className="h-40 w-full" /> : <BreakdownTable rows={data?.publisher ?? []} labelHeader="Publisher" />}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
