import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "npm:zod@3.22.4";
import { buildSystemPrompt, buildMetaSystemPrompt } from "./system-prompt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const metaToolDefinitions = [
  {
    name: "queryMetaData",
    description: "Query Meta Ads data for a specific report type and date range. Use this to fetch additional data not in the current context.",
    parameters: {
      type: "object",
      properties: {
        reportType: { type: "string", enum: ["campaigns", "adsets", "ads", "insights_by_placement", "daily_performance"], description: "Type of Meta report to query" },
        startDate: { type: "string", description: "Start date in YYYY-MM-DD format" },
        endDate: { type: "string", description: "End date in YYYY-MM-DD format" },
      },
      required: ["reportType", "startDate", "endDate"],
    },
  },
  {
    name: "pauseCampaign",
    description: "Pause a running Meta campaign. Use for campaigns wasting budget or underperforming.",
    parameters: {
      type: "object",
      properties: {
        campaignId: { type: "string", description: "Meta campaign ID to pause" },
        reason: { type: "string", description: "Reason for pausing" },
      },
      required: ["campaignId", "reason"],
    },
  },
  {
    name: "enableCampaign",
    description: "Enable a paused Meta campaign.",
    parameters: {
      type: "object",
      properties: {
        campaignId: { type: "string", description: "Meta campaign ID to enable" },
        reason: { type: "string", description: "Reason for enabling" },
      },
      required: ["campaignId", "reason"],
    },
  },
  {
    name: "updateBudget",
    description: "Update the daily budget of a Meta ad set or lifetime budget of a campaign.",
    parameters: {
      type: "object",
      properties: {
        targetType: { type: "string", enum: ["adset_daily", "campaign_lifetime"], description: "What to update" },
        targetId: { type: "string", description: "Ad set or campaign ID" },
        newAmountCents: { type: "number", description: "New budget in cents (e.g. 5000 = $50.00)" },
        reason: { type: "string", description: "Reason for budget change" },
      },
      required: ["targetType", "targetId", "newAmountCents", "reason"],
    },
  },
  {
    name: "analyzeCreative",
    description: "Generate creative analysis and ad copy suggestions using angle-based frameworks.",
    parameters: {
      type: "object",
      properties: {
        currentAdTitle: { type: "string", description: "Current ad headline" },
        currentAdBody: { type: "string", description: "Current ad body copy" },
        objective: { type: "string", description: "Campaign objective (conversions, traffic, awareness)" },
        targetAudience: { type: "string", description: "Description of the target audience" },
      },
      required: ["objective"],
    },
  },
];

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

