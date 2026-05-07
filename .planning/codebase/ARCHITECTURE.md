# Architecture

**Analysis Date:** 2026-05-06

## Pattern Overview

**Overall:** React SPA with Supabase BaaS, Supabase Edge Functions, and platform-specific ad data adapters

**Key Characteristics:**
- Browser-first React 18 application mounted from `src/main.tsx` and routed in `src/App.tsx`.
- Protected dashboard shell uses React Router nested routes with `DashboardLayout` in `src/components/layout/DashboardLayout.tsx`.
- Ad platform switching is centralized in `DashboardContext` and controls Google Ads routes, Meta Ads routes, account selectors, and chat context.
- Server state is fetched through TanStack React Query hooks in `src/hooks/useGoogleAdsReport.ts` and `src/hooks/useMetaReport.ts`.
- Supabase Auth handles Google OAuth for login; Google provider tokens are stored in `sessionStorage` and passed to Edge Functions.
- Supabase database tables hold chat history, AI settings, Meta connections/accounts, company profiles, and CLI bridge sessions.
- AI chat is a client-managed streaming panel backed by `supabase/functions/analyze-ads/index.ts`, persisted chat tables, tool approval UI, and platform mutation functions.

## Layers

**Application Bootstrap:**
- Purpose: Mount React and compose global providers.
- Location: `src/main.tsx`, `src/App.tsx`
- Contains: React root creation, `QueryClientProvider`, `TooltipProvider`, `AuthProvider`, `DashboardProvider`, `OfflineProvider`, `BrowserRouter`, `ErrorBoundary`, toast providers, Vercel Analytics.
- Depends on: React, React Router, TanStack React Query, Supabase auth context, dashboard context.
- Used by: Every browser route.

**Routing and Layout:**
- Purpose: Define public/protected routes and render the persistent dashboard frame.
- Location: `src/App.tsx`, `src/components/auth/ProtectedRoute.tsx`, `src/components/layout/DashboardLayout.tsx`, `src/components/layout/Sidebar.tsx`, `src/components/layout/TopBar.tsx`
- Contains: `/login`, `/auth/callback`, `/connect/ads`, `/dashboard/*`, `/settings`, catch-all `NotFound`, sidebar navigation, top-bar platform/account/date controls, chat rail.
- Depends on: `AuthContext`, `DashboardContext`, `src/config/navigation.ts`, `src/config/app.ts`.
- Used by: Page components in `src/pages/` and nested dashboard routes in `src/pages/dashboard/`.

**Presentation Layer:**
- Purpose: Render pages and reusable visual components.
- Location: `src/pages/`, `src/pages/dashboard/`, `src/pages/dashboard/meta/`, `src/pages/settings/`, `src/components/dashboard/`, `src/components/settings/`, `src/components/ui/`
- Contains: Google Ads dashboard pages, Meta Ads dashboard pages, settings sections, dashboard cards/charts/tables/chat components, shadcn/ui primitives.
- Depends on: Hooks in `src/hooks/`, contexts in `src/contexts/`, utilities in `src/lib/`, shadcn/ui components.
- Used by: React Router route elements and layout components.

**Client State Layer:**
- Purpose: Manage global browser session state and UI coordination.
- Location: `src/contexts/AuthContext.tsx`, `src/contexts/DashboardContext.tsx`, `src/contexts/OfflineContext.tsx`, `src/contexts/DataStreamContext.tsx`
- Contains: Supabase user/session state, Google provider token state, selected Google account, selected Meta account, platform, date range, timezone, attribution window, hidden accounts, chat width, offline status, chat data-stream parts.
- Depends on: Supabase client in `src/integrations/supabase/client.ts`, browser `localStorage`/`sessionStorage`, `date-fns`, toast hooks.
- Used by: Layout, dashboard pages, report hooks, chat panel, settings panels.

