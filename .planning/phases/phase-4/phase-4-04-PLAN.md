---
phase: phase-4
plan: 04
type: execute
wave: 3
depends_on:
  - phase-4-01
  - phase-4-02
  - phase-4-03
files_modified:
  - src/hooks/useGoogleAdsReport.ts
  - src/components/dashboard/DataTable.tsx
  - src/components/dashboard/PerformanceChart.tsx
  - src/components/dashboard/TopPerformers.tsx
autonomous: true
requirements:
  - VALD-01
user_setup: []

must_haves:
  truths:
    - Large accounts (1000+ campaigns) load without freezing UI
    - Initial load shows partial data while full data loads in background
    - Pagination and sorting work efficiently on large datasets
  artifacts:
    - path: "src/hooks/useGoogleAdsReport.ts"
      provides: "Optimized query with better caching and stale time"
      contains: "staleTime, gcTime configuration"
    - path: "src/components/dashboard/DataTable.tsx"
      provides: "Virtual scrolling option for large datasets"
      contains: "virtualization setup"
  key_links:
    - from: "useGoogleAdsReport.ts"
      to: "TanStack Query"
      via: "React Query configuration"
      pattern: "staleTime.*gcTime"
---

<objective>
Optimize for large accounts (1000+ campaigns) to ensure smooth performance.

Purpose: Ensure Phase 4 success criterion "Large accounts (1000+ campaigns) load without performance degradation" is met. Implement virtualization, better caching, and efficient loading strategies.

Output: Optimized data fetching and rendering for large datasets.
</objective>

<context>
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/STATE.md

# Current pagination already at 1000 (from Phase 1)
From src/components/dashboard/DataTable.tsx:
```typescript
initialState: {
  pagination: {
    pageSize: 1000,
  },
},
```

# Reference TanStack Query v5 (from AGENTS.md)
- React Query v5 is used in this project
- Use staleTime, gcTime for caching optimization
</context>

<tasks>

<task type="auto">
  <name>Optimize React Query caching strategy</name>
  <files>src/hooks/useGoogleAdsReport.ts</files>
  <action>
    1. Read existing useGoogleAdsReport hook
    2. Increase staleTime to 5 minutes (data refreshes on manual refresh, not background)
    3. Add gcTime of 30 minutes for cache persistence
    4. Add retry with exponential backoff (3 attempts)
    5. Add placeholderData for smoother loading transitions
    6. Configure refetchOnWindowFocus: false to prevent unnecessary refetches
  </action>
  <verify>
    <automated>npm run build 2>&1 | head -20</automated>
  </verify>
  <done>React Query configured with optimized caching for large accounts</done>
</task>

<task type="auto">
  <name>Add virtualization to DataTable for 1000+ rows</name>
  <files>src/components/dashboard/DataTable.tsx</files>
  <action>
    1. Install @tanstack/react-virtual if not already available
    2. Add virtualized table mode option for large datasets (>500 rows)
    3. Keep existing pagination for smaller datasets
    4. Use useReactTable with getVirtualizer for row virtualization
    5. Maintain all existing functionality (sorting, filtering, pagination controls)
  </action>
  <verify>
    <automated>npm run build 2>&1 | head -20</automated>
  </verify>
  <done>DataTable supports virtualization for large datasets</done>
</task>

<task type="auto">
  <name>Optimize PerformanceChart for large date ranges</name>
  <files>src/components/dashboard/PerformanceChart.tsx</files>
  <action>
    1. Read PerformanceChart to understand data aggregation
    2. Aggregate data to daily/monthly instead of per-row when >90 days
    3. Add loading state that doesn't block UI
    4. Use memo to prevent unnecessary re-renders
  </action>
  <verify>
    <automated>npm run build 2>&1 | head -20</automated>
  </done>
  <done>PerformanceChart optimized for large date ranges</done>
</task>

<task type="auto">
  <name>Optimize TopPerformers component</name>
  <files>src/components/dashboard/TopPerformers.tsx</files>
  <action>
    1. Read TopPerformers component
    2. Use useMemo for sorting and filtering to avoid recalculation
    3. Limit initial render to top 10, lazy load more
    4. Add loading state with skeleton
  </action>
  <verify>
    <automated>npm run build 2>&1 | head -20</automated>
  </verify>
  <done>TopPerformers optimized with memoization and lazy loading</done>
</task>

</tasks>

<verification>
- [ ] Large accounts (1000+ campaigns) render without UI freeze
- [ ] Initial paint is fast with partial data
- [ ] Scrolling through large tables is smooth
- [ ] No performance degradation compared to current state
</verification>

<success_criteria>
Large accounts (1000+ campaigns) load without performance degradation. UI remains responsive during data fetches.
</success_criteria>

<output>
After completion, create .planning/phases/phase-4/phase-4-04-SUMMARY.md
</output>