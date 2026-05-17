# Phase 02 Verification — Meta Ads Chat Tools Parity

**Phase:** 02-meta-ads-chat-tools-paridade-total-de-manipulacao
**Verified:** 2026-05-17
**Mode:** Static + documentation (no deploy per M2-05)

## Scope Recap

Expanded Meta chat tool surface from 5 to 18 tools, adding full lifecycle manipulation (create / edit / duplicate / batch / target / audience / creative / schedule / A/B) with the existing approval flow.

## Static Checks

| Check | Command | Result |
|-------|---------|--------|
| TypeScript | `npx tsc --noEmit -p tsconfig.app.json` | FAIL (pre-existing baseline errors — see Known Issues) |
| ESLint (modified frontend files) | `npx eslint src/hooks/use-chat-stream.ts src/components/dashboard/ToolApprovalDialog.tsx` | FAIL — 2 errors (no-explicit-any at lines 402, 404 in use-chat-stream.ts, introduced in Plan 02-03 with Record<string, any> body type) |
| Deno check (edge functions, best-effort) | `deno check supabase/functions/meta-mutate/index.ts supabase/functions/analyze-ads/index.ts` | SKIPPED — deno not on PATH; fallback node readFileSync confirms both files are non-empty |
| Tool-name round-trip | grep all 13 names across 5 files | PASS — all 13 present in all 5 layers (counts >= 1 per file) |

## Tool Status

Each new tool is exposed end-to-end (tool def → system prompt → frontend dispatch → modal copy → edge handler). Live usage depends on the user's Meta access token scopes and (for 2 tools) App Review status.

| Tool | Code Status | Live Status Notes |
|------|-------------|-------------------|
| createCampaign | Callable | Needs `ads_management` scope (standard for Marketing API) |
| createAdSet | Callable | Same |
| createAd | Callable | Same; user must supply a valid creative_id or object_story_spec with a Page they admin |
| duplicateCampaign | Callable | Uses `/copies` endpoint; new campaign starts paused |
| duplicateAdSet | Callable | Same |
| updateTargeting | Callable | Targeting payload must be valid Meta spec; partial update preserved |
| updateBidStrategy | Callable | COST_CAP/BID_CAP/LOWEST_COST_WITH_BID_CAP require bidAmountCents |
| updateCreative | Callable | Inline creative path creates a new adcreative first, then attaches |
| updateSchedule | Callable | start_time/end_time/adset_schedule snake_case per Meta API |
| createCustomAudience | **GATED** — requires Meta App Review (`ads_management_standard_access` + `custom_audiences` scope) | Returns friendly App Review error if scope missing (code 200, subcode 1487) |
| createLookalikeAudience | **GATED** — same as above | Same |
| batchPauseEnable | Callable | Hard cap 50 per call (enforced by Zod); partial failures returned in `results[]` |
| createSplitTest | Callable | Uses `/ad_studies` endpoint; cells must conform to Meta /ad_studies spec |

## Approval Flow

All 13 new tools route through the existing `ToolApprovalDialog` before invoking `meta-mutate`. Read-only tools (`queryMetaData`, `analyzeCreative`) bypass — same as before. Risk levels per Plan 02-03:

- **High risk** (creates + audience + batch): createCampaign, createAdSet, createAd, createCustomAudience, createLookalikeAudience, batchPauseEnable
- **Medium risk** (duplicates + targeted updates): duplicateCampaign, duplicateAdSet, updateTargeting, updateBidStrategy, updateCreative, updateSchedule, createSplitTest

The two App Review-gated tools show an in-modal yellow banner explaining the scope requirement.

## Pre-launch Checklist (for the user)

Before this phase goes live, the user must:

- [ ] **Deploy edge functions** (Claude is NOT permitted to deploy per M2-05):
  ```
  npx supabase functions deploy meta-mutate
  npx supabase functions deploy analyze-ads
  ```
- [ ] **Confirm Meta access token scopes** on the connected Meta account include at minimum `ads_management` and `pages_show_list`. For audiences, additionally `ads_management_standard_access` + `custom_audiences` (App Review-gated).
- [ ] **Submit Meta App Review** for the two audience tools if you intend to use them in production:
    - `ads_management_standard_access` permission tier
    - `custom_audiences` permission
    - Provide a screencast showing how the chat triggers `createCustomAudience` with user approval
- [ ] **Smoke test in dev** with a low-budget test campaign:
    1. Open chat on a Meta account
    2. Ask: "Create a paused test campaign called 'phase-02-smoke' with objective traffic and $5/day"
    3. Verify ApprovalModal appears with `createCampaign` + the campaign details
    4. Approve and confirm a paused campaign with that name appears in Ads Manager
    5. Repeat for `duplicateCampaign`, `updateBudget`, `batchPauseEnable`
- [ ] **Roll back plan**: keep the previous edge function version handy via `npx supabase functions list` — if the new tools cause issues, redeploy the prior version.

## Known Issues

### tsc errors (pre-existing, not introduced by Phase 02)

All TypeScript errors reported by `npx tsc --noEmit -p tsconfig.app.json` that touch Phase 02 files are in `src/hooks/use-chat-stream.ts` at lines 339, 395, 408, 518, 550, 603. These errors (`TS2353: Object literal may only specify known properties, and 'toolCallId'/'label' does not exist in type 'Omit<DataPart, "id" | "createdAt">'`) are pre-existing: they appear identically in the `e99290c` commit (before Phase 02 began), confirming Phase 02 did not introduce or worsen them.

All other tsc errors are in files outside the Phase 02 scope (AlertSystem, DataTable, HeroMetrics, PerformanceChart, CompanySection, MetaAdsSection, use-chat-context, use-chat-session, useCliSession, useGoogleAdsReport, useMetaCliSession, useMetaReport, Campaigns, Overview, Recommendations). These are deferred to Phase 03 (polish / lint / types).

### ESLint errors introduced by Phase 02

`src/hooks/use-chat-stream.ts` lines 402 and 404: `@typescript-eslint/no-explicit-any` — introduced in Plan 02-03 commit `539de99` with `const input = pending.part.input as Record<string, any>` and `let body: Record<string, any>`. These are pragmatic any types needed because tool inputs are untyped at the dispatch layer. Flagged here for Phase 03 remediation (add explicit union type or branded type for tool input payloads).

`ToolApprovalDialog.tsx` passes ESLint with 0 errors.

## Deferred (out of scope per CONTEXT.md)

- Bulk CSV import
- Campaign performance forecasting before creation
- Creative auto-generation
- Auto-bid adjustments via scheduled job
- Cross-account campaign cloning

## Files Modified

- `supabase/functions/meta-mutate/index.ts` — +13 action handlers + 2 helpers (wrapMetaError, resolveAccountId)
- `supabase/functions/analyze-ads/index.ts` — +13 entries in `metaToolDefinitions`
- `supabase/functions/analyze-ads/system-prompt.ts` — expanded "When to Use Tools" + new "Decision Heuristics" in buildMetaSystemPrompt
- `src/hooks/use-chat-stream.ts` — +13 entries each in TOOL_RISK_LEVEL and TOOL_DESCRIPTION + +13 dispatch branches in approveTool Meta path
- `src/components/dashboard/ToolApprovalDialog.tsx` — +13 entries in toolDescriptions + App Review banner + platform-agnostic copy
