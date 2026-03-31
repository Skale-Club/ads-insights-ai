# Testing Patterns

**Analysis Date:** 2026-03-31

## Test Framework

### Runner

- **Framework:** Vitest 3.2.4
- **Config file:** `vitest.config.ts`
- **Environment:** jsdom (browser-like environment for React testing)
- **Globals:** Enabled (no need to import describe/it/expect)

### Assertion Library

- **Library:** Vitest built-in `expect`
- **Extended matchers:** `@testing-library/jest-dom` (provides `toBeInTheDocument`, `toHaveTextContent`, etc.)

### Testing Library

- **Component testing:** `@testing-library/react` 16.0.0
- **DOM assertions:** `@testing-library/jest-dom` 6.6.0

### Run Commands

```bash
npm run test              # Run all tests once (Vitest run mode)
npm run test:watch        # Run tests in watch mode
npx vitest run src/path/to/file.test.ts  # Run single test file
```

## Test File Organization

### Location

- **Pattern:** Co-located with source files OR in dedicated `src/test/` directory
- **Current approach:** Single `src/test/` directory with `example.test.ts`
- **Naming:** `*.test.ts` or `*.spec.ts` suffix

### Directory Structure

```
src/
├── test/
│   ├── setup.ts          # Test setup and global mocks
│   └── example.test.ts   # Example test file
├── components/
│   ├── dashboard/
│   │   ├── KpiCard.tsx
│   │   └── KpiCard.test.tsx   # Co-located test (if exists)
│   └── ui/
│       └── button.tsx
├── hooks/
│   ├── useGoogleAdsReport.ts
│   └── useGoogleAdsReport.test.ts  # Co-located test (if exists)
└── contexts/
    ├── AuthContext.tsx
    └── AuthContext.test.tsx  # Co-located test (if exists)
```

## Test Structure

### Example Test (from `src/test/example.test.ts`)

```typescript
import { describe, it, expect } from "vitest";

describe("example", () => {
  it("should pass", () => {
    expect(true).toBe(true);
  });
});
```

### Recommended Structure

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MyComponent } from "./MyComponent";

