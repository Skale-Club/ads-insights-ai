# Coding Conventions

**Analysis Date:** 2026-03-31

## Naming Patterns

### Files

- **Components:** PascalCase (e.g., `KpiCard.tsx`, `DashboardLayout.tsx`)
- **Hooks:** camelCase with `use` prefix (e.g., `useGoogleAdsReport.ts`, `useToast.ts`)
- **Utilities:** camelCase (e.g., `utils.ts`, `googleAdsUi.ts`)
- **Context:** PascalCase with `Context` suffix (e.g., `AuthContext.tsx`, `DashboardContext.tsx`)
- **Types:** PascalCase (e.g., `database.ts`, `chat.ts`)
- **Config:** camelCase (e.g., `app.ts`, `navigation.ts`)
- **Tests:** camelCase with `.test.ts` or `.spec.ts` suffix (e.g., `example.test.ts`)

### Functions and Variables

- **Functions:** camelCase (e.g., `calcChange`, `formatValue`, `fetchReport`)
- **React Components:** PascalCase (e.g., `HeroMetric`, `DashboardProvider`)
- **Hooks:** camelCase with `use` prefix (e.g., `useAuth`, `useDashboard`, `useGoogleAdsReport`)
- **State variables:** camelCase (e.g., `selectedAccount`, `dateRange`, `loading`)
- **Boolean flags:** camelCase with `is`, `has`, `should` prefix (e.g., `isLoading`, `hasError`, `shouldRefetch`)

### Types and Interfaces

- **Interfaces:** PascalCase with descriptive suffix (e.g., `AuthContextType`, `DashboardContextType`, `KpiCardProps`)
- **Type aliases:** PascalCase (e.g., `ReportType`, `DateRangePreset`, `AdsAccount`)
- **Enum values:** PascalCase (e.g., `'last7'`, `'last30'`, `'custom'`)

### CSS/Tailwind Classes

- **Custom utility functions:** `cn()` for conditional class merging using `clsx` + `tailwind-merge`

## Code Style

### Formatting

- **Tool:** Vite + SWC for build, Prettier not explicitly configured
- **Indentation:** 2 spaces (default from Vite/SWC)
- **Line endings:** Platform-agnostic (LF in git)

### Linting

- **Tool:** ESLint 9.x with `typescript-eslint`
- **Config file:** `eslint.config.js`
- **Key rules enabled:**
  - React Hooks rules (`eslint-plugin-react-hooks`)
  - React Refresh for HMR (`eslint-plugin-react-refresh`)
- **Key rules disabled:**
  - `@typescript-eslint/no-unused-vars` is OFF
  - No strict TypeScript checking (strict mode is OFF in `tsconfig.app.json`)

### TypeScript Configuration

- **Config:** `tsconfig.app.json` (application code), `tsconfig.node.json` (Vite config)
- **Strict mode:** OFF (no strict, no unused locals/params checks)
- **Path alias:** `@/*` maps to `./src/`
- **Key settings:**
  - `noImplicitAny: false`
  - `noUnusedLocals: false`
  - `noUnusedParameters: false`
  - `strictNullChecks: false`

## Import Organization

### Order (top to bottom)

1. **React imports:** `react` built-ins
2. **External libraries:** `@tanstack/react-query`, `react-router-dom`, `@supabase/supabase-js`, etc.
3. **UI components:** `@/components/ui/*` (shadcn/ui primitives)
4. **Project components:** `@/components/dashboard/*`, `@/components/layout/*`, etc.
5. **Hooks:** `@/hooks/*`
6. **Contexts:** `@/contexts/*`
7. **Config:** `@/config/*`
8. **Types:** `@/types/*`
9. **Utils:** `@/lib/*`
10. **Integrations:** `@/integrations/*`

### Path Alias Usage

Always use `@/` prefix for imports from `src/`:
```typescript
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
```

### Import Examples

```typescript
// React
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

// External
import { useQuery } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { User, Session } from '@supabase/supabase-js';

// UI components (shadcn)
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Project components
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

// Hooks
import { useToast } from '@/hooks/use-toast';
import { useGoogleAdsReport } from '@/hooks/useGoogleAdsReport';

// Contexts
import { useAuth } from '@/contexts/AuthContext';
import { useDashboard } from '@/contexts/DashboardContext';

// Config
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
```

## Error Handling

### Patterns

- **Try-catch blocks:** Used for async operations with user-friendly error messages
- **Error boundaries:** Not explicitly implemented
- **Toast notifications:** Use `useToast` hook for user feedback on errors
- **Error re-throwing:** Propagate errors from async functions for upper-level handling