async function fetchAdsReport(
  args: { reportType: string; startDate: string; endDate: string },
  providerToken: string,
  customerId: string,
): Promise<unknown> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl) return { error: "SUPABASE_URL not configured" };

  try {
    const resp = await fetch(`${supabaseUrl}/functions/v1/google-ads-reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerToken,
        customerId,
        reportType: args.reportType,
        startDate: args.startDate,
        endDate: args.endDate,
      }),
    });
    if (!resp.ok) {
      const errText = await resp.text();
      return { error: `google-ads-reports error (${resp.status}): ${errText}` };
    }
    return await resp.json();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "fetch failed" };
  }
}

async function resolveQueryAdsData(
  nonStreamUrl: string,
  requestBody: Record<string, unknown>,
  providerToken: string,
  customerId: string,
): Promise<{ contents: unknown[]; finalText: string | null }> {
  let contents = [...(requestBody.contents as unknown[])];

  for (let i = 0; i < 4; i++) {
    const resp = await fetch(nonStreamUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...requestBody, contents }),
    });

    if (!resp.ok) break;

    const data = await resp.json();
    const parts: any[] = data?.candidates?.[0]?.content?.parts ?? [];
    const queryCall = parts.find((p: any) => p.functionCall?.name === "queryAdsData");

    if (!queryCall) {
      const text = parts.filter((p: any) => p.text).map((p: any) => p.text).join("");
      return { contents, finalText: text || null };
    }

    const result = await fetchAdsReport(queryCall.functionCall.args, providerToken, customerId);
    contents = [
      ...contents,
      { role: "model", parts },
      {
        role: "user",
        parts: [{
          functionResponse: {
            name: "queryAdsData",
            response: { content: result },
          },
        }],
      },
    ];
  }

  return { contents, finalText: null };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const AnalyzeRequestSchema = z.object({
      apiKey: z.string().min(1, "API key nao configurada. Adicione sua chave do Gemini nas Configuracoes."),
      messages: z.array(z.object({ role: z.string(), content: z.unknown() })).min(1, "messages are required"),
      campaignData: z.unknown().optional(),
      model: z.string().optional(),
      enableTools: z.boolean().optional().default(true),
      providerToken: z.string().optional(),
      customerId: z.string().optional(),
      platform: z.enum(["google", "meta"]).optional().default("google"),
      metaAccessToken: z.string().optional(),
      metaAccountId: z.string().optional(),
    });

    const body = await req.json();
    const parseResult = AnalyzeRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0]?.message ?? "Invalid request";
      return new Response(
        JSON.stringify({ error: firstError }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const { messages, campaignData, apiKey, model, enableTools, providerToken, customerId, platform, metaAccessToken, metaAccountId } = parseResult.data;

    const systemPrompt = platform === "meta"
      ? buildMetaSystemPrompt(campaignData)
      : buildSystemPrompt(campaignData);

    const geminiModel = String(model || "gemini-2.5-flash").trim();
    const contents = Array.isArray(messages)
      ? messages
        .filter((m: any) =>
          m &&
          (m.role === "user" || m.role === "assistant")
        )
        .map((m: any) => {
          const role = m.role === "assistant" ? "model" : "user";

          // Handle multimodal content (images)
          if (m.attachments && Array.isArray(m.attachments) && m.attachments.length > 0) {
            const parts: any[] = [];

            // Add text content first
            if (typeof m.content === "string" && m.content.trim()) {
              parts.push({ text: m.content });
            }

            // Add image parts
            for (const att of m.attachments) {
              if (att.type === "image" && att.data) {
                parts.push({
                  inline_data: {
                    mime_type: att.mimeType || "image/jpeg",
                    data: att.data,
                  },
                });
              }
            }

            // Add spreadsheet data as text
            for (const att of m.attachments) {
              if ((att.type === "csv" || att.type === "excel") && att.data) {
                parts.push({
                  text: `\n\n[File: ${att.name}]\n${att.data}`
                });
              }
            }

            // Add audio transcription
            for (const att of m.attachments) {
              if (att.type === "audio" && att.transcription) {
                parts.push({
                  text: `\n\n[Audio transcription: ${att.transcription}]`
                });
              }
            }

            return { role, parts };
          }

          // Standard text-only message
          if (typeof m.content === "string") {
            return {
              role,
              parts: [{ text: m.content }],
            };
          }

          return null;
        })
        .filter((m: any) => m !== null)
      : [];

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}` +
      `:streamGenerateContent?alt=sse&key=${encodeURIComponent(String(apiKey))}`;

    const requestBody: Record<string, unknown> = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
    };

    if (enableTools) {
      const tools = platform === "meta" ? metaToolDefinitions : toolDefinitions;
      requestBody.tools = [{ functionDeclarations: tools }];
    }

    // Agentic loop: resolve Meta queryMetaData tool calls
    if (platform === "meta" && enableTools && metaAccessToken && metaAccountId) {
      const nonStreamUrl =
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}` +
        `:generateContent?key=${encodeURIComponent(String(apiKey))}`;

      const supabaseUrl = Deno.env.get("SUPABASE_URL");

      const resolveMetaTool = async (
        url: string,
        reqBody: Record<string, unknown>,
      ): Promise<{ contents: unknown[]; finalText: string | null }> => {
        let contents = [...(reqBody.contents as unknown[])];
        for (let i = 0; i < 4; i++) {
          const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...reqBody, contents }),
          });
          if (!resp.ok) break;
          const data = await resp.json();
          const parts: any[] = data?.candidates?.[0]?.content?.parts ?? [];
          const call = parts.find((p: any) => p.functionCall?.name === "queryMetaData");
          if (!call) {
            const text = parts.filter((p: any) => p.text).map((p: any) => p.text).join("");
            return { contents, finalText: text || null };
          }
          const args = call.functionCall.args;
          // Fetch from meta-reports
          let result: unknown = { error: "SUPABASE_URL not configured" };
          if (supabaseUrl) {
            try {
              const r = await fetch(`${supabaseUrl}/functions/v1/meta-reports`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  accessToken: metaAccessToken,
                  accountId: metaAccountId,
                  reportType: args.reportType,
                  startDate: args.startDate,
                  endDate: args.endDate,
                }),
              });
              result = r.ok ? await r.json() : { error: `meta-reports error: ${r.status}` };
            } catch (e) {
              result = { error: e instanceof Error ? e.message : "fetch failed" };
            }
          }
          contents = [
            ...contents,
            { role: "model", parts },
            { role: "user", parts: [{ functionResponse: { name: "queryMetaData", response: { content: result } } }] },
          ];
        }
        return { contents, finalText: null };
      };

      const { contents: resolvedContents, finalText } = await resolveMetaTool(nonStreamUrl, requestBody);

      if (finalText !== null) {
        const encoder = new TextEncoder();
        const words = finalText.split(/(?<=\s)/);
        const stream = new ReadableStream({
          start(controller) {
            for (const chunk of words) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`),
              );
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          },
        });
        return new Response(stream, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
      }

      requestBody.contents = resolvedContents;
    }

    // Agentic loop: resolve Google queryAdsData tool calls server-side when CLI credentials are present
    if (platform !== "meta" && enableTools && providerToken && customerId) {
      const nonStreamUrl =
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}` +
        `:generateContent?key=${encodeURIComponent(String(apiKey))}`;

      const { contents: resolvedContents, finalText } = await resolveQueryAdsData(
        nonStreamUrl,
        requestBody,
        providerToken,
        customerId,
      );

      if (finalText !== null) {
        // Stream the resolved final text without an extra Gemini call
        const encoder = new TextEncoder();
        const words = finalText.split(/(?<=\s)/);
        const stream = new ReadableStream({
          start(controller) {
            for (const chunk of words) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`),
              );
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          },
        });
        return new Response(stream, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
      }

      // queryAdsData loop exhausted without final text — continue with updated contents
      requestBody.contents = resolvedContents;
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

                if (Array.isArray(parts)) {
                  for (const part of parts) {
                    if (part.text) {
                      emit(part.text);
                    }
                    if (part.functionCall) {
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({
                          choices: [{
                            delta: {
                              tool_calls: [{
                                function: {
                                  name: part.functionCall.name,
                                  arguments: JSON.stringify(part.functionCall.args)
                                }
                              }]
                            }
                          }]
                        })}\n\n`),
                      );
                    }
                  }
                }
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
