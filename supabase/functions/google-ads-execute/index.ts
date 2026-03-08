import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const API_VERSION = "v20";

interface ToolExecutionRequest {
    providerToken: string;
    customerId: string;
    toolName: string;
    input: Record<string, unknown>;
}

interface ToolExecutionResult {
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
}

async function executeGoogleAdsMutation(
    providerToken: string,
    customerId: string,
    operations: unknown[]
): Promise<ToolExecutionResult> {
    const url = `https://googleads.googleapis.com/${API_VERSION}/customers/${customerId}/googleAds:mutate`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${providerToken}`,
                'Content-Type': 'application/json',
                'developer-token': Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN') || '',
            },
            body: JSON.stringify({ mutateOperations: operations }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            return { success: false, error: `Google Ads API Error (${response.status}): ${errorText}` };
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

async function addNegativeKeyword(
    providerToken: string,
    customerId: string,
    input: Record<string, unknown>
): Promise<ToolExecutionResult> {
    const { keyword, matchType, level, campaignId, adGroupId } = input;

    let resourceName: string;
    let operationType: string;

    if (level === 'campaign') {
        resourceName = `customers/${customerId}/campaignNegativeKeywords`;
        operationType = 'campaignCriterion';
    } else {
        if (!adGroupId) {
            return { success: false, error: 'adGroupId is required for ad group level negative keywords' };
        }
        resourceName = `customers/${customerId}/adGroupNegativeKeywords`;
        operationType = 'adGroupCriterion';
    }

    const matchTypeMap: Record<string, string> = {
        'broad': 'BROAD',
        'phrase': 'PHRASE',
        'exact': 'EXACT',
    };

    const operation = {
        [operationType]: {
            resourceName: `${resourceName}/~`,
            negative: true,
            keyword: {
                text: keyword as string,
                matchType: matchTypeMap[matchType as string] || 'BROAD',
            },
            ...(level === 'campaign' && { campaign: `customers/${customerId}/campaigns/${campaignId}` }),
            ...(level === 'adGroup' && { adGroup: `customers/${customerId}/adGroups/${adGroupId}` }),
        },
    };

    return executeGoogleAdsMutation(providerToken, customerId, [operation]);
}

async function adjustBid(
    providerToken: string,
    customerId: string,
    input: Record<string, unknown>
): Promise<ToolExecutionResult> {
    const { campaignId, adGroupId, keywordId, bidType, newBid } = input;

    let resourceName: string;
    let updateMask: string;
    let bidField: string;

    if (keywordId) {
        resourceName = `customers/${customerId}/adGroupCriteria/${keywordId}`;
        bidField = 'cpcBidMicros';
        updateMask = 'cpcBidMicros';
    } else if (adGroupId) {
        resourceName = `customers/${customerId}/adGroups/${adGroupId}`;
        bidField = bidType === 'cpc' ? 'cpcBidMicros' : 'cpmBidMicros';
        updateMask = bidField;
    } else if (campaignId) {
        resourceName = `customers/${customerId}/campaigns/${campaignId}`;
        if (bidType === 'targetCpa') {
            bidField = 'targetCpa.targetCpaMicros';
            updateMask = 'target_cpa';
        } else if (bidType === 'targetRoas') {
            bidField = 'targetRoas.targetRoas';
            updateMask = 'target_roas';
        } else {
            bidField = bidType === 'cpc' ? 'cpcBidMicros' : 'cpmBidMicros';
            updateMask = bidField;
        }
    } else {
        return { success: false, error: 'At least one of campaignId, adGroupId, or keywordId is required' };
    }

    const operation = {
        update: {
            resourceName,
            [bidField]: Math.round((newBid as number) * 1_000_000),
        },
        updateMask: { paths: [updateMask] },
    };

    return executeGoogleAdsMutation(providerToken, customerId, [operation]);
}

async function pauseCampaign(
    providerToken: string,
    customerId: string,
    input: Record<string, unknown>
): Promise<ToolExecutionResult> {
    const { campaignId } = input;

    const operation = {
        update: {
            resourceName: `customers/${customerId}/campaigns/${campaignId}`,
            status: 'PAUSED',
        },
        updateMask: { paths: ['status'] },
    };

    return executeGoogleAdsMutation(providerToken, customerId, [operation]);
}

async function enableCampaign(
    providerToken: string,
    customerId: string,
    input: Record<string, unknown>
): Promise<ToolExecutionResult> {
    const { campaignId } = input;

    const operation = {
        update: {
            resourceName: `customers/${customerId}/campaigns/${campaignId}`,
            status: 'ENABLED',
        },
        updateMask: { paths: ['status'] },
    };

    return executeGoogleAdsMutation(providerToken, customerId, [operation]);
}

async function createBudget(
    providerToken: string,
    customerId: string,
    input: Record<string, unknown>
): Promise<ToolExecutionResult> {
    const { name, amountMicros, deliveryMethod } = input;

    const operation = {
        campaignBudgetOperation: {
            create: {
                name: name as string,
                amountMicros: amountMicros as number,
                deliveryMethod: (deliveryMethod as string) || 'STANDARD',
                explicitlyShared: true,
            },
        },
    };

    return executeGoogleAdsMutation(providerToken, customerId, [operation]);
}

async function updateCampaignBudget(
    providerToken: string,
    customerId: string,
    input: Record<string, unknown>
): Promise<ToolExecutionResult> {
    const { campaignId, newBudgetAmountMicros } = input;

    const operation = {
        campaignBudgetOperation: {
            update: {
                resourceName: `customers/${customerId}/campaignBudgets/${campaignId}`,
                amountMicros: newBudgetAmountMicros as number,
            },
            updateMask: { paths: ['amount_micros'] },
        },
    };

    return executeGoogleAdsMutation(providerToken, customerId, [operation]);
}

const toolExecutors: Record<string, (token: string, customerId: string, input: Record<string, unknown>) => Promise<ToolExecutionResult>> = {
    addNegativeKeyword,
    adjustBid,
    pauseCampaign,
    enableCampaign,
    createBudget,
    updateCampaignBudget,
};

const toolRiskLevels: Record<string, 'low' | 'medium' | 'high'> = {
    queryAdsData: 'low',
    addNegativeKeyword: 'low',
    adjustBid: 'medium',
    createBudget: 'medium',
    updateCampaignBudget: 'medium',
    enableCampaign: 'medium',
    pauseCampaign: 'high',
};

const toolDescriptions: Record<string, string> = {
    addNegativeKeyword: 'Add a negative keyword to prevent ads from showing on specific searches',
    adjustBid: 'Modify the bid amount for a campaign, ad group, or keyword',
    pauseCampaign: 'Stop a running campaign from serving ads',
    enableCampaign: 'Resume a paused campaign to start serving ads',
    createBudget: 'Create a new budget that can be assigned to campaigns',
    updateCampaignBudget: 'Change the daily budget allocation for a campaign',
    queryAdsData: 'Retrieve performance data from your Google Ads account',
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { providerToken, customerId, toolName, input }: ToolExecutionRequest = await req.json();

        if (!providerToken) {
            return new Response(
                JSON.stringify({ error: "Provider token is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (!customerId) {
            return new Response(
                JSON.stringify({ error: "Customer ID is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (!toolName) {
            return new Response(
                JSON.stringify({ error: "Tool name is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const executor = toolExecutors[toolName];
        if (!executor) {
            return new Response(
                JSON.stringify({ error: `Unknown tool: ${toolName}` }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const result = await executor(providerToken, customerId, input || {});

        return new Response(
            JSON.stringify(result),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("google-ads-execute error:", error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});

export { toolRiskLevels, toolDescriptions };