**Data Fetching Layer:**
- Purpose: Fetch, cache, and expose ad reporting data to pages/components.
- Location: `src/hooks/useGoogleAdsReport.ts`, `src/hooks/useMetaReport.ts`, `src/hooks/use-chat-context.ts`, `src/hooks/useOnlineStatus.ts`, `src/hooks/useCliSession.ts`, `src/hooks/useMetaCliSession.ts`
- Contains: React Query hooks, five-minute localStorage response caches, account/date query keys, chat context aggregation, Google and Meta CLI session helpers.
- Depends on: `DashboardContext`, `AuthContext`, Supabase client/functions, browser storage.
- Used by: Dashboard pages, `src/components/dashboard/HeroMetrics.tsx`, `src/components/dashboard/PerformanceChart.tsx`, `src/components/dashboard/QuickInsights.tsx`, `src/components/dashboard/AlertSystem.tsx`, `src/components/dashboard/chat/ChatPanel.tsx`.

**AI Chat Layer:**
- Purpose: Persist chat sessions, build ad-performance context, stream assistant responses, and gate mutation tools behind approval.
- Location: `src/components/dashboard/ChatBubble.tsx`, `src/components/dashboard/chat/ChatPanel.tsx`, `src/components/dashboard/chat/*`, `src/hooks/use-chat-session.ts`, `src/hooks/use-chat-stream.ts`, `src/hooks/use-chat-v2.ts`, `src/hooks/use-chat-context.ts`, `src/types/chat.ts`, `src/lib/ai/tools.ts`, `src/lib/ai/models.ts`
- Contains: Chat side rail, session list, message persistence, attachments, streaming parser, AI SDK transport option, tool approval requests, Google/Meta tool execution calls.
- Depends on: `analyze-ads`, `process-attachment`, `google-ads-execute`, `meta-mutate` Edge Functions; `chat_sessions`, `chat_messages`, `user_ai_settings`, `meta_connections` tables.
- Used by: `DashboardLayout` through `ChatBubble`.

**Supabase Client Layer:**
- Purpose: Provide typed Supabase access and direct function invocation from the SPA.
- Location: `src/integrations/supabase/client.ts`, `src/types/database.ts`
- Contains: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `isSupabaseConfigured`, typed `supabase` client, mock auth-only client when environment config is missing.
- Depends on: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Used by: Auth, contexts, report hooks, settings sections, chat persistence, CLI sessions.

**Edge Function API Layer:**
- Purpose: Isolate external API calls, token exchange, server-side secrets, CORS, and mutations.
- Location: `supabase/functions/*/index.ts`, `supabase/functions/analyze-ads/system-prompt.ts`, `supabase/config.toml`
- Contains: Google Ads account/report/mutation/execution functions, Meta OAuth/account/report/mutation functions, AI analysis, attachment processing, CLI bridge session readers, platform config, healthcheck.
- Depends on: Deno runtime, Supabase function environment variables, Google Ads API, Meta Graph API, Gemini/OpenAI-compatible chat flow.
- Used by: Browser hooks/components and `analyze-ads` internal tool resolution.

**Persistence Layer:**
- Purpose: Store user-owned settings, chat, platform connections, account selections, and CLI bridge tokens.
- Location: `supabase/migrations/*.sql`, `src/types/database.ts`
- Contains: `user_ai_settings`, `chat_sessions`, `chat_messages`, `companies`, `meta_connections`, `meta_accounts`, `cli_sessions`, `meta_cli_sessions`, `project_keepalive_heartbeat`.
- Depends on: Supabase PostgreSQL, RLS policies in migration files.
- Used by: Settings cards, dashboard context, chat session hooks, CLI session hooks, Meta Edge Functions.

**Configuration Layer:**
- Purpose: Keep app metadata, feature flags, navigation, Vite aliases, Tailwind/shadcn settings, and Supabase function config centralized.
- Location: `src/config/app.ts`, `src/config/features.ts`, `src/config/navigation.ts`, `vite.config.ts`, `components.json`, `tailwind.config.ts`, `supabase/config.toml`
- Contains: App identity, feature toggles, Google/Meta nav arrays, `@/` alias, dev server port, shadcn aliases, function JWT settings.
- Depends on: Build tooling and UI component conventions.
- Used by: Layout, chat, imports, generated UI components, Supabase deployment.

## Data Flow

**Google OAuth and Account Load:**

