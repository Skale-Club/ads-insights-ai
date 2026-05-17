---
phase: 02-meta-ads-chat-tools-paridade-total-de-manipulacao
plan: "03"
subsystem: chat-stream
tags: [meta, tool-routing, approval-flow, gemini, mutation]
dependency_graph:
  requires: [02-01, 02-02]
  provides: [tool-call-routing-meta]
  affects: [use-chat-stream, approveTool, meta-mutate]
tech_stack:
  added: []
  patterns: [tool-dispatch-switch, discriminated-body-assembly]
key_files:
  modified:
    - src/hooks/use-chat-stream.ts
decisions:
  - "Read-only tools (analyzeCreative, queryMetaData) get explicit early return before the dispatch chain rather than falling to an else clause — makes bypass intent explicit and prevents silent no-op for future unknown read-only tools"
  - "updateBudget routing extended to handle targetType-based body assembly (targetId -> adSetId/campaignId) matching the analyze-ads tool definition shape"
  - "Unknown Meta tool names surface a warning DataPart instead of silently returning — easier to debug future tool name mismatches"
  - "accountId included in all body payloads for every Meta action — handlers only use it when needed, but it costs nothing to always send it"
metrics:
  duration_minutes: 12
  completed_date: "2026-05-17"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 1
---

# Phase 02 Plan 03: Meta Chat Tool Routing Summary

**One-liner:** Wired all 13 new Gemini Meta tool calls through approveTool to meta-mutate actions with correct body shapes, extending TOOL_RISK_LEVEL and TOOL_DESCRIPTION maps.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extend TOOL_RISK_LEVEL and TOOL_DESCRIPTION for 13 new tools | 539de99 | src/hooks/use-chat-stream.ts |
| 2 | Extend approveTool Meta branch with 13 new tool dispatches | 03f861a | src/hooks/use-chat-stream.ts |

---

## What Was Built

`src/hooks/use-chat-stream.ts` now routes all 18 Meta tool calls (5 pre-existing + 13 new) through the existing approval flow:

**TOOL_RISK_LEVEL additions:**
- `high`: createCampaign, createAdSet, createAd, createCustomAudience, createLookalikeAudience, batchPauseEnable
- `medium`: duplicateCampaign, duplicateAdSet, updateTargeting, updateBidStrategy, updateCreative, updateSchedule, createSplitTest

**TOOL_DESCRIPTION additions:** Human-readable copy for all 13 tools displayed in ToolApprovalDialog.

**approveTool Meta branch dispatch chain:**

| Tool Name | meta-mutate action | Key body fields |
|---|---|---|
| analyzeCreative / queryMetaData | (early return — no mutation) | — |
| pauseCampaign | pauseCampaign | campaignId |
| enableCampaign | enableCampaign | campaignId |
| updateBudget | updateDailyBudget / updateLifetimeBudget | adSetId/campaignId, amountCents |
| createCampaign | createCampaign | name, objective, dailyBudgetCents, bidStrategy, status=PAUSED |
| createAdSet | createAdSet | campaignId, name, optimizationGoal, billingEvent, targeting |
| createAd | createAd | adSetId, name, creative, status=PAUSED |
| duplicateCampaign | duplicateCampaign | campaignId, deep |
| duplicateAdSet | duplicateAdSet | adSetId, campaignId |
| updateTargeting | updateTargeting | adSetId, targeting |
| updateSchedule | updateSchedule | adSetId, startTime, endTime, adsetSchedule |
| updateBidStrategy | updateBidStrategy | campaignId/adSetId, bidStrategy, bidAmountCents |
| updateCreative | updateCreative | adId, creativeId, creative |
| createCustomAudience | createCustomAudience | name, audienceSourceType, audienceRules |
| createLookalikeAudience | createLookalikeAudience | name, sourceAudienceId, lookalikeSpec |
| batchPauseEnable | batchPauseEnable | entityIds, entityType, status |
| createSplitTest | createSplitTest | splitTestName, splitTestType, splitTestCells |

---

## Approval Flow Verification

The `streamChat` path (lines 339-346) still calls `onApprovalRequest` for every tool call received from Gemini — this surfaces ToolApprovalDialog for ALL tools including the 13 new ones. The `approveTool` function only executes after user approval. Read-only tools (`analyzeCreative`, `queryMetaData`) are registered as `low` risk in TOOL_RISK_LEVEL and their approval leads to an early return (no mutation) — the approval dialog still shows but no meta-mutate call is made.

Google branch (`/functions/v1/google-ads-execute`) is unchanged.

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] updateBudget body assembly extended for targetType-based routing**
- **Found during:** Task 2 — reviewing analyze-ads tool definition for updateBudget
- **Issue:** Original code passed `input.adSetId` and `input.campaignId` directly, but the analyze-ads tool definition uses `targetType: adset_daily | campaign_lifetime` and `targetId` (not adSetId/campaignId). The old code would have sent undefined values to meta-mutate.
- **Fix:** Extended updateBudget branch to detect `targetType` and map `targetId` to the correct `adSetId` or `campaignId` field, and also handle `newAmountCents` (the field name from tool def) as well as `amountCents` (the old field name) via nullish coalescing.
- **Files modified:** src/hooks/use-chat-stream.ts
- **Commit:** 03f861a

**2. [Rule 2 - Missing Functionality] Unknown tool warning instead of silent drop**
- **Found during:** Task 2
- **Issue:** The original `else` branch silently returned without user feedback. Any future tool name mismatch would be invisible.
- **Fix:** Added explicit `addDataPart` warning status for unknown Meta tool names before returning.
- **Files modified:** src/hooks/use-chat-stream.ts
- **Commit:** 03f861a

---

## Known Stubs

None. All 13 tool dispatches call real meta-mutate actions with correct body shapes. No placeholder values.

---

## Self-Check: PASSED

- `539de99` exists: confirmed
- `03f861a` exists: confirmed
- `src/hooks/use-chat-stream.ts` exists: confirmed
- All 13 `toolName === 'X'` branches present: confirmed via automated verification
- Google branch unchanged: 1 occurrence of `/functions/v1/google-ads-execute` confirmed
- analyzeCreative/queryMetaData early return: confirmed
- All existing TOOL_RISK_LEVEL/TOOL_DESCRIPTION entries preserved
