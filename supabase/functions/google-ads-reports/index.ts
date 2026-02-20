import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const API_VERSION = "v20";

type ReportType = "overview" | "campaigns" | "keywords" | "search_terms" | "daily_performance" | "adGroups" | "ads" | "audiences" | "budgets" | "conversions";

function buildQuery(reportType: ReportType, startDate: string, endDate: string): string {
  switch (reportType) {
    case "overview":
      return `
        SELECT
          metrics.cost_micros,
          metrics.conversions,
          metrics.conversions_value,
          metrics.impressions,
          metrics.clicks
        FROM customer
        WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      `;

    case "daily_performance":
      return `
        SELECT
          segments.date,
          metrics.cost_micros,
          metrics.conversions,
          metrics.impressions,
          metrics.clicks
        FROM customer
        WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        ORDER BY segments.date ASC
      `;

    case "campaigns":
      return `
        SELECT
          campaign.id,
          campaign.name,
          campaign.status,
          campaign.advertising_channel_type,
          campaign_budget.amount_micros,
          metrics.cost_micros,
          metrics.impressions,
          metrics.clicks,
          metrics.conversions,
          metrics.conversions_value
        FROM campaign
        WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
          AND campaign.status != 'REMOVED'
      `;

    case "keywords":
      return `
        SELECT
          ad_group_criterion.criterion_id,
          ad_group_criterion.keyword.text,
          ad_group_criterion.keyword.match_type,
          ad_group_criterion.status,
          ad_group_criterion.quality_info.quality_score,
          metrics.cost_micros,
          metrics.impressions,
          metrics.clicks,
          metrics.conversions,
          metrics.average_cpc,
          metrics.search_impression_share
        FROM keyword_view
        WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
          AND ad_group_criterion.status != 'REMOVED'
      `;

    case "search_terms":
      return `
        SELECT
          search_term_view.search_term,
          search_term_view.ad_group,
          segments.keyword.info.text,
          segments.keyword.info.match_type,
          metrics.cost_micros,
          metrics.impressions,
          metrics.clicks,
          metrics.conversions
        FROM search_term_view
        WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      `;

    case "adGroups":
      return `
        SELECT
          ad_group.id,
          ad_group.name,
          ad_group.status,
          campaign.name,
          metrics.cost_micros,
          metrics.impressions,
          metrics.clicks,
          metrics.conversions,
          metrics.average_cpc
        FROM ad_group
        WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
          AND ad_group.status != 'REMOVED'
      `;

    default:
      throw new Error(`Unknown report type: ${reportType}`);
  }
}

function microsToAmount(micros: string | number): number {
  return Number(micros) / 1_000_000;
}

function transformOverview(results: any[]) {
  let totalCost = 0;
  let totalConversions = 0;
  let totalConversionsValue = 0;
  let totalImpressions = 0;
  let totalClicks = 0;

  for (const row of results) {
    const m = row.metrics;
    totalCost += microsToAmount(m.costMicros || 0);
    totalConversions += Number(m.conversions || 0);
    totalConversionsValue += Number(m.conversionsValue || 0);
    totalImpressions += Number(m.impressions || 0);
    totalClicks += Number(m.clicks || 0);
  }

  const cpa = totalConversions > 0 ? totalCost / totalConversions : 0;
  const roas = totalCost > 0 ? totalConversionsValue / totalCost : 0;
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  return {
    spend: totalCost,
    conversions: totalConversions,
    conversionsValue: totalConversionsValue,
    impressions: totalImpressions,
    clicks: totalClicks,
    cpa,
    roas,
    ctr,
  };
}

function transformDailyPerformance(results: any[]) {
  const dailyMap: Record<string, { date: string; conversions: number; spend: number; impressions: number; clicks: number }> = {};

  for (const row of results) {
    const date = row.segments?.date || "unknown";
    if (!dailyMap[date]) {
      dailyMap[date] = { date, conversions: 0, spend: 0, impressions: 0, clicks: 0 };
    }
    dailyMap[date].conversions += Number(row.metrics?.conversions || 0);
    dailyMap[date].spend += microsToAmount(row.metrics?.costMicros || 0);
    dailyMap[date].impressions += Number(row.metrics?.impressions || 0);
    dailyMap[date].clicks += Number(row.metrics?.clicks || 0);
  }

  return Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
}