1. User opens `/login` rendered by `src/pages/Login.tsx`.
2. `signInWithGoogle()` in `src/contexts/AuthContext.tsx` calls `supabase.auth.signInWithOAuth()` with the Google Ads scope.
3. Google/Supabase redirects to `/auth/callback`, handled by `src/pages/AuthCallback.tsx`.
4. `AuthProvider` captures `session.provider_token`, stores it in `sessionStorage` as `google_provider_token`, and exposes it through `useAuth()`.
5. `DashboardProvider` in `src/contexts/DashboardContext.tsx` invokes `google-ads-accounts` with the provider token.
6. The selected Google account is restored from `localStorage` key `adsinsight:selectedAccountId` or defaults to the first visible account.

**Google Ads Report Flow:**

1. A page/component calls `useGoogleAdsReport(reportType)` from `src/hooks/useGoogleAdsReport.ts`.
2. The hook reads `selectedAccount`, `dateRange`, and `previousPeriodRange` from `DashboardContext`.
3. The hook checks localStorage cache key `adsinsight:cache:{reportType}:{customerId}:{startDate}:{endDate}`.
4. On cache miss, the hook invokes `supabase.functions.invoke('google-ads-reports')`.
5. `supabase/functions/google-ads-reports/index.ts` validates input, builds a GAQL query or special report branch, calls Google Ads API v20, transforms rows, and returns normalized data.
6. React Query caches the result by `['google-ads', reportType, customerId, startDate, endDate, period]`.

**Meta OAuth and Report Flow:**

1. `src/components/settings/MetaAdsSection.tsx` loads Meta app config through `get-platform-config`.
2. The user is redirected to Facebook OAuth with `state` set to the Supabase user id and callback URL `${SUPABASE_URL}/functions/v1/meta-auth`.
3. `supabase/functions/meta-auth/index.ts` exchanges the code for a long-lived token and upserts `meta_connections`.
4. `MetaAdsSection` invokes `meta-accounts`, storing accounts in `meta_accounts` and `DashboardContext`.
5. `useMetaReport(reportType)` in `src/hooks/useMetaReport.ts` loads the Meta token from `meta_connections`, caches by `adsinsight:meta:cache:*`, and invokes `meta-reports`.
6. `supabase/functions/meta-reports/index.ts` validates the request with Zod, refreshes expiring tokens when `userId` is provided, queries Meta Graph API v20.0, and returns normalized report data.

**Platform Switching Flow:**

1. `TopBar` in `src/components/layout/TopBar.tsx` writes `platform` to `DashboardContext`.
2. `DashboardContext` persists the platform under `adsinsight:platform`.
3. `Sidebar` in `src/components/layout/Sidebar.tsx` chooses `navItems` or `metaNavItems` from `src/config/navigation.ts`.
4. The dashboard index route in `src/App.tsx` redirects to `overview` for Google or `meta/overview` for Meta.
5. Shared pages such as `src/pages/dashboard/Recommendations.tsx` branch report hooks based on the active platform.

**AI Chat Flow:**

1. `DashboardLayout` renders `ChatBubble`, which wraps `ChatPanel` in `DataStreamProvider`.
2. `ChatPanel` loads user AI settings and account-scoped chat sessions through `useChatSession`.
3. `use-chat-context.ts` aggregates Google or Meta report data when the panel is open.
4. `useChatStream` posts messages, context, model, platform, and relevant tokens to `${SUPABASE_URL}/functions/v1/analyze-ads`.
5. `supabase/functions/analyze-ads/index.ts` builds the Google or Meta system prompt, streams chat output, and can resolve read-only query tools by calling `google-ads-reports` or `meta-reports`.
6. Client-side streaming code parses OpenAI-style SSE chunks into message text and tool-call parts.
7. Mutating tools create a `ToolApprovalRequest`; user approval calls `google-ads-execute` for Google tools or `meta-mutate` for Meta tools.
8. User and assistant messages are persisted to `chat_messages`; sessions live in `chat_sessions`.

**CLI Bridge Flow:**

1. `src/hooks/useCliSession.ts` creates a Google Ads CLI session row in `cli_sessions` for the selected Google account.
2. `src/hooks/useMetaCliSession.ts` creates a Meta CLI session row in `meta_cli_sessions` for the selected Meta account.
3. `supabase/functions/get-cli-session/index.ts` and `supabase/functions/get-meta-cli-session/index.ts` expose session lookup for external CLI clients.

