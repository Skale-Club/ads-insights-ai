import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useDashboard } from '@/contexts/DashboardContext';
import { useGoogleAdsReport } from '@/hooks/useGoogleAdsReport';
import { useMetaReport } from '@/hooks/useMetaReport';
import type {
  AdGroupRow,
  AdRow,
  AudienceRow,
  BudgetRow,
  CampaignRow,
  ConversionRow,
  DailyPerformanceRow,
  KeywordRow,
  NegativeKeywordRow,
  OverviewData,
  SearchTermRow,
} from '@/components/dashboard/chat/types';

export function useChatContext(campaignContext?: unknown, enabled: boolean = true) {
  const { selectedAccount, selectedMetaAccount, dateRange, dateRangePreset, platform } = useDashboard();
  const location = useLocation();

  const isGoogle = platform === 'google';
  const isMeta = platform === 'meta';

  // Google reports — disabled when Meta is active
  const { data: overview } = useGoogleAdsReport<OverviewData>('overview', { enabled: enabled && isGoogle });
  const { data: dailyPerformance } = useGoogleAdsReport<DailyPerformanceRow[]>('daily_performance', { enabled: enabled && isGoogle });
  const { data: campaigns } = useGoogleAdsReport<CampaignRow[]>('campaigns', { enabled: enabled && isGoogle });
  const { data: adGroups } = useGoogleAdsReport<AdGroupRow[]>('adGroups', { enabled: enabled && isGoogle });
  const { data: ads } = useGoogleAdsReport<AdRow[]>('ads', { enabled: enabled && isGoogle });
  const { data: keywords } = useGoogleAdsReport<KeywordRow[]>('keywords', { enabled: enabled && isGoogle });
  const { data: searchTerms } = useGoogleAdsReport<SearchTermRow[]>('search_terms', { enabled: enabled && isGoogle });
  const { data: audiences } = useGoogleAdsReport<AudienceRow[]>('audiences', { enabled: enabled && isGoogle });
  const { data: budgets } = useGoogleAdsReport<BudgetRow[]>('budgets', { enabled: enabled && isGoogle });
  const { data: conversions } = useGoogleAdsReport<ConversionRow[]>('conversions', { enabled: enabled && isGoogle });
  const { data: negativeKeywords } = useGoogleAdsReport<NegativeKeywordRow[]>('negativeKeywords', { enabled: enabled && isGoogle });

  // Meta reports — disabled when Google is active
  const { data: metaOverview } = useMetaReport<any>('overview', { enabled: enabled && isMeta });
  const { data: metaCampaigns } = useMetaReport<any[]>('campaigns', { enabled: enabled && isMeta });
  const { data: metaAdSets } = useMetaReport<any[]>('adsets', { enabled: enabled && isMeta });
  const { data: metaAds } = useMetaReport<any[]>('ads', { enabled: enabled && isMeta });
  const { data: metaPlacements } = useMetaReport<any[]>('insights_by_placement', { enabled: enabled && isMeta });
  const { data: metaDaily } = useMetaReport<any[]>('daily_performance', { enabled: enabled && isMeta });

  const googleContext = useMemo(() => {
    if (!isGoogle || !selectedAccount) return null;

    const dateLabel =
      dateRangePreset === 'custom'
        ? `${dateRange.from.toISOString().slice(0, 10)}..${dateRange.to.toISOString().slice(0, 10)}`
        : dateRangePreset;

    const currentSection = location.pathname.startsWith('/dashboard/')
      ? (location.pathname.replace('/dashboard/', '') || 'overview')
      : location.pathname;

    return {
      platform: 'google',
      accountName: selectedAccount.name,
      accountId: selectedAccount.id,
      currencyCode: selectedAccount.currencyCode,
      uiContext: {
        currentPath: location.pathname,
        currentSection,
        dateRangePreset,
      },
      dateRange: dateLabel,
      dataCoverage: {
        campaigns: campaigns?.length || 0,
        adGroups: adGroups?.length || 0,
        ads: ads?.length || 0,
        keywords: keywords?.length || 0,
        searchTerms: searchTerms?.length || 0,
        audiences: audiences?.length || 0,
        budgets: budgets?.length || 0,
        conversions: conversions?.length || 0,
        negativeKeywords: negativeKeywords?.length || 0,
        dailyPerformanceDays: dailyPerformance?.length || 0,
      },
      overallMetrics: overview || null,
      dailyPerformance: (dailyPerformance || [])
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30)
        .map((row) => ({
          date: row.date,
          spend: row.spend,
          clicks: row.clicks,
          impressions: row.impressions,
          conversions: row.conversions,
        })),
      campaigns: (campaigns || [])
        .slice()
        .sort((a, b) => (b.spend || 0) - (a.spend || 0))
        .slice(0, 25)
        .map((row) => ({
          name: row.name,
          spend: row.spend,
          conversions: row.conversions,
          cpa: row.cpa,
          roas: row.roas ?? null,
          ctr: row.ctr,
          biddingStrategy: row.biddingStrategy || 'Manual',
        })),
      adGroups: (adGroups || [])
        .slice()
        .sort((a, b) => (b.cost || 0) - (a.cost || 0))
        .slice(0, 25)
        .map((row) => ({
          name: row.name,
          campaignName: row.campaignName,
          status: row.status,
          cost: row.cost,
          conversions: row.conversions,
          ctr: row.ctr,
          cpa: row.cpa,
        })),
      ads: (ads || [])
        .slice()
        .sort((a, b) => (b.cost || 0) - (a.cost || 0))
        .slice(0, 25)
        .map((row) => ({
          name: row.name,
          campaign: row.campaign,
          adGroup: row.adGroup,
          type: row.type,
          status: row.status,
          cost: row.cost,
          conversions: row.conversions,
          ctr: row.ctr,
          headlines: row.headlines || [],
          descriptions: row.descriptions || [],
        })),
      topKeywords: (keywords || [])
        .slice()
        .sort((a, b) => (b.cost || 0) - (a.cost || 0))
        .slice(0, 25)
        .map((row) => ({
          keyword: row.keyword,
          matchType: row.matchType,
          spend: row.cost,
          conversions: row.conversions,
          cpa: row.cpa,
          ctr: row.ctr,
        })),
      searchTermsSummary: (searchTerms || []).reduce(
        (acc, row) => {
          const spend = row.cost || 0;
          const conversionsCount = row.conversions || 0;
          acc.totalTerms += 1;
          acc.totalSpend += spend;
          acc.totalConversions += conversionsCount;
          if (conversionsCount > 0) {
            acc.termsWithConversions += 1;
          } else {
            acc.termsWithoutConversions += 1;
            acc.spendWithoutConversions += spend;
          }
          return acc;
        },
        {
          totalTerms: 0,
          termsWithConversions: 0,
          termsWithoutConversions: 0,
          totalSpend: 0,
          totalConversions: 0,
          spendWithoutConversions: 0,
        },
      ),
      searchTerms: (searchTerms || [])
        .slice()
        .sort((a, b) => (b.cost || 0) - (a.cost || 0))
        .slice(0, 50)
        .map((row) => ({
          searchTerm: row.searchTerm,
          matchedKeyword: row.matchedKeyword,
          matchType: row.matchType,
          impressions: row.impressions,
          clicks: row.clicks,
          cost: row.cost,
          conversions: row.conversions,
          ctr: row.ctr,
          cpa: row.cpa,
        })),
      audiences: (audiences || [])
        .slice()
        .sort((a, b) => (b.cost || 0) - (a.cost || 0))
        .slice(0, 20)
        .map((row) => ({
          name: row.name,
          type: row.type,
          status: row.status,
          cost: row.cost,
          conversions: row.conversions,
          ctr: row.ctr,
          cpa: row.cpa,
        })),
      budgets: (budgets || [])
        .slice()
        .sort((a, b) => (b.utilization || 0) - (a.utilization || 0))
        .slice(0, 20)
        .map((row) => ({
          name: row.name,
          status: row.status,
          amount: row.amount,
          spent: row.spent,
          remaining: row.remaining,
          utilization: row.utilization,
          campaignsCount: row.campaignsCount,
        })),
      conversions: (conversions || [])
        .slice()
        .sort((a, b) => (b.conversions || 0) - (a.conversions || 0))
        .slice(0, 25)
        .map((row) => ({
          name: row.name,
          category: row.category,
          type: row.type,
          status: row.status,
          primaryForGoal: row.primaryForGoal,
          conversions: row.conversions,
          value: row.value,
          cpa: row.cpa,
          roas: row.roas,
        })),
      existingNegativeKeywords: (negativeKeywords || [])
        .slice()
        .sort((a, b) => String(a.keyword || '').localeCompare(String(b.keyword || '')))
        .slice(0, 120)
        .map((row) => ({
          keyword: row.keyword,
          matchType: row.matchType,
          level: row.level || 'unknown',
          campaign: row.campaign || '',
          adGroup: row.adGroup || '',
          status: row.status,
        })),
      negativeKeywordSuggestions: (searchTerms || [])
        .filter((row) => (row.conversions || 0) === 0)
        .filter((row) => (row.cost || 0) >= 5 || (row.clicks || 0) >= 25)
        .slice()
        .sort((a, b) => (b.cost || 0) - (a.cost || 0))
        .slice(0, 10)
        .map((row) => row.searchTerm),
    };
  }, [
    isGoogle,
    selectedAccount,
    dateRange,
    dateRangePreset,
    location.pathname,
    overview,
    dailyPerformance,
    campaigns,
    adGroups,
    ads,
    keywords,
    searchTerms,
    audiences,
    budgets,
    conversions,
    negativeKeywords,
  ]);

  const metaContext = useMemo(() => {
    if (!isMeta || !selectedMetaAccount) return null;

    const dateLabel =
      dateRangePreset === 'custom'
        ? `${dateRange.from.toISOString().slice(0, 10)}..${dateRange.to.toISOString().slice(0, 10)}`
        : dateRangePreset;

    return {
      platform: 'meta',
      accountName: selectedMetaAccount.account_name,
      accountId: selectedMetaAccount.account_id,
      currency: selectedMetaAccount.currency,
      dateRange: dateLabel,
      overallMetrics: metaOverview ?? null,
      dailyPerformance: (metaDaily ?? [])
        .slice()
        .sort((a: any) => a.date)
        .slice(-30),
      campaigns: (metaCampaigns ?? [])
        .slice()
        .sort((a: any, b: any) => (b.spend || 0) - (a.spend || 0))
        .slice(0, 25)
        .map((c: any) => ({
          id: c.id,
          name: c.name,
          status: c.status,
          objective: c.objective,
          budgetType: c.budgetType,
          budget: c.budget,
          spend: c.spend,
          impressions: c.impressions,
          ctr: c.ctr,
          roas: c.roas,
          results: c.results,
        })),
      adSets: (metaAdSets ?? [])
        .slice()
        .sort((a: any, b: any) => (b.spend || 0) - (a.spend || 0))
        .slice(0, 25)
        .map((s: any) => ({
          id: s.id,
          name: s.name,
          status: s.status,
          targetingSummary: s.targetingSummary,
          dailyBudget: s.dailyBudget,
          spend: s.spend,
          impressions: s.impressions,
          ctr: s.ctr,
          roas: s.roas,
        })),
      ads: (metaAds ?? [])
        .slice()
        .sort((a: any, b: any) => (b.spend || 0) - (a.spend || 0))
        .slice(0, 25)
        .map((a: any) => ({
          id: a.id,
          name: a.name,
          status: a.status,
          title: a.title,
          body: a.body,
          spend: a.spend,
          impressions: a.impressions,
          ctr: a.ctr,
          cpc: a.cpc,
          roas: a.roas,
        })),
      placements: (metaPlacements ?? [])
        .slice()
        .sort((a: any, b: any) => (b.spend || 0) - (a.spend || 0)),
    };
  }, [
    isMeta,
    selectedMetaAccount,
    dateRange,
    dateRangePreset,
    metaOverview,
    metaCampaigns,
    metaAdSets,
    metaAds,
    metaPlacements,
    metaDaily,
  ]);

  if (campaignContext !== undefined) return campaignContext;
  return isMeta ? metaContext : googleContext;
}
