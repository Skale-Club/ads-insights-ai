---
phase: 02-meta-ads-chat-tools-paridade-total-de-manipulacao
plan: "01"
subsystem: supabase-edge-functions
tags: [meta-ads, mutations, edge-functions, campaign-lifecycle]
dependency_graph:
  requires: []
  provides: [meta-mutate-full-actions]
  affects: [analyze-ads, use-chat-stream]
tech_stack:
  added: []
  patterns: [zod-validation, form-encoded-meta-api, wrapMetaError-helper, resolveAccountId-helper]
key_files:
  created: []
  modified:
    - supabase/functions/meta-mutate/index.ts
decisions:
  - "Used URLSearchParams (application/x-www-form-urlencoded) for all new Meta API calls — consistent with Meta Graph API requirements for targeting/creative fields that must be JSON-stringified within form encoding"
  - "wrapMetaError translates Meta code=200/subcode=1487 to a friendly App Review message (403) before any other error path — audience permission gate is the primary UX concern"
  - "batchPauseEnable returns partial success (status 200) with per-entity results array — lets caller decide how to handle failures without a hard 500"
  - "All new handlers default status=PAUSED for create/duplicate actions — safe default prevents accidental spend"
metrics:
  duration_minutes: 10
  completed_date: "2026-05-17T13:50:44Z"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 1
---

# Phase 02 Plan 01: Meta Mutate Full Lifecycle Actions Summary

**One-liner:** Extended meta-mutate edge function with 13 new action handlers (create/duplicate/update/targeting/audiences/batch/splitTest) plus `wrapMetaError` helper for App Review-gated permission errors.

## What Was Built

The `supabase/functions/meta-mutate/index.ts` edge function grew from 4 actions to 17, covering the complete Meta campaign lifecycle:

**Helpers added:**
- `resolveAccountId(accountId)` — strips and re-prepends `act_` prefix, normalizing all account IDs for Graph API endpoints
- `wrapMetaError(resp, body)` — parses Meta error JSON, translates `code=200 / error_subcode=1487` to a friendly App Review message (HTTP 403), otherwise formats a structured error with `code` and `fb_trace_id`

**New Zod schema fields:** `accountId`, `adId`, `creativeId`, `audienceId`, `name`, `objective`, `status`, `targeting`, `bidStrategy`, `bidAmountCents`, `optimizationGoal`, `billingEvent`, `dailyBudgetCents`, `lifetimeBudgetCents`, `startTime`, `endTime`, `adsetSchedule`, `creative`, `deep`, `entityIds`, `entityType`, `audienceSourceType`, `audienceRules`, `sourceAudienceId`, `lookalikeSpec`, `splitTestName`, `splitTestType`, `splitTestCells`

**Task 1 — Lifecycle creation (4 handlers):**
- `createCampaign` — POST `/{act_NNN}/campaigns` with objective, name, status=PAUSED default, optional budget/bidStrategy
- `createAdSet` — POST `/{act_NNN}/adsets` with all targeting, optimization, billing fields
- `createAd` — POST `/{act_NNN}/ads` with adset_id + inline creative JSON
- `updateSchedule` — POST `/{adSetId}` with start_time, end_time, adset_schedule dayparting

**Task 2 — Duplicate + update (5 handlers):**
- `duplicateCampaign` — POST `/{campaignId}/copies` with `deep_copy` + `status_option=PAUSED`
- `duplicateAdSet` — POST `/{adSetId}/copies`, optional cross-campaign via `campaign_id`
- `updateTargeting` — POST `/{adSetId}` with `targeting` JSON-stringified in form params
- `updateBidStrategy` — POST `/{campaignId|adSetId}` with bid_strategy + optional bid_amount; validates bid_amount required for cap strategies
- `updateCreative` — POST `/{adId}`; if inline creative spec provided, first creates via `/{act_NNN}/adcreatives`, then links

**Task 3 — Audience + batch + split test (4 handlers):**
- `createCustomAudience` — POST `/{act_NNN}/customaudiences` with subtype, optional rule; `wrapMetaError` catches 1487
- `createLookalikeAudience` — POST `/{act_NNN}/customaudiences` with `subtype=LOOKALIKE`, `origin_audience_id`, `lookalike_spec`; `wrapMetaError` catches 1487
- `batchPauseEnable` — loops up to 50 entity IDs, posts status=ACTIVE|PAUSED per entity, returns `{ success: allPassed, results: [{id, success, error?}] }`
- `createSplitTest` — POST `/{act_NNN}/ad_studies` with `type=SPLIT_TEST`, cells JSON, objectives JSON

## Deviations from Plan

None - plan executed exactly as written.

The plan specified `async function wrapMetaError` — implemented as such. All 28 acceptance criteria passed in automated verification before committing.

## Known Stubs

None. This is a pure backend edge function with no UI rendering. All handlers return structured JSON responses. No hardcoded placeholders in response payloads.

## Self-Check: PASSED

- `supabase/functions/meta-mutate/index.ts` exists and was modified (685 insertions)
- Commit `b504123` verified via `git log --oneline -3`
- All 28 acceptance criteria verified via node script before commit
- Zod enum contains all 17 action names (4 original + 13 new)
- `wrapMetaError` translates code=200/subcode=1487 to HTTP 403 with App Review message
- `resolveAccountId` enforces `act_` prefix
- Existing 4 handlers (pauseCampaign, enableCampaign, updateDailyBudget, updateLifetimeBudget) preserved unchanged
- No edge function deploy performed (per M2-05)
