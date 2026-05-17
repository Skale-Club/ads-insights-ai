# Phase 1: Meta Ads paineis completos - paridade visual com Google - Context

**Gathered:** 2026-05-17
**Status:** Ready for planning
**Mode:** Pre-written (skip_discuss=true, autonomous mode, user explicitly authorized)

<domain>
## Phase Boundary

Build the missing Meta dashboard pages so the Meta side of the product reaches feature + visual parity with Google Ads. Current Meta pages: Overview, Campaigns, AdSets, Ads. Current Google pages: Overview, Campaigns, AdGroups, Ads, Keywords, SearchTerms, Audiences, Budgets, Conversions, Reports.

**New Meta pages to create (route under /dashboard/meta/):**
1. `audiences` — Audience + demographics breakdown (age, gender, region, device, platform). Meta equivalent of Google's Audiences page.
2. `placements` — Placement performance: Facebook feed, Instagram feed, Stories, Reels, right column, Messenger, Audience Network. No equivalent on Google (placement is Meta-specific concept).
3. `conversions` — Pixel events list, conversion tracking, attribution windows (1d-click, 7d-click, 1d-view). Meta equivalent of Google's Conversions page.
4. `reports` — Custom report builder with field selector + xlsx export. Meta equivalent of Google's Reports page.
5. `budgets` — Campaign + ad set budgets with pacing, daily vs lifetime distinction. Meta equivalent of Google's Budgets page.

Out of scope: chat tools expansion (Phase 2), polish/bugs (Phase 3), edge function deploy (user responsibility), database migrations.

</domain>

<decisions>
## Implementation Decisions

### Page Structure & Styling
- Reuse existing components from `src/components/dashboard/` (KpiCard, DataTable, PerformanceChart, HeroMetrics)
- Copy the layout pattern from the equivalent Google page when one exists; for Placements (no Google equivalent) follow the same shadcn card+table structure as `src/pages/dashboard/meta/Campaigns.tsx`
- Use existing DashboardLayout wrapper
- Match Google's date range filter pattern (use DashboardContext's dateRange)
- All pages must respect `platform === 'meta'` guard — redirect to /overview if user switches to Google

### Data Layer
- Extend `supabase/functions/meta-reports/index.ts` with new report types: `audiences`, `placements`, `conversions`, `pixel-events`, `budgets-detail`
- Use existing `useMetaReport(reportType, options)` hook pattern from `src/hooks/useMetaReport.ts`
- Cache: same staleTime as Google reports
- For `audiences` use Meta breakdowns: `age,gender`, `region`, `device_platform`, `publisher_platform`
- For `placements` use breakdown: `publisher_platform,platform_position,impression_device`
- For `conversions` query the `actions` field grouped by action type + use `cost_per_action_type`
- For `budgets` use `/{campaign-id}?fields=daily_budget,lifetime_budget,budget_remaining,bid_strategy` + ad set level
- Edge function code only — no deploy

### Navigation & Routing
- Add new routes to `src/App.tsx` under `/dashboard/meta/*` (parallel to existing Google routes)
- Update `src/config/navigation.ts` (or wherever nav lives) — Meta side should show all 5 new entries when platform === 'meta'
- Maintain platform-aware redirects from `App.tsx` DashboardIndex

### State & Error Handling
- Loading: skeleton components (existing pattern)
- Empty: helpful empty-state message per page ("Connect Pixel to see conversions", etc.)
- Error: toast notification using existing useToast pattern + retry button
- Auth errors: detect 401 / token expired → show toast with "Reconnect Meta" action linking to /dashboard/settings

### Claude's Discretion
- Exact field set per page (favor most-actionable metrics: spend, ROAS, CPM, CTR, conversions, reach, frequency)
- Chart types per page (line for time series, bar for breakdown comparisons, table for everything)
- Default sort order on tables
- Pagination thresholds

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/dashboard/KpiCard.tsx` — primary metric card
- `src/components/dashboard/HeroMetrics.tsx` — top-of-page KPI strip
- `src/components/dashboard/PerformanceChart.tsx` — Recharts wrapper
- `src/components/dashboard/DataTable.tsx` — sortable table
- `src/components/layout/DashboardLayout.tsx` — page wrapper
- `src/contexts/DashboardContext.tsx` — selectedAccount + dateRange + platform
- `src/hooks/useMetaReport.ts` — query hook
- `src/lib/utils.ts` — cn() helper
- `src/lib/format.ts` (or similar) — number/currency/percent formatters

### Established Patterns
- Page component default-exported, named after page (e.g., `Audiences`)
- React Query for server state (already configured at App level)
- Toast feedback via `useToast`
- LocalStorage keys prefixed `adsinsight:`
- File naming: PascalCase components, camelCase hooks/utils

### Integration Points
- Routes registered in `src/App.tsx`
- Navigation items in `src/config/navigation.ts`
- Meta-specific routes already exist at `/dashboard/meta/overview`, `/campaigns`, `/adsets`, `/ads`
- DashboardContext already supports platform switching with localStorage persistence
- meta-reports edge function dispatcher already routes by `reportType` parameter

</code_context>

<specifics>
## Specific Ideas

- For Conversions page, mirror Google's funnel-style metric presentation: total conversions → cost per conversion → conversion rate → conversion value
- For Reports page, support xlsx export using existing `xlsx` library (already in deps)
- For Budgets page, show a pacing bar (% of daily budget spent today) — actionable signal
- For Placements page, group by publisher_platform first (Facebook / Instagram / Messenger / Audience Network), then placement_position underneath
- For Audiences page, default tab = Age & Gender breakdown (most-used by media buyers)

</specifics>

<deferred>
## Deferred Ideas

- Real-time / live spend ticker (would need polling — defer to later phase)
- Cross-platform comparison view (Google + Meta side by side) — separate milestone
- Saved reports / scheduled email exports — defer
- Anomaly detection on placements — defer to AI chat phase

</deferred>
