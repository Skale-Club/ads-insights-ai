---
phase: 01-meta-ads-paineis-completos-paridade-visual-com-google
plan: 01
subsystem: edge-functions
tags: [meta-ads, edge-function, api, reporting]
dependency_graph:
  requires: []
  provides: [meta-reports/audiences, meta-reports/placements, meta-reports/conversions, meta-reports/pixel-events, meta-reports/budgets-detail]
  affects: [plans 02-06 — all new Meta dashboard pages depend on these report types]
tech_stack:
  added: []
  patterns: [if-else dispatcher chain, Meta Graph API v20.0 breakdown queries, Zod enum extension]
key_files:
  created: []
  modified:
    - supabase/functions/meta-reports/index.ts
decisions:
  - Used fetchBreakdown() helper function in audiences branch to avoid URL repetition across 4 breakdown calls
  - Budgets divide by 100 (Meta API returns budget in cents)
  - conversions branch queries at campaign level for per-campaign funnel data plus account-level totals
metrics:
  duration: 4 minutes
  completed: "2026-05-17"
  tasks_completed: 2
  files_modified: 1
---

# Phase 01 Plan 01: Extend meta-reports Edge Function — 5 New Report Types Summary

Extended `supabase/functions/meta-reports/index.ts` with 5 new Zod-validated report type branches (audiences, placements, conversions, pixel-events, budgets-detail) using Meta Graph API v20.0 breakdowns, enabling the new dashboard pages planned in plans 02-06.

## What Was Built

### New Report Types Added

**1. `audiences`** — 4 breakdown buckets in one response
- API: `/{act_id}/insights` with breakdowns `age,gender` / `region` / `device_platform` / `publisher_platform`
- Shape: `{ ageGender: Row[], region: Row[], device: Row[], publisher: Row[] }`
- Each row: `{ id, label, impressions, clicks, spend, ctr, cpc, conversions, costPerConversion, roas }`

**2. `placements`** — granular placement breakdown
- API: `/{act_id}/insights` with breakdown `publisher_platform,platform_position,impression_device`
- Shape: `PlacementRow[]`
- Each row: `{ id, publisherPlatform, platformPosition, impressionDevice, placementLabel, impressions, clicks, spend, ctr, cpc, reach, frequency, conversions, roas }`

**3. `pixel-events`** — per-action-type aggregate
- API: `/{act_id}/insights` with `actions,action_values,cost_per_action_type`
- Shape: `PixelEventRow[]`
- Each row: `{ id, actionType, count, value, costPerAction, roas }`

**4. `conversions`** — per-campaign conversion funnel + account totals
- API: `/{act_id}/insights` at `level=campaign` with `actions,action_values`
- Shape: `{ perCampaign: CampaignConvRow[], totals: ConvTotals }`
- Tracks: purchases, leads, add-to-cart, purchaseValue, costPerPurchase, conversionRate, roas

**5. `budgets-detail`** — campaign + ad set budgets with pacing
- API: parallel `/{act_id}/campaigns` + `/{act_id}/adsets` with budget and insights fields
- Shape: `{ campaigns: BudgetRow[], adsets: BudgetRow[] }`
- Each row: `{ id, level, name, campaignId, status, budgetType, amount, spent, remaining, utilization, bidStrategy }`
- Budgets divided by 100 (Meta API returns values in cents)

### Zod Schema Updated

`RequestSchema.reportType` enum extended from 6 to 11 values:
```
["overview", "campaigns", "adsets", "ads", "insights_by_placement", "daily_performance",
 "audiences", "placements", "conversions", "pixel-events", "budgets-detail"]
```

### Existing Branches Unchanged

All 6 existing branches (overview, campaigns, adsets, ads, insights_by_placement, daily_performance) remain untouched.

## Meta API Endpoints Used

| Branch | Endpoint | Key Params |
|--------|----------|------------|
| audiences | `/{act_id}/insights` | breakdowns=age,gender / region / device_platform / publisher_platform |
| placements | `/{act_id}/insights` | breakdowns=publisher_platform,platform_position,impression_device |
| pixel-events | `/{act_id}/insights` | fields=spend,actions,action_values,cost_per_action_type |
| conversions | `/{act_id}/insights` | level=campaign, fields include campaign_id/name |
| budgets-detail | `/{act_id}/campaigns` + `/{act_id}/adsets` | fields include daily_budget,lifetime_budget,budget_remaining,bid_strategy + insights{spend} |

## Deploy Status

Edge function NOT deployed — code only, per plan constraint M2-05. Deploy is user responsibility.

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 25f7b65 | feat(01-01): extend meta-reports enum + add audiences/placements/pixel-events branches |
| 2 | 120176b | feat(01-01): add conversions and budgets-detail branches to meta-reports |

## Deviations from Plan

### Auto-fixed Issues

None.

### Implementation Notes

**Audiences branch helper function:** The plan showed inline URL construction for each breakdown, but the implementation uses a `fetchBreakdown(bd: string)` helper to avoid repetition. All 4 breakdowns (`age,gender`, `region`, `device_platform`, `publisher_platform`) are present in the file as string arguments. Functionally identical.

## Known Stubs

None — this plan only extends backend logic. No UI components were created, so no stub tracking needed.

## Self-Check: PASSED

- `supabase/functions/meta-reports/index.ts` exists and contains all 5 new branches
- Commit 25f7b65 exists (Task 1)
- Commit 120176b exists (Task 2)
- z.enum contains all 11 report types
- All 6 existing branches unchanged
- No deploy command in code
