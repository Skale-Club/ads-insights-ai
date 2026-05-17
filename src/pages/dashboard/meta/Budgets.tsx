import { useMemo } from 'react';
import { DollarSign, AlertTriangle, Layers, Megaphone, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useMetaReport } from '@/hooks/useMetaReport';
import { useDashboard } from '@/contexts/DashboardContext';
import { cn } from '@/lib/utils';

interface BudgetRow {
  id: string;
  level: 'campaign' | 'adset';
  name: string;
  campaignId: string;
  status: string;
  budgetType: 'daily' | 'lifetime' | 'none';
  amount: number;
  spent: number;
  remaining: number;
  utilization: number;
  bidStrategy: string | null;
}

interface BudgetsDetailResponse {
  campaigns: BudgetRow[];
  adsets: BudgetRow[];
}

function fmt(n: number, type: 'currency' | 'number' | 'percent' | 'roas' = 'number'): string {
  if (type === 'currency') return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (type === 'percent') return `${n.toFixed(2)}%`;
  if (type === 'roas') return `${n.toFixed(2)}x`;
  return n.toLocaleString('en-US');
}

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVE: 'default',
  PAUSED: 'secondary',
  ARCHIVED: 'outline',
  DELETED: 'destructive',
};

function BudgetTable({ rows }: { rows: BudgetRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="py-10 text-center text-muted-foreground text-sm">
        No budgets in this view
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground text-xs uppercase tracking-wide">
            <th className="text-left py-2 pr-4">Name</th>
            <th className="text-left py-2 pr-4">Status</th>
            <th className="text-left py-2 pr-4">Type</th>
            <th className="text-right py-2 pr-4">Budget</th>
            <th className="text-right py-2 pr-4">Spent</th>
            <th className="text-right py-2 pr-4">Remaining</th>
            <th className="py-2 pr-4" style={{ minWidth: 160 }}>Utilization</th>
            <th className="text-left py-2">Bid Strategy</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const utilizationColor =
              r.utilization > 100
                ? 'text-destructive'
                : r.utilization >= 80
                ? 'text-warning'
                : 'text-success';

            return (
              <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="py-2 pr-4 font-medium max-w-[200px] truncate">{r.name}</td>
                <td className="py-2 pr-4">
                  <Badge variant={statusVariant[r.status] ?? 'outline'}>{r.status}</Badge>
                </td>
                <td className="py-2 pr-4 text-muted-foreground capitalize">
                  {r.budgetType}
                </td>
                <td className="text-right py-2 pr-4">{fmt(r.amount, 'currency')}</td>
                <td className="text-right py-2 pr-4">{fmt(r.spent, 'currency')}</td>
                <td className={cn('text-right py-2 pr-4', r.remaining < 0 && 'text-destructive font-medium')}>
                  {fmt(r.remaining, 'currency')}
                </td>
                <td className="py-2 pr-4">
                  <div className="flex items-center gap-2">
                    <Progress value={Math.min(r.utilization, 100)} className="h-2 flex-1" />
                    <span className={cn('text-sm font-medium shrink-0', utilizationColor)}>
                      {r.utilization.toFixed(0)}%
                    </span>
                  </div>
                </td>
                <td className="py-2 text-muted-foreground text-xs">
                  {r.bidStrategy ?? '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function MetaBudgetsPage() {
  const { selectedMetaAccount } = useDashboard();
  const { data, isLoading, error } = useMetaReport<BudgetsDetailResponse>('budgets-detail');

  const campaigns = data?.campaigns ?? [];
  const adsets = data?.adsets ?? [];
  const all = [...campaigns, ...adsets];

  const stats = useMemo(() => {
    const totalBudget = all.reduce((sum, b) => sum + b.amount, 0);
    const totalSpent = all.reduce((sum, b) => sum + b.spent, 0);
    const totalRemaining = all.reduce((sum, b) => sum + b.remaining, 0);
    const overBudget = all.filter((b) => b.utilization > 100).length;
    const campaignsCount = campaigns.length;
    const adsetsCount = adsets.length;
    return { totalBudget, totalSpent, totalRemaining, overBudget, campaignsCount, adsetsCount };
  }, [all, campaigns.length, adsets.length]);

  if (!selectedMetaAccount) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <DollarSign className="h-12 w-12 text-muted-foreground" />
        <div>
          <p className="font-medium">No Meta Ads account connected</p>
          <p className="text-sm text-muted-foreground mt-1">
            Connect your Meta account in Settings to view budget data.
          </p>
        </div>
        <Button asChild>
          <Link to="/settings">Go to Settings</Link>
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading budgets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Budgets</h1>
        <p className="text-muted-foreground text-sm">{selectedMetaAccount.account_name}</p>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Failed to load budgets</p>
                <p className="text-sm text-muted-foreground">
                  {error instanceof Error ? error.message : 'An unexpected error occurred.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {stats.overBudget > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Budget Alert</p>
                <p className="text-sm text-muted-foreground">
                  {stats.overBudget} budget{stats.overBudget > 1 ? 's' : ''} exceeded the planned amount
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmt(stats.totalBudget, 'currency')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmt(stats.totalSpent, 'currency')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn('text-2xl font-bold', stats.totalRemaining < 0 && 'text-destructive')}>
              {fmt(stats.totalRemaining, 'currency')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Budgets</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.campaignsCount + stats.adsetsCount}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns" className="gap-2">
            <Megaphone className="h-4 w-4" />
            Campaigns ({stats.campaignsCount})
          </TabsTrigger>
          <TabsTrigger value="adsets" className="gap-2">
            <Layers className="h-4 w-4" />
            Ad Sets ({stats.adsetsCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Budgets</CardTitle>
              <CardDescription>Daily and lifetime budget pacing across campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              <BudgetTable rows={campaigns} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adsets" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Ad Set Budgets</CardTitle>
              <CardDescription>Daily and lifetime budget pacing across ad sets</CardDescription>
            </CardHeader>
            <CardContent>
              <BudgetTable rows={adsets} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
