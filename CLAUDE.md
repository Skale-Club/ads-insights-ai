# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

- `npm run dev` — Start Vite dev server on port 8080
- `npm run build` — Production build
- `npm run build:dev` — Development build
- `npm run lint` — ESLint
- `npm run test` — Run all tests once (Vitest)
- `npm run test:watch` — Run tests in watch mode
- `npx vitest run src/path/to/file.test.ts` — Run a single test file
 
Bun is also supported (`bun.lockb` present).

## Tech Stack

- **Frontend:** React 18 + TypeScript 5.8, bundled with Vite 5 (SWC)
- **Routing:** React Router v6 (client-side SPA)
- **UI:** shadcn/ui (Radix UI primitives) + Tailwind CSS 3 with CSS variable theming
- **State:** React Context (AuthContext, DashboardContext) + TanStack React Query for server state
- **Forms:** React Hook Form + Zod validation
- **Charts:** Recharts
- **Backend:** Supabase (PostgreSQL, Auth, Edge Functions)
- **Edge Functions:** Deno runtime (in `supabase/functions/`)
- **External APIs:** Google Ads API v18, OpenAI Chat Completions (streaming)

## Path Alias

`@/` resolves to `./src/` (configured in both tsconfig.json and vite.config.ts).

## Architecture

### Frontend (src/)

- `pages/` — Route-level components. Dashboard pages are nested under `pages/dashboard/`.
- `components/ui/` — shadcn/ui primitives (do not edit directly; regenerate via shadcn CLI).
- `components/dashboard/` — Dashboard-specific components (HeroMetrics, PerformanceChart, DataTable, etc.).
- `components/auth/ProtectedRoute.tsx` — Auth guard wrapper used in App.tsx routes.
- `components/layout/` — DashboardLayout and TopBar.
- `contexts/AuthContext.tsx` — Google OAuth flow via Supabase, stores provider token in sessionStorage.
- `contexts/DashboardContext.tsx` — Selected Google Ads account, date range presets, previous period calculation.
- `integrations/supabase/client.ts` — Supabase client initialization with fallback mock client.
- `types/database.ts` — Auto-generated Supabase database types. Use `Tables<T>`, `InsertTables<T>`, `UpdateTables<T>` helpers.
- `lib/utils.ts` — `cn()` helper (clsx + tailwind-merge).

### Supabase Edge Functions (supabase/functions/)

- `google-ads-accounts/` — Fetches accessible Google Ads customer accounts using provider OAuth token. Requires `GOOGLE_ADS_DEVELOPER_TOKEN` env var.
- `analyze-ads/` — Proxies OpenAI Chat Completions with streaming. Accepts user's OpenAI API key in request body.

Both functions have `verify_jwt = false` in `supabase/config.toml` and handle CORS internally.

### Database Tables (PostgreSQL via Supabase)

- `profiles` — User profile (synced from auth)
- `google_connections` — Encrypted OAuth tokens
- `ads_accounts` — User's Google Ads accounts with `is_selected` flag
- `reports_cache` — Cached report payloads (JSONB)
- `user_ai_settings` — OpenAI API key and preferred model per user (RLS enforced)

### Auth Flow

Google OAuth → Supabase Auth → provider token stored in sessionStorage → passed to edge functions for Google Ads API calls. Scope: `https://www.googleapis.com/auth/adwords`.

## Testing

Vitest with jsdom environment. Setup file: `src/test/setup.ts`. Test files follow `src/**/*.{test,spec}.{ts,tsx}` pattern.

## TypeScript

Strict mode is **off** in tsconfig.app.json (noImplicitAny, strictNullChecks disabled). tsconfig.node.json (for vite.config.ts) has strict enabled.

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Ads Insights AI**

A web application for managing and analyzing Google Ads campaigns with AI-powered insights. It enables users to connect their Google Ads accounts via OAuth, visualize performance metrics (impressions, clicks, CTR, CPC, conversions, cost), and receive intelligent recommendations powered by OpenAI/Gemini.

**Core Value:** Enable marketers to quickly understand their Google Ads performance and get AI-driven recommendations to optimize campaigns — without leaving the dashboard.

### Constraints

