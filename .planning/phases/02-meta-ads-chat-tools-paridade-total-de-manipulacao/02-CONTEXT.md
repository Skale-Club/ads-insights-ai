# Phase 2: Meta Ads chat tools - paridade total de manipulacao - Context

**Gathered:** 2026-05-17
**Status:** Ready for planning
**Mode:** Pre-written (skip_discuss=true, autonomous mode, user explicitly authorized)

<domain>
## Phase Boundary

Expand the AI chat's Meta tool set from 5 → ~15 tools so users can perform the full Meta campaign lifecycle via natural-language conversation, with the same safety guarantees Google Ads enjoys today (approval modal for spend-affecting actions).

**Current Meta tools** (in `supabase/functions/analyze-ads/index.ts`):
- queryMetaData, pauseCampaign, enableCampaign, updateBudget, analyzeCreative

**New tools to add:**
1. `createCampaign` — Create a new campaign (objective, name, status=PAUSED by default)
2. `createAdSet` — Create ad set under campaign (targeting, budget, optimization goal, billing event)
3. `createAd` — Create ad with creative spec
4. `duplicateCampaign` — Duplicate campaign with all ad sets/ads under it
5. `duplicateAdSet` — Duplicate ad set within or across campaigns
6. `updateTargeting` — Edit geo, age, gender, interests, behaviors, custom audiences, lookalikes on ad set
7. `createCustomAudience` — Create custom audience from website/app/list (returns audience_id) — requires Meta App Review
8. `createLookalikeAudience` — Create lookalike from source audience — requires Meta App Review
9. `updateBidStrategy` — Change bid strategy (lowest_cost_without_cap, cost_cap, bid_cap, lowest_cost_with_bid_cap)
10. `batchPauseEnable` — Pause or enable many entities by IDs in one call
11. `updateCreative` — Update ad creative copy / CTA / link / swap image-or-video asset
12. `updateSchedule` — Update start/end dates + dayparting (adset_schedule)
13. `createSplitTest` — Set up A/B test via Meta's split-test API

Out of scope: dashboard pages (Phase 1), polish (Phase 3), edge function deploy, OAuth scope changes.

</domain>

<decisions>
## Implementation Decisions

### Tool Surface (analyze-ads edge function)
- Add each new tool to `metaToolDefinitions` array in `supabase/functions/analyze-ads/index.ts`
- Tool schema: OpenAI/Gemini function-calling format (same shape as existing Meta tools)
- Each tool must include `description` rich enough to teach the AI when to use it
- Parameters typed with JSON Schema (required + optional with sensible defaults)
- Update `buildMetaSystemPrompt()` to teach: when to suggest creating vs editing, when to suggest duplicating vs creating from scratch, approval expectations, batch limits

### Mutation Handlers (meta-mutate edge function)
- Add new action handlers in `supabase/functions/meta-mutate/index.ts` — one per tool
- Each handler: validate inputs → check CLI session token or user JWT → call Meta Marketing API v18.0 → return structured result
- Use existing CLI session pattern from `get-meta-cli-session/index.ts` for elevated mutations
- Standard error wrapping: catch Meta API errors, return `{ ok: false, error: { code, message, fb_trace_id } }`
- Code only — no deploy

### Chat Stream Routing (use-chat-stream.ts)
- Add tool-call handlers for each new tool in `src/hooks/use-chat-stream.ts`
- Route to `meta-mutate` edge function with appropriate action name
- Preserve existing approval flow: spend-affecting tools (create/duplicate/updateBudget/updateBidStrategy) must surface ApprovalModal before invoking the edge function
- Read-only tools (queryMetaData stays as is) bypass approval
- Show structured success/error messages back into the chat thread

### Approval Policy
- **Auto-allowed (no approval modal):** queryMetaData, analyzeCreative
- **Approval required:** All create*, update*, duplicate*, batch*, pauseCampaign, enableCampaign, createCustomAudience, createLookalikeAudience, updateBidStrategy, updateBudget, updateSchedule, updateCreative, updateTargeting, createSplitTest, batchPauseEnable
- Approval modal shows: tool name, target entity (campaign/adset/ad name + ID), human-readable diff of what will change, "Approve" / "Cancel"
- Reuse existing ApprovalModal component if present, otherwise wire up using the Google approval flow as template

### Permission-Gated Features
- `createCustomAudience` and `createLookalikeAudience` require Meta App Review tier `ads_management_standard_access` + `custom_audiences` scope on the user's access token
- If Meta returns a permission error (code 200 / subcode 1487), surface a friendly message: "Custom audiences require Meta App Review approval. Contact support to enable."
- Document the permission requirement in `VERIFICATION.md` so user knows what to request

### Claude's Discretion
- Exact JSON Schema for each tool parameter set (favor Meta API v18.0 native field names)
- Default values for optional parameters (e.g., billing_event=IMPRESSIONS, optimization_goal=OFFSITE_CONVERSIONS for purchase campaigns)
- Specific copy of approval modal messages
- Error message wording

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `supabase/functions/analyze-ads/index.ts` lines ~11-77 — metaToolDefinitions array (to extend)
- `supabase/functions/analyze-ads/index.ts` lines ~283-285 — system prompt routing
- `supabase/functions/meta-mutate/index.ts` — existing action dispatcher (pattern to extend)
- `supabase/functions/get-meta-cli-session/index.ts` — CLI session token issuance
- `src/hooks/use-chat-stream.ts` lines 53, 73, 149-153, 360 — platform-aware request building + tool-call handling
- `src/hooks/use-chat-v2.ts` — AnalyzeAdsTransport
- `src/hooks/useMetaCliSession.ts` — client-side CLI session management
- ApprovalModal component (find by grep in src/components/)

### Established Patterns
- Edge function action dispatcher: `switch (action) { case 'pause': ... }` in meta-mutate
- Tool-call handlers in use-chat-stream return `{ status, result }` to merge back into chat state
- Approval modal pattern from Google mutations (lookup `addNegativeKeyword`, `adjustBid` handlers as reference)
- All Meta API calls go through edge function (never directly from frontend)
- CLI session token gives elevated privileges scoped to a single account + ttl

### Integration Points
- Frontend tool-call handler in `use-chat-stream.ts` is where approval flow gates execution
- Edge function `meta-mutate` is the single sink for all Meta mutations
- `meta-cli-sessions` table stores temporary elevated access tokens
- Chat conversation history persisted via existing chat persistence hook
- System prompt rebuilt per request based on platform

</code_context>

<specifics>
## Specific Ideas

- For `createSplitTest`, use Meta's split-test API (`/{account-id}/ad_studies`) — supports A/B by creative or audience
- For `batchPauseEnable`, cap batch size at 50 entities per call (Meta API limit on certain endpoints)
- For `updateTargeting`, accept partial updates (only specified fields change; rest preserved)
- For `duplicateCampaign`, expose `deep` param: true = duplicate including all child ad sets and ads, false = shell only
- For `updateCreative`, support either inline new asset spec OR reference to an existing creative_id
- All tools should accept human-friendly name OR id (resolve name → id server-side for safety)

</specifics>

<deferred>
## Deferred Ideas

- Bulk import from CSV (defer — needs UI work)
- Campaign performance forecasting before creating (defer — needs separate ML/AI layer)
- Creative auto-generation (defer — separate AI capability)
- Auto-bid adjustments via scheduled job (defer — needs scheduling infra)
- Cross-account campaign cloning (defer — multi-account auth complexity)

</deferred>
