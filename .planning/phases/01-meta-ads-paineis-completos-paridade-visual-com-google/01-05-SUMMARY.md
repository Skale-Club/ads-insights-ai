---
phase: 01-meta-ads-paineis-completos-paridade-visual-com-google
plan: 05
subsystem: meta-ads-reports
tags: [meta-ads, xlsx-export, report-builder, campaigns]
dependency_graph:
  requires: [useMetaReport, useDashboard, xlsx]
  provides: [MetaReportsPage]
  affects: [meta-dashboard-reports-route]
tech_stack:
  added: []
  patterns: [field-selector-with-checkboxes, xlsx-export-with-date-range-filename]
key_files:
  created:
    - src/pages/dashboard/meta/Reports.tsx
  modified: []
decisions:
  - "Reuse existing 'campaigns' reportType from useMetaReport — avoids new edge function, full data already available"
  - "Filename pattern: meta-{account-slug}-{from}-to-{to}.xlsx for unique, descriptive export files"
  - "AVAILABLE_FIELDS constant with default:true/false drives both the checkboxes and the column selection at export time"
metrics:
  duration_minutes: 5
  completed_date: "2026-05-17"
  tasks_completed: 1
  tasks_total: 1
  files_created: 1
  files_modified: 0
requirements: [M2-01, M2-04]
---

# Phase 01 Plan 05: Meta Reports Page Summary

**One-liner:** Meta custom report builder with 11-field xlsx export using existing `campaigns` report type and date-range filename pattern.

## What Was Built

`src/pages/dashboard/meta/Reports.tsx` — A full-featured report builder page for Meta Ads that:

- Lets users pick which campaign fields to include via `<Checkbox>` toggles (11 fields, 9 enabled by default)
- Exports selected data as an xlsx file using the existing `xlsx` library already in `package.json`
- Uses `useMetaReport('campaigns')` to fetch live campaign data — no new edge function required
- Generates descriptive filenames: `meta-{account-slug}-{yyyy-MM-dd}-to-{yyyy-MM-dd}.xlsx`
- Shows 3 KPI cards: Campaigns count, Total Spend, Selected Fields count
- Guards for: no Meta account connected, loading state (Loader2 spinner), empty data, and export errors
- Displays the selected account name and date range in the page subtitle

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create Meta Reports page with xlsx export | 469965d | src/pages/dashboard/meta/Reports.tsx |

## Field Set

| Field Key | Label | Default |
|-----------|-------|---------|
| name | Campaign Name | yes |
| status | Status | yes |
| objective | Objective | yes |
| budgetType | Budget Type | no |
| budget | Budget | yes |
| spend | Spend | yes |
| impressions | Impressions | yes |
| clicks | Clicks | yes |
| ctr | CTR (%) | yes |
| roas | ROAS | yes |
| results | Results | yes |

## Decisions Made

1. **Reuse campaigns reportType** — The `campaigns` report already returns all fields needed (name, status, objective, budget, spend, impressions, clicks, ctr, roas, results). No new edge function call is required, making this zero-infrastructure-cost.

2. **Filename pattern** — `meta-{slug}-{from}-to-{to}.xlsx` encodes the account and date range in the filename so exported files are self-descriptive and don't collide when exported multiple times.

3. **budgetType excluded by default** — Less commonly needed for client reporting; included as an opt-in field.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — the page fetches live data via `useMetaReport('campaigns')` and exports real rows.

## Deferred Items

**Pre-existing build failure** (out of scope): `src/hooks/use-chat-v2.ts` imports `@ai-sdk/react` which is not installed. This causes `npm run build:dev` to fail. This failure existed before this plan and is unrelated to the Reports page. Logged here for tracking.

## Self-Check: PASSED

- `src/pages/dashboard/meta/Reports.tsx` — FOUND
- Commit `469965d` — FOUND
- All 12 grep checks from plan — PASSED
- File length: 251 lines (min 180) — PASSED
