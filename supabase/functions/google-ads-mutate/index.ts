import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const {
      providerToken,
      customerId,
      action,
      campaignId,
      newStatus,
      keywords,
      keywordText,
      matchType,
    } = await req.json();

    if (!providerToken) throw new Error("Provider token not provided");
    if (!customerId) throw new Error("Customer ID not provided");
    if (!action) throw new Error("Action not provided");

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
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const result = await mutateResponse.json();
      return new Response(
        JSON.stringify({ success: true, result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    console.error("[google-ads-mutate] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