### Error Handling Example (from `useGoogleAdsReport.ts`)

```typescript
onError: (err) => {
  const message = err instanceof Error ? err.message : String(err);
  const isUnauth = message.includes('Google Ads API Error (401)') || ...;

  if (!isUnauth) return;

  sessionStorage.removeItem('google_provider_token');

  toast({
    title: 'Google session expired',
    description: 'Your Google Ads connection expired. Click reconnect to sign in again.',
    variant: 'destructive',
    action: React.createElement(ToastAction, { ... }, 'Reconnect'),
  });
}
```

## Logging

### Framework

- **Primary:** `console.log`, `console.error` for debugging
- **No formal logging library:** Direct console usage throughout

### Patterns

- **Debug logging:** Prefix with context tag (e.g., `[Auth]`, `[DashboardContext]`)
- **State changes:** Log state transitions for debugging auth flow
- **Error logging:** `console.error` with error object

### Examples

```typescript
console.log('[Auth] Mount - URL hash:', hashParams ? 'present' : 'none');
console.log('[Auth] onAuthStateChange:', event, newSession?.user?.email ?? 'no session');
console.error('[Auth] Error getting session:', error);
console.log('[DashboardContext] Fetching accounts...');
```

## Comments

### When to Comment

- **Minimal comments in code** per AGENTS.md: "No comments in code unless explicitly requested"
- **Debug logs with context tags:** Not formal comments, but trace execution flow
- **JSDoc/TSDoc:** Not extensively used in this codebase
- **Type definitions:** Self-documenting interfaces and types

### Example (minimal comments approach)

The codebase follows a "no comments" philosophy except for:
- Console log prefixes for debugging
- Type definitions that serve as documentation

## Function Design

### Size

- **Small, focused functions:** Single responsibility (e.g., `calcChange`, `formatValue`, `getTrendColor`)
- **Helper functions:** Extracted for reusable logic (e.g., `safeGetLocalStorage`, `getDateRangeFromPreset`)

### Parameters

- **Typed parameters:** Always use TypeScript types/interfaces
- **Optional parameters:** With default values or `?` syntax
- **Destructuring:** Used extensively for props and context values

### Return Values

- **Typed returns:** Explicit return types on hooks and utility functions
- **Async functions:** Return Promises for data fetching

### Example Patterns

```typescript
// Typed props interface
interface KpiCardProps {
  title: string;
  value: string | number;
  previousValue?: string | number;
  change?: number;
  changeLabel?: string;
  format?: 'number' | 'currency' | 'percent';
  tooltip?: string;
  loading?: boolean;
  reverseColors?: boolean;
}

// Destructured parameters with defaults
export function KpiCard({
  title,
  value,
  previousValue,
  change,
  changeLabel = 'vs previous period',
  format = 'number',
  tooltip,
  loading = false,
  reverseColors = false,
}: KpiCardProps) { ... }
```

## Component Design

### Structure

- **Props interface:** Defined above component (e.g., `interface KpiCardProps`)
- **Component function:** Named export for standalone usage
- **Default export:** For page components (e.g., `export default function OverviewPage()`)

### Props

- **TypeScript interfaces:** Always define props type
- **Default values:** Set in function parameters
- **Optional props:** Use `?` syntax with sensible defaults
- **Children:** Use `React.ReactNode` type

### Example Component Structure (from `KpiCard.tsx`)

```typescript
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface KpiCardProps {
  title: string;
  value: string | number;
  // ... other props
}

export function KpiCard({ ... }: KpiCardProps) {
  // ... component implementation
}
```

### Conditional Rendering

- **Loading states:** Show skeleton components
- **Empty states:** Display user-friendly messages
- **Error states:** Toast notifications + fallback UI

## Module Design

### Exports

- **Named exports:** Primary pattern for components, hooks, utilities
- **Default exports:** Used for page components (`OverviewPage`, `SettingsPage`, etc.)
- **Re-exports:** Barrel files not extensively used

### Context Pattern

- **Context creation:** `createContext<Type | undefined>(undefined)`
- **Provider component:** Named export with children prop
- **Custom hook:** `useContextName` pattern for consumer access
- **Error boundary:** Throw error if used outside provider

```typescript
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) { ... }

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### State Management

- **React Context:** For global state (AuthContext, DashboardContext)
- **TanStack React Query:** For server state and caching
- **Local component state:** `useState` for component-level state
- **LocalStorage:** For persistence (selected account, hidden accounts)

---

*Convention analysis: 2026-03-31*
