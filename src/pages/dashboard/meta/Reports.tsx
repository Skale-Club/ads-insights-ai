import { useState, useMemo } from 'react';
import { Download, FileSpreadsheet, Loader2, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { useMetaReport } from '@/hooks/useMetaReport';
import { useDashboard } from '@/contexts/DashboardContext';
import { useToast } from '@/hooks/use-toast';

interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  budgetType: string;
  budget: number;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  roas: number;
  results: number;
}

const AVAILABLE_FIELDS: Array<{ key: keyof MetaCampaign; label: string; default: boolean }> = [
  { key: 'name', label: 'Campaign Name', default: true },
  { key: 'status', label: 'Status', default: true },
  { key: 'objective', label: 'Objective', default: true },
  { key: 'budgetType', label: 'Budget Type', default: false },
  { key: 'budget', label: 'Budget', default: true },
  { key: 'spend', label: 'Spend', default: true },
  { key: 'impressions', label: 'Impressions', default: true },
  { key: 'clicks', label: 'Clicks', default: true },
  { key: 'ctr', label: 'CTR (%)', default: true },
  { key: 'roas', label: 'ROAS', default: true },
  { key: 'results', label: 'Results', default: true },
];

function exportToXlsx(
  rows: MetaCampaign[],
  selectedFields: Array<keyof MetaCampaign>,
  accountName: string,
  dateRange: { from: Date; to: Date },
): string {
  const mapped = rows.map((r) => {
    const obj: Record<string, unknown> = {};
    selectedFields.forEach((f) => {
      const def = AVAILABLE_FIELDS.find((x) => x.key === f);
      if (def) obj[def.label] = r[f];
    });
    return obj;
  });
  const ws = XLSX.utils.json_to_sheet(mapped);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Campaigns');
  const from = format(dateRange.from, 'yyyy-MM-dd');
  const to = format(dateRange.to, 'yyyy-MM-dd');
  const filename = `meta-${accountName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${from}-to-${to}.xlsx`;
  XLSX.writeFile(wb, filename);
  return filename;
}

export default function MetaReportsPage() {
  const { selectedMetaAccount, dateRange } = useDashboard();
  const { data: campaigns, isLoading, error } = useMetaReport<MetaCampaign[]>('campaigns');
  const { toast } = useToast();

  const [selected, setSelected] = useState<Set<keyof MetaCampaign>>(
    new Set(AVAILABLE_FIELDS.filter((f) => f.default).map((f) => f.key)),
  );

  const toggle = (k: keyof MetaCampaign) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const stats = useMemo(
    () => ({
      campaignsCount: campaigns?.length ?? 0,
      totalSpend: campaigns?.reduce((acc, c) => acc + (c.spend ?? 0), 0) ?? 0,
      selectedFieldsCount: selected.size,
    }),
    [campaigns, selected.size],
  );

  const handleExport = () => {
    if (!campaigns || campaigns.length === 0) {
      toast({ title: 'No data', description: 'Nothing to export for this period.' });
      return;
    }
    try {
      const filename = exportToXlsx(
        campaigns,
        Array.from(selected),
        selectedMetaAccount?.account_name ?? 'meta',
        dateRange,
      );
      toast({ title: 'Report exported', description: filename });
    } catch (err) {
      toast({ title: 'Export failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    }
  };

  if (!selectedMetaAccount) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
        <div>
          <p className="font-medium">No Meta Ads account connected</p>
          <p className="text-sm text-muted-foreground mt-1">Connect your Meta account in Settings to use the report builder.</p>
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
          <p className="text-muted-foreground">Loading report builder...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground text-sm flex items-center gap-1">
          {selectedMetaAccount.account_name}
          <span className="mx-1">·</span>
          <Calendar className="h-3 w-3 inline" />
          <span className="ml-1">
            {format(dateRange.from, 'MMM d, yyyy')} – {format(dateRange.to, 'MMM d, yyyy')}
          </span>
        </p>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">Failed to load campaign data: {(error as Error).message}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold">{stats.campaignsCount}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Spend</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-bold">
                ${stats.totalSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Selected Fields</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.selectedFieldsCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Field Selection</CardTitle>
              <CardDescription>Pick the columns to include in the export</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {AVAILABLE_FIELDS.map((field) => (
                  <div key={field.key} className="flex items-center gap-2">
                    <Checkbox
                      id={field.key}
                      checked={selected.has(field.key)}
                      onCheckedChange={() => toggle(field.key)}
                    />
                    <Label htmlFor={field.key} className="cursor-pointer">
                      {field.label}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Export</CardTitle>
              <CardDescription>Download the current data as a spreadsheet</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                className="w-full"
                onClick={handleExport}
                disabled={selected.size === 0 || isLoading || !campaigns?.length}
              >
                <Download className="h-4 w-4 mr-2" />
                Export as XLSX
              </Button>
              {campaigns && campaigns.length > 0 && selected.size > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  Will include {campaigns.length} row{campaigns.length !== 1 ? 's' : ''} &times; {selected.size} column{selected.size !== 1 ? 's' : ''}
                </p>
              )}
              {(!campaigns || campaigns.length === 0) && !isLoading && (
                <p className="text-xs text-muted-foreground text-center">No campaign data for this period</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
