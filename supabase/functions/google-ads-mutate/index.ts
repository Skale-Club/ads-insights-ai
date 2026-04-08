import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "npm:zod@3.22.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const API_VERSION = "v20";

function cleanCustomerIdLike(input: unknown): string {
  const s = String(input ?? "").trim();
  // Accept "customers/1234567890" as well as "123-456-7890" / "1234567890".
  const withoutPrefix = s.includes("/") ? s.split("/").filter(Boolean).slice(-1)[0] : s;
  return String(withoutPrefix).replace(/-/g, "");
}

function buildCampaignResourceName(customerIdLike: unknown, campaignIdOrResourceName: unknown): string {
  const raw = String(campaignIdOrResourceName ?? "").trim();
  if (!raw) return "";

  // If the caller already sent a full resource name, use it as-is.
  // Example: customers/123/campaigns/456
  if (raw.includes("/campaigns/")) return raw;

  const cleanCustomerId = cleanCustomerIdLike(customerIdLike);
  const cleanCampaignId = raw.replace(/[^0-9]/g, "");
  return `customers/${cleanCustomerId}/campaigns/${cleanCampaignId}`;
}

async function googleAdsSearchStream(
  customerId: string,
  query: string,
  headers: Record<string, string>,
): Promise<any[]> {
  const resp = await fetch(
    `https://googleads.googleapis.com/${API_VERSION}/customers/${customerId}/googleAds:searchStream`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ query }),
    },
  );

  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`Google Ads API Error (${resp.status}): ${errorText}`);
  }

  const data = await resp.json();
  return data.reduce((acc: any[], batch: any) => acc.concat(batch.results || []), []);
}

