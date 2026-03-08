import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const toolDefinitions = [
  {
    name: "addNegativeKeyword",
    description: "Add a negative keyword to a campaign or ad group to prevent ads from showing on specific searches. Use this when you identify wasteful search terms.",
    parameters: {
      type: "object",
      properties: {
        keyword: { type: "string", description: "The negative keyword to add" },
        matchType: { type: "string", enum: ["broad", "phrase", "exact"], description: "Match type for the negative keyword" },
        level: { type: "string", enum: ["campaign", "adGroup"], description: "Level to add the negative keyword at" },
        campaignId: { type: "string", description: "Campaign ID to add the negative keyword to" },
        adGroupId: { type: "string", description: "Ad Group ID (required if level is adGroup)" },
      },
      required: ["keyword", "matchType", "level", "campaignId"],
    },
  },
  {
    name: "adjustBid",
    description: "Adjust bids for a campaign, ad group, or keyword. Use this to optimize spend based on performance.",
    parameters: {
      type: "object",
      properties: {
        campaignId: { type: "string", description: "Campaign ID to adjust bids for" },
        adGroupId: { type: "string", description: "Ad Group ID to adjust bids for" },
        keywordId: { type: "string", description: "Keyword ID to adjust bid for" },
        bidType: { type: "string", enum: ["cpc", "cpm", "targetCpa", "targetRoas"], description: "Type of bid to adjust" },
        newBid: { type: "number", description: "New bid amount in account currency" },
        reason: { type: "string", description: "Reason for the bid adjustment" },
      },
      required: ["bidType", "newBid", "reason"],
    },
  },
  {
    name: "pauseCampaign",
    description: "Pause a running campaign. Use this for campaigns that are underperforming or wasting budget.",
    parameters: {
      type: "object",
      properties: {
        campaignId: { type: "string", description: "Campaign ID to pause" },
        reason: { type: "string", description: "Reason for pausing the campaign" },
      },
      required: ["campaignId", "reason"],
    },
  },
  {
    name: "enableCampaign",
    description: "Enable a paused campaign. Use this to resume previously paused campaigns.",
    parameters: {
      type: "object",
      properties: {
        campaignId: { type: "string", description: "Campaign ID to enable" },
        reason: { type: "string", description: "Reason for enabling the campaign" },
      },
      required: ["campaignId", "reason"],
    },
  },
  {
    name: "createBudget",
    description: "Create a new campaign budget. Use this when setting up new budget allocations.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name for the budget" },
        amountMicros: { type: "number", description: "Budget amount in micros (1 USD = 1,000,000 micros)" },
        deliveryMethod: { type: "string", enum: ["STANDARD", "ACCELERATED"], description: "Budget delivery method" },
      },
      required: ["name", "amountMicros"],
    },
  },
  {
    name: "updateCampaignBudget",
    description: "Update the daily budget for a campaign. Use this to increase or decrease budget allocation.",
    parameters: {
      type: "object",
      properties: {
        campaignId: { type: "string", description: "Campaign ID to update budget for" },
        newBudgetAmountMicros: { type: "number", description: "New budget amount in micros" },
        reason: { type: "string", description: "Reason for the budget change" },
      },
      required: ["campaignId", "newBudgetAmountMicros", "reason"],
    },
  },
  {
    name: "queryAdsData",
    description: "Query Google Ads data with specific filters. Use this to fetch additional data not in the current context.",
    parameters: {
      type: "object",
      properties: {
        reportType: { type: "string", enum: ["campaigns", "adGroups", "ads", "keywords", "searchTerms", "audiences", "budgets", "conversions"], description: "Type of report to query" },
        startDate: { type: "string", description: "Start date in YYYY-MM-DD format" },
        endDate: { type: "string", description: "End date in YYYY-MM-DD format" },
        filters: { type: "array", items: { type: "object" }, description: "Filters to apply to the query" },
        limit: { type: "number", description: "Maximum number of results to return" },
      },
      required: ["reportType", "startDate", "endDate"],
    },
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, campaignData, apiKey, model, enableTools = true } = await req.json();

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "API key nao configurada. Adicione sua chave do Gemini nas Configuracoes.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const systemPrompt =
      `You are an expert Google Ads analyst embedded directly within the user's dashboard. Your primary goal is to **analyze internal client data** and **propose actionable improvements**.\n\n` +
      `Create a distinct section for "Detailed Analysis" and "Key Recommendations".\n\n` +
      `## Golden Rules\n` +
      `1. **Context Aware**: You always have access to the dashboard context sent in campaignData (overview, trends, campaigns, ad groups, ads, keywords, search terms, audiences, budgets, conversions, negatives, and current page). **Never** ask for data that is already provided in the context.\n` +
      `2. **Proactive Analysis**: Don't just answer questions. If you see a high CPA or low CTR in the context, point it out.\n` +
      `3. **No Walls of Text**: BREAK DOWN your responses. Paragraphs should be max 2-3 lines. Use bullet points liberally.\n` +
      `4. **Fragmented Delivery**: If you have a lot to say, structure it with clear headers and short sections. \n` +
      `5. **Internal References**: When mentioning a campaign or keyword, use its exact name so the user can find it.\n` +
      `6. **Memory**: Remember previous turns in the conversation. If the user says "refine that", know what "that" refers to.\n` +
      `7. **Action Oriented**: When you identify an optimization opportunity, USE THE TOOLS to take action. Don't just suggest - execute when appropriate.\n\n` +
      `## Analysis Skills\n` +
      `### Metric Correlation\n` +
      `- LOOK FOR: Increased CPA vs Decreased CTR (Ad fatigue?), High Spend vs Zero Conversions (Wasted budget).\n` +
      `### Budget Optimization\n` +
      `- CHECK: Keywords with spend > $50 and 0 conversions. High performing campaigns limited by budget (high ROAS).\n` +
      `- ACTION: Use adjustBid to reduce bids on underperforming keywords, or pauseCampaign for severely underperforming campaigns.\n` +
      `### Search Term Mining\n` +
      `- SCAN: Search terms in the context. Flag irrelevant ones as negative keyword suggestions.\n` +
      `- ACTION: Use addNegativeKeyword to immediately add wasteful search terms as negatives.\n` +
      `- If "searchTerms" exists in campaignData, treat it as the available raw query list for this request and do not claim you lack access to search terms.\n\n` +
      `### Cross-Page Analysis\n` +
      `- Use uiContext.currentSection to prioritize what the user is looking at now, but cross-check with all other sections before giving final recommendations.\n\n` +
      `## When to Use Tools\n` +
      `- **addNegativeKeyword**: When you find search terms with high clicks/spend and no conversions\n` +
      `- **adjustBid**: When a keyword/campaign has poor ROAS or could benefit from increased investment\n` +
      `- **pauseCampaign**: When a campaign is severely underperforming and wasting budget\n` +
      `- **enableCampaign**: When conditions are right to resume a previously paused campaign\n` +
      `- **updateCampaignBudget**: When a campaign needs more budget (high ROAS) or less (low ROAS)\n\n` +
      `## Interaction Style\n` +
      `- Tone: Professional, analytical, encouraging, but direct about performance issues.\n` +
      `- Formatting: Use Markdown tables for comparing metrics. Use code blocks for negative keyword lists.\n` +
      `- When taking an action, clearly state what you're doing and why before calling the tool.\n\n` +
      `Current campaign context:\n` +
      `${campaignData ? JSON.stringify(campaignData, null, 2) : "No specific campaign data provided. Use general best practices."}\n\n` +
      `Format your responses in a clear, structured way. Use bullet points for lists and bold text for important metrics. REMEMBER: Short paragraphs. No giant blocks of text.`;

    const geminiModel = String(model || "gemini-2.5-flash").trim();
    const contents = Array.isArray(messages)
      ? messages
        .filter((m: any) =>
          m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string"
        )
        .map((m: any) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }))
      : [];

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}` +
      `:streamGenerateContent?alt=sse&key=${encodeURIComponent(String(apiKey))}`;

    const requestBody: Record<string, unknown> = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
    };

    if (enableTools) {
      requestBody.tools = [{ functionDeclarations: toolDefinitions }];
    }

    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!upstream.ok) {
      if (upstream.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisicoes excedido. Aguarde e tente novamente." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (upstream.status === 401) {
        return new Response(
          JSON.stringify({ error: "API key invalida. Verifique sua chave nas Configuracoes." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (upstream.status === 403) {
        return new Response(
          JSON.stringify({
            error:
              "API key sem permissao para Gemini. Em Google AI Studio, habilite a Generative Language API e remova restricoes de referrer/IP incompatíveis.",
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const errorText = await upstream.text();
      const loweredError = errorText.toLowerCase();
      if (loweredError.includes("api key not valid") || loweredError.includes("invalid api key")) {
        return new Response(
          JSON.stringify({ error: "API key invalida. Gere uma nova chave no Google AI Studio e salve novamente nas Configuracoes." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (upstream.status === 404 || loweredError.includes("model") || loweredError.includes("not found")) {
        return new Response(
          JSON.stringify({
            error:
              `Modelo "${geminiModel}" indisponivel para esta chave/projeto. Selecione um modelo estavel (ex.: gemini-2.5-flash) e tente novamente.`,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      console.error("Gemini gateway error:", upstream.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao obter resposta da IA. Verifique sua API key do Gemini." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Translate Gemini SSE chunks into OpenAI-style SSE so the existing client stream parser keeps working.
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = upstream.body!.getReader();
        let buffer = "";

        const emit = (deltaText: string) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: deltaText } }] })}\n\n`),
          );
        };

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            let idx: number;

            while ((idx = buffer.indexOf("\n")) !== -1) {
              let line = buffer.slice(0, idx);
              buffer = buffer.slice(idx + 1);

              if (line.endsWith("\r")) line = line.slice(0, -1);
              if (!line.startsWith("data:")) continue;

              const payload = line.slice(5).trim();
              if (!payload || payload === "[DONE]") continue;

              try {
                const parsed = JSON.parse(payload);
                const parts = parsed?.candidates?.[0]?.content?.parts;
                const text = Array.isArray(parts)
                  ? parts.map((p: any) => (typeof p?.text === "string" ? p.text : "")).join("")
                  : "";

                if (text) emit(text);
              } catch {
                // Ignore partial/malformed chunk.
              }
            }
          }
        } finally {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("analyze-ads error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
