import { useEffect, useMemo, useState } from 'react';
import {
  Sparkles,
  TrendingUp,
  DollarSign,
  Target,
  Loader2,
  Zap,
  Clock,
  ImageOff,
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
import { useMetaReport } from '@/hooks/useMetaReport';

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

type MetaOverviewData = {
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
};

type MetaCampaignRow = {
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
};

type MetaAdSetRow = {
  id: string;
  name: string;
  campaignId: string;
  status: string;
  targetingSummary: string;
  dailyBudget: number;
  spend: number;
  impressions: number;
  ctr: number;
  roas: number;
};

type MetaAdRow = {
  id: string;
  name: string;
  adsetId: string;
  status: string;
  title: string;
  body: string;
  imageUrl: string | null;
  spend: number;
  impressions: number;
  ctr: number;
  cpc: number;
  roas: number;
};

type MetaPlacementRow = {
  placement: string;
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
  cpc: number;
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
  const { selectedAccount, dateRange, dateRangePreset, platform, selectedMetaAccount } = useDashboard();
  const { user } = useAuth();
  const { toast } = useToast();
  const [aiSettings, setAiSettings] = useState<{ apiKey: string | null; model: string } | null>(null);

  const isMeta = platform === 'meta';

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

  const { data: overview, isLoading: isLoadingOverview } = useGoogleAdsReport<OverviewData>('overview', { enabled: !isMeta });
  const { data: campaigns, isLoading: isLoadingCampaigns } = useGoogleAdsReport<CampaignRow[]>('campaigns', { enabled: !isMeta });
  const { data: keywords, isLoading: isLoadingKeywords } = useGoogleAdsReport<KeywordRow[]>('keywords', { enabled: !isMeta });
  const { data: searchTerms, isLoading: isLoadingSearchTerms } = useGoogleAdsReport<SearchTermRow[]>('search_terms', { enabled: !isMeta });

  const isLoadingData = isLoadingOverview || isLoadingCampaigns || isLoadingKeywords || isLoadingSearchTerms;

  // Meta reports
  const { data: metaOverview, isLoading: isLoadingMetaOverview } = useMetaReport<MetaOverviewData>('overview', { enabled: isMeta });
  const { data: metaCampaigns, isLoading: isLoadingMetaCampaigns } = useMetaReport<MetaCampaignRow[]>('campaigns', { enabled: isMeta });
  const { data: metaAdSets, isLoading: isLoadingMetaAdSets } = useMetaReport<MetaAdSetRow[]>('adsets', { enabled: isMeta });
  const { data: metaAds, isLoading: isLoadingMetaAds } = useMetaReport<MetaAdRow[]>('ads', { enabled: isMeta });
  const { data: metaPlacements } = useMetaReport<MetaPlacementRow[]>('insights_by_placement', { enabled: isMeta });

  const isLoadingMetaData = isLoadingMetaOverview || isLoadingMetaCampaigns || isLoadingMetaAdSets || isLoadingMetaAds;

  const metaRecommendations = useMemo<Recommendation[]>(() => {
    if (!isMeta || !selectedMetaAccount) return [];
    const recs: Recommendation[] = [];
    const currency = selectedMetaAccount.currency ?? 'USD';

    const activeCampaigns = (metaCampaigns ?? []).filter((c) => c.status === 'ACTIVE');
    const activeAds = (metaAds ?? []).filter((a) => a.status === 'ACTIVE');

    // 1. Low ROAS campaigns (ROAS tracked but below 1.0, with real spend)
    const losingCampaigns = activeCampaigns
      .filter((c) => c.roas > 0 && c.roas < 1.0 && c.spend >= 50)
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 5);

    if (losingCampaigns.length > 0) {
      const totalWaste = losingCampaigns.reduce((acc, c) => acc + c.spend, 0);
      recs.push({
        id: 'meta-low-roas',
        title: 'Campaigns spending more than they return — pause or restructure',
        category: 'budget',
        impact: totalWaste >= 300 ? 'high' : 'medium',
        effort: 'low',
        rationale: `${losingCampaigns.length} active campaign(s) have ROAS below 1.0x with ${formatCurrency(totalWaste, currency)} total spend — spending more than the revenue they generate.`,
        metrics: [
          { label: 'Total Spend at Risk', value: formatCurrency(totalWaste, currency) },
          { label: 'Campaigns Flagged', value: formatNumber(losingCampaigns.length) },
        ],
        actions: losingCampaigns.map((c) => `"${c.name}": ROAS ${c.roas.toFixed(2)}x, spend ${formatCurrency(c.spend, currency)}. Consider pausing or reallocating budget.`),
        confidence: 'high',
      });
    }

    // 2. Creative fatigue — ads with high impressions and low CTR
    const accountAvgCtr = metaOverview?.ctr ?? 0;
    const fatigueThreshold = Math.min(accountAvgCtr * 0.5, 0.5);
    const fatiguedAds = activeAds
      .filter((a) => a.impressions >= 3000 && a.ctr < fatigueThreshold && a.spend >= 15)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 6);

    if (fatiguedAds.length > 0) {
      recs.push({
        id: 'meta-creative-fatigue',
        title: 'Active ads showing creative fatigue — CTR well below account average',
        category: 'creative',
        impact: fatiguedAds.length >= 3 ? 'high' : 'medium',
        effort: 'high',
        rationale: `${fatiguedAds.length} active ad(s) have CTR below ${fatigueThreshold.toFixed(2)}% (account avg: ${formatPct(accountAvgCtr)}) with significant impressions — audience may be fatigued.`,
        metrics: [
          { label: 'Ads Flagged', value: formatNumber(fatiguedAds.length) },
          { label: 'Account Avg CTR', value: formatPct(accountAvgCtr) },
        ],
        actions: fatiguedAds.map((a) => {
          const label = a.title || a.name;
          return `"${label}": ${formatNumber(a.impressions)} impressions, ${formatPct(a.ctr)} CTR, ${formatCurrency(a.spend, currency)} spend. Refresh creative copy or visual.`;
        }),
        confidence: 'medium',
      });
    }

    // 3. Underperforming placements
    if (metaPlacements && metaPlacements.length > 0) {
      const totalPlacementSpend = metaPlacements.reduce((acc, p) => acc + p.spend, 0);
      const badPlacements = metaPlacements
        .filter((p) => p.ctr < 0.3 && p.spend >= totalPlacementSpend * 0.1)
        .sort((a, b) => b.spend - a.spend);

      if (badPlacements.length > 0) {
        const wastedSpend = badPlacements.reduce((acc, p) => acc + p.spend, 0);
        recs.push({
          id: 'meta-bad-placements',
          title: 'Placements with high spend and very low CTR',
          category: 'targeting',
          impact: wastedSpend >= 200 ? 'high' : 'medium',
          effort: 'low',
          rationale: `${badPlacements.length} placement(s) account for ${formatCurrency(wastedSpend, currency)} spend with CTR below 0.3% — consider excluding them.`,
          metrics: [
            { label: 'Spend on Low-CTR Placements', value: formatCurrency(wastedSpend, currency) },
            { label: 'Placements Flagged', value: formatNumber(badPlacements.length) },
          ],
          actions: badPlacements.map((p) => `${p.placement}: ${formatPct(p.ctr)} CTR, ${formatCurrency(p.spend, currency)} spend (${formatPct((p.spend / totalPlacementSpend) * 100)} of total). Consider excluding in ad set placement settings.`),
          confidence: 'medium',
        });
      }
    }

    // 4. High CPM ad sets vs account average
    const accountAvgCpm = metaOverview?.cpm ?? 0;
    if (accountAvgCpm > 0) {
      const expensiveAdSets = (metaAdSets ?? [])
        .filter((s) => s.status === 'ACTIVE' && s.impressions > 0 && s.spend >= 30)
        .map((s) => ({ ...s, cpm: (s.spend / s.impressions) * 1000 }))
        .filter((s) => s.cpm > accountAvgCpm * 2)
        .sort((a, b) => b.cpm - a.cpm)
        .slice(0, 4);

      if (expensiveAdSets.length > 0) {
        recs.push({
          id: 'meta-high-cpm',
          title: 'Ad sets with CPM more than 2× the account average',
          category: 'targeting',
          impact: 'medium',
          effort: 'medium',
          rationale: `${expensiveAdSets.length} active ad set(s) have CPM over ${formatCurrency(accountAvgCpm * 2, currency)} (account avg: ${formatCurrency(accountAvgCpm, currency)}). Narrow or over-competitive targeting may be inflating costs.`,
          metrics: [
            { label: 'Account Avg CPM', value: formatCurrency(accountAvgCpm, currency) },
            { label: 'Ad Sets Flagged', value: formatNumber(expensiveAdSets.length) },
          ],
          actions: expensiveAdSets.map((s) => `"${s.name}": CPM ${formatCurrency(s.cpm, currency)}, targeting: ${s.targetingSummary}. Try broadening audience or removing overlapping interests.`),
          confidence: 'medium',
        });
      }
    }

    // 5. Best ROAS campaign — concentrate budget
    const bestRoas = activeCampaigns
      .filter((c) => c.roas >= 2.0 && c.spend >= 50)
      .sort((a, b) => b.roas - a.roas)[0];

    if (bestRoas) {
      recs.push({
        id: 'meta-budget-focus',
        title: 'Concentrate more budget on your highest-ROAS campaign',
        category: 'budget',
        impact: 'medium',
        effort: 'low',
        rationale: `"${bestRoas.name}" has a strong ROAS of ${bestRoas.roas.toFixed(2)}x. If budget-constrained, shift spend from lower-performing campaigns here.`,
        metrics: [
          { label: 'ROAS', value: `${bestRoas.roas.toFixed(2)}x` },
          { label: 'Current Spend', value: formatCurrency(bestRoas.spend, currency) },
          { label: 'Results', value: formatNumber(bestRoas.results) },
        ],
        actions: [
          'Increase daily/lifetime budget by 20–30% and monitor CPA for 3–5 days.',
          'Ensure creative is not fatigued before scaling (check frequency and CTR trend).',
        ],
        confidence: 'low',
      });
    }

    return recs;
  }, [isMeta, selectedMetaAccount, metaCampaigns, metaAdSets, metaAds, metaPlacements, metaOverview]);

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
    if (isMeta) {
      const highImpact = metaRecommendations.filter((r) => r.impact === 'high').length;
      const quickWins = metaRecommendations.filter((r) => r.effort === 'low').length;
      const losingSpend = (metaCampaigns ?? [])
        .filter((c) => c.roas > 0 && c.roas < 1.0 && c.spend >= 50)
        .reduce((acc, c) => acc + c.spend, 0);
      return { highImpact, quickWins, potentialSavings: losingSpend };
    }

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
  }, [isMeta, recommendations, metaRecommendations, keywords, searchTerms, metaCampaigns]);

  const activeRecommendations = isMeta ? metaRecommendations : recommendations;
  const isLoadingActive = isMeta ? isLoadingMetaData : isLoadingData;
  const currencyCode = isMeta
    ? safeCurrency(selectedMetaAccount?.currency)
    : safeCurrency(selectedAccount?.currencyCode);

  if (!isMeta && !selectedAccount) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Please select an account to view recommendations</p>
      </div>
    );
  }

  if (isMeta && !selectedMetaAccount) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Please connect a Meta Ads account in Settings to view recommendations</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Recommendations</h1>
        <p className="text-muted-foreground">
          Actionable insights to improve your {isMeta ? 'Meta Ads' : 'Google Ads'} performance
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
        {isLoadingActive && activeRecommendations.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading your {isMeta ? 'Meta Ads' : 'Google Ads'} data...</span>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {!isLoadingActive && activeRecommendations.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">
                No recommendations yet for the selected period. Try expanding the date range or check back after more data accrues.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {activeRecommendations.map((rec) => {
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
