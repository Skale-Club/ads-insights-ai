---
phase: 03-meta-ads-polish-bugs-lint-types-e-integracao
plan: "01"
subsystem: meta-ads-lint-types
tags: [lint, typescript, meta-ads, code-quality]
dependency_graph:
  requires: [02-01-SUMMARY, 02-02-SUMMARY, 02-03-SUMMARY]
  provides: [lint-clean-meta-surface, type-clean-meta-surface]
  affects: [meta-reports, meta-mutate, analyze-ads, meta-pages, use-chat-stream]
tech_stack:
  added: []
  patterns:
    - MetaAction interface for Graph API action/value arrays
    - Record<string,unknown> over Record<string,any> for API response shapes
    - FC<LucideProps> for typed Lucide icon props
    - Typed catch blocks (err instanceof Error) over err: any
key_files:
  created:
    - .planning/phases/03-meta-ads-polish-bugs-lint-types-e-integracao/03-01-lint-baseline.txt
  modified:
    - src/pages/dashboard/meta/Overview.tsx
    - src/pages/dashboard/meta/Reports.tsx
    - supabase/functions/meta-reports/index.ts
    - supabase/functions/meta-mutate/index.ts
    - supabase/functions/analyze-ads/index.ts
decisions:
  - "Use MetaAction interface instead of any[] for all Meta Graph API action/action_value arrays — stable shape across all report types"
  - "Split let { accessToken, ...rest } destructuring into let accessToken + const rest to satisfy prefer-const without losing reassignment on accessToken"
  - "Use FC<LucideProps> (from react + lucide-react) for icon props — avoids any while allowing all Lucide icons"
  - "Deferred react-hooks/exhaustive-deps warnings in meta/ pages — warnings only (no errors), consistent with pre-existing pattern across all Google pages"
metrics:
  duration_minutes: 35
  completed_date: "2026-05-17"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 6
requirements: [M2-03, M2-04]
---

# Phase 03 Plan 01: Meta Lint + Type Cleanup Summary

Zero new lint errors in the Meta surface (Phase 1 + Phase 2). All `@typescript-eslint/no-explicit-any` errors in in-scope files eliminated without behavioral change.

## What Was Done

### Task 1 — Baseline capture and triage

Ran `npm run lint` and captured full output. Tagged every finding as IN_SCOPE (Meta surface, Phase 1-2 files) or OUT_OF_SCOPE (process-attachment, google-ads-*, ui/*, settings/*, pre-existing pages). Found approximately 40 in-scope errors across 6 files.

Baseline artifact: `.planning/phases/03-meta-ads-polish-bugs-lint-types-e-integracao/03-01-lint-baseline.txt`

### Task 2 — Fix all in-scope errors

**Counts before → after:**
- IN_SCOPE errors: ~40 → 0
- IN_SCOPE warnings: ~4 (react-hooks/exhaustive-deps, all warnings not errors — intentionally deferred)

#### Fixes per file

**`src/pages/dashboard/meta/Overview.tsx`**
- Added `import type { FC } from 'react'` and `import type { LucideProps } from 'lucide-react'`
- Changed `icon: any` prop in `KpiCard` to `icon: FC<LucideProps>`

**`src/pages/dashboard/meta/Reports.tsx`**
- `Record<string, any>` in `exportToXlsx` → `Record<string, unknown>`
- `catch (err: any)` → `catch (err)` with `err instanceof Error` guard for `.message`

**`src/hooks/use-chat-stream.ts`** (lines 402, 404 — plan objective)
- Already committed by parallel agent 03-02 prior to this plan's execution
- `Record<string, any>` × 2 → `Record<string, unknown>` — confirmed in place

**`supabase/functions/meta-mutate/index.ts`**
- `wrapMetaError`: `let parsed: any` → typed interface `{ error?: { code?: number; error_subcode?: number; message?: string; fbtrace_id?: string } } | null`

**`supabase/functions/meta-reports/index.ts`**
- Added `MetaAction` interface: `{ action_type: string; value: string }` — shared shape for all Graph API action/action_value arrays
- `extractAction`, `extractActionValue`, `calcRoas`: replaced `any[]` params with `MetaAction[]`
- `metaGet`: return type `Promise<any>` → `Promise<Record<string, unknown>>`
- `let { accessToken, accountId, reportType, startDate, endDate, userId }` → `let accessToken` + `const { accountId, ... }` (satisfy prefer-const while preserving accessToken reassignment for token refresh)
- All `.map((c: any) => ...)` callbacks → `.map((c) => ...)` with `Record<string, unknown>[]` cast on array
- `audiences` section: `mapRow` typed with explicit `Record<string, unknown>` param; helper variables `typedAgeGender` etc. added for type clarity
- `pixel-events` section: `actions/actionValues/costPerAction` typed as `MetaAction[]`
- `conversions` section: `rows: any[]` → `Record<string, unknown>[]`
- `budgets-detail` section: `mapBudget(b: any, ...)` → `mapBudget(b: Record<string, unknown>, ...)`; filter callbacks typed
- catch block: `err: any` → untyped with `errObj` cast

**`supabase/functions/analyze-ads/index.ts`**
- `resolveQueryAdsData` (Google agentic loop): `parts: any[]` → `Array<Record<string, unknown>>`; `(p: any)` callbacks → typed with inline access via cast
- `resolveMetaTool` (Meta agentic loop — NEW code): same pattern applied
- Message processing: `(m: any)` filter/map callbacks → `MsgInput` type alias + typed iteration; `parts: any[]` → `Array<Record<string, unknown>>`

## Deviations from Plan

### Auto-fixed Issues

None required beyond the planned scope. All fixes were strictly additive typing (no behavioral changes).

### Intentionally Deferred Items

**`src/pages/dashboard/meta/Budgets.tsx:119`** — `react-hooks/exhaustive-deps` WARNING (not error)
- Reason: Warning-only, consistent with pre-existing pattern in all Google pages (AdGroups, Campaigns, Keywords, etc.)

**`src/pages/dashboard/meta/Placements.tsx:66`** — `react-hooks/exhaustive-deps` WARNING (not error)
- Same reasoning as above.

**`src/hooks/use-chat-stream.ts:383,578`** — `react-hooks/exhaustive-deps` WARNINGS (not errors)
- These are pre-existing issues in the hook's platform branching logic; fixing would require restructuring the `useCallback` dependency arrays, which is out of scope for this plan.

## Known Stubs

None. All Meta pages fetch real data via `useMetaReport` and the Meta Graph API.

## Self-Check

Files created/modified all exist and contain the expected changes. Commits:
- `e9118bc` — chore(03-01): capture lint baseline and triage
- `18817db` — fix(03-01): eliminate all in-scope lint errors

## Self-Check: PASSED

- `src/pages/dashboard/meta/Overview.tsx` — exists, `FC<LucideProps>` in place
- `src/pages/dashboard/meta/Reports.tsx` — exists, `Record<string, unknown>` in place
- `supabase/functions/meta-reports/index.ts` — exists, `MetaAction` interface in place
- `supabase/functions/meta-mutate/index.ts` — exists, typed `parsed` in place
- `supabase/functions/analyze-ads/index.ts` — exists, `Array<Record<string, unknown>>` in place
- Commits `e9118bc` and `18817db` verified in git log
- Zero in-scope errors in `npm run lint` output (verified post-fix)
- No new tsc errors in Meta-specific files (verified post-fix)
