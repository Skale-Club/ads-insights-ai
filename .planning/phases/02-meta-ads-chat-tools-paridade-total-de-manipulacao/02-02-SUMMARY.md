---
phase: 02-meta-ads-chat-tools-paridade-total-de-manipulacao
plan: 02
subsystem: analyze-ads edge function
tags: [meta-ads, gemini, tool-definitions, system-prompt, function-calling]
dependency_graph:
  requires: []
  provides: [metaToolDefinitions-18-tools, buildMetaSystemPrompt-full-coaching]
  affects: [analyze-ads edge function, Meta AI chat tool surface]
tech_stack:
  added: []
  patterns: [gemini-function-declarations, json-schema-parameters, system-instruction]
key_files:
  created: []
  modified:
    - supabase/functions/analyze-ads/index.ts
    - supabase/functions/analyze-ads/system-prompt.ts
decisions:
  - "All 13 new tools appended after existing 5 entries — preserving original array order"
  - "Decision Heuristics section added to system prompt to teach create-vs-duplicate and update-vs-create reasoning"
  - "Meta App Review gate documented inline in createCustomAudience and createLookalikeAudience tool descriptions"
metrics:
  duration_minutes: 8
  completed_date: "2026-05-17T13:50:29Z"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
---

# Phase 02 Plan 02: Meta Tool Definitions + System Prompt Coaching Summary

**One-liner:** Extended metaToolDefinitions from 5 to 18 entries and rewrote buildMetaSystemPrompt's "When to Use Tools" section with full per-tool trigger conditions, category groupings, and a Decision Heuristics section teaching create-vs-duplicate, update-vs-create, batch cap, and approval modal expectations.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Append 13 new tool definitions to metaToolDefinitions | bb46471 | supabase/functions/analyze-ads/index.ts |
| 2 | Update buildMetaSystemPrompt with full tool coaching | 680cf9b | supabase/functions/analyze-ads/system-prompt.ts |

## Changes Made

### Task 1 — 13 New Tool Definitions (index.ts)

Added after existing `analyzeCreative` entry, before closing `];`:

**Lifecycle creation:** `createCampaign`, `createAdSet`, `createAd`
- Each defaults to PAUSED status to prevent accidental spend
- `createCampaign` supports all 6 OUTCOME_* objectives, CBO budgets, and bid strategies
- `createAdSet` exposes targeting spec (geo, age, interests, custom/lookalike), optimizationGoal enum, billingEvent
- `createAd` accepts either `creative_id` reference or inline `object_story_spec`

**Scale/duplicate:** `duplicateCampaign`, `duplicateAdSet`
- `duplicateCampaign.deep=true` clones all child ad sets and ads; `false` = shell only
- `duplicateAdSet` stays in same campaign or routes to a different campaignId

**Mutations:** `updateTargeting`, `updateBidStrategy`, `updateCreative`, `updateSchedule`
- All accept partial updates — unspecified fields preserved server-side
- `updateBidStrategy` documents that COST_CAP/BID_CAP/LOWEST_COST_WITH_BID_CAP require `bidAmountCents`
- `updateSchedule` supports dayparting via `adsetSchedule` array

**Audience tools:** `createCustomAudience`, `createLookalikeAudience`
- Both descriptions note Meta App Review requirement upfront to set user expectations

**Batch ops:** `batchPauseEnable` — max 50 entities per call, enum-typed status field

**Experiments:** `createSplitTest` — CREATIVE/AUDIENCE/PLACEMENT types via Meta /ad_studies

### Task 2 — buildMetaSystemPrompt Rewrite (system-prompt.ts)

Replaced 5-line "When to Use Tools" section with:
- **Read-only tools** block (queryMetaData, analyzeCreative) — no approval
- **Spend-affecting tools** block — grouped into status toggles, budget/bid, lifecycle creation, duplicate, targeting/schedule, creative, audiences, experiments
- Each tool entry has its trigger condition, defaults, and caveats
- **Decision Heuristics** section: create-vs-duplicate, update-vs-create, batch limit (50), approval expectation, always-include-reason rule

Google `buildSystemPrompt` and `toolDefinitions` are unchanged.

## Verification Results

- `metaToolDefinitions.length` = 18 (5 original + 13 new) — verified
- All 13 tool names present in index.ts — verified via node script
- All 14 required terms (tool names + "Decision Heuristics" + "Meta App Review" + "approval modal") present in system-prompt.ts — verified
- `buildSystemPrompt` (Google) unchanged — confirmed 1 occurrence
- `ad-creative skill frameworks` line preserved — confirmed 1 occurrence

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — this plan adds tool definitions and system prompt coaching only. No data wiring or UI rendering involved.

## Self-Check: PASSED

- supabase/functions/analyze-ads/index.ts — modified and committed bb46471
- supabase/functions/analyze-ads/system-prompt.ts — modified and committed 680cf9b
- All 13 tool names verified present
- Google tools unchanged