async function ensureCustomerNegativeKeywordList(
  customerId: string,
  headers: Record<string, string>,
): Promise<string> {
  // Account-level negative keywords are implemented via a SharedSet (type=NEGATIVE_KEYWORDS)
  // attached to the customer through customer_negative_criterion.negative_keyword_list.
  const existing = await googleAdsSearchStream(
    customerId,
    `
      SELECT
        customer_negative_criterion.negative_keyword_list.shared_set
      FROM customer_negative_criterion
      LIMIT 1
    `,
    headers,
  );

  const sharedSet =
    existing?.[0]?.customerNegativeCriterion?.negativeKeywordList?.sharedSet as string | undefined;

  if (sharedSet) return sharedSet;

  // 1) Create the shared set that will hold the negative keywords.
  const sharedSetName = "AdsInsight Negative Keywords";
  const createSharedSetBody = {
    operations: [
      {
        create: {
          name: sharedSetName,
          type: "NEGATIVE_KEYWORDS",
        },
      },
    ],
  };

  const createSharedSetResp = await fetch(
    `https://googleads.googleapis.com/${API_VERSION}/customers/${customerId}/sharedSets:mutate`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(createSharedSetBody),
    },
  );

  if (!createSharedSetResp.ok) {
    const errorText = await createSharedSetResp.text();
    throw new Error(`Google Ads API Error (${createSharedSetResp.status}): ${errorText}`);
  }

  const createSharedSetJson = await createSharedSetResp.json();
  const sharedSetResourceName = createSharedSetJson?.results?.[0]?.resourceName as string | undefined;
  if (!sharedSetResourceName) {
    throw new Error("Failed to create negative keyword shared set (missing resourceName)");
  }

  // 2) Attach the shared set to the customer as its (single) negative keyword list.
  const attachBody = {
    operations: [
      {
        create: {
          negativeKeywordList: {
            sharedSet: sharedSetResourceName,
          },
        },
      },
    ],
  };

  const attachResp = await fetch(
    `https://googleads.googleapis.com/${API_VERSION}/customers/${customerId}/customerNegativeCriteria:mutate`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(attachBody),
    },
  );

  if (!attachResp.ok) {
    const errorText = await attachResp.text();
    throw new Error(`Google Ads API Error (${attachResp.status}): ${errorText}`);
  }

  return sharedSetResourceName;
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

    const MutateRequestSchema = z.object({
      providerToken: z.string().min(1, "providerToken is required"),
      customerId: z.string().min(1, "customerId is required"),
      action: z.enum(["updateCampaignStatus", "addNegativeKeywords", "adjustBid", "updateCampaignBudget", "createBudget"], {
        errorMap: () => ({ message: "action must be updateCampaignStatus, addNegativeKeywords, adjustBid, updateCampaignBudget, or createBudget" }),
      }),
      campaignId: z.string().optional(),
      newStatus: z.string().optional(),
      keywords: z.array(z.string()).optional(),
      keywordText: z.string().optional(),
      matchType: z.string().optional(),
      adGroupId: z.string().optional(),
      keywordResourceName: z.string().optional(),
      newBidMicros: z.number().positive().optional(),
      campaignBudgetId: z.string().optional(),
      newAmountMicros: z.number().positive().optional(),
      budgetName: z.string().optional(),
      deliveryMethod: z.enum(["STANDARD", "ACCELERATED"]).optional(),
    });

    const body = await req.json();
    const parseResult = MutateRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const messages = parseResult.error.errors.map((e) => e.message).join(", ");
      return new Response(
        JSON.stringify({ error: `Invalid request: ${messages}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { providerToken, customerId, action, campaignId, newStatus, keywords, keywordText, matchType, adGroupId, keywordResourceName, newBidMicros, campaignBudgetId, newAmountMicros, budgetName, deliveryMethod } = parseResult.data;

    const cleanCustomerId = cleanCustomerIdLike(customerId);

    const headers: Record<string, string> = {
      "Authorization": `Bearer ${providerToken}`,
      "developer-token": developerToken,
      "Content-Type": "application/json",
    };

    if (loginCustomerId) {
      headers["login-customer-id"] = loginCustomerId.replace(/-/g, "");
    }

    if (action === "updateCampaignStatus") {
      if (!campaignId) throw new Error("Campaign ID not provided");
      if (!newStatus) throw new Error("New status not provided");

      // Google Ads API expects ENABLED or PAUSED
      const apiStatus = newStatus.toUpperCase();
      if (apiStatus !== "ENABLED" && apiStatus !== "PAUSED") {
        throw new Error("Invalid status. Must be ENABLED or PAUSED");
      }

      console.log(`[google-ads-mutate] Updating campaign ${campaignId} to ${apiStatus}`);

      const resourceName = buildCampaignResourceName(cleanCustomerId, campaignId);
      if (!resourceName) throw new Error("Failed to build campaign resourceName");
      console.log(`[google-ads-mutate] resourceName: ${resourceName}, status: ${apiStatus}`);

      const mutateBody = {
        operations: [
          {
            update: {
              resourceName,
              status: apiStatus,
            },
            // FieldMask JSON form. Avoids ambiguity vs. string updateMask variants.
            updateMask: { paths: ["status"] },
          },
        ],
      };

      const mutateResponse = await fetch(
        `https://googleads.googleapis.com/${API_VERSION}/customers/${cleanCustomerId}/campaigns:mutate`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(mutateBody),
        }
      );

      if (!mutateResponse.ok) {
        const errorText = await mutateResponse.text();
        console.error(`[google-ads-mutate] API error (${mutateResponse.status}):`, errorText);
        return new Response(
          JSON.stringify({ error: `Google Ads API Error (${mutateResponse.status}): ${errorText}` }),
          { status: mutateResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await mutateResponse.json();
      console.log(`[google-ads-mutate] Campaign ${campaignId} updated to ${apiStatus}`);

      return new Response(
        JSON.stringify({ success: true, result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "addNegativeKeywords") {
      const list = (Array.isArray(keywords) ? keywords : []).filter(Boolean).map((k) => String(k).trim());
      const single = keywordText ? [String(keywordText).trim()] : [];
      const all = [...single, ...list].filter((k) => k.length > 0);
      if (all.length === 0) throw new Error("No keywords provided");

      const mt = String(matchType || "PHRASE").toUpperCase();
      const allowed = new Set(["EXACT", "PHRASE", "BROAD"]);
      if (!allowed.has(mt)) throw new Error("Invalid matchType. Must be EXACT, PHRASE, or BROAD");

      const sharedSetResourceName = await ensureCustomerNegativeKeywordList(cleanCustomerId, headers);

      const mutateBody = {
        operations: all.map((text) => ({
          create: {
            sharedSet: sharedSetResourceName,
            keyword: {
              text,
              matchType: mt,
            },
          },
        })),
      };

      const mutateResponse = await fetch(
        `https://googleads.googleapis.com/${API_VERSION}/customers/${cleanCustomerId}/sharedCriteria:mutate`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(mutateBody),
        },
      );

      if (!mutateResponse.ok) {
        const errorText = await mutateResponse.text();
        console.error(`[google-ads-mutate] API error (${mutateResponse.status}):`, errorText);
        return new Response(
          JSON.stringify({ error: `Google Ads API Error (${mutateResponse.status}): ${errorText}` }),
          { status: mutateResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const result = await mutateResponse.json();
      return new Response(
        JSON.stringify({ success: true, result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "adjustBid") {
      if (!newBidMicros) {
        return new Response(
          JSON.stringify({ error: "Invalid request: newBidMicros is required for adjustBid" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!campaignId && !adGroupId && !keywordResourceName) {
        return new Response(
          JSON.stringify({ error: "Invalid request: adjustBid requires at least one of campaignId, adGroupId, or keywordResourceName" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      let mutateUrl: string;
      let mutateBody: unknown;

      if (keywordResourceName) {
        mutateUrl = `https://googleads.googleapis.com/${API_VERSION}/customers/${cleanCustomerId}/adGroupCriteria:mutate`;
        mutateBody = {
          operations: [{
            update: { resourceName: keywordResourceName, cpcBidMicros: String(newBidMicros) },
            updateMask: { paths: ["cpc_bid_micros"] },
          }],
        };
      } else if (adGroupId) {
        const adGroupResourceName = adGroupId.includes("/adGroups/")
          ? adGroupId
          : `customers/${cleanCustomerId}/adGroups/${adGroupId.replace(/[^0-9]/g, "")}`;
        mutateUrl = `https://googleads.googleapis.com/${API_VERSION}/customers/${cleanCustomerId}/adGroups:mutate`;
        mutateBody = {
          operations: [{
            update: { resourceName: adGroupResourceName, cpcBidMicros: String(newBidMicros) },
            updateMask: { paths: ["cpc_bid_micros"] },
          }],
        };
      } else {
        const resourceName = buildCampaignResourceName(cleanCustomerId, campaignId);
        if (!resourceName) throw new Error("Failed to build campaign resourceName");
        mutateUrl = `https://googleads.googleapis.com/${API_VERSION}/customers/${cleanCustomerId}/campaigns:mutate`;
        mutateBody = {
          operations: [{
            update: { resourceName, manualCpc: { enhancedCpcEnabled: false } },
            updateMask: { paths: ["manual_cpc"] },
          }],
        };
      }

      const mutateResponse = await fetch(mutateUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(mutateBody),
      });

      if (!mutateResponse.ok) {
        const errorText = await mutateResponse.text();
        console.error(`[google-ads-mutate] adjustBid API error (${mutateResponse.status}):`, errorText);
        return new Response(
          JSON.stringify({ error: `Google Ads API Error (${mutateResponse.status}): ${errorText}` }),
          { status: mutateResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const result = await mutateResponse.json();
      return new Response(
        JSON.stringify({ success: true, result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "updateCampaignBudget") {
      if (!campaignBudgetId) {
        return new Response(
          JSON.stringify({ error: "Invalid request: campaignBudgetId is required for updateCampaignBudget" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!newAmountMicros) {
        return new Response(
          JSON.stringify({ error: "Invalid request: newAmountMicros is required for updateCampaignBudget" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const budgetResourceName = campaignBudgetId.includes("/campaignBudgets/")
        ? campaignBudgetId
        : `customers/${cleanCustomerId}/campaignBudgets/${campaignBudgetId.replace(/[^0-9]/g, "")}`;

      const mutateBody = {
        operations: [{
          update: { resourceName: budgetResourceName, amountMicros: String(newAmountMicros) },
          updateMask: { paths: ["amount_micros"] },
        }],
      };

      const mutateResponse = await fetch(
        `https://googleads.googleapis.com/${API_VERSION}/customers/${cleanCustomerId}/campaignBudgets:mutate`,
        { method: "POST", headers, body: JSON.stringify(mutateBody) },
      );

      if (!mutateResponse.ok) {
        const errorText = await mutateResponse.text();
        console.error(`[google-ads-mutate] updateCampaignBudget API error (${mutateResponse.status}):`, errorText);
        return new Response(
          JSON.stringify({ error: `Google Ads API Error (${mutateResponse.status}): ${errorText}` }),
          { status: mutateResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const result = await mutateResponse.json();
      return new Response(
        JSON.stringify({ success: true, result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "createBudget") {
      if (!budgetName) {
        return new Response(
          JSON.stringify({ error: "Invalid request: budgetName is required for createBudget" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!newAmountMicros) {
        return new Response(
          JSON.stringify({ error: "Invalid request: newAmountMicros is required for createBudget" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const mutateBody = {
        operations: [{
          create: {
            name: budgetName,
            amountMicros: String(newAmountMicros),
            deliveryMethod: deliveryMethod ?? "STANDARD",
          },
        }],
      };

      const mutateResponse = await fetch(
        `https://googleads.googleapis.com/${API_VERSION}/customers/${cleanCustomerId}/campaignBudgets:mutate`,
        { method: "POST", headers, body: JSON.stringify(mutateBody) },
      );

      if (!mutateResponse.ok) {
        const errorText = await mutateResponse.text();
        console.error(`[google-ads-mutate] createBudget API error (${mutateResponse.status}):`, errorText);
        return new Response(
          JSON.stringify({ error: `Google Ads API Error (${mutateResponse.status}): ${errorText}` }),
          { status: mutateResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const result = await mutateResponse.json();
      const resourceName = result?.results?.[0]?.resourceName;
      return new Response(
        JSON.stringify({ success: true, resourceName }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    console.error("[google-ads-mutate] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
