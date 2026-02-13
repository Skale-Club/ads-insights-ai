import { useEffect, useMemo, useState } from 'react';
import {
  Sparkles,
  TrendingUp,
  DollarSign,
  Target,
  Loader2,
  Zap,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDashboard } from '@/contexts/DashboardContext';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useGoogleAdsReport } from '@/hooks/useGoogleAdsReport';

interface UserAISettings {
  openai_api_key: string | null;
  preferred_model: string;
}

function normalizeModel(model: string | null | undefined): string {
  const m = String(model || '').trim();
  if (m.startsWith('gemini-')) return m;
  return 'gemini-3-flash-preview';
}
type OverviewData = {
  spend: number;
  conversions: number;
  conversionsValue: number;
  impressions: number;
  clicks: number;
  cpa: number;
  roas: number;
  ctr: number;
};

type CampaignRow = {
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
  conversionsValue?: number;
};

type KeywordRow = {
  id: string;
  keyword: string;
  matchType: 'exact' | 'phrase' | 'broad' | string;
  status: 'enabled' | 'paused' | 'removed' | string;
  qualityScore: number | null;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  avgCpc: number;
  ctr: number;
  cpa: number;
  conversionRate: number;
};

type SearchTermRow = {
  id: string;
  searchTerm: string;
  matchedKeyword: string;
  matchType: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  ctr: number;
  cpa: number;
};

interface Recommendation {
  id: string;
  title: string;
  category: 'keywords' | 'budget' | 'bidding' | 'targeting' | 'creative';
  impact: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  rationale: string;
  metrics: { label: string; value: string }[];
  actions: string[];
  confidence: 'high' | 'medium' | 'low';
}

function safeCurrency(code: string | undefined): string {
  return code && /^[A-Z]{3}$/.test(code) ? code : 'USD';
}

