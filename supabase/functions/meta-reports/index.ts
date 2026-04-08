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
  reportType: z.enum(["overview", "campaigns", "adsets", "ads", "insights_by_placement", "daily_performance"]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "startDate must be YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "endDate must be YYYY-MM-DD"),
  userId: z.string().optional(),
});

function timeRange(startDate: string, endDate: string) {
  return encodeURIComponent(JSON.stringify({ since: startDate, until: endDate }));
}

function extractAction(actions: any[], type: string): number {
  if (!Array.isArray(actions)) return 0;
  return parseFloat(actions.find((a: any) => a.action_type === type)?.value ?? "0");
}

function extractActionValue(action_values: any[], type: string): number {
  if (!Array.isArray(action_values)) return 0;
  return parseFloat(action_values.find((a: any) => a.action_type === type)?.value ?? "0");
}

function calcRoas(action_values: any[], spend: number): number {
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

async function metaGet(url: string): Promise<any> {
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

    let { accessToken, accountId, reportType, startDate, endDate, userId } = parseResult.data;

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
      data = (json.data ?? []).map((c: any) => {
        const ins = c.insights?.data?.[0] ?? {};
        const spend = parseFloat(ins.spend ?? "0");
        const conversions = extractAction(ins.actions ?? [], "offsite_conversion.fb_pixel_purchase")
          || extractAction(ins.actions ?? [], "purchase");
        return {
          id: c.id,
          name: c.name,
          status: c.status,
          objective: c.objective,
          budgetType: c.daily_budget ? "daily" : c.lifetime_budget ? "lifetime" : "unknown",
          budget: parseFloat(c.daily_budget ?? c.lifetime_budget ?? "0") / 100,
          spend,
          impressions: parseInt(ins.impressions ?? "0"),
          clicks: parseInt(ins.clicks ?? "0"),
          ctr: parseFloat(ins.ctr ?? "0"),
          roas: calcRoas(ins.action_values ?? [], spend),
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
      data = (json.data ?? []).map((s: any) => {
        const ins = s.insights?.data?.[0] ?? {};
        const spend = parseFloat(ins.spend ?? "0");
        const targeting = s.targeting ?? {};
        const ages = targeting.age_min && targeting.age_max
          ? `${targeting.age_min}–${targeting.age_max}`
          : null;
        const geos = (targeting.geo_locations?.countries ?? []).slice(0, 2).join(", ");
        const interests = (targeting.flexible_spec?.[0]?.interests ?? [])
          .slice(0, 2).map((i: any) => i.name).join(", ");
        const targetingSummary = [ages, geos, interests].filter(Boolean).join(" · ") || "Broad";
        return {
          id: s.id,
          name: s.name,
          campaignId: s.campaign_id,
          status: s.status,
          targetingSummary,
          dailyBudget: parseFloat(s.daily_budget ?? "0") / 100,
          startTime: s.start_time,
          endTime: s.end_time,
          spend,
          impressions: parseInt(ins.impressions ?? "0"),
          ctr: parseFloat(ins.ctr ?? "0"),
          roas: calcRoas(ins.action_values ?? [], spend),
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
      data = (json.data ?? []).map((a: any) => {
        const ins = a.insights?.data?.[0] ?? {};
        const spend = parseFloat(ins.spend ?? "0");
        return {
          id: a.id,
          name: a.name,
          adsetId: a.adset_id,
          status: a.status,
          title: a.creative?.title ?? "",
          body: a.creative?.body ?? "",
          imageUrl: a.creative?.image_url ?? a.creative?.thumbnail_url ?? null,
          spend,
          impressions: parseInt(ins.impressions ?? "0"),
          ctr: parseFloat(ins.ctr ?? "0"),
          cpc: parseFloat(ins.cpc ?? "0"),
          roas: calcRoas(ins.action_values ?? [], spend),
        };
      });
    }

    else if (reportType === "insights_by_placement") {
      const fields = "impressions,clicks,spend,ctr,cpc";
      const json = await metaGet(
        `${META_API}/${accountId}/insights?fields=${fields}&breakdowns=publisher_platform,platform_position&time_range=${tr}&level=account&access_token=${token}`,
      );
      data = (json.data ?? []).map((row: any) => ({
        placement: placementLabel(row.publisher_platform ?? "", row.platform_position ?? ""),
        impressions: parseInt(row.impressions ?? "0"),
        clicks: parseInt(row.clicks ?? "0"),
        spend: parseFloat(row.spend ?? "0"),
        ctr: parseFloat(row.ctr ?? "0"),
        cpc: parseFloat(row.cpc ?? "0"),
      }));
    }

    else if (reportType === "daily_performance") {
      const fields = "spend,impressions,clicks,actions";
      const json = await metaGet(
        `${META_API}/${accountId}/insights?fields=${fields}&time_range=${tr}&time_increment=1&level=account&access_token=${token}`,
      );
      data = (json.data ?? []).map((row: any) => ({
        date: row.date_start,
        spend: parseFloat(row.spend ?? "0"),
        impressions: parseInt(row.impressions ?? "0"),
        clicks: parseInt(row.clicks ?? "0"),
        conversions: extractAction(row.actions ?? [], "offsite_conversion.fb_pixel_purchase")
          || extractAction(row.actions ?? [], "purchase"),
      }));
    }

    return new Response(
      JSON.stringify({ data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("[meta-reports] Error:", err);
    const status = err.status ?? 500;
    return new Response(
      JSON.stringify({ error: err.message ?? "Unknown error" }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
