---
phase: 1-foundation
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: []
autonomous: true
requirements:
  - RELI-01
  - RELI-02
  - RELI-03

must_haves:
  truths:
    - "API errors display user-friendly messages with retry option"
    - "Loading states shown during data fetches"
    - "Offline handling with appropriate user feedback"
    - "Error boundaries wrap all dashboard components (no blank screen crashes)"
    - "Data tables paginate at 1000 records to prevent memory exhaustion"
    - "Failed API requests automatically retry 3 times with exponential backoff"
    - "Critical user flows have test coverage"
  artifacts:
    - path: "src/components/ErrorBoundary.tsx"
      provides: "Graceful error handling for dashboard components"
      min_lines: 50
    - path: "src/hooks/useOnlineStatus.ts"
      provides: "Network online/offline detection"
      min_lines: 20
    - path: "src/components/dashboard/DataTable.tsx"
      provides: "Client-side pagination at 1000 records"
      min_lines: 100
    - path: "src/hooks/useGoogleAdsReport.ts"
      provides: "Exponential backoff retry (3 attempts)"
      min_lines: 90
    - path: "src/contexts/OfflineContext.tsx"
      provides: "Offline state management and toast notifications"
      min_lines: 50
  key_links:
    - from: "src/components/ErrorBoundary.tsx"
      to: "src/App.tsx"
      via: "Wraps Router"
      pattern: "ErrorBoundary.*children"
    - from: "src/hooks/useOnlineStatus.ts"
      to: "src/contexts/OfflineContext.tsx"
      via: "useEffect listener"
      pattern: "navigator.onLine.*setIsOnline"
    - from: "src/hooks/useGoogleAdsReport.ts"
      to: "TanStack Query"
      via: "retry configuration"
      pattern: "retry.*exponential"
---

<objective>
Foundation & Reliability - Error handling, offline support, and retry logic

Purpose: Implement critical infrastructure for reliability including error boundaries, offline detection, retry logic with exponential backoff, and loading states. This addresses research pitfalls #3, #4, #5, #6, and #8.

Output: Working error handling infrastructure across the dashboard
</objective>

<execution_context>
@$HOME/.config/opencode/get-shit-done/workflows/execute-plan.md
@$HOME/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/research/PITFALLS.md
@.planning/STATE.md

From src/hooks/useGoogleAdsReport.ts (current retry config):
```typescript
retry: 1,  // Currently only 1 retry, needs 3 with exponential backoff
```

From supabase/functions/google-ads-reports/index.ts (silent failures):
```typescript
// Line 1466-1469: Returns HTTP 200 with error JSON
return new Response(
  JSON.stringify({ error: `Google Ads API Error (${searchResponse.status}): ${errorText}` }),
  { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
);
```

From src/components/dashboard/DataTable.tsx (current state):
- Uses TanStack Table with sorting and filtering
- No pagination implemented - renders all data
- Needs 1000 record limit with pagination
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create ErrorBoundary component</name>
  <files>src/components/ErrorBoundary.tsx</files>
  <action>
Create React ErrorBoundary component that:
- Extends React.Component with state: { hasError: boolean, error: Error | null }
- Implements static getDerivedStateFromError() to set error state
- Renders fallback UI with error message, retry button, and "Go to Dashboard" link
- Logs errors to console with component stack
- Uses CSS classes from existing UI components (Card, Button from shadcn/ui)

The fallback UI should show:
- "Something went wrong" title
- Error message (sanitized, user-friendly)
- "Try Again" button that calls resetErrorBoundary()
- "Go to Dashboard" link

Import from '@/components/ui/card' and '@/components/ui/button' following existing patterns.
  </action>
  <verify>
File exists at src/components/ErrorBoundary.tsx with ErrorBoundary class component export
  </verify>
  <done>ErrorBoundary component created with fallback UI and retry functionality</done>
</task>

<task type="auto">
  <name>Task 2: Wrap DashboardLayout with ErrorBoundary</name>
  <files>src/App.tsx</files>
  <action>
In App.tsx, wrap the main content with ErrorBoundary:

```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Wrap the Router output:
<ErrorBoundary fallback={<div>Something went wrong</div>}>
  <Router />
</ErrorBoundary>
```

Also wrap individual route components that could crash:
- DashboardLayout routes in Routes.tsx
- Any standalone pages (Login, ConnectGoogleAds, AuthCallback)

Use the pattern: &lt;ErrorBoundary key={location.pathname}&gt;&lt;Component /&gt;&lt;/ErrorBoundary&gt; to ensure each route has its own boundary.
  </action>
  <verify>
grep -n "ErrorBoundary" src/App.tsx returns the import and usage
  </verify>
  <done>All dashboard routes wrapped with ErrorBoundary for crash protection</done>
</task>

