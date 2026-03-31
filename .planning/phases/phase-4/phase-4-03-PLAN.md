---
phase: phase-4
plan: 03
type: execute
wave: 2
depends_on:
  - phase-4-01
files_modified:
  - src/components/dashboard/LoadingSkeleton.tsx
  - src/components/dashboard/EmptyState.tsx
  - src/pages/dashboard/AdGroups.tsx
  - src/pages/dashboard/SearchTerms.tsx
  - src/pages/dashboard/Audiences.tsx
  - src/pages/dashboard/Budgets.tsx
  - src/pages/dashboard/Conversions.tsx
  - src/pages/dashboard/Ads.tsx
autonomous: true
requirements:
  - VALD-01
user_setup: []

must_haves:
  truths:
    - All pages show skeleton loaders while fetching data
    - All pages show friendly empty state when no data available
    - No blank spaces or unstyled loading states remain
  artifacts:
    - path: "src/components/dashboard/LoadingSkeleton.tsx"
      provides: "Reusable skeleton component for table/card loading states"
      exports: ["LoadingSkeleton", "TableSkeleton", "CardSkeleton"]
    - path: "src/components/dashboard/EmptyState.tsx"
      provides: "Reusable empty state component"
      exports: ["EmptyState"]
  key_links:
    - from: "AdGroups.tsx, SearchTerms.tsx, Audiences.tsx, Budgets.tsx, Conversions.tsx, Ads.tsx"
      to: "LoadingSkeleton.tsx, EmptyState.tsx"
      via: "import and conditional render"
      pattern: "isLoading.*EmptyState"
---

<objective>
Ensure consistent loading skeletons and empty states across all dashboard pages.

Purpose: Address UX polish requirement - no blank spaces during loading, friendly empty states instead of empty tables. HeroMetrics already has skeletons; other pages need them.

Output: LoadingSkeleton and EmptyState reusable components used across all remaining pages.
</objective>

<context>
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/STATE.md

# Reference existing patterns
From src/components/dashboard/HeroMetrics.tsx:
- Uses Skeleton from @/components/ui/skeleton
- Loading state passed as prop to HeroMetric component

From src/pages/dashboard/Campaigns.tsx:
- Manual Loader2 spinner during loading
- Shows "No data" only in table fallback
</context>

<tasks>

<task type="auto">
  <name>Create reusable LoadingSkeleton component</name>
  <files>src/components/dashboard/LoadingSkeleton.tsx</files>
  <action>
    1. Create LoadingSkeleton with multiple variants:
       - TableSkeleton: 5-10 row skeleton matching DataTable column structure
       - CardSkeleton: For metric cards (HeroMetrics style)
       - ChartSkeleton: For PerformanceChart placeholder
    2. Use existing Skeleton from shadcn/ui
    3. Make configurable: rowCount, withSearch (shows search bar skeleton), withActions (shows filter skeleton)
    4. Include subtle pulse animation using CSS
  </action>
  <verify>
    <automated>npm run build 2>&1 | head -20</automated>
  </verify>
  <done>LoadingSkeleton component created with TableSkeleton, CardSkeleton, ChartSkeleton exports</done>
</task>

<task type="auto">
  <name>Create reusable EmptyState component</name>
  <files>src/components/dashboard/EmptyState.tsx</files>
  <action>
    1. Create EmptyState component with props: title, description, icon, action (optional CTA)
    2. Use existing Card, Inbox icon from lucide-react
    3. Support variants: noData, noResults, noAccount, noPermission
    4. Include helpful message and next steps for each variant
  </action>
  <verify>
    <automated>npm run build 2>&1 | head -20</automated>
  </verify>
  <done>EmptyState component created with variants for different scenarios</done>
</task>

<task type="auto">
  <name>Add skeletons and empty states to AdGroups and SearchTerms</name>
  <files>
    - src/pages/dashboard/AdGroups.tsx
    - src/pages/dashboard/SearchTerms.tsx
  </files>
  <action>
    1. Read each file to understand data loading pattern
    2. Replace manual isLoading check with LoadingSkeleton component
    3. Replace manual "No data" fallback with EmptyState component
    4. Keep existing filtering/search functionality intact
  </action>
  <verify>
    <automated>npm run build 2>&1 | head -20</automated>
  </verify>
  <done>AdGroups and SearchTerms show proper loading and empty states</done>
</task>

<task type="auto">
  <name>Add skeletons and empty states to remaining pages</name>
  <files>
    - src/pages/dashboard/Audiences.tsx
    - src/pages/dashboard/Budgets.tsx
    - src/pages/dashboard/Conversions.tsx
    - src/pages/dashboard/Ads.tsx
  </files>
  <action>
    1. Read each file to understand data loading pattern
    2. Replace manual loading checks with LoadingSkeleton component
    3. Replace manual empty fallbacks with EmptyState component
    4. Keep existing functionality intact
  </action>
  <verify>
    <automated>npm run build 2>&1 | head -20</automated>
  </verify>
  <done>All remaining dashboard pages show proper loading and empty states</done>
</task>

</tasks>

<verification>
- [ ] LoadingSkeleton shows during data fetches on all pages
- [ ] EmptyState shows when data is empty on all pages
- [ ] No blank spaces during loading
- [ ] Consistent UX across all dashboard pages
</verification>

<success_criteria>
Loading skeletons displayed during data fetches, empty states shown when no data available. No blank spaces remain.
</success_criteria>

<output>
After completion, create .planning/phases/phase-4/phase-4-03-SUMMARY.md
</output>