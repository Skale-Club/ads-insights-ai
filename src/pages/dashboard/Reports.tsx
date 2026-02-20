import { useState } from 'react';
import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, Loader2, Download, FileText, Calendar } from 'lucide-react';
import { DataTable } from '@/components/dashboard/DataTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDashboard } from '@/contexts/DashboardContext';
import { useGoogleAdsReport } from '@/hooks/useGoogleAdsReport';

interface Report {
  id: string;
  name: string;
  type: string;
  dateRange: string;
  generatedAt: string;
  status: string;
  metrics: string[];
}

const reports: Report[] = [
  { id: '1', name: 'Monthly Performance Summary', type: 'performance', dateRange: 'Last 30 days', generatedAt: '2024-01-15', status: 'ready', metrics: ['impressions', 'clicks', 'cost', 'conversions'] },
  { id: '2', name: 'Campaign Comparison', type: 'comparison', dateRange: 'Last 90 days', generatedAt: '2024-01-14', status: 'ready', metrics: ['cost', 'conversions', 'ctr'] },
  { id: '3', name: 'Keyword Analysis', type: 'keywords', dateRange: 'Last 7 days', generatedAt: '2024-01-13', status: 'processing', metrics: ['quality_score', 'impressions', 'clicks'] },
];

export default function ReportsPage() {
  const { selectedAccount } = useDashboard();
  const { data: campaigns, isLoading } = useGoogleAdsReport<{ name: string; cost: number }[]>('campaigns');
  const campaignData = (campaigns as { name: string; cost: number }[] | undefined) || [];

  const stats = useMemo(() => {
    const totalReports = reports.length;
    const readyReports = reports.filter(r => r.status === 'ready').length;
    return { totalReports, readyReports };
  }, []);

  const handleExport = (report: Report) => {
    const csv = [
      ['Report', report.name],
      ['Type', report.type],
      ['Date Range', report.dateRange],
      ['Generated', report.generatedAt],
      ['Metrics', report.metrics.join(', ')],
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.name.toLowerCase().replace(/\s+/g, '-')}.csv`;
    a.click();
  };

  const columns: ColumnDef<Report>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            Report Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{row.getValue('name')}</span>
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
            <Badge variant="outline" className="capitalize">{row.getValue('type')}</Badge>
          </div>
        ),
      },
      {
        accessorKey: 'dateRange',
        header: ({ column }) => (
          <div className="text-center">
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
              Date Range
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ),
        cell: ({ row }) => (
          <div className="text-center flex items-center justify-center gap-1">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            {row.getValue('dateRange')}
          </div>
        ),
      },
      {
        accessorKey: 'generatedAt',
        header: ({ column }) => (
          <div className="text-center">
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
              Generated
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ),
        cell: ({ row }) => <div className="text-center">{row.getValue('generatedAt')}</div>,
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
                variant={status === 'ready' ? 'default' : 'secondary'}
                className={status === 'ready' ? 'bg-success hover:bg-success/90' : ''}
              >
                {status}
              </Badge>
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: () => <div className="text-center">Actions</div>,
        cell: ({ row }) => {
          const report = row.original;
          return (
            <div className="text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleExport(report)}
                disabled={report.status !== 'ready'}
              >
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
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
        <p className="text-muted-foreground">Please select an account to view reports</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Generate and export custom reports for your campaigns
          </p>
        </div>
        <Button>
          <FileText className="h-4 w-4 mr-2" />
          Create Report
        </Button>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalReports}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ready to Download</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.readyReports}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{campaignData.length}</p>
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={reports}
        searchColumn="name"
        searchPlaceholder="Search reports..."
      />
    </div>
  );
}
