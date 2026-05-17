---
phase: 03-meta-ads-polish-bugs-lint-types-e-integracao
plan: "02"
subsystem: integration-audit
tags: [audit, meta, google, platform-switching, bugfix]
dependency_graph:
  requires: []
  provides: [integration-correctness-proof, IP-4-fix, IP-7-fix]
  affects: [use-chat-stream, Recommendations]
tech_stack:
  added: []
  patterns: [platform-snapshot-in-ref, declaration-order-correctness]
key_files:
  created:
    - .planning/phases/03-meta-ads-polish-bugs-lint-types-e-integracao/03-02-INTEGRATION-AUDIT.md
  modified:
    - src/hooks/use-chat-stream.ts
    - src/pages/dashboard/Recommendations.tsx
decisions:
  - "Snapshot platform in pendingToolCallRef rather than reading from closure in approveTool"
  - "Move currencyCode declaration before first useMemo reference; no structural refactor needed"
  - "ChatPanel.tsx Google-only guard for handleSubmit deferred (not in files_modified)"
metrics:
  duration: "~45 minutes"
  completed: "2026-05-17"
  tasks_completed: 2
  files_modified: 2
  files_created: 1
requirements:
  - M2-03
  - M2-04
---

# Phase 03 Plan 02: Google ↔ Meta Integration Audit Summary

Audited 9 integration touchpoints (IP-1 through IP-9) between Google Ads and Meta Ads surfaces. Found 2 concrete bugs and fixed both; 7 touchpoints confirmed correct. No Google Ads regression introduced.

## Integration Points Audited

| ID | Touchpoint | File | Verdict |
|----|-----------|------|---------|
| IP-1 | DashboardContext platform switching | DashboardContext.tsx | OK |
| IP-2 | AuthContext token isolation | AuthContext.tsx | OK |
| IP-3 | App.tsx DashboardIndex redirect | App.tsx | OK |
| IP-4 | use-chat-stream platform routing + in-flight tool calls | use-chat-stream.ts | **BUG** |
| IP-5 | ProtectedRoute | ProtectedRoute.tsx | OK |
| IP-6 | Settings page — both panels visible/functional | settings/index.tsx | OK |
| IP-7 | Recommendations page platform awareness | Recommendations.tsx | **BUG** |
| IP-8 | localStorage key collision | DashboardContext.tsx + cache hooks | OK |
| IP-9 | ToolApprovalDialog Google vs Meta copy | ToolApprovalDialog.tsx | OK |

## Bugs Fixed

### IP-4: platform race condition in `approveTool`

**File:** `src/hooks/use-chat-stream.ts`

When a tool call was pending approval and the user switched platform before clicking Approve, `approveTool` used the current (post-switch) `platform` value from its closure to decide which edge function to call (`meta-mutate` vs `google-ads-execute`). This could route a Meta mutation to Google's edge function or vice versa.

**Fix:** Extended `pendingToolCallRef` type to include `platform: 'google' | 'meta'`. The current `platform` value is now snapshotted into the ref when `pendingToolCallRef.current` is set (at tool-call arrival time). `approveTool` reads `pending.platform` instead of the closure `platform`.

### IP-7: `currencyCode` declaration order (TDZ in useMemo deps)

**File:** `src/pages/dashboard/Recommendations.tsx`

`const currencyCode` was declared at line 645 (after all `useMemo` hooks), but it was referenced in `useMemo` dependency arrays at lines 463 and 616. Dependency arrays are evaluated inline when `useMemo(callback, deps)` is called — not lazily. At those call sites, `currencyCode` was in the temporal dead zone.

**Fix:** Moved `const currencyCode` declaration to immediately after `const isMeta = platform === 'meta'` (line 211), before all `useMemo` calls that reference it. Removed the duplicate declaration at the original location.

## Deferred Items

- **ChatPanel.tsx handleSubmit Google guard:** When `platform === 'meta'`, `handleSubmit` blocks on `!selectedAccount?.id` and shows a Google-centric toast. This file was not in `files_modified` for this plan. Tracked in `deferred-items.md`.

## Regression Check

- `npm run test`: 14/14 tests pass (no regressions)
- `npm run lint`: 232 pre-existing problems, 0 new errors introduced
- `tsc --noEmit`: pre-existing TS errors in Recommendations.tsx are from TanStack Query generics (`NoInfer<TQueryFnData>`) — unrelated to the `currencyCode` declaration fix. No new TS errors introduced.
- Google-only pages untouched: confirmed via `git diff --name-only`

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- `03-02-INTEGRATION-AUDIT.md` exists at `.planning/phases/03-meta-ads-polish-bugs-lint-types-e-integracao/03-02-INTEGRATION-AUDIT.md`
- Audit document has 9 IP sections with Verdicts
- `## Resolution Log` section present in audit document
- Commits `8cb3416` (audit) and `b5ff2b8` (fixes) exist
- No Google page files modified
