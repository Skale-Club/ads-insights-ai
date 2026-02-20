import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, Loader2, AlertTriangle, DollarSign } from 'lucide-react';
import { DataTable } from '@/components/dashboard/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useDashboard } from '@/contexts/DashboardContext';
import { useGoogleAdsReport } from '@/hooks/useGoogleAdsReport';
import { cn } from '@/lib/utils';

interface Budget {
  id: string;
  name: string;
  status: string;
  amount: number;
  spent: number;
  remaining: number;
  utilization: number;
  campaignsCount: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);

export default function BudgetsPage() {
  const { selectedAccount } = useDashboard();
  const { data, isLoading } = useGoogleAdsReport<Budget[]>('budgets');
  const budgetData = (data as Budget[] | undefined) || [];

  const stats = useMemo(() => {
    const totalBudget = budgetData.reduce((sum, b) => sum + b.amount, 0);
    const totalSpent = budgetData.reduce((sum, b) => sum + b.spent, 0);
    const totalRemaining = budgetData.reduce((sum, b) => sum + b.remaining, 0);
    const overBudget = budgetData.filter(b => b.utilization > 100).length;
    return { totalBudget, totalSpent, totalRemaining, overBudget, total: budgetData.length };
  }, [budgetData]);

  const columns: ColumnDef<Budget>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            Budget Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="max-w-[250px]">
            <p className="font-medium truncate">{row.getValue('name')}</p>
            <p className="text-xs text-muted-foreground">{row.original.campaignsCount} campaigns</p>
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
        accessorKey: 'amount',
        header: ({ column }) => (
          <div className="text-center">
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
              Budget
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ),
        cell: ({ row }) => <div className="text-center font-medium">{formatCurrency(row.getValue('amount'))}</div>,
      },
      {
        accessorKey: 'spent',
        header: ({ column }) => (
          <div className="text-center">
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
              Spent
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ),
        cell: ({ row }) => <div className="text-center">{formatCurrency(row.getValue('spent'))}</div>,
      },
      {
        accessorKey: 'remaining',
        header: ({ column }) => (
          <div className="text-center">
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
              Remaining
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ),
        cell: ({ row }) => {
          const remaining = row.getValue('remaining') as number;
          return (
            <div className={cn('text-center', remaining < 0 && 'text-destructive font-medium')}>
              {formatCurrency(remaining)}
            </div>
          );
        },
      },
      {
        accessorKey: 'utilization',
        header: ({ column }) => (
          <div className="text-center">
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
              Utilization
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ),
        cell: ({ row }) => {
          const utilization = row.getValue('utilization') as number;
          return (
            <div className="text-center min-w-[120px]">
              <div className="flex items-center gap-2">
                <Progress
                  value={Math.min(utilization, 100)}
                  className={cn(
                    'h-2',
                    utilization > 100 && 'bg-destructive/20',
                    utilization > 80 && utilization <= 100 && 'bg-warning/20'
                  )}
                />
                <span className={cn(
                  'text-sm font-medium shrink-0',
                  utilization > 100 && 'text-destructive',
                  utilization > 80 && utilization <= 100 && 'text-warning'
                )}>
                  {utilization.toFixed(0)}%
                </span>
              </div>
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
        <p className="text-muted-foreground">Please select an account to view budgets</p>
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
        <p className="text-muted-foreground">
          Monitor budget allocation and spending across your campaigns
        </p>
      </div>

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

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(stats.totalBudget)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(stats.totalSpent)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn('text-2xl font-bold', stats.totalRemaining < 0 && 'text-destructive')}>
              {formatCurrency(stats.totalRemaining)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Budgets</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={budgetData}
        searchColumn="name"
        searchPlaceholder="Search budgets..."
      />
    </div>
  );
}
