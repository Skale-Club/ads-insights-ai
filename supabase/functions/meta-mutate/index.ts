import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "npm:zod@3.22.4";
import { corsHeadersFor, preflightResponse } from "../_shared/cors.ts";

const META_API = "https://graph.facebook.com/v20.0";

const RequestSchema = z.object({
  accessToken: z.string().min(1, "accessToken is required"),
  accountId: z.string().optional(),
  action: z.enum([
    "pauseCampaign", "enableCampaign", "updateDailyBudget", "updateLifetimeBudget",
    "createCampaign", "createAdSet", "createAd",
    "duplicateCampaign", "duplicateAdSet",
    "updateTargeting", "updateBidStrategy", "updateCreative", "updateSchedule",
    "createCustomAudience", "createLookalikeAudience",
    "batchPauseEnable", "createSplitTest",
  ]),
  campaignId: z.string().optional(),
  adSetId: z.string().optional(),
  adId: z.string().optional(),
  creativeId: z.string().optional(),
  audienceId: z.string().optional(),
  amountCents: z.number().positive().optional(),
  name: z.string().optional(),
  objective: z.string().optional(),
  status: z.enum(["ACTIVE", "PAUSED"]).optional(),
  targeting: z.record(z.unknown()).optional(),
  bidStrategy: z.string().optional(),
  bidAmountCents: z.number().positive().optional(),
  optimizationGoal: z.string().optional(),
  billingEvent: z.string().optional(),
  dailyBudgetCents: z.number().positive().optional(),
  lifetimeBudgetCents: z.number().positive().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  adsetSchedule: z.array(z.unknown()).optional(),
  creative: z.record(z.unknown()).optional(),
  deep: z.boolean().optional(),
  entityIds: z.array(z.string()).max(50).optional(),
  entityType: z.enum(["campaign", "adset", "ad"]).optional(),
  audienceSourceType: z.string().optional(),
  audienceRules: z.record(z.unknown()).optional(),
  sourceAudienceId: z.string().optional(),
  lookalikeSpec: z.record(z.unknown()).optional(),
  splitTestName: z.string().optional(),
  splitTestType: z.string().optional(),
  splitTestCells: z.array(z.unknown()).optional(),
});

function resolveAccountId(accountId: string): string {
  const stripped = accountId.replace(/^act_/, "");
  return `act_${stripped}`;
}