**State Management:**
- Use React Context for auth/session/account/date/platform state in `src/contexts/`.
- Use React Query for remote report state in `src/hooks/useGoogleAdsReport.ts` and `src/hooks/useMetaReport.ts`.
- Use Supabase tables for durable chat, AI settings, Meta connections, company profile, and CLI sessions.
- Use browser storage for provider token, selected account ids, hidden accounts, platform, timezone, attribution window, report cache, chat panel width, and chat sidebar width.

## Key Abstractions

**Provider Hierarchy:**
- Purpose: Make auth, dashboard state, offline state, query cache, toasts, and routing available globally.
- Examples: `src/App.tsx`, `src/contexts/AuthContext.tsx`, `src/contexts/DashboardContext.tsx`, `src/contexts/OfflineContext.tsx`
- Pattern: Global provider composition around all routes; route guards live inside the router tree.

**Dashboard Context:**
- Purpose: Single source of truth for active platform, Google account, Meta account, date range, previous period, and dashboard UI state.
- Examples: `src/contexts/DashboardContext.tsx`, `src/components/layout/TopBar.tsx`, `src/components/layout/Sidebar.tsx`
- Pattern: Store user selections in state and persist stable selections to `localStorage`.

**Report Hooks:**
- Purpose: Normalize ad platform data fetching behind React Query.
- Examples: `src/hooks/useGoogleAdsReport.ts`, `src/hooks/useMetaReport.ts`
- Pattern: Read context values, build stable query keys, short-circuit until required account/token values exist, use localStorage TTL cache before invoking Supabase functions.

**Platform Pages:**
- Purpose: Keep Google Ads and Meta Ads route pages separate where data shape differs.
- Examples: `src/pages/dashboard/Campaigns.tsx`, `src/pages/dashboard/meta/Campaigns.tsx`, `src/pages/dashboard/Recommendations.tsx`
- Pattern: Add Google pages under `src/pages/dashboard/`; add Meta pages under `src/pages/dashboard/meta/`; use shared dashboard components when metrics shape is compatible.

**Chat Session Hooks:**
- Purpose: Encapsulate chat persistence and streaming concerns outside visual components.
- Examples: `src/hooks/use-chat-session.ts`, `src/hooks/use-chat-stream.ts`, `src/hooks/use-chat-context.ts`, `src/components/dashboard/chat/ChatPanel.tsx`
- Pattern: `ChatPanel` coordinates UI state; hooks own database reads/writes, report context aggregation, streaming, and tool execution.

**Tool Approval:**
- Purpose: Prevent direct execution of AI-proposed mutations.
- Examples: `src/hooks/use-chat-stream.ts`, `src/components/dashboard/ToolApprovalDialog.tsx`, `supabase/functions/google-ads-execute/index.ts`, `supabase/functions/meta-mutate/index.ts`
- Pattern: Assistant tool calls become approval-requested message parts; approved Google calls execute through `google-ads-execute`; approved Meta calls execute through `meta-mutate`.

**Supabase Edge Functions:**
- Purpose: Server boundary for external API calls and secrets.
- Examples: `supabase/functions/google-ads-reports/index.ts`, `supabase/functions/meta-reports/index.ts`, `supabase/functions/analyze-ads/index.ts`, `supabase/functions/process-attachment/index.ts`
- Pattern: Handle CORS, parse/validate request body, call external API with env-provided secrets, return normalized JSON or SSE.

**Settings Sections:**
- Purpose: Compose independent account/configuration cards under the settings route.
- Examples: `src/pages/settings/index.tsx`, `src/components/settings/AISettingsCard.tsx`, `src/components/settings/MetaAdsSection.tsx`, `src/components/settings/ClaudeCodeSection.tsx`, `src/components/settings/MetaClaudeCodeSection.tsx`
- Pattern: Settings page imports section components and stacks them in a single route under `DashboardLayout`.

## Entry Points

**Frontend Entry:**
- Location: `src/main.tsx`
- Triggers: Browser loads `index.html`.
- Responsibilities: Create React root, render `App`, load global CSS from `src/index.css`.

**App and Router:**
- Location: `src/App.tsx`
- Triggers: `src/main.tsx` render.
- Responsibilities: Compose providers, configure QueryClient retry behavior, define routes, install error boundary and analytics.

**Dashboard Shell:**
- Location: `src/components/layout/DashboardLayout.tsx`
- Triggers: Protected `/dashboard/*` and `/settings` routes.
- Responsibilities: Render collapsible sidebar, top bar, nested route outlet, and AI chat rail with chat width coordination.