function formatCurrency(value: number, currencyCode: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: safeCurrency(currencyCode),
    minimumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatPct(value: number) {
  return `${value.toFixed(2)}%`;
}
const impactColors = {
  high: 'bg-success/10 text-success border-success/30',
  medium: 'bg-warning/10 text-warning border-warning/30',
  low: 'bg-muted text-muted-foreground border-muted',
};

const effortColors = {
  low: 'text-success',
  medium: 'text-warning',
  high: 'text-destructive',
};

const categoryIcons = {
  keywords: Target,
  budget: DollarSign,
  bidding: TrendingUp,
  targeting: Target,
  creative: Sparkles,
};

export default function RecommendationsPage() {
  const { selectedAccount, dateRange, dateRangePreset } = useDashboard();
  const { user } = useAuth();
  const { toast } = useToast();
  const [aiSettings, setAiSettings] = useState<{ apiKey: string | null; model: string } | null>(null);

  // Load AI settings
  useEffect(() => {
    if (!user?.id) return;
    (supabase as any)
      .from('user_ai_settings')
      .select('openai_api_key, preferred_model')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }: { data: UserAISettings | null }) => {
        if (data) {
          setAiSettings({
            apiKey: data.openai_api_key,
            model: normalizeModel(data.preferred_model),
          });
        }
      });
  }, [user?.id]);

  const currencyCode = safeCurrency(selectedAccount?.currencyCode);

  const { data: overview, isLoading: isLoadingOverview } = useGoogleAdsReport<OverviewData>('overview');
  const { data: campaigns, isLoading: isLoadingCampaigns } = useGoogleAdsReport<CampaignRow[]>('campaigns');
  const { data: keywords, isLoading: isLoadingKeywords } = useGoogleAdsReport<KeywordRow[]>('keywords');
  const { data: searchTerms, isLoading: isLoadingSearchTerms } = useGoogleAdsReport<SearchTermRow[]>('search_terms');

  const isLoadingData = isLoadingOverview || isLoadingCampaigns || isLoadingKeywords || isLoadingSearchTerms;

  const campaignContext = useMemo(() => {
    if (!selectedAccount) return null;
    const dateLabel =
      dateRangePreset === 'custom'
        ? `${dateRange.from.toISOString().slice(0, 10)}..${dateRange.to.toISOString().slice(0, 10)}`
        : dateRangePreset;

    const topCampaigns = (campaigns || [])
      .slice()
      .sort((a, b) => (b.spend || 0) - (a.spend || 0))
      .slice(0, 12)
      .map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        type: c.type,
        budget: c.budget,
        spend: c.spend,
        conversions: c.conversions,
        cpa: c.cpa,
        roas: c.roas ?? null,
        ctr: c.ctr,
        impressions: c.impressions,
        clicks: c.clicks,
      }));

    const topKeywords = (keywords || [])
      .slice()
      .sort((a, b) => (b.cost || 0) - (a.cost || 0))
      .slice(0, 20)
      .map((k) => ({
        id: k.id,
        keyword: k.keyword,
        matchType: k.matchType,
        status: k.status,
        spend: k.cost,
        conversions: k.conversions,
        cpa: k.cpa,
        ctr: k.ctr,
        clicks: k.clicks,
        impressions: k.impressions,
        qualityScore: k.qualityScore,
      }));

    const negativeKeywordCandidates = (searchTerms || [])
      .filter((t) => (t.conversions || 0) === 0)
      .filter((t) => (t.cost || 0) >= 5 || (t.clicks || 0) >= 25)
      .slice()
      .sort((a, b) => (b.cost || 0) - (a.cost || 0))
      .slice(0, 10)
      .map((t) => t.searchTerm);

    return {
      accountName: selectedAccount.name,
      accountId: selectedAccount.id,
      currencyCode,
      dateRange: dateLabel,
      overallMetrics: overview
        ? {
            totalSpend: overview.spend,
            totalConversions: overview.conversions,
            conversionsValue: overview.conversionsValue,
            avgCpa: overview.cpa,
            avgCtr: overview.ctr,
            roas: overview.roas,
            impressions: overview.impressions,
            clicks: overview.clicks,
          }
        : null,
      campaigns: topCampaigns,
      topKeywords,
      negativeKeywordSuggestions: negativeKeywordCandidates,
    };
  }, [selectedAccount, dateRange, dateRangePreset, campaigns, keywords, searchTerms, overview, currencyCode]);

  const recommendations = useMemo<Recommendation[]>(() => {
    const recs: Recommendation[] = [];
    const kw = (keywords || []).filter((k) => String(k.status).toLowerCase() !== 'removed');
    const st = searchTerms || [];
    const camp = (campaigns || []).filter((c) => String(c.status).toLowerCase() !== 'removed');

    const accountAvgCpa = overview?.cpa || null;

    const wasteKeywords = kw
      .filter((k) => String(k.status).toLowerCase() === 'enabled')
      .filter((k) => (k.conversions || 0) === 0)
      .filter((k) => (k.cost || 0) >= 25 || (k.clicks || 0) >= 80)
      .slice()
      .sort((a, b) => (b.cost || 0) - (a.cost || 0))
      .slice(0, 6);

    if (wasteKeywords.length > 0) {
      const totalWaste = wasteKeywords.reduce((acc, k) => acc + (k.cost || 0), 0);
      recs.push({
        id: 'kw-waste',
        title: 'Review or pause keywords with spend but no conversions',
        category: 'keywords',
        impact: totalWaste >= 250 ? 'high' : totalWaste >= 100 ? 'medium' : 'low',
        effort: 'low',
        rationale: `Found ${wasteKeywords.length} enabled keyword(s) with ${formatCurrency(totalWaste, currencyCode)} spend and 0 conversions in the selected date range.`,
        metrics: [
          { label: 'Wasted Spend (Top)', value: formatCurrency(totalWaste, currencyCode) },
          { label: 'Keywords Flagged', value: formatNumber(wasteKeywords.length) },
          ...(accountAvgCpa !== null ? [{ label: 'Account Avg CPA', value: formatCurrency(accountAvgCpa, currencyCode) }] : []),
        ],
        actions: wasteKeywords.map((k) => {
          const kwLabel = `"${k.keyword}" (${String(k.matchType).toLowerCase()})`;
          return `Review ${kwLabel}: ${formatCurrency(k.cost || 0, currencyCode)} spend, ${formatNumber(k.clicks || 0)} clicks, ${formatPct(k.ctr || 0)} CTR, 0 conversions.`;
        }),
        confidence: 'medium',
      });
    }

    const negCandidates = st
      .filter((t) => (t.conversions || 0) === 0)
      .filter((t) => (t.cost || 0) >= 10 && (t.clicks || 0) >= 15)
      .slice()
      .sort((a, b) => (b.cost || 0) - (a.cost || 0))
      .slice(0, 8);

    if (negCandidates.length > 0) {
      const totalWaste = negCandidates.reduce((acc, t) => acc + (t.cost || 0), 0);
      recs.push({
        id: 'neg-terms',
        title: 'Add negative keyword candidates from non-converting search terms',
        category: 'keywords',
        impact: totalWaste >= 200 ? 'high' : totalWaste >= 80 ? 'medium' : 'low',
        effort: 'low',
        rationale: `Search terms show ${negCandidates.length} term(s) with ${formatCurrency(totalWaste, currencyCode)} spend and 0 conversions.`,
        metrics: [
          { label: 'Potential Savings', value: formatCurrency(totalWaste, currencyCode) },
          { label: 'Terms Flagged', value: formatNumber(negCandidates.length) },
        ],
        actions: negCandidates.map((t) => `Consider negative: "${t.searchTerm}" (${formatCurrency(t.cost || 0, currencyCode)} spend, ${formatNumber(t.clicks || 0)} clicks, 0 conversions).`),
        confidence: 'medium',
      });
    }

    const byMatch = (rows: KeywordRow[], match: string) => rows.filter((k) => String(k.matchType).toLowerCase() === match);
    const broad = byMatch(kw, 'broad');
    const phrase = byMatch(kw, 'phrase');
    const exact = byMatch(kw, 'exact');

    const sum = (arr: KeywordRow[], key: keyof KeywordRow) => arr.reduce((a, r) => a + (Number(r[key]) || 0), 0);
    const broadCost = sum(broad, 'cost');
    const broadConv = sum(broad, 'conversions');
    const broadCpa = broadConv > 0 ? broadCost / broadConv : null;

    const epCost = sum([...exact, ...phrase], 'cost');
    const epConv = sum([...exact, ...phrase], 'conversions');
    const epCpa = epConv > 0 ? epCost / epConv : null;

    if (broadCost >= 150 && broadCpa !== null && epCpa !== null && broadCpa > epCpa * 1.5) {
      recs.push({
        id: 'match-shift',
        title: 'Shift spend from broad match into phrase/exact where performance is stronger',
        category: 'keywords',
        impact: 'medium',
        effort: 'medium',
        rationale: `Broad match CPA (${formatCurrency(broadCpa, currencyCode)}) is significantly higher than phrase/exact (${formatCurrency(epCpa, currencyCode)}) with meaningful broad spend (${formatCurrency(broadCost, currencyCode)}).`,
        metrics: [
          { label: 'Broad Spend', value: formatCurrency(broadCost, currencyCode) },
          { label: 'Broad CPA', value: formatCurrency(broadCpa, currencyCode) },
          { label: 'Phrase/Exact CPA', value: formatCurrency(epCpa, currencyCode) },
        ],
        actions: [
          'Identify converting search terms and add them as phrase/exact keywords.',
          'Reduce broad match bids 10-20% and monitor CPA for 7 days.',
          'Add negatives to prevent irrelevant broad queries (use Search Terms list).',
        ],
        confidence: 'medium',
      });
    }

    const lowCtr = kw
      .filter((k) => String(k.status).toLowerCase() === 'enabled')
      .filter((k) => (k.impressions || 0) >= 1500)
      .filter((k) => (k.ctr || 0) > 0 && (k.ctr || 0) < 1.0)
      .slice()
      .sort((a, b) => (b.impressions || 0) - (a.impressions || 0))
      .slice(0, 5);

    if (lowCtr.length > 0) {
      recs.push({
        id: 'low-ctr',
        title: 'Improve ad relevance for keywords with high impressions but low CTR',
        category: 'creative',
        impact: 'medium',
        effort: 'high',
        rationale: `Found ${lowCtr.length} enabled keyword(s) with high impressions and CTR below 1.00%.`,
        metrics: [
          { label: 'Keywords Flagged', value: formatNumber(lowCtr.length) },
          { label: 'Top Impressions', value: formatNumber(lowCtr[0].impressions || 0) },
        ],
        actions: lowCtr.map((k) => `Review ads/landing page for "${k.keyword}": ${formatNumber(k.impressions)} impressions, ${formatPct(k.ctr)} CTR.`),
        confidence: 'low',
      });
    }

    const bestByRoas = camp
      .filter((c) => typeof c.roas === 'number' && (c.roas as number) > 0)
      .slice()
      .sort((a, b) => (b.roas || 0) - (a.roas || 0))[0];

    if (bestByRoas && (bestByRoas.spend || 0) >= 100) {
      recs.push({
        id: 'budget-focus',
        title: 'Prioritize budget toward your highest-ROAS campaign',
        category: 'budget',
        impact: 'medium',
        effort: 'low',
        rationale: `"${bestByRoas.name}" has the strongest ROAS (${(bestByRoas.roas || 0).toFixed(1)}x) in the selected period. Consider reallocating budget from lower performing campaigns if you are constrained.`,
        metrics: [
          { label: 'Campaign ROAS', value: `${(bestByRoas.roas || 0).toFixed(1)}x` },
          { label: 'Spend', value: formatCurrency(bestByRoas.spend || 0, currencyCode) },
          { label: 'CPA', value: formatCurrency(bestByRoas.cpa || 0, currencyCode) },
        ],
        actions: [
          'If limited by budget, shift incremental spend into this campaign and monitor CPA/ROAS.',
          'Confirm conversion value tracking is correct before scaling.',
        ],
        confidence: 'low',
      });
    }

    return recs;
  }, [keywords, searchTerms, campaigns, overview, currencyCode]);

  const summary = useMemo(() => {
    const highImpact = recommendations.filter((r) => r.impact === 'high').length;
    const quickWins = recommendations.filter((r) => r.effort === 'low').length;

    const wastedKeywords = (keywords || [])
      .filter((k) => String(k.status).toLowerCase() === 'enabled')
      .filter((k) => (k.conversions || 0) === 0)
      .reduce((acc, k) => acc + (k.cost || 0), 0);

    const wastedTerms = (searchTerms || [])
      .filter((t) => (t.conversions || 0) === 0)
      .reduce((acc, t) => acc + (t.cost || 0), 0);

    return { highImpact, quickWins, potentialSavings: wastedKeywords + wastedTerms };
  }, [recommendations, keywords, searchTerms]);

  if (!selectedAccount) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Please select an account to view recommendations</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Recommendations</h1>
        <p className="text-muted-foreground">
          Actionable insights to improve your campaign performance
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                <Zap className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.highImpact}</p>
                <p className="text-sm text-muted-foreground">High Impact</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(summary.potentialSavings, currencyCode)}</p>
                <p className="text-sm text-muted-foreground">Potential Savings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent">
                <Clock className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.quickWins}</p>
                <p className="text-sm text-muted-foreground">Quick Wins</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations List */}
      <div className="space-y-4">
        {isLoadingData && recommendations.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading your Google Ads data...</span>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {!isLoadingData && recommendations.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">
                No recommendations yet for the selected period. Try expanding the date range or check back after more data accrues.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {recommendations.map((rec) => {
          const CategoryIcon = categoryIcons[rec.category];
          return (
            <Card key={rec.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <CategoryIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{rec.title}</CardTitle>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="outline" className={cn(impactColors[rec.impact])}>
                          {rec.impact} impact
                        </Badge>
                        <span className={cn('text-sm', effortColors[rec.effort])}>
                          {rec.effort} effort
                        </span>
                        <Badge variant="secondary" className="capitalize">
                          {rec.category}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      rec.confidence === 'high' && 'bg-success/10 text-success',
                      rec.confidence === 'medium' && 'bg-warning/10 text-warning'
                    )}
                  >
                    {rec.confidence} confidence
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">{rec.rationale}</p>

                {/* Metrics */}
                <div className="flex flex-wrap gap-4">
                  {rec.metrics.map((metric, i) => (
                    <div key={i} className="rounded-lg bg-muted/50 px-3 py-2">
                      <p className="text-xs text-muted-foreground">{metric.label}</p>
                      <p className="font-semibold">{metric.value}</p>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div>
                  <p className="mb-2 text-sm font-medium">Recommended Actions:</p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {rec.actions.map((action, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button size="sm" disabled title="Not implemented yet">
                    Apply Changes
                  </Button>
                  <Button size="sm" variant="outline" disabled title="Not implemented yet">
                    Dismiss
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

    </div>
  );
}