<task type="auto">
  <name>Task 3: Create useOnlineStatus hook for offline detection</name>
  <files>src/hooks/useOnlineStatus.ts</files>
  <action>
Create useOnlineStatus hook that:
- Uses navigator.onLine to detect network status
- Uses window.addEventListener for 'online' and 'offline' events
- Returns boolean: isOnline
- Adds safe check for SSR (typeof window !== 'undefined')

Hook signature:
```typescript
export function useOnlineStatus(): boolean
```

Returns true when online, false when offline.
  </action>
  <verify>
File exists at src/hooks/useOnlineStatus.ts and exports useOnlineStatus function
  </verify>
  <done>Online status detection hook created</done>
</task>

<task type="auto">
  <name>Task 4: Create OfflineContext for offline state management</name>
  <files>src/contexts/OfflineContext.tsx</files>
  <action>
Create OfflineContext that:
- Uses useOnlineStatus hook for detection
- Shows toast notification when going offline using existing useToast hook
- Provides: isOnline (boolean), wasOffline (boolean - tracks if user was offline)
- Clears toast when coming back online

Context type:
```typescript
interface OfflineContextType {
  isOnline: boolean;
  wasOffline: boolean;  // became offline at least once
}
```

Wrap the App with OfflineProvider in main.tsx or App.tsx after AuthProvider.
  </action>
  <verify>
grep -n "OfflineProvider" src/main.tsx or src/App.tsx shows provider wrapping
  </verify>
  <done>OfflineContext created with toast notifications for network status changes</done>
</task>

<task type="auto">
  <name>Task 5: Update useGoogleAdsReport with exponential backoff retry</name>
  <files>src/hooks/useGoogleAdsReport.ts</files>
  <action>
Update the query options in useGoogleAdsReport:

Current (line 58):
```typescript
retry: 1,
```

New configuration:
```typescript
retry: 3,
retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
```

This implements exponential backoff:
- Attempt 1: wait 1000ms (1s)
- Attempt 2: wait 2000ms (2s)  
- Attempt 3: wait 4000ms (4s)
- Max delay capped at 30 seconds

Also update the onError handler to handle retries gracefully - don't show auth error toast on every retry attempt. Only show error after all retries fail.
  </action>
  <verify>
grep -n "retry:" src/hooks/useGoogleAdsReport.ts shows retry: 3 with retryDelay
  </verify>
  <done>API requests retry 3 times with exponential backoff (1s, 2s, 4s)</done>
</task>

<task type="auto">
  <name>Task 6: Add loading states to dashboard components</name>
  <files>src/components/dashboard/HeroMetrics.tsx, src/components/dashboard/PerformanceChart.tsx, src/components/dashboard/TopPerformers.tsx</files>
  <action>
Add loading states to major dashboard components:

HeroMetrics.tsx:
- Check isLoading from useGoogleAdsReport
- Show skeleton loader instead of metrics when loading
- Use existing Skeleton component from @/components/ui/skeleton

PerformanceChart.tsx:
- Check isLoading from useGoogleAdsReport
- Show loading skeleton while chart data fetches

TopPerformers.tsx:
- Check isLoading from useGoogleAdsReport
- Show table skeleton with 5 rows while loading

Use pattern:
```tsx
{isLoading ? (
  <div className="flex space-x-4">
    {[...Array(4)].map((_, i) => (
      <Skeleton key={i} className="h-24 w-1/4" />
    ))}
  </div>
) : (
  <HeroMetrics data={data} />
)}
```
  </verify>
  <verify>
grep -n "isLoading.*Skeleton\|Skeleton.*isLoading" src/components/dashboard/*.tsx returns loading implementations
  </verify>
  <done>All major dashboard components show loading states during data fetches</done>
</task>

</tasks>

<verification>
- ErrorBoundary wraps Router in App.tsx
- Offline detection shows toast when network drops
- API retry happens 3 times with exponential backoff (visible in Network tab)
- Loading skeletons appear during data fetches
- All components that call useGoogleAdsReport handle isLoading state
</verification>

<success_criteria>
1. API errors display user-friendly messages with retry option - ErrorBoundary catches crashes and shows retry button
2. Loading states shown during data fetches - All dashboard components show skeleton loaders
3. Offline handling with appropriate user feedback - OfflineContext shows toast on offline/online transitions
4. Error boundaries wrap all dashboard components - App.tsx and DashboardLayout have ErrorBoundary
5. Data tables paginate at 1000 records - DataTable.tsx implements pagination
6. Failed API requests automatically retry 3 times with exponential backoff - useGoogleAdsReport has retry: 3, retryDelay
7. Critical user flows have test coverage - Tests added for ErrorBoundary, OfflineContext, useOnlineStatus
</success_criteria>

<output>
After completion, create .planning/phases/phase-1/phase-1-01-SUMMARY.md
</output>