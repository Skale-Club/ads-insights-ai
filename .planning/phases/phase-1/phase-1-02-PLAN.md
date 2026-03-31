---
phase: 1-foundation
plan: 02
type: execute
wave: 2
depends_on:
  - phase-1-01
files_modified: []
autonomous: true
requirements:
  - RELI-01
  - RELI-02
  - RELI-03

must_haves:
  truths:
    - "Data tables paginate at 1000 records to prevent memory exhaustion"
    - "Edge functions return proper HTTP status codes (not 200 with error JSON)"
    - "Critical user flows have test coverage"
  artifacts:
    - path: "src/components/dashboard/DataTable.tsx"
      provides: "Client-side pagination with 1000 record limit"
      min_lines: 100
    - path: "supabase/functions/google-ads-reports/index.ts"
      provides: "Proper HTTP status codes (400, 401, 403, 500)"
      min_lines: 1570
    - path: "src/test/ErrorBoundary.test.tsx"
      provides: "Error boundary test coverage"
      min_lines: 50
    - path: "src/test/OfflineContext.test.tsx"
      provides: "Offline detection test coverage"
      min_lines: 50
  key_links:
    - from: "src/components/dashboard/DataTable.tsx"
      to: "TanStack Table"
      via: "pagination state"
      pattern: "pageSize.*1000"
    - from: "supabase/functions/google-ads-reports/index.ts"
      to: "Client"
      via: "HTTP status codes"
      pattern: "status: [45]\\d\\d"
---

<objective>
Foundation & Reliability - Part 2: Pagination, proper HTTP codes, and test coverage

Purpose: Complete the reliability foundation with pagination for large datasets, fix edge functions to return proper HTTP status codes instead of 200 with error JSON, and add test coverage for critical flows.

Output: Complete reliability infrastructure with tests
</objective>

<execution_context>
@$HOME/.config/opencode/get-shit-done/workflows/execute-plan.md
@$HOME/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/phase-1/phase-1-01-PLAN.md

From src/components/dashboard/DataTable.tsx (current state):
- Uses TanStack Table v8 for data grid
- Has sorting and filtering but NO pagination
- Renders all data passed to it
- Needs: add pagination with pageSize=1000, page count, page index controls

From supabase/functions/google-ads-reports/index.ts (line 1466-1469):
```typescript
// CURRENT: Returns HTTP 200 with error (SILENT FAILURE)
return new Response(
  JSON.stringify({ error: `Google Ads API Error (${searchResponse.status}): ${errorText}` }),
  { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
);

// SHOULD BE:
return new Response(
  JSON.stringify({ error: `Google Ads API Error: ${errorText}` }),
  { status: searchResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
);
```

Also line 1564-1567 (catch block) returns status 200 - should be 500.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add pagination to DataTable with 1000 record limit</name>
  <files>src/components/dashboard/DataTable.tsx</files>
  <action>
Update DataTable component to implement pagination:

1. Add pagination state:
```typescript
const [pagination, setPagination] = useState({
  pageIndex: 0,
  pageSize: 1000,  // Default to 1000 max
});
```

2. Apply to table:
```typescript
const table = useReactTable({
  // ... existing config
  state: {
    ...paginationState,
    pagination,
  },
  onPaginationChange: setPagination,
  getCoreRowModel: getCoreRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
});
```

3. Add pagination controls below table:
```tsx
<div className="flex items-center justify-end space-x-2 py-4">
  <Button
    variant="outline"
    size="sm"
    onClick={() => table.previousPage()}
    disabled={!table.getCanPreviousPage()}
  >
    Previous
  </Button>
  <Button
    variant="outline"
    size="sm"
    onClick={() => table.nextPage()}
    disabled={!table.getCanNextPage()}
  >
    Next
  </Button>
</div>
```

4. Show page info: "Page {pageIndex + 1} of {pageCount}"
5. Allow user to change pageSize to 100, 500, 1000 via Select
  </action>
  <verify>
grep -n "pageSize.*1000\|pagination" src/components/dashboard/DataTable.tsx returns pagination implementation
  </verify>
  <done>DataTable paginates at 1000 records with navigation controls</done>
</task>

<task type="auto">
  <name>Task 2: Fix edge functions to return proper HTTP status codes</name>
  <files>supabase/functions/google-ads-reports/index.ts</files>
  <action>
Update edge function error responses to return proper HTTP status codes:

1. Line 1466-1469 (API error response):
   - Change: { status: 200 } 
   - To: { status: searchResponse.status }

2. Line 1564-1567 (catch block - unknown error):
   - Change: { status: 200 }
   - To: { status: 500 }

3. Also update google-ads-accounts function (same pattern):
   - Find similar HTTP 200 error responses
   - Change to appropriate status codes (400, 401, 403, 500)

The client (useGoogleAdsReport) already checks for data.error, but this ensures:
- Network errors show proper HTTP status
- Client can distinguish success (200) from errors (4xx, 5xx)
- Debugging easier with correct status codes in logs
  </action>
  <verify>
grep -n "status: 200" supabase/functions/google-ads-reports/index.ts | grep -v "status: 200, headers" returns empty (no more 200 for errors)
  </verify>
  <done>Edge functions return proper HTTP status codes for errors</done>
</task>

<task type="auto">
  <name>Task 3: Add tests for ErrorBoundary component</name>
 files>src/test/ErrorBoundary.test.tsx</files>
  <action>
Create test file for ErrorBoundary:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Test 1: Renders children when no error
// Test 2: Shows fallback UI when child throws error
// Test 3: Retry button calls resetErrorBoundary
// Test 4: Error is logged to console

// Helper component that throws
const ThrowError = () => {
  throw new Error('Test error');
};

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('shows fallback UI on error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/try again/i)).toBeInTheDocument();
    
    spy.mockRestore();
  });
});
```

Run with: npm test src/test/ErrorBoundary.test.tsx
  </action>
  <verify>
npm test -- --filter=ErrorBoundary passes
  </verify>
  <done>ErrorBoundary tested for error catching and fallback rendering</done>
</task>

<task type="auto">
  <name>Task 4: Add tests for OfflineContext and useOnlineStatus</name>
  <files>src/test/OfflineContext.test.tsx</files>
  <action>
Create test file for offline functionality:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { OfflineProvider, useOffline } from '@/contexts/OfflineContext';

// Test useOnlineStatus hook:
// - Returns true when navigator.onLine is true
// - Returns false when navigator.onLine is false
// - Updates on 'online' and 'offline' events

// Test OfflineProvider:
// - Provides isOnline to consumers
// - Shows toast when going offline (mock useToast)
// - Clears toast when coming back online

describe('OfflineContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('provides online status', () => {
    const TestComponent = () => {
      const { isOnline } = useOffline();
      return <div>{isOnline ? 'online' : 'offline'}</div>;
    };

    render(
      <OfflineProvider>
        <TestComponent />
      </OfflineProvider>
    );

    expect(screen.getByText('online')).toBeInTheDocument();
  });
});
```

Run with: npm test -- --filter=OfflineContext
  </action>
  <verify>
npm test -- --filter=OfflineContext passes
  </verify>
  <done>OfflineContext tested for online/offline detection and toast handling</done>
</task>

<task type="auto">
  <name>Task 5: Add test for useGoogleAdsReport retry logic</name>
  <files>src/test/useGoogleAdsReport.test.tsx</files>
  <action>
Create test for retry logic:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGoogleAdsReport } from '@/hooks/useGoogleAdsReport';

// Test:
// - Query retries 3 times on failure
// - Exponential backoff delays are applied (1000, 2000, 4000)
// - After 3 failures, error is shown to user
// - Auth errors trigger re-authentication flow

describe('useGoogleAdsReport retry', () => {
  it('retries failed requests 3 times', async () => {
    const fetchSpy = vi.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ data: { test: 'data' } });

    // ... test implementation
  });
});
```
  </action>
  <verify>
npm test -- --filter=useGoogleAdsReport passes
  </verify>
  <done>Retry logic tested for exponential backoff behavior</done>
</task>

</tasks>

<verification>
- DataTable shows pagination with 1000 record limit
- Edge functions return proper HTTP status codes (not 200 for errors)
- Test coverage added for ErrorBoundary, OfflineContext, retry logic
</verification>

<success_criteria>
1. Data tables paginate at 1000 records - DataTable implements pagination state and controls
2. Edge functions return proper HTTP status codes - No more HTTP 200 with error JSON
3. Critical user flows have test coverage - Tests exist for ErrorBoundary, OfflineContext, useGoogleAdsReport
</success_criteria>

<output>
After completion, create .planning/phases/phase-1/phase-1-02-SUMMARY.md
</output>