describe("MyComponent", () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  it("should render correctly", () => {
    render(<MyComponent />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("should handle user interaction", async () => {
    const user = userEvent.setup();
    render(<MyComponent />);
    
    await user.click(screen.getByRole("button"));
    
    await waitFor(() => {
      expect(screen.getByText("Clicked")).toBeInTheDocument();
    });
  });
});
```

## Test Setup

### Setup File (`src/test/setup.ts`)

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

### Vitest Config (`vitest.config.ts`)

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

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

### What the Setup Provides

- **Jest-dom matchers:** `toBeInTheDocument()`, `toHaveTextContent()`, `toBeVisible()`, etc.
- **matchMedia mock:** Required for components using media queries (e.g., responsive UI)
- **Globals:** `describe`, `it`, `expect`, `beforeEach`, `afterEach`, `vi` available without import
- **Path alias:** `@/*` resolves to `./src/` in tests

## Mocking

### Framework

- **Mocking:** Vitest's `vi` object for creating mocks and spies
- **Module mocking:** `vi.mock()` for module-level mocks

### Common Mocks

```typescript
// Mock a module
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
    functions: {
      invoke: vi.fn(),
    },
  },
}));

// Mock a hook
vi.mock("@/hooks/useGoogleAdsReport", () => ({
  useGoogleAdsReport: vi.fn(() => ({
    data: mockData,
    isLoading: false,
    error: null,
  })),
}));

// Mock context
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(() => ({
    user: { id: "123", email: "test@example.com" },
    session: { access_token: "mock-token" },
    providerToken: "mock-provider-token",
    loading: false,
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
  })),
}));
```

### Mocking External Dependencies

```typescript
// Mock React Query
vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(() => ({
    data: mockData,
    isLoading: false,
    error: null,
  })),
}));

// Mock router
vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({}),
}));
```

### What to Mock

- **External services:** Supabase client, Google Ads API calls
- **Hooks with side effects:** `useGoogleAdsReport`, `useAuth` (in component tests)
- **Browser APIs:** `matchMedia`, `localStorage`, `sessionStorage`
- **Third-party libraries:** Analytics, OAuth flows

### What NOT to Mock

- **Component internals:** Test behavior, not implementation
- **Simple utilities:** `cn()` from utils can be tested directly
- **UI primitives:** shadcn/ui components can be rendered

## Fixtures and Factories

### Test Data Location

- **Inline:** Define directly in test file for simple data
- **Fixtures file:** Create `src/test/fixtures.ts` for shared data

### Example Fixture Pattern

```typescript
// src/test/fixtures.ts
export const mockUser = {
  id: "user-123",
  email: "test@example.com",
  app_metadata: {},
  user_metadata: { full_name: "Test User" },
  aud: "authenticated",
  created_at: "2024-01-01T00:00:00Z",
};

export const mockSession = {
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: "bearer",
  user: mockUser,
};

export const mockAdsAccount = {
  id: "acc-123",
  customerId: "123-456-7890",
  name: "Test Account",
  currencyCode: "USD",
  timeZone: "America/New_York",
};
```

### Factory Functions

```typescript
function createMockCampaign(overrides = {}) {
  return {
    id: "camp-1",
    name: "Test Campaign",
    status: "ENABLED",
    budget: 1000,
    impressions: 10000,
    clicks: 500,
    ...overrides,
  };
}
```

## Coverage

### Requirements

- **Target:** No explicit coverage threshold enforced
- **Current state:** No coverage configuration in `vitest.config.ts`

### View Coverage

```bash
npx vitest run --coverage
# Note: Requires @vitest/coverage-v8 or similar package
```

### Recommended Coverage Configuration

Add to `vitest.config.ts`:
```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
```

## Test Types

### Unit Tests

- **Scope:** Individual hooks, utilities, small components
- **Approach:** Test in isolation with mocks
- **Location:** Co-located or in `src/test/`

### Integration Tests

- **Scope:** Context providers, composite components
- **Approach:** Render with necessary providers, mock external services
- **Example:** Test `AuthContext` behavior with mocked Supabase

### Component Tests

```typescript
import { render, screen } from "@testing-library/react";
import { KpiCard } from "./KpiCard";

describe("KpiCard", () => {
  it("renders title and value", () => {
    render(<KpiCard title="Total Spend" value="$1,000" />);
    
    expect(screen.getByText("Total Spend")).toBeInTheDocument();
    expect(screen.getByText("$1,000")).toBeInTheDocument();
  });

  it("shows loading skeleton when loading prop is true", () => {
    render(<KpiCard title="Total Spend" value="$1,000" loading />);
    
    // Skeleton has animate-pulse class
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("displays change percentage", () => {
    render(<KpiCard title="Total Spend" value="$1,000" change={15.5} />);
    
    expect(screen.getByText("15.5%")).toBeInTheDocument();
  });
});
```

### Hook Tests

```typescript
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/contexts/AuthContext";

describe("useAuth hook", () => {
  it("provides initial auth state", () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });
    
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(true);
  });
});
```

## Common Patterns

### Async Testing

```typescript
it("fetches data asynchronously", async () => {
  render(<MyComponent />);
  
  // Initial loading state
  expect(screen.getByText("Loading...")).toBeInTheDocument();
  
  // Wait for async data
  await waitFor(() => {
    expect(screen.getByText("Data loaded")).toBeInTheDocument();
  });
});
```

### Error Testing

```typescript
it("displays error message on failure", async () => {
  const mockError = new Error("Failed to fetch");
  vi.fn(() => ({ data: null, error: mockError }));

  render(<MyComponent />);
  
  await waitFor(() => {
    expect(screen.getByText("Failed to fetch")).toBeInTheDocument();
  });
});
```

### User Interaction

```typescript
it("handles button click", async () => {
  const handleClick = vi.fn();
  const user = userEvent.setup();
  
  render(<Button onClick={handleClick}>Click me</Button>);
  
  await user.click(screen.getByRole("button", { name: /click me/i }));
  
  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

### Context Testing

```typescript
import { render } from "@testing-library/react";
import { AuthProvider } from "@/contexts/AuthContext";

const renderWithAuth = (ui: React.ReactNode) => {
  return render(<AuthProvider>{ui}</AuthProvider>);
};

it("accesses auth context", () => {
  renderWithAuth(<TestComponent />);
  
  expect(screen.getByText("Not authenticated")).toBeInTheDocument();
});
```

## Testing Best Practices

### Priority

1. **Business-critical flows:** Auth, data fetching, form submissions
2. **Complex components:** Charts, tables, multi-step forms
3. **Hooks:** Custom hooks with side effects
4. **Utilities:** Critical helper functions

### Guidelines

- **Test behavior, not implementation:** Focus on user-facing functionality
- **Meaningful test names:** Describe what should happen
- **Single assertion per test when possible:** Easier debugging
- **Clean up after tests:** Reset mocks, clear intervals/timeouts
- **Use user-event over fireEvent:** More realistic interaction simulation

### Current Testing Gaps

- **No test files for existing components:** Only `example.test.ts` exists
- **No test utilities:** No custom render with providers
- **No mocking examples:** Project would benefit from mock factories

---

*Testing analysis: 2026-03-31*
