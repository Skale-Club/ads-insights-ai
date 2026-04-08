import { TrendingUp, Eye, MousePointer, DollarSign, Target, BarChart3, Users, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useMetaReport } from '@/hooks/useMetaReport';
import { useDashboard } from '@/contexts/DashboardContext';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

interface MetaOverview {
  spend: number;
  reach: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  roas: number;
  conversions: number;
  costPerConversion: number;
}

interface DailyRow {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

interface PlacementRow {
  placement: string;
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
  cpc: number;
}

function fmt(n: number, type: 'currency' | 'number' | 'percent' | 'roas' = 'number'): string {
  if (type === 'currency') return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (type === 'percent') return `${n.toFixed(2)}%`;
  if (type === 'roas') return `${n.toFixed(2)}x`;
  return n.toLocaleString('en-US');
}

function KpiCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function MetaOverviewPage() {
  const { selectedMetaAccount } = useDashboard();
  const { data: overview, isLoading: oLoading } = useMetaReport<MetaOverview>('overview');
  const { data: daily, isLoading: dLoading } = useMetaReport<DailyRow[]>('daily_performance');
  const { data: placements, isLoading: pLoading } = useMetaReport<PlacementRow[]>('insights_by_placement');

  if (!selectedMetaAccount) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <Users className="h-12 w-12 text-muted-foreground" />
        <div>
          <p className="font-medium">No Meta Ads account connected</p>
          <p className="text-sm text-muted-foreground mt-1">Connect your Meta account in Settings to get started.</p>
        </div>
        <Button asChild><Link to="/settings">Go to Settings</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Meta Ads Overview</h1>
        <p className="text-muted-foreground text-sm">{selectedMetaAccount.account_name}</p>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {oLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-8 w-24" /></CardContent></Card>
          ))
        ) : overview ? (
          <>
            <KpiCard icon={DollarSign} label="Spend" value={fmt(overview.spend, 'currency')} />
            <KpiCard icon={Users} label="Reach" value={fmt(overview.reach)} />
            <KpiCard icon={Eye} label="Impressions" value={fmt(overview.impressions)} sub={`CPM: ${fmt(overview.cpm, 'currency')}`} />
            <KpiCard icon={MousePointer} label="Clicks" value={fmt(overview.clicks)} sub={`CTR: ${fmt(overview.ctr, 'percent')}`} />
            <KpiCard icon={TrendingUp} label="CPC" value={fmt(overview.cpc, 'currency')} />
            <KpiCard icon={Zap} label="ROAS" value={fmt(overview.roas, 'roas')} />
            <KpiCard icon={Target} label="Conversions" value={fmt(overview.conversions)} />
            <KpiCard icon={BarChart3} label="Cost / Conv." value={fmt(overview.costPerConversion, 'currency')} />
          </>
        ) : null}
      </div>

      {/* Daily performance chart */}
      <Card>
        <CardHeader><CardTitle>Daily Performance</CardTitle></CardHeader>
        <CardContent>
          {dLoading ? <Skeleton className="h-56 w-full" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={daily ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="spend" stroke="#3b82f6" name="Spend ($)" dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="impressions" stroke="#8b5cf6" name="Impressions" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Placement breakdown */}
      <Card>
        <CardHeader><CardTitle>Performance by Placement</CardTitle></CardHeader>
        <CardContent>
          {pLoading ? <Skeleton className="h-40 w-full" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs uppercase tracking-wide">
                    <th className="text-left py-2 pr-4">Placement</th>
                    <th className="text-right py-2 pr-4">Impressions</th>
                    <th className="text-right py-2 pr-4">Clicks</th>
                    <th className="text-right py-2 pr-4">CTR</th>
                    <th className="text-right py-2">Spend</th>
                  </tr>
                </thead>
                <tbody>
                  {(placements ?? []).map((row) => (
                    <tr key={row.placement} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{row.placement}</td>
                      <td className="text-right py-2 pr-4">{fmt(row.impressions)}</td>
                      <td className="text-right py-2 pr-4">{fmt(row.clicks)}</td>
                      <td className="text-right py-2 pr-4">{fmt(row.ctr, 'percent')}</td>
                      <td className="text-right py-2">{fmt(row.spend, 'currency')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