function transformCampaigns(results: any[]) {
  const campaignMap: Record<string, any> = {};

  for (const row of results) {
    const id = row.campaign?.id;
    if (!id) continue;

    if (!campaignMap[id]) {
      const status = (row.campaign.status || "").toLowerCase();
      const channelType = (row.campaign.advertisingChannelType || "").toLowerCase();
      const typeMap: Record<string, string> = {
        search: "search",
        display: "display",
        shopping: "shopping",
        video: "video",
        multi_channel: "pmax",
        performance_max: "pmax",
      };

      campaignMap[id] = {
        id: String(id),
        name: row.campaign.name || `Campaign ${id}`,
        status: status === "enabled" ? "enabled" : "paused",
        type: typeMap[channelType] || channelType,
        budget: microsToAmount(row.campaignBudget?.amountMicros || 0),
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        conversionsValue: 0,
      };
    }

    const c = campaignMap[id];
    c.spend += microsToAmount(row.metrics?.costMicros || 0);
    c.impressions += Number(row.metrics?.impressions || 0);
    c.clicks += Number(row.metrics?.clicks || 0);
    c.conversions += Number(row.metrics?.conversions || 0);
    c.conversionsValue += Number(row.metrics?.conversionsValue || 0);
  }

  return Object.values(campaignMap).map((c: any) => ({
    ...c,
    ctr: c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
    cpa: c.conversions > 0 ? c.spend / c.conversions : 0,
    roas: c.spend > 0 ? c.conversionsValue / c.spend : 0,
  }));
}

function transformKeywords(results: any[]) {
  const keywordMap: Record<string, any> = {};

  for (const row of results) {
    const id = row.adGroupCriterion?.criterionId;
    if (!id) continue;

    if (!keywordMap[id]) {
      const matchType = (row.adGroupCriterion?.keyword?.matchType || "").toLowerCase();
      const status = (row.adGroupCriterion?.status || "").toLowerCase();

      keywordMap[id] = {
        id: String(id),
        keyword: row.adGroupCriterion?.keyword?.text || `Keyword ${id}`,
        matchType: matchType === "exact" ? "exact" : matchType === "phrase" ? "phrase" : "broad",
        status: status === "enabled" ? "enabled" : "paused",
        qualityScore: row.adGroupCriterion?.qualityInfo?.qualityScore || null,
        searchImpressionShare: null,
        impressions: 0,
        clicks: 0,
        cost: 0,
        conversions: 0,
        avgCpc: 0,
      };
    }

    const k = keywordMap[id];
    k.impressions += Number(row.metrics?.impressions || 0);
    k.clicks += Number(row.metrics?.clicks || 0);
    k.cost += microsToAmount(row.metrics?.costMicros || 0);
    k.conversions += Number(row.metrics?.conversions || 0);

    // Search impression share (take last non-null value)
    if (row.metrics?.searchImpressionShare) {
      k.searchImpressionShare = Number(row.metrics.searchImpressionShare) * 100;
    }
  }

  return Object.values(keywordMap).map((k: any) => ({
    ...k,
    ctr: k.impressions > 0 ? (k.clicks / k.impressions) * 100 : 0,
    avgCpc: k.clicks > 0 ? k.cost / k.clicks : 0,
    cpa: k.conversions > 0 ? k.cost / k.conversions : 0,
    conversionRate: k.clicks > 0 ? (k.conversions / k.clicks) * 100 : 0,
  }));
}

function transformSearchTerms(results: any[]) {
  const termMap: Record<string, any> = {};

  for (const row of results) {
    const term = row.searchTermView?.searchTerm;
    if (!term) continue;

    const key = term;
    if (!termMap[key]) {
      termMap[key] = {
        id: key,
        searchTerm: term,
        matchedKeyword: row.segments?.keyword?.info?.text || "",
        matchType: (row.segments?.keyword?.info?.matchType || "").toLowerCase(),
        impressions: 0,
        clicks: 0,
        cost: 0,
        conversions: 0,
      };
    }

    const t = termMap[key];
    t.impressions += Number(row.metrics?.impressions || 0);
    t.clicks += Number(row.metrics?.clicks || 0);
    t.cost += microsToAmount(row.metrics?.costMicros || 0);
    t.conversions += Number(row.metrics?.conversions || 0);
  }

  return Object.values(termMap).map((t: any) => ({
    ...t,
    ctr: t.impressions > 0 ? (t.clicks / t.impressions) * 100 : 0,
    cpa: t.conversions > 0 ? t.cost / t.conversions : 0,
  }));
}

