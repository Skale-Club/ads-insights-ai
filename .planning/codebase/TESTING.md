# Testing Patterns

**Analysis Date:** 2026-05-06

## Test Framework

**Runner:**
- Vitest 3.2.4 from `package.json`.
- Config: `vitest.config.ts`.
- Environment: `jsdom`.
- Globals: enabled in `vitest.config.ts`, so `describe`, `it`, `expect`, `beforeEach`, `afterEach`, and `vi` are available without imports. Existing tests still import them explicitly in `src/test/*.test.*`.
- Include pattern: `src/**/*.{test,spec}.{ts,tsx}` in `vitest.config.ts`.

**Assertion Library:**
- Vitest built-in `expect`.
- `@testing-library/jest-dom` is loaded by `src/test/setup.ts` for DOM matchers such as `toBeInTheDocument`.

**React Testing:**
- `@testing-library/react` is installed and used for `render`, `renderHook`, `screen`, `waitFor`, and `act`.
- `@testing-library/user-event` is not installed in `package.json`; use installed Testing Library helpers or add the dependency before adopting `userEvent`.

**Run Commands:**
```bash
npm run test
npm run test:watch
npx vitest run src/test/AuthContext.test.tsx
npx vitest run src/test/useGoogleAdsReport.test.tsx
```

## Test File Organization

**Location:**
- Current tests live in the dedicated `src/test/` directory.
- Test setup lives in `src/test/setup.ts`.
- Source files under test are imported by alias, such as `@/contexts/AuthContext` and `@/hooks/useGoogleAdsReport`.

**Naming:**
- Use `*.test.ts` for pure TypeScript tests: `src/test/example.test.ts`.
- Use `*.test.tsx` for React component/context/hook tests: `src/test/AuthContext.test.tsx`, `src/test/ErrorBoundary.test.tsx`, `src/test/useGoogleAdsReport.test.tsx`.

**Structure:**
```text
src/test/
├── setup.ts
├── example.test.ts
├── AuthContext.test.tsx
├── ErrorBoundary.test.tsx
└── useGoogleAdsReport.test.tsx
```

## Test Structure

**Suite Organization:**
```typescript
import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('sets loading=false and user=null when no session exists', async () => {
    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
  });
});
```

**Patterns:**
- Put module mocks before importing the mocked module instance. Example: `vi.mock('@/integrations/supabase/client', ...)` precedes `import { supabase } ...` in `src/test/AuthContext.test.tsx` and `src/test/useGoogleAdsReport.test.tsx`.
- Use small in-test consumer components for context tests. Example: `TestConsumer` in `src/test/AuthContext.test.tsx`.
- Use wrapper factories for provider-heavy hook tests. Example: `makeWrapper()` creates a `QueryClientProvider` in `src/test/useGoogleAdsReport.test.tsx`.
- Use `waitFor` for asynchronous state transitions from effects or React Query. Examples: all async tests in `src/test/AuthContext.test.tsx` and `src/test/useGoogleAdsReport.test.tsx`.
- Use `act` around manually invoked React callbacks. Example: captured Supabase auth callback in `src/test/AuthContext.test.tsx`.

## Mocking

**Framework:** Vitest `vi`.

**Patterns:**
```typescript
vi.mock('@/integrations/supabase/client', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
    functions: {
      invoke: vi.fn(),
    },
  },
}));
```

```typescript
vi.mock('@/contexts/DashboardContext', () => ({
  useDashboard: () => ({
    selectedAccount: { id: 'cust-123' },
    dateRange: { from: new Date('2024-01-01'), to: new Date('2024-01-31') },
    previousPeriodRange: { from: new Date('2023-12-01'), to: new Date('2023-12-31') },
  }),
}));
```

**What to Mock:**
- Supabase clients and functions from `src/integrations/supabase/client.ts`.
- Context hooks when testing a hook that depends on them, such as `useDashboard` and `useAuth` in `src/test/useGoogleAdsReport.test.tsx`.
- Toast hooks for user feedback side effects, such as `@/hooks/use-toast` in `src/test/useGoogleAdsReport.test.tsx`.
- Browser storage state with `localStorage.clear()` and `sessionStorage.clear()` in `beforeEach`.
- Console errors when a test intentionally triggers React error output, as in `src/test/ErrorBoundary.test.tsx`.

**What NOT to Mock:**
- The unit under test. `src/test/AuthContext.test.tsx` renders the real `AuthProvider`; `src/test/ErrorBoundary.test.tsx` renders the real `ErrorBoundary`; `src/test/useGoogleAdsReport.test.tsx` calls the real `useGoogleAdsReport`.
- React Query itself for hooks that validate query behavior. Use a real `QueryClientProvider` with retries disabled instead.
- shadcn/ui primitives for ordinary rendering tests; they are regular React components under `src/components/ui/`.

## Fixtures and Factories

**Test Data:**
```typescript
const mockData = [{ id: '1', name: 'Campaign A', impressions: 1000 }];

(supabase.functions.invoke as ReturnType<typeof vi.fn>).mockResolvedValue({
  data: { data: mockData },
  error: null,
});
```

**Location:**
- Fixtures are currently inline inside individual test files.
- Shared fixture files are not present. If multiple tests need the same Supabase session, Google Ads account, Meta account, or report payload, add a focused helper under `src/test/`, for example `src/test/fixtures.ts`.

**Factory Pattern:**
```typescript
function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}
```

Use the `makeWrapper()` pattern for hooks that depend on React Query, and create a fresh `QueryClient` per test or per render group so cache state stays isolated.

