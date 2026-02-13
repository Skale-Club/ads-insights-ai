import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, campaignData, apiKey, model } = await req.json();

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
      `Create a distinct section for "Detailed Analysis" and "Key Recommendations".` +
      `## Golden Rules\n` +
      `1. **Context Aware**: You always have access to the user's current campaign data. **Never** ask for data that is already provided in the context.\n` +
      `2. **Proactive Analysis**: Don't just answer questions. If you see a high CPA or low CTR in the context, point it out.\n` +
      `3. **No Walls of Text**: BREAK DOWN your responses. Paragraphs should be max 2-3 lines. Use bullet points liberally.\n` +
      `4. **Fragmented Delivery**: If you have a lot to say, structure it with clear headers and short sections. \n` +
      `5. **Internal References**: When mentioning a campaign or keyword, use its exact name so the user can find it.\n` +
      `6. **Memory**: Remember previous turns in the conversation. If the user says "refine that", know what "that" refers to.\n\n` +
      `## Analysis Skills\n` +
      `### Metric Correlation\n` +
      `- LOOK FOR: Increased CPA vs Decreased CTR (Ad fatigue?), High Spend vs Zero Conversions (Wasted budget).\n` +
      `### Budget Optimization\n` +
      `- CHECK: Keywords with spend > $50 and 0 conversions. High performing campaigns limited by budget (high ROAS).\n` +
      `### Search Term Mining\n` +
      `- SCAN: Search terms in the context. Flag irrelevant ones as negative keyword suggestions.\n\n` +
      `## Interaction Style\n` +
      `- Tone: Professional, analytical, encouraging, but direct about performance issues.\n` +
      `- Formatting: Use Markdown tables for comparing metrics. Use code blocks for negative keyword lists.\n\n` +
      `Current campaign context:\n` +
      `${campaignData ? JSON.stringify(campaignData, null, 2) : "No specific campaign data provided. Use general best practices."}\n\n` +
      `Format your responses in a clear, structured way. Use bullet points for lists and bold text for important metrics. REMEMBER: Short paragraphs. No giant blocks of text.`;

    const geminiModel = String(model || "gemini-3-flash-preview").trim();
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

    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
      }),
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
      const errorText = await upstream.text();
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
