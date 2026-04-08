import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "npm:zod@3.22.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const META_API = "https://graph.facebook.com/v20.0";

const RequestSchema = z.object({
  accessToken: z.string().min(1, "accessToken is required"),
  action: z.enum(["pauseCampaign", "enableCampaign", "updateDailyBudget", "updateLifetimeBudget"], {
    errorMap: () => ({ message: "action must be pauseCampaign, enableCampaign, updateDailyBudget, or updateLifetimeBudget" }),
  }),
  campaignId: z.string().optional(),
  adSetId: z.string().optional(),
  amountCents: z.number().positive().optional(), // Meta budget in cents (currency × 100)
});

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

    const { accessToken, action, campaignId, adSetId, amountCents } = parseResult.data;
    const token = encodeURIComponent(accessToken);

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

    throw new Error(`Unknown action: ${action}`);
  } catch (err) {
    console.error("[meta-mutate] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
