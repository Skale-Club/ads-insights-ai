import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "npm:zod@3.22.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const META_API = "https://graph.facebook.com/v20.0";

const RequestSchema = z.object({
  accessToken: z.string().min(1, "accessToken is required"),
  accountId: z.string().regex(/^act_\d+$/, "accountId must be in format act_XXXXXXXXX"),
  reportType: z.enum(["overview", "campaigns", "adsets", "ads", "insights_by_placement", "daily_performance", "audiences", "placements", "conversions", "pixel-events", "budgets-detail"]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "startDate must be YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "endDate must be YYYY-MM-DD"),
  userId: z.string().optional(),
});

function timeRange(startDate: string, endDate: string) {
  return encodeURIComponent(JSON.stringify({ since: startDate, until: endDate }));
}

interface MetaAction {
  action_type: string;
  value: string;
}

function extractAction(actions: MetaAction[], type: string): number {
  if (!Array.isArray(actions)) return 0;
  return parseFloat(actions.find((a) => a.action_type === type)?.value ?? "0");
}

function extractActionValue(action_values: MetaAction[], type: string): number {
  if (!Array.isArray(action_values)) return 0;
  return parseFloat(action_values.find((a) => a.action_type === type)?.value ?? "0");
}

function calcRoas(action_values: MetaAction[], spend: number): number {
  if (!spend) return 0;
  const purchaseValue = extractActionValue(action_values, "offsite_conversion.fb_pixel_purchase")
    || extractActionValue(action_values, "purchase");
  return purchaseValue ? parseFloat((purchaseValue / spend).toFixed(2)) : 0;
}

function placementLabel(platform: string, position: string): string {
  const map: Record<string, string> = {
    facebook_feed: "FB Feed",
    instagram_stream: "IG Feed",
    instagram_story: "IG Stories",
    facebook_stories: "FB Stories",
    instagram_reels: "IG Reels",
    audience_network_rewarded_video: "Audience Network",
    facebook_marketplace: "FB Marketplace",
    facebook_reels: "FB Reels",
    messenger_inbox: "Messenger",
  };
  const key = `${platform}_${position}`;
  return map[key] ?? `${platform} / ${position}`;
}

async function refreshTokenIfNeeded(userId: string, accessToken: string): Promise<string> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const appId = Deno.env.get("META_APP_ID");
  const appSecret = Deno.env.get("META_APP_SECRET");
  if (!supabaseUrl || !serviceKey || !appId || !appSecret) return accessToken;

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data } = await supabase
    .from("meta_connections")
    .select("expires_at, access_token")
    .eq("user_id", userId)
    .single();

  if (!data) return accessToken;

  const expiresAt = new Date(data.expires_at);
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  if (expiresAt > sevenDaysFromNow) return data.access_token;

  // Refresh
  const resp = await fetch(
    `${META_API}/oauth/access_token` +
      `?grant_type=fb_exchange_token` +
      `&client_id=${encodeURIComponent(appId)}` +
      `&client_secret=${encodeURIComponent(appSecret)}` +
      `&fb_exchange_token=${encodeURIComponent(data.access_token)}`,
  );
  if (!resp.ok) return data.access_token;

  const refreshed = await resp.json();
  const newToken: string = refreshed.access_token;
  const newExpiry = new Date(Date.now() + (refreshed.expires_in ?? 5183944) * 1000).toISOString();

  await supabase
    .from("meta_connections")
    .update({ access_token: newToken, expires_at: newExpiry, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  console.log(`[meta-reports] Refreshed token for user ${userId}`);
  return newToken;
}

async function metaGet(url: string): Promise<Record<string, unknown>> {
  const resp = await fetch(url);
  if (!resp.ok) {
    const err = await resp.text();
    throw Object.assign(new Error(`Meta API error: ${err}`), { status: resp.status });
  }
  return resp.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const parseResult = RequestSchema.safeParse(body);

    if (!parseResult.success) {
      const messages = parseResult.error.errors.map((e) => e.message).join(", ");
      return new Response(
        JSON.stringify({ error: `Invalid request: ${messages}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let accessToken = parseResult.data.accessToken;
    const { accountId, reportType, startDate, endDate, userId } = parseResult.data;

    // Refresh token if close to expiry
    if (userId) {
      accessToken = await refreshTokenIfNeeded(userId, accessToken);
    }

    const tr = timeRange(startDate, endDate);
    const token = encodeURIComponent(accessToken);

    let data: unknown;

    if (reportType === "overview") {
      const fields = "spend,reach,impressions,clicks,ctr,cpc,cpm,actions,action_values,cost_per_action_type";
      const json = await metaGet(
        `${META_API}/${accountId}/insights?fields=${fields}&time_range=${tr}&level=account&access_token=${token}`,
      );
      const row = json.data?.[0] ?? {};
      const spend = parseFloat(row.spend ?? "0");
      const conversions = extractAction(row.actions, "offsite_conversion.fb_pixel_purchase")
        || extractAction(row.actions, "purchase");
      data = {
        spend,
        reach: parseInt(row.reach ?? "0"),
        impressions: parseInt(row.impressions ?? "0"),
        clicks: parseInt(row.clicks ?? "0"),
        ctr: parseFloat(row.ctr ?? "0"),
        cpc: parseFloat(row.cpc ?? "0"),
        cpm: parseFloat(row.cpm ?? "0"),
        roas: calcRoas(row.action_values ?? [], spend),
        conversions,
        costPerConversion: conversions > 0 ? parseFloat((spend / conversions).toFixed(2)) : 0,
      };
    }

    else if (reportType === "campaigns") {
      const fields =
        "id,name,status,objective,daily_budget,lifetime_budget" +
        `,insights.fields(spend,impressions,clicks,ctr,actions,action_values){time_range:${JSON.stringify({ since: startDate, until: endDate })}}`;
      const json = await metaGet(
        `${META_API}/${accountId}/campaigns?fields=${encodeURIComponent(fields)}&limit=200&access_token=${token}`,
      );
      data = ((json.data ?? []) as Record<string, unknown>[]).map((c) => {
        const ins = (c.insights as Record<string, unknown[]> | undefined)?.data?.[0] as Record<string, unknown> ?? {};
        const spend = parseFloat(String(ins.spend ?? "0"));
        const conversions = extractAction((ins.actions ?? []) as MetaAction[], "offsite_conversion.fb_pixel_purchase")
          || extractAction((ins.actions ?? []) as MetaAction[], "purchase");
        return {
          id: c.id,
          name: c.name,
          status: c.status,
          objective: c.objective,
          budgetType: c.daily_budget ? "daily" : c.lifetime_budget ? "lifetime" : "unknown",
          budget: parseFloat(String(c.daily_budget ?? c.lifetime_budget ?? "0")) / 100,
          spend,
          impressions: parseInt(String(ins.impressions ?? "0")),
          clicks: parseInt(String(ins.clicks ?? "0")),
          ctr: parseFloat(String(ins.ctr ?? "0")),
          roas: calcRoas((ins.action_values ?? []) as MetaAction[], spend),
          results: conversions,
        };
      });
    }

    else if (reportType === "adsets") {
      const fields =
        "id,name,campaign_id,status,targeting,daily_budget,start_time,end_time" +
        `,insights.fields(spend,impressions,ctr,actions,action_values){time_range:${JSON.stringify({ since: startDate, until: endDate })}}`;
      const json = await metaGet(
        `${META_API}/${accountId}/adsets?fields=${encodeURIComponent(fields)}&limit=200&access_token=${token}`,
      );
      data = ((json.data ?? []) as Record<string, unknown>[]).map((s) => {
        const ins = (s.insights as Record<string, unknown[]> | undefined)?.data?.[0] as Record<string, unknown> ?? {};
        const spend = parseFloat(String(ins.spend ?? "0"));
        const targeting = (s.targeting ?? {}) as Record<string, unknown>;
        const ages = targeting.age_min && targeting.age_max
          ? `${targeting.age_min}–${targeting.age_max}`
          : null;
        const geoLocs = targeting.geo_locations as Record<string, string[]> | undefined;
        const geos = (geoLocs?.countries ?? []).slice(0, 2).join(", ");
        const flexSpec = targeting.flexible_spec as Array<Record<string, Array<{name: string}>>> | undefined;
        const interests = (flexSpec?.[0]?.interests ?? [])
          .slice(0, 2).map((i) => i.name).join(", ");
        const targetingSummary = [ages, geos, interests].filter(Boolean).join(" · ") || "Broad";
        return {
          id: s.id,
          name: s.name,
          campaignId: s.campaign_id,
          status: s.status,
          targetingSummary,
          dailyBudget: parseFloat(String(s.daily_budget ?? "0")) / 100,
          startTime: s.start_time,
          endTime: s.end_time,
          spend,
          impressions: parseInt(String(ins.impressions ?? "0")),
          ctr: parseFloat(String(ins.ctr ?? "0")),
          roas: calcRoas((ins.action_values ?? []) as MetaAction[], spend),
        };
      });
    }

    else if (reportType === "ads") {
      const fields =
        "id,name,adset_id,status,creative{title,body,image_url,thumbnail_url}" +
        `,insights.fields(spend,impressions,ctr,cpc,actions,action_values){time_range:${JSON.stringify({ since: startDate, until: endDate })}}`;
      const json = await metaGet(
        `${META_API}/${accountId}/ads?fields=${encodeURIComponent(fields)}&limit=200&access_token=${token}`,
      );
      data = ((json.data ?? []) as Record<string, unknown>[]).map((a) => {
        const ins = (a.insights as Record<string, unknown[]> | undefined)?.data?.[0] as Record<string, unknown> ?? {};
        const creative = (a.creative ?? {}) as Record<string, unknown>;
        const spend = parseFloat(String(ins.spend ?? "0"));
        return {
          id: a.id,
          name: a.name,
          adsetId: a.adset_id,
          status: a.status,
          title: String(creative.title ?? ""),
          body: String(creative.body ?? ""),
          imageUrl: (creative.image_url ?? creative.thumbnail_url ?? null) as string | null,
          spend,
          impressions: parseInt(String(ins.impressions ?? "0")),
          ctr: parseFloat(String(ins.ctr ?? "0")),
          cpc: parseFloat(String(ins.cpc ?? "0")),
          roas: calcRoas((ins.action_values ?? []) as MetaAction[], spend),
        };
      });
    }

    else if (reportType === "insights_by_placement") {
      const fields = "impressions,clicks,spend,ctr,cpc";
      const json = await metaGet(
        `${META_API}/${accountId}/insights?fields=${fields}&breakdowns=publisher_platform,platform_position&time_range=${tr}&level=account&access_token=${token}`,
      );
      data = ((json.data ?? []) as Record<string, unknown>[]).map((row) => ({
        placement: placementLabel(String(row.publisher_platform ?? ""), String(row.platform_position ?? "")),
        impressions: parseInt(String(row.impressions ?? "0")),
        clicks: parseInt(String(row.clicks ?? "0")),
        spend: parseFloat(String(row.spend ?? "0")),
        ctr: parseFloat(String(row.ctr ?? "0")),
        cpc: parseFloat(String(row.cpc ?? "0")),
      }));
    }

    else if (reportType === "daily_performance") {
      const fields = "spend,impressions,clicks,actions";
      const json = await metaGet(
        `${META_API}/${accountId}/insights?fields=${fields}&time_range=${tr}&time_increment=1&level=account&access_token=${token}`,
      );
      data = ((json.data ?? []) as Record<string, unknown>[]).map((row) => ({
        date: row.date_start,
        spend: parseFloat(String(row.spend ?? "0")),
        impressions: parseInt(String(row.impressions ?? "0")),
        clicks: parseInt(String(row.clicks ?? "0")),
        conversions: extractAction((row.actions ?? []) as MetaAction[], "offsite_conversion.fb_pixel_purchase")
          || extractAction((row.actions ?? []) as MetaAction[], "purchase"),
      }));
    }

    else if (reportType === "audiences") {
      const fields = "impressions,clicks,spend,ctr,cpc,actions,action_values";
      async function fetchBreakdown(bd: string) {
        const json = await metaGet(
          `${META_API}/${accountId}/insights?fields=${fields}&breakdowns=${bd}&time_range=${tr}&level=account&access_token=${token}`,
        );
        return json.data ?? [];
      }
      const [ageGender, region, device, publisher] = await Promise.all([
        fetchBreakdown("age,gender"),
        fetchBreakdown("region"),
        fetchBreakdown("device_platform"),
        fetchBreakdown("publisher_platform"),
      ]);
      const mapRow = (label: string) => (row: Record<string, unknown>) => {
        const spend = parseFloat(String(row.spend ?? "0"));
        const conv = extractAction((row.actions ?? []) as MetaAction[], "offsite_conversion.fb_pixel_purchase")
          || extractAction((row.actions ?? []) as MetaAction[], "purchase");
        return {
          id: label,
          label,
          impressions: parseInt(String(row.impressions ?? "0")),
          clicks: parseInt(String(row.clicks ?? "0")),
          spend,
          ctr: parseFloat(String(row.ctr ?? "0")),
          cpc: parseFloat(String(row.cpc ?? "0")),
          conversions: conv,
          costPerConversion: conv > 0 ? parseFloat((spend / conv).toFixed(2)) : 0,
          roas: calcRoas((row.action_values ?? []) as MetaAction[], spend),
        };
      };
      const typedAgeGender = (ageGender as Record<string, unknown>[]);
      const typedRegion = (region as Record<string, unknown>[]);
      const typedDevice = (device as Record<string, unknown>[]);
      const typedPublisher = (publisher as Record<string, unknown>[]);
      data = {
        ageGender: typedAgeGender.map((r) => mapRow(`${String(r.age ?? "")} ${String(r.gender ?? "")}`.trim() || "Unknown")(r)),
        region: typedRegion.map((r) => mapRow(String(r.region ?? "Unknown"))(r)),
        device: typedDevice.map((r) => mapRow(String(r.device_platform ?? "Unknown"))(r)),
        publisher: typedPublisher.map((r) => mapRow(String(r.publisher_platform ?? "Unknown"))(r)),
      };
    }

    else if (reportType === "placements") {
      const fields = "impressions,clicks,spend,ctr,cpc,actions,action_values,reach,frequency";
      const json = await metaGet(
        `${META_API}/${accountId}/insights?fields=${fields}&breakdowns=publisher_platform,platform_position,impression_device&time_range=${tr}&level=account&access_token=${token}`,
      );
      data = ((json.data ?? []) as Record<string, unknown>[]).map((row, i) => {
        const spend = parseFloat(String(row.spend ?? "0"));
        const conv = extractAction((row.actions ?? []) as MetaAction[], "offsite_conversion.fb_pixel_purchase")
          || extractAction((row.actions ?? []) as MetaAction[], "purchase");
        return {
          id: `${row.publisher_platform}-${row.platform_position}-${row.impression_device}-${i}`,
          publisherPlatform: String(row.publisher_platform ?? "unknown"),
          platformPosition: String(row.platform_position ?? "unknown"),
          impressionDevice: String(row.impression_device ?? "unknown"),
          placementLabel: placementLabel(String(row.publisher_platform ?? ""), String(row.platform_position ?? "")),
          impressions: parseInt(String(row.impressions ?? "0")),
          clicks: parseInt(String(row.clicks ?? "0")),
          spend,
          ctr: parseFloat(String(row.ctr ?? "0")),
          cpc: parseFloat(String(row.cpc ?? "0")),
          reach: parseInt(String(row.reach ?? "0")),
          frequency: parseFloat(String(row.frequency ?? "0")),
          conversions: conv,
          roas: calcRoas((row.action_values ?? []) as MetaAction[], spend),
        };
      });
    }

    else if (reportType === "pixel-events") {
      const fields = "spend,actions,action_values,cost_per_action_type";
      const json = await metaGet(
        `${META_API}/${accountId}/insights?fields=${fields}&time_range=${tr}&level=account&access_token=${token}`,
      );
      const row = ((json.data ?? []) as Record<string, unknown>[])[0] ?? {};
      const actions: MetaAction[] = (row.actions ?? []) as MetaAction[];
      const actionValues: MetaAction[] = (row.action_values ?? []) as MetaAction[];
      const costPerAction: MetaAction[] = (row.cost_per_action_type ?? []) as MetaAction[];
      data = actions.map((a) => {
        const count = parseFloat(a.value ?? "0");
        const value = extractActionValue(actionValues, a.action_type);
        const cpa = parseFloat(costPerAction.find((c) => c.action_type === a.action_type)?.value ?? "0");
        return {
          id: a.action_type,
          actionType: a.action_type,
          count,
          value,
          costPerAction: cpa,
          roas: cpa > 0 && value > 0 ? parseFloat((value / (cpa * count || 1)).toFixed(2)) : 0,
        };
      });
    }

    else if (reportType === "conversions") {
      const fields = "campaign_id,campaign_name,spend,impressions,clicks,actions,action_values,cost_per_action_type";
      const json = await metaGet(
        `${META_API}/${accountId}/insights?fields=${fields}&time_range=${tr}&level=campaign&access_token=${token}`,
      );
      const rows: Record<string, unknown>[] = (json.data ?? []) as Record<string, unknown>[];
      const perCampaign = rows.map((r) => {
        const spend = parseFloat(String(r.spend ?? "0"));
        const purchases = extractAction((r.actions ?? []) as MetaAction[], "offsite_conversion.fb_pixel_purchase")
          || extractAction((r.actions ?? []) as MetaAction[], "purchase");
        const leads = extractAction((r.actions ?? []) as MetaAction[], "lead")
          || extractAction((r.actions ?? []) as MetaAction[], "offsite_conversion.fb_pixel_lead");
        const addToCart = extractAction((r.actions ?? []) as MetaAction[], "offsite_conversion.fb_pixel_add_to_cart")
          || extractAction((r.actions ?? []) as MetaAction[], "add_to_cart");
        const purchaseValue = extractActionValue((r.action_values ?? []) as MetaAction[], "offsite_conversion.fb_pixel_purchase")
          || extractActionValue((r.action_values ?? []) as MetaAction[], "purchase");
        return {
          id: r.campaign_id,
          campaignId: r.campaign_id,
          campaignName: r.campaign_name ?? r.campaign_id,
          spend,
          impressions: parseInt(String(r.impressions ?? "0")),
          clicks: parseInt(String(r.clicks ?? "0")),
          purchases,
          leads,
          addToCart,
          purchaseValue,
          costPerPurchase: purchases > 0 ? parseFloat((spend / purchases).toFixed(2)) : 0,
          roas: spend > 0 && purchaseValue > 0 ? parseFloat((purchaseValue / spend).toFixed(2)) : 0,
        };
      });
      const totals = perCampaign.reduce((acc, r) => ({
        spend: acc.spend + r.spend,
        impressions: acc.impressions + r.impressions,
        clicks: acc.clicks + r.clicks,
        addToCart: acc.addToCart + r.addToCart,
        purchases: acc.purchases + r.purchases,
        leads: acc.leads + r.leads,
        purchaseValue: acc.purchaseValue + r.purchaseValue,
      }), { spend: 0, impressions: 0, clicks: 0, addToCart: 0, purchases: 0, leads: 0, purchaseValue: 0 });
      data = {
        perCampaign,
        totals: {
          ...totals,
          costPerPurchase: totals.purchases > 0 ? parseFloat((totals.spend / totals.purchases).toFixed(2)) : 0,
          conversionRate: totals.clicks > 0 ? parseFloat(((totals.purchases / totals.clicks) * 100).toFixed(2)) : 0,
          roas: totals.spend > 0 ? parseFloat((totals.purchaseValue / totals.spend).toFixed(2)) : 0,
        },
      };
    }

    else if (reportType === "budgets-detail") {
      const campaignFields = "id,name,status,daily_budget,lifetime_budget,budget_remaining,bid_strategy" +
        `,insights.fields(spend){time_range:${JSON.stringify({ since: startDate, until: endDate })}}`;
      const adsetFields = "id,name,campaign_id,status,daily_budget,lifetime_budget,budget_remaining,bid_strategy" +
        `,insights.fields(spend){time_range:${JSON.stringify({ since: startDate, until: endDate })}}`;
      const [campJson, asJson] = await Promise.all([
        metaGet(`${META_API}/${accountId}/campaigns?fields=${encodeURIComponent(campaignFields)}&limit=200&access_token=${token}`),
        metaGet(`${META_API}/${accountId}/adsets?fields=${encodeURIComponent(adsetFields)}&limit=200&access_token=${token}`),
      ]);
      const mapBudget = (b: Record<string, unknown>, level: "campaign" | "adset") => {
        const daily = parseFloat(String(b.daily_budget ?? "0")) / 100;
        const lifetime = parseFloat(String(b.lifetime_budget ?? "0")) / 100;
        const remaining = parseFloat(String(b.budget_remaining ?? "0")) / 100;
        const amount = daily || lifetime;
        const insightsRow = ((b.insights as Record<string, unknown[]> | undefined)?.data?.[0]) as Record<string, unknown> | undefined;
        const spent = parseFloat(String(insightsRow?.spend ?? "0"));
        const utilization = amount > 0 ? parseFloat(((spent / amount) * 100).toFixed(2)) : 0;
        return {
          id: b.id,
          level,
          name: b.name,
          campaignId: b.campaign_id ?? b.id,
          status: b.status,
          budgetType: daily ? "daily" : lifetime ? "lifetime" : "none",
          amount,
          spent,
          remaining,
          utilization,
          bidStrategy: b.bid_strategy ?? null,
        };
      };
      const campaigns = ((campJson.data ?? []) as Record<string, unknown>[]).map((c) => mapBudget(c, "campaign"))
        .filter((c) => (c.amount as number) > 0);
      const adsets = ((asJson.data ?? []) as Record<string, unknown>[]).map((s) => mapBudget(s, "adset"))
        .filter((s) => (s.amount as number) > 0);
      data = { campaigns, adsets };
    }

    return new Response(
      JSON.stringify({ data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[meta-reports] Error:", err);
    const errObj = err as { status?: number; message?: string };
    const status = errObj.status ?? 500;
    return new Response(
      JSON.stringify({ error: errObj.message ?? "Unknown error" }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
