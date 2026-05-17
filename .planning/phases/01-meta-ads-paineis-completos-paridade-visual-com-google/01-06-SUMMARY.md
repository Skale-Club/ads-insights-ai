---
phase: 01-meta-ads-paineis-completos-paridade-visual-com-google
plan: "06"
subsystem: meta-dashboard-pages
tags: [meta-ads, budgets, pacing-bar, react, shadcn, tabs]
dependency_graph:
  requires:
    - 01-01 (meta-reports edge function - budgets-detail report type)
    - 01-02 (useMetaReport hook - budgets-detail type union)
  provides:
    - src/pages/dashboard/meta/Budgets.tsx (MetaBudgetsPage)
  affects:
    - 01-07 (route registration in App.tsx)
    - 01-08 (navigation config update)
tech_stack:
  added: []
  patterns:
    - Tabs/TabsList/TabsTrigger/TabsContent from shadcn for campaign vs ad set views
    - Progress component for per-row utilization pacing bar
    - Inner BudgetTable component encapsulating table rendering logic
key_files:
  created:
    - src/pages/dashboard/meta/Budgets.tsx
  modified: []
decisions:
  - Used inline BudgetTable component (not DataTable) to render native HTML table — matches Meta Campaigns.tsx pattern and avoids TanStack Table dependency for a simpler read-only view
  - Pacing bar color-coded: destructive (>100%), warning (80-100%), success (<80%) — visual priority for over-budget detection
  - KPI grid shows campaign+adset counts combined as "Active Budgets" for at-a-glance total
  - budgetType capitalized via CSS class "capitalize" — no JS transformation needed
  - bidStrategy shows em-dash (—) when null — better than empty cell
metrics:
  duration_minutes: 8
  completed_date: "2026-05-17"
  tasks_completed: 1
  tasks_total: 1
  files_created: 1
  files_modified: 0
---

# Phase 01 Plan 06: Meta Budgets Page Summary

**One-liner:** Meta Budgets page with campaign+adset tabs, per-row utilization pacing bars, over-budget alert card, and daily vs lifetime budget type distinction.

## What Was Built

`src/pages/dashboard/meta/Budgets.tsx` exports `MetaBudgetsPage` as default. The page mirrors Google's Budgets page structure with Meta-specific additions:

- **Tabs:** Campaigns tab and Ad Sets tab, each powered by data from `useMetaReport<BudgetsDetailResponse>('budgets-detail')`
- **Pacing bar per row:** `<Progress value={Math.min(r.utilization, 100)} />` with color-coded percentage label (destructive >100%, warning 80-100%, success otherwise)
- **Daily vs lifetime distinction:** `budgetType` field shown as capitalized text in the Type column
- **Over-budget alert card:** Renders only when `stats.overBudget > 0`, styled with `border-destructive/50 bg-destructive/5`
- **4-column KPI grid:** Total Budget, Total Spent, Remaining (red if negative), Active Budgets
- **Guards:** `selectedMetaAccount` check shows connect prompt with `DollarSign` icon + Link to /settings; `isLoading` shows `Loader2` spinner
- **Error card:** Shown when `error` is truthy

## Architecture

```
MetaBudgetsPage (default export)
  ├── selectedMetaAccount guard → connect prompt
  ├── isLoading guard → Loader2 spinner
  ├── error card (conditional)
  ├── over-budget alert card (conditional, utilization > 100)
  ├── KPI grid (4 cards)
  └── Tabs
       ├── TabsTrigger "campaigns" (Megaphone icon)
       ├── TabsTrigger "adsets" (Layers icon)
       ├── TabsContent "campaigns" → Card → BudgetTable
       └── TabsContent "adsets" → Card → BudgetTable

BudgetTable({ rows })
  ├── empty state if rows.length === 0
  └── <table> columns: Name | Status | Type | Budget | Spent | Remaining | Utilization | Bid Strategy
```

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None. The page is wired to `useMetaReport('budgets-detail')` which will return real data when the edge function (plan 01) is deployed. No hardcoded empty values flow to UI rendering — `data?.campaigns ?? []` and `data?.adsets ?? []` are standard empty-state fallbacks, not stubs.

## Self-Check: PASSED
