---
phase: 01-meta-ads-paineis-completos-paridade-visual-com-google
plan: "07"
subsystem: routing-and-navigation
tags: [meta-ads, routing, navigation, react-router, sidebar]
dependency_graph:
  requires: [01-02, 01-03, 01-04, 01-05, 01-06]
  provides: [meta-page-routes, meta-nav-entries]
  affects: [src/App.tsx, src/config/navigation.ts]
tech_stack:
  added: []
  patterns: [react-router-v6-nested-routes, lucide-react-icon-import]
key_files:
  created: []
  modified:
    - src/App.tsx
    - src/config/navigation.ts
decisions:
  - "Used Globe icon from lucide-react for Placements nav entry (not previously imported)"
  - "Inserted 5 new nav items before AI Recommendations to preserve parity ordering with Google sidebar"
metrics:
  duration_minutes: 5
  completed_date: "2026-05-17"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
---

# Phase 01 Plan 07: Meta Route and Navigation Wiring Summary

**One-liner:** Registered 5 new Meta Ads routes in React Router and added 11-entry sidebar nav (was 6) by wiring Audiences, Placements, Conversions, Reports, and Budgets pages.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add 5 route imports + Route elements to App.tsx | 420b019 | src/App.tsx |
| 2 | Add 5 nav entries + Globe import to navigation.ts | 8f940f1 | src/config/navigation.ts |

## Changes Made

### src/App.tsx

Added 5 import statements after existing Meta page imports (line 40):
```tsx
import MetaAudiencesPage from "@/pages/dashboard/meta/Audiences";
import MetaPlacementsPage from "@/pages/dashboard/meta/Placements";
import MetaConversionsPage from "@/pages/dashboard/meta/Conversions";
import MetaReportsPage from "@/pages/dashboard/meta/Reports";
import MetaBudgetsPage from "@/pages/dashboard/meta/Budgets";
```

Added 5 Route elements under the `/dashboard` parent route, after `meta/ads`:
```tsx
<Route path="meta/audiences" element={<MetaAudiencesPage />} />
<Route path="meta/placements" element={<MetaPlacementsPage />} />
<Route path="meta/conversions" element={<MetaConversionsPage />} />
<Route path="meta/reports" element={<MetaReportsPage />} />
<Route path="meta/budgets" element={<MetaBudgetsPage />} />
```

### src/config/navigation.ts

Added `Globe` to lucide-react import. Expanded `metaNavItems` from 6 to 11 entries:
- `/dashboard/meta/audiences` — Audiences (Users icon)
- `/dashboard/meta/placements` — Placements (Globe icon)
- `/dashboard/meta/conversions` — Conversions (Target icon)
- `/dashboard/meta/reports` — Reports (BarChart3 icon)
- `/dashboard/meta/budgets` — Budgets (DollarSign icon)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. This plan only wires routing and navigation; all page rendering is handled by pages built in plans 02-06.

## Pre-existing Issues (Out of Scope)

`src/hooks/use-chat-v2.ts` imports `@ai-sdk/react` which is not installed. This caused `npm run build:dev` to fail. This is pre-existing and unrelated to this plan. Logged to deferred-items.

## Self-Check: PASSED

- FOUND: src/App.tsx
- FOUND: src/config/navigation.ts
- FOUND commit: 420b019 (App.tsx route registrations)
- FOUND commit: 8f940f1 (navigation.ts nav entries)