function transformAdGroups(results: any[]) {
  const adGroupMap: Record<string, any> = {};

  for (const row of results) {
    const id = row.adGroup?.id;
    if (!id) continue;

    if (!adGroupMap[id]) {
      const status = (row.adGroup?.status || "").toLowerCase();
      
      adGroupMap[id] = {
        id: String(id),
        name: row.adGroup?.name || `Ad Group ${id}`,
        campaignName: row.campaign?.name || "",
        status: status === "enabled" ? "enabled" : "paused",
        impressions: 0,
        clicks: 0,
        cost: 0,
        conversions: 0,
        avgCpc: 0,
      };
    }

    const ag = adGroupMap[id];
    ag.impressions += Number(row.metrics?.impressions || 0);
    ag.clicks += Number(row.metrics?.clicks || 0);
    ag.cost += microsToAmount(row.metrics?.costMicros || 0);
    ag.conversions += Number(row.metrics?.conversions || 0);
  }

  return Object.values(adGroupMap).map((ag: any) => ({
    ...ag,
    ctr: ag.impressions > 0 ? (ag.clicks / ag.impressions) * 100 : 0,
    avgCpc: ag.clicks > 0 ? ag.cost / ag.clicks : 0,
    cpa: ag.conversions > 0 ? ag.cost / ag.conversions : 0,
  }));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const developerToken = Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN");
    const loginCustomerId = Deno.env.get("GOOGLE_ADS_LOGIN_CUSTOMER_ID");

    if (!developerToken) {
      throw new Error("GOOGLE_ADS_DEVELOPER_TOKEN not configured");
    }

    const { providerToken, customerId, reportType, startDate, endDate } = await req.json();

    if (!providerToken) throw new Error("Provider token not provided");
    if (!customerId) throw new Error("Customer ID not provided");
    if (!reportType) throw new Error("Report type not provided");
    if (!startDate || !endDate) throw new Error("Date range not provided");

    console.log(`[google-ads-reports] type=${reportType}, customer=${customerId}, range=${startDate}..${endDate}`);

    const cleanCustomerId = String(customerId).replace(/-/g, "");
    const query = buildQuery(reportType as ReportType, startDate, endDate);

    const headers: Record<string, string> = {
      "Authorization": `Bearer ${providerToken}`,
      "developer-token": developerToken,
      "Content-Type": "application/json",
    };

    if (loginCustomerId) {
      headers["login-customer-id"] = loginCustomerId.replace(/-/g, "");
    }

    const searchResponse = await fetch(
      `https://googleads.googleapis.com/${API_VERSION}/customers/${cleanCustomerId}/googleAds:searchStream`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ query }),
      }
    );

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error(`[google-ads-reports] API error (${searchResponse.status}):`, errorText);
      return new Response(
        JSON.stringify({ error: `Google Ads API Error (${searchResponse.status}): ${errorText}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const searchData = await searchResponse.json();
    const results = searchData.reduce((acc: any[], batch: any) => {
      return acc.concat(batch.results || []);
    }, []);

    console.log(`[google-ads-reports] Got ${results.length} results for ${reportType}`);

    let data: any;
    switch (reportType) {
      case "overview":
        data = transformOverview(results);
        break;
      case "daily_performance":
        data = transformDailyPerformance(results);
        break;
      case "campaigns":
        data = transformCampaigns(results);
        break;
      case "keywords":
        data = transformKeywords(results);
        break;
      case "search_terms":
        data = transformSearchTerms(results);
        break;
      case "adGroups":
        data = transformAdGroups(results);
        break;
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }

    return new Response(JSON.stringify({ data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[google-ads-reports] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
