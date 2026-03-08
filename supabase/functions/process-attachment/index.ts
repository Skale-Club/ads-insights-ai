import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version",
};

interface ProcessRequest {
    type: 'audio' | 'image';
    data: string;
    mimeType: string;
    apiKey?: string;
    prompt?: string;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const body: ProcessRequest = await req.json();
        const { type, data, mimeType, apiKey, prompt } = body;

        if (type === 'audio') {
            return await processAudio(data, mimeType, apiKey);
        }

        if (type === 'image') {
            return await processImage(data, mimeType, apiKey, prompt);
        }

        return new Response(
            JSON.stringify({ error: "Invalid attachment type" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("process-attachment error:", error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});

async function processAudio(data: string, mimeType: string, apiKey?: string) {
    if (!apiKey) {
        return new Response(
            JSON.stringify({ error: "API key required for audio transcription" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const audioBytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));

    const requestBody: any = {
        config: {
            encoding: mimeType.includes('webm') ? 'WEBM_OPUS' : mimeType.includes('mp3') ? 'MP3' : 'LINEAR16',
            sampleRateHertz: 48000,
            languageCode: 'pt-BR',
            enableAutomaticPunctuation: true,
        },
        audio: {
            content: data,
        },
    };

    const response = await fetch(
        `https://speech.googleapis.com/v1/speech:recognize?key=${encodeURIComponent(apiKey)}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Google Speech API error:', response.status, errorText);

        if (response.status === 401 || response.status === 403) {
            return new Response(
                JSON.stringify({ error: "Invalid API key for Google Speech-to-Text" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({ error: "Failed to transcribe audio" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const result = await response.json();
    const transcription = result.results
        ?.map((r: any) => r.alternatives?.[0]?.transcript || '')
        .join(' ')
        .trim() || '';

    return new Response(
        JSON.stringify({ transcription }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
}

async function processImage(data: string, mimeType: string, apiKey?: string, prompt?: string) {
    if (!apiKey) {
        return new Response(
            JSON.stringify({ error: "API key required for image analysis" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const systemPrompt = prompt || "Analyze this image in the context of Google Ads. Describe what you see and provide insights relevant to advertising, marketing, or campaign optimization. If the image contains data, charts, or metrics, interpret them.";

    const requestBody = {
        contents: [
            {
                parts: [
                    { text: systemPrompt },
                    {
                        inline_data: {
                            mime_type: mimeType,
                            data: data,
                        },
                    },
                ],
            },
        ],
        generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1024,
        },
    };

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini Vision API error:', response.status, errorText);

        if (response.status === 401 || response.status === 403) {
            return new Response(
                JSON.stringify({ error: "Invalid API key for Gemini" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({ error: "Failed to analyze image" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const result = await response.json();
    const analysis = result.candidates?.[0]?.content?.parts
        ?.map((p: any) => p.text || '')
        .join('')
        .trim() || '';

    return new Response(
        JSON.stringify({ analysis }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
}