## Coverage

**Requirements:** No coverage threshold is configured in `vitest.config.ts`.

**View Coverage:**
```bash
npx vitest run --coverage
```

Coverage requires adding a Vitest coverage provider such as `@vitest/coverage-v8`; no coverage provider is listed in `package.json`.

## Test Types

**Unit Tests:**
- `src/test/example.test.ts` is a smoke/unit example.
- Utility tests are not currently present for `src/lib/errors.ts`, `src/lib/googleAdsUi.ts`, or `src/components/dashboard/chat/types.ts`; add straightforward unit tests when changing those helpers.

**Component Tests:**
- `src/test/ErrorBoundary.test.tsx` renders `src/components/ErrorBoundary.tsx` under `BrowserRouter`, verifies children render normally, and verifies fallback UI after a child throws.
- Component tests should assert user-visible text/roles where available and suppress expected console noise only inside the test that triggers it.

**Context Tests:**
- `src/test/AuthContext.test.tsx` renders `AuthProvider` with a test consumer and mocked Supabase auth methods.
- Auth tests cover loading state, null session, provider token capture, sessionStorage restore, sign-out cleanup, and guard-hook failure outside the provider.

**Hook Tests:**
- `src/test/useGoogleAdsReport.test.tsx` uses `renderHook`, a real `QueryClientProvider`, and mocked Supabase/context/toast dependencies.
- Hook tests cover success payloads, edge-function error payloads, invocation failures, React Query cache reuse, and disabled queries.

**Integration Tests:**
- No full route/page integration tests are present for `src/App.tsx`, `src/components/layout/DashboardLayout.tsx`, dashboard pages under `src/pages/dashboard/`, or settings flows under `src/pages/settings/`.

**E2E Tests:**
- Not used. No Playwright, Cypress, or browser E2E config is present in `package.json` or project config files.

## Common Patterns

**Async Testing:**
```typescript
const { result } = renderHook(() => useGoogleAdsReport('campaigns'), {
  wrapper: makeWrapper(),
});

await waitFor(() => expect(result.current.isSuccess).toBe(true));
expect(result.current.data).toEqual(mockData);
```

Use `waitFor` for effects, Supabase auth session initialization, and React Query status changes.

**Error Testing:**
```typescript
(supabase.functions.invoke as ReturnType<typeof vi.fn>).mockResolvedValue({
  data: { error: 'Google Ads API Error (400): bad request' },
  error: null,
});

const { result } = renderHook(() => useGoogleAdsReport('campaigns'), {
  wrapper: makeWrapper(),
});

await waitFor(() => expect(result.current.isError).toBe(true));
expect((result.current.error as Error).message).toContain('Google Ads API Error (400)');
```

**Context Guard Testing:**
```typescript
const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
expect(() => render(<TestConsumer />)).toThrow('useAuth must be used within an AuthProvider');
spy.mockRestore();
```

**Storage Testing:**
```typescript
beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  localStorage.clear();
});
```

Use `sessionStorage` expectations for Google OAuth provider-token behavior in `src/contexts/AuthContext.tsx`; use `localStorage` expectations for report cache behavior in `src/hooks/useGoogleAdsReport.ts` and `src/hooks/useMetaReport.ts`.

## Test Setup

**Global Setup:** `src/test/setup.ts`

```typescript
import "@testing-library/jest-dom";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
```

**Config:** `vitest.config.ts`

```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

**Setup Responsibilities:**
- Load jest-dom matchers.
- Provide a `window.matchMedia` mock for responsive hooks and UI.
- Reuse the same `@/` alias as app code.

## Verification Snapshot

**Current Command Result:**
```bash
npm run test
```

Current result: 4 test files passed, 14 tests passed.

**Observed Test Output:**
- `src/test/AuthContext.test.tsx` emits `[Auth]` console logs from `src/contexts/AuthContext.tsx`.
- `src/test/ErrorBoundary.test.tsx` emits React Router v7 future-flag warnings from `react-router-dom`.
- These logs/warnings do not fail the current test suite.

## Add-Test Guidance

**Auth and OAuth Changes:**
- Update `src/test/AuthContext.test.tsx` when changing `src/contexts/AuthContext.tsx`.
- Cover provider token capture, `sessionStorage` fallback, Supabase `onAuthStateChange`, and sign-out cleanup.

**Report Hook Changes:**
- Update `src/test/useGoogleAdsReport.test.tsx` when changing `src/hooks/useGoogleAdsReport.ts`.
- Add a matching test file for `src/hooks/useMetaReport.ts` before changing Meta reporting behavior; use the same React Query wrapper pattern.

**Error Boundary Changes:**
- Update `src/test/ErrorBoundary.test.tsx` when changing `src/components/ErrorBoundary.tsx`.
- Keep a router wrapper when testing actions or links that assume `react-router-dom` context.

**Forms and Settings Changes:**
- Add tests for React Hook Form + Zod behavior when changing `src/components/settings/CompanySection.tsx` or related settings cards.
- Mock `useAuth`, `useToast`, and `supabase.from(...).select/upsert` chains for settings forms.

**Google Ads Creative Fixtures:**
- When tests include Google Ads creative payloads, keep fixtures aligned with `.agents/skills/ad-creative/SKILL.md` and `.agents/skills/google-ads-manager/SKILL.md`: RSA headlines should be 30 characters or fewer, descriptions 90 characters or fewer, and campaign/ad-group vocabulary should match Google Ads concepts.

---

*Testing analysis: 2026-05-06*
