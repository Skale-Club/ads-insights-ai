import { useMemo, useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, Plus, X, Sparkles, Loader2, Check, Filter } from 'lucide-react';
import { DataTable } from '@/components/dashboard/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDashboard } from '@/contexts/DashboardContext';
import { useGoogleAdsReport } from '@/hooks/useGoogleAdsReport';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { matchTypeBadgeClass } from '@/lib/googleAdsUi';
import { cn } from '@/lib/utils';

interface SearchTerm {
  id: string;
  searchTerm: string;
  matchedKeyword: string;
  matchType: string;
  adGroup?: string;
  campaign?: string;
  impressions: number;
  clicks: number;
  ctr: number;
  cost: number;
  conversions: number;
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

export default function SearchTermsPage() {
  const { selectedAccount } = useDashboard();
  const { providerToken } = useAuth();
  const { toast } = useToast();
  const { data, isLoading } = useGoogleAdsReport<SearchTerm[]>('search_terms');
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([]);
  const [adding, setAdding] = useState<Record<string, boolean>>({});
  const [added, setAdded] = useState<Record<string, boolean>>({});
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [selectedAdGroup, setSelectedAdGroup] = useState<string>('all');

  const searchTermData = (data as SearchTerm[] | undefined) || [];

  const campaigns = useMemo(() => {
    const uniqueCampaigns = [...new Set(searchTermData.map(t => t.campaign).filter(Boolean))].sort();
    return uniqueCampaigns;
  }, [searchTermData]);

  const adGroups = useMemo(() => {
    const filtered = selectedCampaign === 'all' 
      ? searchTermData 
      : searchTermData.filter(t => t.campaign === selectedCampaign);
    const uniqueAdGroups = [...new Set(filtered.map(t => t.adGroup).filter(Boolean))].sort();
    return uniqueAdGroups;
  }, [searchTermData, selectedCampaign]);

  const filteredData = useMemo(() => {
    let filtered = searchTermData;
    if (selectedCampaign !== 'all') {
      filtered = filtered.filter(t => t.campaign === selectedCampaign);
    }
    if (selectedAdGroup !== 'all') {
      filtered = filtered.filter(t => t.adGroup === selectedAdGroup);
    }
    return filtered;
  }, [searchTermData, selectedCampaign, selectedAdGroup]);

  const handleCampaignChange = (value: string) => {
    setSelectedCampaign(value);
    setSelectedAdGroup('all');
  };

  const suggestedNegatives = useMemo(() => {
    const candidates = filteredData
      .filter((t) => t.conversions === 0 && t.cost > 5)
      .slice()
      .sort((a, b) => b.cost - a.cost)
      .map((t) => {
        const term = String(t.searchTerm || '').trim();
        const key = term.toLowerCase();
        return {
          key,
          term,
          reason: `"${t.searchTerm}" matched "${t.matchedKeyword}" with ${t.clicks} clicks and no conversions`,
          potentialSavings: t.cost,
        };
      })
      .filter((c) => c.term.length > 0);

    const bestByKey: Record<string, (typeof candidates)[number]> = {};
    for (const c of candidates) {
      if (!bestByKey[c.key] || bestByKey[c.key].potentialSavings < c.potentialSavings) {
        bestByKey[c.key] = c;
      }
    }

    return Object.values(bestByKey).slice(0, 8);
  }, [filteredData]);

  const activeSuggestions = suggestedNegatives.filter(
    (s) => !dismissedSuggestions.includes(s.key)
  );
  const hasRightPanel = activeSuggestions.length > 0;

  const token = providerToken || sessionStorage.getItem('google_provider_token');

  const addNegative = async (suggestion: { key: string; term: string }) => {
    if (!token || !selectedAccount) return;
    if (adding[suggestion.key] || added[suggestion.key]) return;

    setAdding((p) => ({ ...p, [suggestion.key]: true }));
    try {
      const { data, error: fnError } = await supabase.functions.invoke('google-ads-mutate', {
        body: {
          providerToken: token,
          customerId: selectedAccount.id,
          action: 'addNegativeKeywords',
          keywords: [suggestion.term],
          matchType: 'PHRASE',
        },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      setAdded((p) => ({ ...p, [suggestion.key]: true }));
      setDismissedSuggestions((p) => [...p, suggestion.key]);
      toast({
        title: 'Negative keyword added',
        description: `Added "${suggestion.term}" as PHRASE negative.`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast({
        title: 'Failed to add negative keyword',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setAdding((p) => ({ ...p, [suggestion.key]: false }));
    }
  };

  const addAllNegatives = async () => {
    if (!token || !selectedAccount) return;
    const pending = activeSuggestions.filter((s) => !adding[s.key] && !added[s.key]).map((s) => s.term);
    if (pending.length === 0) return;

    const batchKey = '__all__';
    setAdding((p) => ({ ...p, [batchKey]: true }));
    try {
      const { data, error: fnError } = await supabase.functions.invoke('google-ads-mutate', {
        body: {
          providerToken: token,
          customerId: selectedAccount.id,
          action: 'addNegativeKeywords',
          keywords: pending,
          matchType: 'PHRASE',
        },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      const nextAdded: Record<string, boolean> = {};
      for (const s of activeSuggestions) nextAdded[s.key] = true;
      setAdded((p) => ({ ...p, ...nextAdded }));
      setDismissedSuggestions((p) => [...p, ...activeSuggestions.map((s) => s.key)]);

      toast({
        title: 'Negative keywords added',
        description: `Added ${pending.length} negative keyword(s) as PHRASE.`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast({
        title: 'Failed to add negative keywords',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setAdding((p) => ({ ...p, [batchKey]: false }));
    }
  };

  const columns: ColumnDef<SearchTerm>[] = useMemo(
    () => [
      {
        accessorKey: 'searchTerm',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            Search Term
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="max-w-[300px]">
            <p className="truncate font-medium">{row.getValue('searchTerm')}</p>
            {(row.original.adGroup || row.original.campaign) && (
              <p className="text-xs text-muted-foreground truncate">
                {row.original.adGroup} {row.original.campaign && `• ${row.original.campaign}`}
              </p>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'matchedKeyword',
        header: ({ column }) => (
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              Matched Keyword
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ),
        cell: ({ row }) => (
          <div className="text-center">
            <p className="truncate">{row.getValue('matchedKeyword')}</p>
            <Badge variant="outline" className={cn('mt-1 text-xs capitalize', matchTypeBadgeClass(row.original.matchType))}>
              {row.original.matchType}
            </Badge>
          </div>
        ),
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
        cell: ({ row }) => <div className="text-center">{`${(row.getValue('ctr') as number).toFixed(1)}%`}</div>,
      },
      {
        accessorKey: 'cost',
        header: ({ column }) => (
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
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
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
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
    ],
    []
  );

  const handleExport = () => {
    const csv = [
      ['Search Term', 'Matched Keyword', 'Match Type', 'Ad Group', 'Campaign', 'Impressions', 'Clicks', 'CTR', 'Cost', 'Conversions', 'CPA'],
      ...filteredData.map((t) => [
        t.searchTerm,
        t.matchedKeyword,
        t.matchType,
        t.adGroup || '',
        t.campaign || '',
        t.impressions,
        t.clicks,
        t.ctr,
        t.cost,
        t.conversions,
        t.cpa,
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'search-terms.csv';
    a.click();
  };

  if (!selectedAccount) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Please select an account to view search terms</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading search terms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Search Terms</h1>
        <p className="text-muted-foreground">
          Analyze what users actually search for and find negative keyword opportunities
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
                <SelectItem value="all">All Campaigns ({searchTermData.length})</SelectItem>
                {campaigns.map((campaign) => {
                  const count = searchTermData.filter(t => t.campaign === campaign).length;
                  return (
                    <SelectItem key={campaign} value={campaign}>
                      {campaign} ({count})
                    </SelectItem>
                  );
                })}
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

      <div
        className={cn(
          'grid gap-6',
          hasRightPanel ? '2xl:grid-cols-[minmax(0,1fr)_420px] 2xl:items-start' : 'grid-cols-1'
        )}
      >
        <div className="space-y-6">
          <DataTable
            columns={columns}
            data={filteredData}
            searchColumn="searchTerm"
            searchPlaceholder="Search terms..."
            onExport={handleExport}
          />
        </div>

        {hasRightPanel ? (
          <Card className="border-primary/20 bg-primary/5 2xl:sticky 2xl:top-20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
                  <CardTitle className="text-lg truncate">Suggested Negatives</CardTitle>
                </div>
                <Button
                  size="sm"
                  onClick={addAllNegatives}
                  disabled={!token || adding['__all__']}
                  className="gap-2"
                >
                  {adding['__all__'] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add all
                </Button>
              </div>
              <CardDescription>
                Add as <span className="font-medium text-foreground">PHRASE</span> negatives. Estimated savings:{' '}
                <span className="font-semibold text-foreground">
                  {formatCurrency(activeSuggestions.reduce((sum, s) => sum + s.potentialSavings, 0))}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[520px] overflow-auto pr-1">
              {activeSuggestions.map((suggestion) => {
                const isAdding = !!adding[suggestion.key];
                const isAdded = !!added[suggestion.key];

                return (
                  <div
                    key={suggestion.key}
                    className="rounded-lg border bg-card p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="font-mono max-w-full truncate">
                            -{suggestion.term}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Save {formatCurrency(suggestion.potentialSavings)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{suggestion.reason}</p>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          size="sm"
                          onClick={() => addNegative(suggestion)}
                          disabled={!token || isAdding || isAdded}
                          className="gap-2"
                        >
                          {isAdding ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : isAdded ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                          {isAdded ? 'Added' : 'Add'}
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDismissedSuggestions((p) => [...p, suggestion.key])}
                          title="Dismiss suggestion"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
