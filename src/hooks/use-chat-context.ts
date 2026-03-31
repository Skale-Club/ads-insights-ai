import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useDashboard } from '@/contexts/DashboardContext';
import { useGoogleAdsReport } from '@/hooks/useGoogleAdsReport';
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
  const { selectedAccount, dateRange, dateRangePreset } = useDashboard();
  const location = useLocation();

  const { data: overview } = useGoogleAdsReport<OverviewData>('overview', { enabled });
  const { data: dailyPerformance } = useGoogleAdsReport<DailyPerformanceRow[]>('daily_performance', { enabled });
  const { data: campaigns } = useGoogleAdsReport<CampaignRow[]>('campaigns', { enabled });
  const { data: adGroups } = useGoogleAdsReport<AdGroupRow[]>('adGroups', { enabled });
  const { data: ads } = useGoogleAdsReport<AdRow[]>('ads', { enabled });
  const { data: keywords } = useGoogleAdsReport<KeywordRow[]>('keywords', { enabled });
  const { data: searchTerms } = useGoogleAdsReport<SearchTermRow[]>('search_terms', { enabled });
  const { data: audiences } = useGoogleAdsReport<AudienceRow[]>('audiences', { enabled });
  const { data: budgets } = useGoogleAdsReport<BudgetRow[]>('budgets', { enabled });
  const { data: conversions } = useGoogleAdsReport<ConversionRow[]>('conversions', { enabled });
  const { data: negativeKeywords } = useGoogleAdsReport<NegativeKeywordRow[]>('negativeKeywords', { enabled });

  const builtContext = useMemo(() => {
    if (!selectedAccount) return null;

    const dateLabel =
      dateRangePreset === 'custom'
        ? `${dateRange.from.toISOString().slice(0, 10)}..${dateRange.to.toISOString().slice(0, 10)}`
        : dateRangePreset;

    const currentSection = location.pathname.startsWith('/dashboard/')
      ? (location.pathname.replace('/dashboard/', '') || 'overview')
      : location.pathname;

    return {
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

  return campaignContext ?? builtContext;
}