async function wrapMetaError(resp: Response, body: string, corsHeaders: Record<string, string>): Promise<Response> {
  let parsed: { error?: { code?: number; error_subcode?: number; message?: string; fbtrace_id?: string } } | null = null;
  try {
    parsed = JSON.parse(body);
  } catch (_) {
    // ignore parse error
  }

  if (parsed?.error?.code === 200 && parsed?.error?.error_subcode === 1487) {
    return new Response(
      JSON.stringify({
        error:
          "Custom audiences require Meta App Review approval (ads_management_standard_access + custom_audiences scope). Contact support to enable.",
      }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({
      error: "Meta API error: " + (parsed?.error?.message || body),
      code: parsed?.error?.code,
      fb_trace_id: parsed?.error?.fbtrace_id,
    }),
    { status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse(req);
  const corsHeaders = corsHeadersFor(req);

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

    const {
      accessToken,
      accountId,
      action,
      campaignId,
      adSetId,
      adId,
      creativeId,
      amountCents,
      name,
      objective,
      status,
      targeting,
      bidStrategy,
      bidAmountCents,
      optimizationGoal,
      billingEvent,
      dailyBudgetCents,
      lifetimeBudgetCents,
      startTime,
      endTime,
      adsetSchedule,
      creative,
      deep,
      entityIds,
      entityType,
      audienceSourceType,
      audienceRules,
      sourceAudienceId,
      lookalikeSpec,
      splitTestName,
      splitTestType,
      splitTestCells,
    } = parseResult.data;
    const token = encodeURIComponent(accessToken);

    // ── Existing handlers (unchanged) ──────────────────────────────────────

    if (action === "pauseCampaign") {
      if (!campaignId) {
        return new Response(
          JSON.stringify({ error: "Invalid request: campaignId is required for pauseCampaign" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const resp = await fetch(
        `${META_API}/${campaignId}?status=PAUSED&access_token=${token}`,
        { method: "POST" },
      );
      if (!resp.ok) {
        const err = await resp.text();
        return new Response(
          JSON.stringify({ error: `Meta API error: ${err}` }),
          { status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      console.log(`[meta-mutate] Paused campaign ${campaignId}`);
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "enableCampaign") {
      if (!campaignId) {
        return new Response(
          JSON.stringify({ error: "Invalid request: campaignId is required for enableCampaign" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const resp = await fetch(
        `${META_API}/${campaignId}?status=ACTIVE&access_token=${token}`,
        { method: "POST" },
      );
      if (!resp.ok) {
        const err = await resp.text();
        return new Response(
          JSON.stringify({ error: `Meta API error: ${err}` }),
          { status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      console.log(`[meta-mutate] Enabled campaign ${campaignId}`);
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "updateDailyBudget") {
      if (!adSetId) {
        return new Response(
          JSON.stringify({ error: "Invalid request: adSetId is required for updateDailyBudget" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!amountCents) {
        return new Response(
          JSON.stringify({ error: "Invalid request: amountCents is required for updateDailyBudget" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const resp = await fetch(
        `${META_API}/${adSetId}?daily_budget=${amountCents}&access_token=${token}`,
        { method: "POST" },
      );
      if (!resp.ok) {
        const err = await resp.text();
        return new Response(
          JSON.stringify({ error: `Meta API error: ${err}` }),
          { status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      console.log(`[meta-mutate] Updated daily budget for adset ${adSetId} to ${amountCents} cents`);
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "updateLifetimeBudget") {
      if (!campaignId) {
        return new Response(
          JSON.stringify({ error: "Invalid request: campaignId is required for updateLifetimeBudget" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!amountCents) {
        return new Response(
          JSON.stringify({ error: "Invalid request: amountCents is required for updateLifetimeBudget" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const resp = await fetch(
        `${META_API}/${campaignId}?lifetime_budget=${amountCents}&access_token=${token}`,
        { method: "POST" },
      );
      if (!resp.ok) {
        const err = await resp.text();
        return new Response(
          JSON.stringify({ error: `Meta API error: ${err}` }),
          { status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      console.log(`[meta-mutate] Updated lifetime budget for campaign ${campaignId} to ${amountCents} cents`);
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Task 1: Lifecycle creation handlers ────────────────────────────────

    if (action === "createCampaign") {
      if (!accountId) {
        return new Response(
          JSON.stringify({ error: "Invalid request: accountId is required for createCampaign" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!name) {
        return new Response(
          JSON.stringify({ error: "Invalid request: name is required for createCampaign" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!objective) {
        return new Response(
          JSON.stringify({ error: "Invalid request: objective is required for createCampaign (e.g. OUTCOME_TRAFFIC, OUTCOME_SALES, OUTCOME_LEADS)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const params = new URLSearchParams({
        name,
        objective,
        status: status || "PAUSED",
        special_ad_categories: "[]",
        access_token: accessToken,
      });
      if (dailyBudgetCents) params.set("daily_budget", String(dailyBudgetCents));
      if (lifetimeBudgetCents) params.set("lifetime_budget", String(lifetimeBudgetCents));
      if (bidStrategy) params.set("bid_strategy", bidStrategy);

      const resp = await fetch(
        `${META_API}/${resolveAccountId(accountId)}/campaigns`,
        { method: "POST", body: params, headers: { "Content-Type": "application/x-www-form-urlencoded" } },
      );
      const respBody = await resp.text();
      if (!resp.ok) return wrapMetaError(resp, respBody, corsHeaders);

      const result = JSON.parse(respBody);
      console.log(`[meta-mutate] Created campaign ${result.id}`);
      return new Response(
        JSON.stringify({ success: true, campaignId: result.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "createAdSet") {
      if (!accountId) {
        return new Response(
          JSON.stringify({ error: "Invalid request: accountId is required for createAdSet" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!campaignId) {
        return new Response(
          JSON.stringify({ error: "Invalid request: campaignId is required for createAdSet" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!name) {
        return new Response(
          JSON.stringify({ error: "Invalid request: name is required for createAdSet" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!optimizationGoal) {
        return new Response(
          JSON.stringify({ error: "Invalid request: optimizationGoal is required for createAdSet" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!billingEvent) {
        return new Response(
          JSON.stringify({ error: "Invalid request: billingEvent is required for createAdSet" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!dailyBudgetCents && !lifetimeBudgetCents) {
        return new Response(
          JSON.stringify({ error: "Invalid request: dailyBudgetCents or lifetimeBudgetCents is required for createAdSet" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!targeting) {
        return new Response(
          JSON.stringify({ error: "Invalid request: targeting is required for createAdSet" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const params = new URLSearchParams({
        campaign_id: campaignId,
        name,
        optimization_goal: optimizationGoal,
        billing_event: billingEvent,
        targeting: JSON.stringify(targeting),
        status: status || "PAUSED",
        access_token: accessToken,
      });
      if (dailyBudgetCents) params.set("daily_budget", String(dailyBudgetCents));
      if (lifetimeBudgetCents) params.set("lifetime_budget", String(lifetimeBudgetCents));
      if (bidStrategy) params.set("bid_strategy", bidStrategy);
      if (bidAmountCents) params.set("bid_amount", String(bidAmountCents));
      if (startTime) params.set("start_time", startTime);
      if (endTime) params.set("end_time", endTime);

      const resp = await fetch(
        `${META_API}/${resolveAccountId(accountId)}/adsets`,
        { method: "POST", body: params, headers: { "Content-Type": "application/x-www-form-urlencoded" } },
      );
      const respBody = await resp.text();
      if (!resp.ok) return wrapMetaError(resp, respBody, corsHeaders);

      const result = JSON.parse(respBody);
      console.log(`[meta-mutate] Created adset ${result.id}`);
      return new Response(
        JSON.stringify({ success: true, adSetId: result.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "createAd") {
      if (!accountId) {
        return new Response(
          JSON.stringify({ error: "Invalid request: accountId is required for createAd" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!adSetId) {
        return new Response(
          JSON.stringify({ error: "Invalid request: adSetId is required for createAd" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!name) {
        return new Response(
          JSON.stringify({ error: "Invalid request: name is required for createAd" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!creative) {
        return new Response(
          JSON.stringify({ error: "Invalid request: creative is required for createAd (provide creative_id or inline object_story_spec)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const params = new URLSearchParams({
        name,
        adset_id: adSetId,
        creative: JSON.stringify(creative),
        status: status || "PAUSED",
        access_token: accessToken,
      });

      const resp = await fetch(
        `${META_API}/${resolveAccountId(accountId)}/ads`,
        { method: "POST", body: params, headers: { "Content-Type": "application/x-www-form-urlencoded" } },
      );
      const respBody = await resp.text();
      if (!resp.ok) return wrapMetaError(resp, respBody, corsHeaders);

      const result = JSON.parse(respBody);
      console.log(`[meta-mutate] Created ad ${result.id}`);
      return new Response(
        JSON.stringify({ success: true, adId: result.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "updateSchedule") {
      if (!adSetId) {
        return new Response(
          JSON.stringify({ error: "Invalid request: adSetId is required for updateSchedule" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const params = new URLSearchParams({ access_token: accessToken });
      if (startTime) params.set("start_time", startTime);
      if (endTime) params.set("end_time", endTime);
      if (adsetSchedule) params.set("adset_schedule", JSON.stringify(adsetSchedule));

      const resp = await fetch(
        `${META_API}/${adSetId}`,
        { method: "POST", body: params, headers: { "Content-Type": "application/x-www-form-urlencoded" } },
      );
      const respBody = await resp.text();
      if (!resp.ok) return wrapMetaError(resp, respBody, corsHeaders);

      console.log(`[meta-mutate] Updated schedule for adset ${adSetId}`);
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Task 2: Duplicate + update handlers ───────────────────────────────

    if (action === "duplicateCampaign") {
      if (!campaignId) {
        return new Response(
          JSON.stringify({ error: "Invalid request: campaignId is required for duplicateCampaign" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const params = new URLSearchParams({
        deep_copy: String(deep === true),
        status_option: "PAUSED",
        access_token: accessToken,
      });

      const resp = await fetch(
        `${META_API}/${campaignId}/copies`,
        { method: "POST", body: params, headers: { "Content-Type": "application/x-www-form-urlencoded" } },
      );
      const respBody = await resp.text();
      if (!resp.ok) return wrapMetaError(resp, respBody, corsHeaders);

      const result = JSON.parse(respBody);
      const newCampaignId = result.copied_campaign_id || result.id;
      console.log(`[meta-mutate] duplicateCampaign ${campaignId} → ${newCampaignId}`);
      return new Response(
        JSON.stringify({ success: true, newCampaignId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "duplicateAdSet") {
      if (!adSetId) {
        return new Response(
          JSON.stringify({ error: "Invalid request: adSetId is required for duplicateAdSet" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const params = new URLSearchParams({
        status_option: "PAUSED",
        access_token: accessToken,
      });
      if (campaignId) params.set("campaign_id", campaignId);

      const resp = await fetch(
        `${META_API}/${adSetId}/copies`,
        { method: "POST", body: params, headers: { "Content-Type": "application/x-www-form-urlencoded" } },
      );
      const respBody = await resp.text();
      if (!resp.ok) return wrapMetaError(resp, respBody, corsHeaders);

      const result = JSON.parse(respBody);
      const newAdSetId = result.copied_adset_id || result.id;
      console.log(`[meta-mutate] duplicateAdSet ${adSetId} → ${newAdSetId}`);
      return new Response(
        JSON.stringify({ success: true, newAdSetId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "updateTargeting") {
      if (!adSetId) {
        return new Response(
          JSON.stringify({ error: "Invalid request: adSetId is required for updateTargeting" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!targeting) {
        return new Response(
          JSON.stringify({ error: "Invalid request: targeting is required for updateTargeting" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const params = new URLSearchParams({
        targeting: JSON.stringify(targeting),
        access_token: accessToken,
      });

      const resp = await fetch(
        `${META_API}/${adSetId}`,
        { method: "POST", body: params, headers: { "Content-Type": "application/x-www-form-urlencoded" } },
      );
      const respBody = await resp.text();
      if (!resp.ok) return wrapMetaError(resp, respBody, corsHeaders);

      console.log(`[meta-mutate] updateTargeting adset ${adSetId}`);
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "updateBidStrategy") {
      if (!bidStrategy) {
        return new Response(
          JSON.stringify({ error: "Invalid request: bidStrategy is required for updateBidStrategy (LOWEST_COST_WITHOUT_CAP, COST_CAP, BID_CAP, LOWEST_COST_WITH_BID_CAP)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!campaignId && !adSetId) {
        return new Response(
          JSON.stringify({ error: "Invalid request: campaignId or adSetId is required for updateBidStrategy" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const bidCapStrategies = ["COST_CAP", "BID_CAP", "LOWEST_COST_WITH_BID_CAP"];
      if (bidCapStrategies.includes(bidStrategy) && !bidAmountCents) {
        return new Response(
          JSON.stringify({ error: `Invalid request: bidAmountCents is required when bidStrategy is ${bidStrategy}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const targetId = campaignId || adSetId;
      const params = new URLSearchParams({
        bid_strategy: bidStrategy,
        access_token: accessToken,
      });
      if (bidAmountCents) params.set("bid_amount", String(bidAmountCents));

      const resp = await fetch(
        `${META_API}/${targetId}`,
        { method: "POST", body: params, headers: { "Content-Type": "application/x-www-form-urlencoded" } },
      );
      const respBody = await resp.text();
      if (!resp.ok) return wrapMetaError(resp, respBody, corsHeaders);

      console.log(`[meta-mutate] updateBidStrategy ${targetId} → ${bidStrategy}`);
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "updateCreative") {
      if (!adId) {
        return new Response(
          JSON.stringify({ error: "Invalid request: adId is required for updateCreative" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!creativeId && !creative) {
        return new Response(
          JSON.stringify({ error: "Invalid request: creativeId or creative spec is required for updateCreative" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      let finalCreativeId = creativeId;

      if (!finalCreativeId && creative) {
        if (!accountId) {
          return new Response(
            JSON.stringify({ error: "Invalid request: accountId is required when providing inline creative spec for updateCreative" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        const createParams = new URLSearchParams({
          access_token: accessToken,
        });
        for (const [k, v] of Object.entries(creative)) {
          createParams.set(k, typeof v === "object" ? JSON.stringify(v) : String(v));
        }
        const createResp = await fetch(
          `${META_API}/${resolveAccountId(accountId)}/adcreatives`,
          { method: "POST", body: createParams, headers: { "Content-Type": "application/x-www-form-urlencoded" } },
        );
        const createBody = await createResp.text();
        if (!createResp.ok) return wrapMetaError(createResp, createBody, corsHeaders);
        const createResult = JSON.parse(createBody);
        finalCreativeId = createResult.id;
      }

      const params = new URLSearchParams({
        creative: JSON.stringify({ creative_id: finalCreativeId }),
        access_token: accessToken,
      });

      const resp = await fetch(
        `${META_API}/${adId}`,
        { method: "POST", body: params, headers: { "Content-Type": "application/x-www-form-urlencoded" } },
      );
      const respBody = await resp.text();
      if (!resp.ok) return wrapMetaError(resp, respBody, corsHeaders);

      console.log(`[meta-mutate] updateCreative ad ${adId} → creative ${finalCreativeId}`);
      return new Response(
        JSON.stringify({ success: true, newCreativeId: finalCreativeId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Task 3: Audience + batch + split test handlers ─────────────────────

    if (action === "createCustomAudience") {
      if (!accountId) {
        return new Response(
          JSON.stringify({ error: "Invalid request: accountId is required for createCustomAudience" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!name) {
        return new Response(
          JSON.stringify({ error: "Invalid request: name is required for createCustomAudience" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!audienceSourceType) {
        return new Response(
          JSON.stringify({ error: "Invalid request: audienceSourceType is required for createCustomAudience (WEBSITE, CUSTOMER_FILE, ENGAGEMENT, LOOKALIKE)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const params = new URLSearchParams({
        name,
        subtype: audienceSourceType,
        customer_file_source: "USER_PROVIDED_ONLY",
        access_token: accessToken,
      });
      if (audienceRules) params.set("rule", JSON.stringify(audienceRules));

      const resp = await fetch(
        `${META_API}/${resolveAccountId(accountId)}/customaudiences`,
        { method: "POST", body: params, headers: { "Content-Type": "application/x-www-form-urlencoded" } },
      );
      const respBody = await resp.text();
      if (!resp.ok) return wrapMetaError(resp, respBody, corsHeaders);

      const result = JSON.parse(respBody);
      console.log(`[meta-mutate] createCustomAudience ${result.id}`);
      return new Response(
        JSON.stringify({ success: true, audienceId: result.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "createLookalikeAudience") {
      if (!accountId) {
        return new Response(
          JSON.stringify({ error: "Invalid request: accountId is required for createLookalikeAudience" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!name) {
        return new Response(
          JSON.stringify({ error: "Invalid request: name is required for createLookalikeAudience" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!sourceAudienceId) {
        return new Response(
          JSON.stringify({ error: "Invalid request: sourceAudienceId is required for createLookalikeAudience" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!lookalikeSpec) {
        return new Response(
          JSON.stringify({ error: "Invalid request: lookalikeSpec is required for createLookalikeAudience (e.g. { country: 'US', ratio: 0.01 })" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const params = new URLSearchParams({
        name,
        subtype: "LOOKALIKE",
        origin_audience_id: sourceAudienceId,
        lookalike_spec: JSON.stringify(lookalikeSpec),
        access_token: accessToken,
      });

      const resp = await fetch(
        `${META_API}/${resolveAccountId(accountId)}/customaudiences`,
        { method: "POST", body: params, headers: { "Content-Type": "application/x-www-form-urlencoded" } },
      );
      const respBody = await resp.text();
      if (!resp.ok) return wrapMetaError(resp, respBody, corsHeaders);

      const result = JSON.parse(respBody);
      console.log(`[meta-mutate] createLookalikeAudience ${result.id}`);
      return new Response(
        JSON.stringify({ success: true, audienceId: result.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "batchPauseEnable") {
      if (!entityIds || entityIds.length === 0) {
        return new Response(
          JSON.stringify({ error: "Invalid request: entityIds is required for batchPauseEnable (max 50)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!status) {
        return new Response(
          JSON.stringify({ error: "Invalid request: status (ACTIVE or PAUSED) is required for batchPauseEnable" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const results: { id: string; success: boolean; error?: string }[] = [];

      for (const id of entityIds) {
        try {
          const resp = await fetch(
            `${META_API}/${id}?status=${status}&access_token=${token}`,
            { method: "POST" },
          );
          if (resp.ok) {
            results.push({ id, success: true });
          } else {
            const errBody = await resp.text();
            results.push({ id, success: false, error: errBody });
          }
        } catch (e) {
          results.push({ id, success: false, error: e instanceof Error ? e.message : "Unknown error" });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      console.log(`[meta-mutate] batchPauseEnable: ${successCount}/${entityIds.length} (${entityType || "entities"})`);
      return new Response(
        JSON.stringify({ success: results.every((r) => r.success), results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "createSplitTest") {
      if (!accountId) {
        return new Response(
          JSON.stringify({ error: "Invalid request: accountId is required for createSplitTest" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!splitTestName) {
        return new Response(
          JSON.stringify({ error: "Invalid request: splitTestName is required for createSplitTest" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!splitTestType) {
        return new Response(
          JSON.stringify({ error: "Invalid request: splitTestType is required for createSplitTest (CREATIVE, AUDIENCE, PLACEMENT)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!splitTestCells || splitTestCells.length === 0) {
        return new Response(
          JSON.stringify({ error: "Invalid request: splitTestCells is required for createSplitTest" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const params = new URLSearchParams({
        name: splitTestName,
        type: "SPLIT_TEST",
        cells: JSON.stringify(splitTestCells),
        objectives: JSON.stringify([{ type: splitTestType }]),
        access_token: accessToken,
      });

      const resp = await fetch(
        `${META_API}/${resolveAccountId(accountId)}/ad_studies`,
        { method: "POST", body: params, headers: { "Content-Type": "application/x-www-form-urlencoded" } },
      );
      const respBody = await resp.text();
      if (!resp.ok) return wrapMetaError(resp, respBody, corsHeaders);

      const result = JSON.parse(respBody);
      console.log(`[meta-mutate] createSplitTest ${result.id}`);
      return new Response(
        JSON.stringify({ success: true, splitTestId: result.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (err) {
    console.error("[meta-mutate] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