- **Tech Stack**: React 18, TypeScript, Supabase, Vite — constrained by existing codebase
- **API**: Google Ads API v18/v20 required for data fetching
- **AI**: Gemini API (or OpenAI-compatible) for insights
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5.8.3 - Frontend application code
- JavaScript (ES2020) - ESLint configuration
- TypeScript/Deno - Supabase Edge Functions (runtime: Deno)
## Runtime
- Node.js - Frontend build and development
- Deno - Supabase Edge Functions runtime
- npm - Primary package manager
- Lockfile: `package-lock.json` (present)
## Frameworks
- React 18.3.1 - UI library
- React Router v6.30.1 - Client-side routing
- shadcn/ui - Component library built on Radix UI primitives
- Tailwind CSS 3.4.17 - Utility-first CSS framework
- class-variance-authority 0.7.1 - Component variants
- tailwind-merge 2.6.0 - Tailwind class merging
- TanStack React Query v5.83.0 - Server state management
- React Context - Client state (Auth, Dashboard)
- React Hook Form 7.61.1 - Form handling
- Zod 3.25.76 - Schema validation
- Recharts 2.15.4 - Charting library
- Vite 5.4.19 - Build tool (uses SWC for fast HMR)
- @vitejs/plugin-react-swc 3.11.0 - React plugin for Vite
- Vitest 3.2.4 - Test runner
- @testing-library/react 16.0.0 - React component testing
- jsdom 20.0.3 - DOM environment for tests
## Key Dependencies
- @supabase/supabase-js 2.94.0 - Supabase client library
- lucide-react 0.462.0 - Icon library
- date-fns 3.6.0 - Date manipulation
- xlsx 0.18.5 - Excel file export
- @vercel/analytics 1.6.1 - Analytics tracking
- @radix-ui/react-dialog 1.1.14
- @radix-ui/react-dropdown-menu 2.1.15
- @radix-ui/react-select 2.2.5
- @radix-ui/react-tabs 1.1.12
- @radix-ui/react-toast 1.2.14
- @radix-ui/react-tooltip 1.2.7
- @radix-ui/react-slot 1.2.3
- @radix-ui/react-table 1.1.7
- @radix-ui/react-progress 1.1.7
- @radix-ui/react-checkbox 1.3.2
- @radix-ui/react-switch 1.2.5
- clsx 2.1.1 - Conditional class names
- tailwind-merge 2.6.0 - Tailwind class merging
- next-themes 0.3.0 - Theme management
## Configuration
- Environment variables via `.env.local` or Vite env prefixed with `VITE_`
- Key vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `vite.config.ts` - Vite configuration with path aliases
- `tsconfig.json` - TypeScript project references
- `tailwind.config.ts` - Tailwind configuration
- `postcss.config.js` - PostCSS for Tailwind
- `eslint.config.js` - ESLint flat config
- `tsconfig.app.json` - Application code (strict mode OFF)
- `tsconfig.node.json` - Build config (strict mode ON)
- Path alias: `@/` maps to `./src/`
## Platform Requirements
- Node.js 18+
- npm or Bun for package management
- Supabase CLI (for local edge function development)
- Browser support: Modern browsers (ES2020+)
- Supabase hosted infrastructure
- Google Ads API access
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

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
- **Key rules disabled:**
### TypeScript Configuration
- **Config:** `tsconfig.app.json` (application code), `tsconfig.node.json` (Vite config)
- **Strict mode:** OFF (no strict, no unused locals/params checks)
- **Path alias:** `@/*` maps to `./src/`
- **Key settings:**
## Import Organization
### Order (top to bottom)
### Path Alias Usage
### Import Examples
## Error Handling
### Patterns
- **Try-catch blocks:** Used for async operations with user-friendly error messages
- **Error boundaries:** Not explicitly implemented
- **Toast notifications:** Use `useToast` hook for user feedback on errors
- **Error re-throwing:** Propagate errors from async functions for upper-level handling
### Error Handling Example (from `useGoogleAdsReport.ts`)
## Logging
### Framework
- **Primary:** `console.log`, `console.error` for debugging
- **No formal logging library:** Direct console usage throughout
### Patterns
- **Debug logging:** Prefix with context tag (e.g., `[Auth]`, `[DashboardContext]`)
- **State changes:** Log state transitions for debugging auth flow
- **Error logging:** `console.error` with error object
### Examples
## Comments
### When to Comment
- **Minimal comments in code** per AGENTS.md: "No comments in code unless explicitly requested"
- **Debug logs with context tags:** Not formal comments, but trace execution flow
- **JSDoc/TSDoc:** Not extensively used in this codebase
- **Type definitions:** Self-documenting interfaces and types
### Example (minimal comments approach)
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
### State Management
- **React Context:** For global state (AuthContext, DashboardContext)
- **TanStack React Query:** For server state and caching
- **Local component state:** `useState` for component-level state
- **LocalStorage:** For persistence (selected account, hidden accounts)
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Single Page Application (SPA) using React 18 + TypeScript
- Server-side API proxy via Supabase Edge Functions (Deno runtime)
- OAuth-based authentication (Google OAuth via Supabase Auth)
- Server state management via TanStack React Query
- Client state management via React Context (AuthContext, DashboardContext)
- AI-powered insights via Gemini API integration
## Layers
### Presentation Layer (`src/pages/`, `src/components/`)
- Purpose: UI rendering, user interaction handling
- Location: `src/pages/dashboard/`, `src/components/layout/`, `src/components/dashboard/`, `src/components/ui/`
- Contains: React components, pages, shadcn/ui primitives
- Depends on: Context providers, hooks
- Used by: React Router
### State Management Layer (`src/contexts/`)
- Purpose: Client-side global state management
- Location: `src/contexts/AuthContext.tsx`, `src/contexts/DashboardContext.tsx`
- Contains: AuthContext (user, session, Google OAuth token), DashboardContext (selected account, date range, accounts list)
- Depends on: Supabase client
- Used by: All components that need auth or dashboard state
### Data Fetching Layer (`src/hooks/`)
- Purpose: Server state fetching and caching
- Location: `src/hooks/useGoogleAdsReport.ts`
- Contains: React Query hooks for Google Ads API reports
- Depends on: Supabase client, context providers
- Used by: Dashboard pages
### API Integration Layer (`src/integrations/`, `supabase/functions/`)
- Purpose: External service communication
- Location: `src/integrations/supabase/client.ts`, `supabase/functions/*`
- Contains: Supabase client initialization, Edge Function handlers
- Depends on: Environment variables, Google Ads API, Gemini API
- Used by: Contexts, hooks, components
### Configuration Layer (`src/config/`)
- Purpose: App-wide configuration
- Location: `src/config/app.ts`, `src/config/navigation.ts`
- Contains: App metadata, navigation items
- Depends on: None
- Used by: Layout components, routing
## Data Flow
### Authentication Flow:
```
```
### Report Data Flow:
### AI Chat Flow:
## Key Abstractions
### Edge Functions:
- `google-ads-accounts`: Fetches accessible Google Ads customer accounts
- `google-ads-reports`: Fetches various report types
- `analyze-ads`: AI-powered analysis via Gemini
- `google-ads-mutate`: Campaign mutations (pause, bid adjustment, etc.)
### React Contexts:
- `AuthContext`: Manages Supabase Auth + Google OAuth provider token
- `DashboardContext`: Manages selected account, date range, accounts list, chat sidebar width
### Custom Hooks:
- `useGoogleAdsReport(reportType, options)`: Fetches and caches Google Ads reports via React Query
## Entry Points
### Frontend Entry:
- Location: `src/main.tsx`
- Triggers: User loads app in browser
- Responsibilities: Initialize React, mount App component, set up providers
### App Component:
- Location: `src/App.tsx`
- Triggers: Main entry
- Responsibilities: Set up provider hierarchy (QueryClient, TooltipProvider, AuthProvider, DashboardProvider), define routes, render page components
### Auth Callback:
- Location: `src/pages/AuthCallback.tsx`
- Triggers: OAuth redirect from Google
- Responsibilities: Process OAuth callback, extract tokens, redirect to dashboard
### Protected Routes:
- Location: `src/components/auth/ProtectedRoute.tsx`
- Triggers: Any protected page access
- Responsibilities: Check auth state, render children or redirect to login
## Error Handling
- Auth errors: Detect 401/UNAUTHENTICATED, show toast with "Reconnect" action
- API errors: Edge function returns error object, hook throws and triggers toast
- Network errors: React Query retry with 1 attempt, then error state
- Form validation: React Hook Form + Zod (not extensively used)
## Cross-Cutting Concerns
- Date range: Preset validation via `DateRangePreset` type
- Required params: Edge functions validate inputs before API calls
- OAuth: Supabase Auth with Google provider
- Token storage: sessionStorage for Google provider token
- Protected routes: `ProtectedRoute` component checks user session
- RLS: Database tables have Row Level Security (via Supabase)
- Selected account: LocalStorage (`adsinsight:selectedAccountId`)
- Hidden accounts: LocalStorage (`adsinsight:hiddenAccountIds`)
- Session: Supabase Auth session in storage
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
