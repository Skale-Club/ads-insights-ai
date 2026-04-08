---
phase: 07-query-ads-data
plan: 01
type: summary
status: complete
completed_at: 2026-04-08
---

# Phase 07-01 Summary: Dynamic queryAdsData

## Outcome

`queryAdsData` Gemini tool now executes server-side in `analyze-ads` when CLI credentials are present.

## Changes

File: `supabase/functions/analyze-ads/index.ts`

**New helpers:**
- `fetchAdsReport(args, providerToken, customerId)` — calls `google-ads-reports` edge function via `SUPABASE_URL`
- `resolveQueryAdsData(nonStreamUrl, requestBody, providerToken, customerId)` — agentic loop (max 4 iterations): calls Gemini non-streaming, detects `queryAdsData` function calls, executes them, appends `functionResponse` to contents, repeats until final text or exhausted

**Schema change:**
- Added `providerToken: z.string().optional()` and `customerId: z.string().optional()` to `AnalyzeRequestSchema`

**Main handler:**
- When `enableTools && providerToken && customerId`: runs `resolveQueryAdsData` loop before streaming
- If loop produces `finalText`: fake-streams it word-by-word as SSE (no extra Gemini call)
- If loop exhausted without final text: falls through to real Gemini streaming with updated contents (including function responses)
- If no CLI credentials: existing streaming path unchanged (web app unaffected)

## Behavior

- **CLI sessions**: Gemini can call `queryAdsData` and get real data mid-conversation. Up to 4 rounds of data fetching before final response.
- **Web app**: Unchanged. `queryAdsData` tool calls are forwarded to client as before.
