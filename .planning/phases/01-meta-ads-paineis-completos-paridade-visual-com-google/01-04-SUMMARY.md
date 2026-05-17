---
phase: 01-meta-ads-paineis-completos-paridade-visual-com-google
plan: "04"
subsystem: frontend
tags: [meta-ads, conversions, pixel-events, funnel, dashboard]
dependency_graph:
  requires:
    - useMetaReport hook (src/hooks/useMetaReport.ts)
    - DashboardContext selectedMetaAccount (src/contexts/DashboardContext.tsx)
    - meta-reports edge function with conversions + pixel-events report types
  provides:
    - MetaConversionsPage component at src/pages/dashboard/meta/Conversions.tsx
  affects:
    - Route wiring (deferred to plan 07)
    - Navigation update (deferred to plan 07)
tech_stack:
  added: []
  patterns:
    - Dual useMetaReport calls combined into single isLoading flag
    - Funnel visualization using Progress component with % relative to impressions
    - prettyActionType helper with Record<string,string> fallback stripping
    - Icon selection by action type substring matching
key_files:
  created:
    - src/pages/dashboard/meta/Conversions.tsx
  modified: []
decisions:
  - "Used Progress component from shadcn/ui for funnel bars (matches CONTEXT.md funnel-style spec)"
  - "Funnel percentages calculated relative to impressions as base (100%)"
  - "ROAS color-coded: text-success >= 2, text-destructive < 1 — matching Google Conversions pattern"
  - "Pixel event icon selection uses substring matching on actionType for robustness"
  - "Per-campaign table sorted by purchases desc (most actionable default for Meta marketers)"
metrics:
  duration: "~10 minutes"
  completed: "2026-05-17"
  tasks_completed: 1
  tasks_total: 1
  files_created: 1
  files_modified: 0
---

# Phase 01 Plan 04: Meta Conversions Page Summary

**One-liner:** Meta Conversions page with impression-to-purchase funnel, per-campaign ROAS table, and pixel events list — dual useMetaReport calls for `conversions` and `pixel-events` report types.

## Objective

Build `src/pages/dashboard/meta/Conversions.tsx` exporting `MetaConversionsPage` as default. Mirrors Google's funnel-style metric presentation per CONTEXT.md: total conversions → cost per conversion → conversion rate → conversion value.

## What Was Built

### File: `src/pages/dashboard/meta/Conversions.tsx` (343 lines)

**Type definitions:**
- `ConversionsResponse` — perCampaign array + totals object with spend, impressions, clicks, addToCart, purchases, leads, purchaseValue, costPerPurchase, conversionRate, roas
- `PixelEvent` — actionType, count, value, costPerAction, roas

**Helpers:**
- `fmt(n, type)` — identical to Overview.tsx pattern (currency/number/percent/roas)
- `prettyActionType(s)` — maps 9 known action type strings via `ACTION_TYPE_LABELS` Record; fallback strips `offsite_conversion.fb_pixel_` prefix and title-cases remaining words
- `getEventIcon(actionType)` — returns ShoppingCart/UserPlus/Eye/MousePointer/Target based on substring matching

**Component structure:**
1. `selectedMetaAccount` guard — Target icon + "Go to Settings" Link button
2. `isLoading` spinner (combines cLoading + eLoading)
3. Page title + account_name subtitle
4. Error card (border-destructive/50) for cError or eError
5. Funnel card — 5 stages (Impressions/Clicks/AddToCart/Purchases/Leads) with `<Progress value={pct} className="h-2" />`
6. KPI grid (4 cards): Total Purchases (with conversion rate), Cost/Purchase, Purchase Value, ROAS (color-coded)
7. Per-campaign table — 9 columns, sorted by purchases desc, empty state
8. Pixel events list — icon + prettyActionType + count + value + costPerAction, empty state

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create Meta Conversions page | 6a83b1e | src/pages/dashboard/meta/Conversions.tsx |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. The component correctly calls `useMetaReport<ConversionsResponse>('conversions')` and `useMetaReport<PixelEvent[]>('pixel-events')` which will return real data once the meta-reports edge function (plan 01) is deployed. Empty states are shown when data is absent — not hardcoded stubs.

## Verification

- `node -e "..."` grep check: PASSED (all required strings present)
- File line count: 343 (minimum 200 required: PASSED)
- Pre-existing build failure (`@ai-sdk/react` in `use-chat-v2.ts`) confirmed unrelated to this plan
- Google Conversions page (`src/pages/dashboard/Conversions.tsx`): UNCHANGED

## Self-Check: PASSED

- File exists: src/pages/dashboard/meta/Conversions.tsx — FOUND
- Commit exists: 6a83b1e — FOUND
- Contains `export default function MetaConversionsPage` — CONFIRMED
- Contains `useMetaReport<ConversionsResponse>('conversions')` — CONFIRMED
- Contains `useMetaReport<PixelEvent[]>('pixel-events')` — CONFIRMED
- Contains `prettyActionType` — CONFIRMED
- Contains Progress funnel — CONFIRMED
- Contains per-campaign table with Campaign/Spend/Purchases/Cost-Purchase/ROAS — CONFIRMED
- Contains pixel events section — CONFIRMED
- Has selectedMetaAccount guard with Link to /settings — CONFIRMED
- Has combined isLoading state — CONFIRMED
- Has error display for cError and eError — CONFIRMED
- Has empty states — CONFIRMED
