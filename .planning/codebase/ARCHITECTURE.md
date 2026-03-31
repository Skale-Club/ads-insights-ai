# Architecture

**Analysis Date:** 2026-03-31

## Pattern Overview

**Overall:** React SPA with Supabase Backend-as-a-Service (BaaS) + Edge Functions

**Key Characteristics:**
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

1. User navigates to `/login`
2. User clicks "Login with Google"
3. `AuthContext.signInWithGoogle()` initiates OAuth via Supabase Auth
4. Google OAuth redirects to `/auth/callback` with authorization code
5. Supabase Auth exchanges code for session (includes `provider_token` for Google Ads)
6. `provider_token` stored in `sessionStorage` for persistence
7. User authenticated, redirected to dashboard

**Token Usage:**
```
Provider Token → sessionStorage → DashboardContext → Edge Functions → Google Ads API
```

### Report Data Flow:

1. User selects date range and account in DashboardContext
2. Page component calls `useGoogleAdsReport(reportType)`
3. Hook fetches from `supabase.functions.invoke('google-ads-reports')`
4. Edge Function validates token, calls Google Ads API (v20)
5. Response returned to hook, cached by React Query
6. Component renders data in charts/tables

### AI Chat Flow:

1. User sends message in ChatBubble component
2. `analyze-ads` edge function invoked with messages + campaign context
3. Edge Function proxies to Gemini API with system prompt
4. Gemini returns streaming response (tool calls + text)
5. Edge Function converts to OpenAI SSE format
6. Client streams response, renders in chat UI

## Key Abstractions

### Edge Functions:
- `google-ads-accounts`: Fetches accessible Google Ads customer accounts
  - Input: `providerToken` (Google OAuth token)
  - Output: Array of `AdsAccount` objects
  - Pattern: Direct Google Ads API v20 calls

- `google-ads-reports`: Fetches various report types
  - Input: `providerToken`, `customerId`, `reportType`, `startDate`, `endDate`
  - Output: Report data (campaigns, keywords, etc.)
  - Pattern: Google Ads API v20 SearchStream

- `analyze-ads`: AI-powered analysis via Gemini
  - Input: `messages`, `campaignData`, `apiKey`, `model`
  - Output: Streaming SSE response with text + tool calls
  - Pattern: Gemini API streaming with function declarations

- `google-ads-mutate`: Campaign mutations (pause, bid adjustment, etc.)
  - Input: `providerToken`, `customerId`, `operations`
  - Output: Mutation result
  - Pattern: Google Ads API v20 mutate

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

**Strategy:** Error boundaries + toast notifications + auth token refresh

**Patterns:**
- Auth errors: Detect 401/UNAUTHENTICATED, show toast with "Reconnect" action
- API errors: Edge function returns error object, hook throws and triggers toast
- Network errors: React Query retry with 1 attempt, then error state
- Form validation: React Hook Form + Zod (not extensively used)

## Cross-Cutting Concerns

**Logging:** Console logging with `[Auth]`, `[DashboardContext]` prefixes for debugging

**Validation:**
- Date range: Preset validation via `DateRangePreset` type
- Required params: Edge functions validate inputs before API calls

**Authentication:**
- OAuth: Supabase Auth with Google provider
- Token storage: sessionStorage for Google provider token
- Protected routes: `ProtectedRoute` component checks user session
- RLS: Database tables have Row Level Security (via Supabase)

**State Persistence:**
- Selected account: LocalStorage (`adsinsight:selectedAccountId`)
- Hidden accounts: LocalStorage (`adsinsight:hiddenAccountIds`)
- Session: Supabase Auth session in storage

---

*Architecture analysis: 2026-03-31*