**Google Auth Callback:**
- Location: `src/pages/AuthCallback.tsx`
- Triggers: Supabase/Google OAuth redirect to `/auth/callback`.
- Responsibilities: Complete auth callback UX and route the user into the app after session establishment.

**Meta Auth Callback:**
- Location: `supabase/functions/meta-auth/index.ts`
- Triggers: Facebook OAuth redirect to Supabase function URL.
- Responsibilities: Exchange Meta auth code, store long-lived token in `meta_connections`, redirect back to `/settings`.

**Google Ads Report API:**
- Location: `supabase/functions/google-ads-reports/index.ts`
- Triggers: `useGoogleAdsReport`, `analyze-ads` query tool.
- Responsibilities: Build Google Ads API v20 report queries and return normalized dashboard data.

**Meta Report API:**
- Location: `supabase/functions/meta-reports/index.ts`
- Triggers: `useMetaReport`, `analyze-ads` Meta query tool.
- Responsibilities: Query Meta Graph API v20.0 and refresh expiring Meta tokens.

**AI Analysis API:**
- Location: `supabase/functions/analyze-ads/index.ts`
- Triggers: `use-chat-stream.ts` and optional `use-chat-v2.ts`.
- Responsibilities: Build prompts, expose platform tool schemas, stream assistant output, resolve read-only query tools.

## Error Handling

**Strategy:** UI boundaries for render failures, toast notifications for user-action failures, explicit Edge Function errors, and guarded provider initialization.

**Patterns:**
- Wrap routed UI in `src/components/ErrorBoundary.tsx` from `src/App.tsx`.
- Show auth and API failures with toasts from `src/hooks/use-toast.ts` and `src/components/ui/toaster.tsx`.
- Handle missing Supabase frontend env by creating a mock auth client in `src/integrations/supabase/client.ts`.
- Detect expired Google Ads OAuth tokens in `src/hooks/useGoogleAdsReport.ts`, remove `google_provider_token`, and offer a reconnect toast action.
- Return JSON error responses from Edge Functions such as `supabase/functions/meta-reports/index.ts`, `supabase/functions/google-ads-execute/index.ts`, and `supabase/functions/meta-auth/index.ts`.
- Use Zod validation at Edge Function boundaries in `supabase/functions/analyze-ads/index.ts`, `supabase/functions/google-ads-reports/index.ts`, and `supabase/functions/meta-reports/index.ts`.
- Ignore browser storage failures in `src/contexts/DashboardContext.tsx`, `src/hooks/useGoogleAdsReport.ts`, and `src/hooks/useMetaReport.ts` to avoid breaking private-mode users.

## Cross-Cutting Concerns

**Logging:** Console logging is used in `src/contexts/AuthContext.tsx`, `src/contexts/DashboardContext.tsx`, and several Edge Functions such as `supabase/functions/meta-auth/index.ts` and `supabase/functions/meta-reports/index.ts`.

**Validation:** Client code relies mostly on TypeScript and controlled UI state; Edge Functions use request validation with Zod and explicit required-field checks.

**Authentication:** Supabase Auth protects frontend routes via `src/components/auth/ProtectedRoute.tsx`; Google Ads uses Supabase Google OAuth provider tokens; Meta Ads uses a separate Meta OAuth flow persisted in `meta_connections`; Supabase RLS policies in `supabase/migrations/*.sql` restrict user-owned tables.

**Authorization:** `supabase/config.toml` sets all listed Edge Functions to `verify_jwt = false`, so functions must validate tokens, request body ownership, and service-role writes internally.

**Caching:** Google report hooks cache under `adsinsight:cache:*`; Meta report hooks cache under `adsinsight:meta:cache:*`; React Query adds in-memory stale-time caching.

**Feature Flags:** Chat behavior is gated by `src/config/features.ts`, including tool calling, message actions, data stream preview, model selection, and optional AI SDK transport.

**Domain Structure:** Google Ads pages follow account > campaign > ad group > ad/keyword/search term/audience/budget/conversion views. Meta pages follow account > campaign > ad set > ad views, matching the domain guidance in `.agents/skills/google-ads-manager/SKILL.md`.

---

*Architecture analysis: 2026-05-06*
