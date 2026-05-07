# Codebase Structure

**Analysis Date:** 2026-05-06

## Directory Layout

```text
ads-insights-ai/
|-- .agents/                    # Project skills for ad creative and Google Ads domain work
|-- .claude/                    # Claude-local workflow/settings files
|-- .planning/codebase/         # GSD codebase intelligence documents
|-- docs/chat/                  # Chat prompt/rule documentation
|-- plans/                      # Planning notes for chat improvements
|-- public/                     # Static browser assets
|-- src/                        # React/Vite frontend source
|   |-- components/             # Reusable React components
|   |   |-- auth/               # Auth route guards
|   |   |-- dashboard/          # Dashboard widgets and chat UI
|   |   |   `-- chat/           # Newer panelized chat subcomponents
|   |   |-- icons/              # Custom project icons
|   |   |-- layout/             # Dashboard frame components
|   |   |-- settings/           # Settings cards/sections
|   |   `-- ui/                 # shadcn/ui primitives
|   |-- config/                 # App config, feature flags, navigation
|   |-- contexts/               # React Context providers
|   |-- hooks/                  # Custom hooks for data, chat, status, CLI sessions
|   |-- integrations/           # External client setup
|   |   `-- supabase/           # Supabase browser client
|   |-- lib/                    # Shared utility and AI helper modules
|   |   `-- ai/                 # AI model/tool metadata helpers
|   |-- pages/                  # Route-level components
|   |   |-- dashboard/          # Google Ads dashboard pages
|   |   |   `-- meta/           # Meta Ads dashboard pages
|   |   `-- settings/           # Settings route and page-local sections
|   |-- test/                   # Vitest setup and tests
|   `-- types/                  # Shared TypeScript types
|-- supabase/                   # Supabase backend configuration
|   |-- functions/              # Deno Edge Functions
|   |-- migrations/             # PostgreSQL schema and RLS migrations
|   `-- config.toml             # Local Supabase/function config
|-- AGENTS.md                   # Agent guidance for this repo
|-- components.json             # shadcn/ui configuration
|-- package.json                # npm scripts and dependencies
|-- tailwind.config.ts          # Tailwind theme/content config
|-- tsconfig*.json              # TypeScript project configs
|-- vercel.json                 # Vercel deployment config
|-- vite.config.ts              # Vite React/SWC config and alias
`-- vitest.config.ts            # Vitest config
```

## Directory Purposes

**`src/`:**
- Purpose: Frontend application source for the Vite React SPA.
- Contains: Entry points, routes, components, contexts, hooks, integrations, utilities, types, tests, and styles.
- Key files: `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/App.css`

**`src/components/auth/`:**
- Purpose: Authentication wrappers.
- Contains: Route guard components.
- Key files: `src/components/auth/ProtectedRoute.tsx`

**`src/components/dashboard/`:**
- Purpose: Shared dashboard UI for Google and Meta reporting surfaces plus legacy/root chat components.
- Contains: KPI cards, charts, data tables, alerts, chat rail wrapper, message actions, tool approval dialog, attachment UI.
- Key files: `src/components/dashboard/HeroMetrics.tsx`, `src/components/dashboard/PerformanceChart.tsx`, `src/components/dashboard/DataTable.tsx`, `src/components/dashboard/ChatBubble.tsx`, `src/components/dashboard/ChatSidebar.tsx`, `src/components/dashboard/ToolApprovalDialog.tsx`, `src/components/dashboard/AlertSystem.tsx`

**`src/components/dashboard/chat/`:**
- Purpose: Panelized AI chat implementation.
- Contains: Chat panel controller, header, input, message list/bubbles, data-stream preview, shared chat types.
- Key files: `src/components/dashboard/chat/ChatPanel.tsx`, `src/components/dashboard/chat/ChatInput.tsx`, `src/components/dashboard/chat/MessageList.tsx`, `src/components/dashboard/chat/MessageBubble.tsx`, `src/components/dashboard/chat/types.ts`

**`src/components/icons/`:**
- Purpose: Custom visual identity components.
- Contains: Project logo/icon components.
- Key files: `src/components/icons/AdsLogo.tsx`

**`src/components/layout/`:**
- Purpose: Persistent dashboard application frame.
- Contains: Main layout, collapsible sidebar, top bar with platform/account/date controls.
- Key files: `src/components/layout/DashboardLayout.tsx`, `src/components/layout/Sidebar.tsx`, `src/components/layout/TopBar.tsx`

**`src/components/settings/`:**
- Purpose: Reusable settings cards that are composed by the settings route.
- Contains: AI settings, alert/data settings, company profile, Meta Ads connection, Google/Meta Claude Code CLI connection cards.
- Key files: `src/components/settings/AISettingsCard.tsx`, `src/components/settings/AlertSettings.tsx`, `src/components/settings/DataSettingsCard.tsx`, `src/components/settings/CompanySection.tsx`, `src/components/settings/MetaAdsSection.tsx`, `src/components/settings/ClaudeCodeSection.tsx`, `src/components/settings/MetaClaudeCodeSection.tsx`

**`src/components/ui/`:**
- Purpose: shadcn/ui primitives and wrappers.
- Contains: Button, Card, Dialog, Table, Select, Toast, Tooltip, Sidebar, and other Radix-based primitives.
- Key files: `src/components/ui/button.tsx`, `src/components/ui/card.tsx`, `src/components/ui/table.tsx`, `src/components/ui/dialog.tsx`, `src/components/ui/toaster.tsx`
- Guidance: Do not hand-edit generated shadcn primitives for product behavior; add project-specific composition in `src/components/dashboard/`, `src/components/settings/`, or `src/components/layout/`.

**`src/config/`:**
- Purpose: Small static configuration modules.
- Contains: App metadata, feature flags, and navigation definitions for Google and Meta dashboards.
- Key files: `src/config/app.ts`, `src/config/features.ts`, `src/config/navigation.ts`

**`src/contexts/`:**
- Purpose: React Context providers for cross-cutting browser state.
- Contains: Auth/session state, dashboard state, offline state, chat data-stream state.
- Key files: `src/contexts/AuthContext.tsx`, `src/contexts/DashboardContext.tsx`, `src/contexts/OfflineContext.tsx`, `src/contexts/DataStreamContext.tsx`

**`src/hooks/`:**
- Purpose: Reusable stateful logic outside components.
- Contains: Google/Meta report hooks, chat persistence/stream/context hooks, online status, mobile breakpoint, toast, scroll-to-bottom, Google/Meta CLI session hooks.
- Key files: `src/hooks/useGoogleAdsReport.ts`, `src/hooks/useMetaReport.ts`, `src/hooks/use-chat-stream.ts`, `src/hooks/use-chat-session.ts`, `src/hooks/use-chat-context.ts`, `src/hooks/useCliSession.ts`, `src/hooks/useMetaCliSession.ts`, `src/hooks/useOnlineStatus.ts`

**`src/integrations/supabase/`:**
- Purpose: Supabase browser client setup.
- Contains: Env-derived Supabase URL/key exports, typed client, mock auth client fallback.
- Key files: `src/integrations/supabase/client.ts`

**`src/lib/`:**
- Purpose: Shared utilities and non-component helpers.
- Contains: `cn()` Tailwind merge helper, Google Ads UI helpers, error formatting, AI model/tool metadata.
- Key files: `src/lib/utils.ts`, `src/lib/googleAdsUi.ts`, `src/lib/errors.ts`, `src/lib/ai/tools.ts`, `src/lib/ai/models.ts`

**`src/pages/`:**
- Purpose: Top-level route components outside the dashboard page families.
- Contains: Login, auth callback, connect Google Ads, index/landing redirect page, not found page, dashboard/settings route folders.
- Key files: `src/pages/Login.tsx`, `src/pages/AuthCallback.tsx`, `src/pages/ConnectGoogleAds.tsx`, `src/pages/NotFound.tsx`, `src/pages/Index.tsx`

**`src/pages/dashboard/`:**
- Purpose: Google Ads dashboard route pages and shared cross-platform recommendations route.
- Contains: Overview, campaigns, ad groups, ads, keywords, search terms, audiences, budgets, conversions, reports, recommendations.
- Key files: `src/pages/dashboard/Overview.tsx`, `src/pages/dashboard/Campaigns.tsx`, `src/pages/dashboard/AdGroups.tsx`, `src/pages/dashboard/Ads.tsx`, `src/pages/dashboard/Keywords.tsx`, `src/pages/dashboard/SearchTerms.tsx`, `src/pages/dashboard/Audiences.tsx`, `src/pages/dashboard/Budgets.tsx`, `src/pages/dashboard/Conversions.tsx`, `src/pages/dashboard/Reports.tsx`, `src/pages/dashboard/Recommendations.tsx`

**`src/pages/dashboard/meta/`:**
- Purpose: Meta Ads dashboard route pages.
- Contains: Overview, campaigns, ad sets, ads.
- Key files: `src/pages/dashboard/meta/Overview.tsx`, `src/pages/dashboard/meta/Campaigns.tsx`, `src/pages/dashboard/meta/AdSets.tsx`, `src/pages/dashboard/meta/Ads.tsx`

**`src/pages/settings/`:**
- Purpose: Settings route and page-local settings sections.
- Contains: Settings page composition plus profile/account/environment/privacy sections.
- Key files: `src/pages/settings/index.tsx`, `src/pages/settings/ProfileSection.tsx`, `src/pages/settings/AccountSection.tsx`, `src/pages/settings/EnvironmentSection.tsx`, `src/pages/settings/PrivacySection.tsx`

**`src/test/`:**
- Purpose: Vitest setup and focused test files.
- Contains: jsdom setup, sample test, AuthContext tests, ErrorBoundary tests, Google Ads report hook tests.
- Key files: `src/test/setup.ts`, `src/test/useGoogleAdsReport.test.tsx`, `src/test/AuthContext.test.tsx`, `src/test/ErrorBoundary.test.tsx`, `src/test/example.test.ts`

**`src/types/`:**
- Purpose: Shared TypeScript data contracts.
- Contains: Supabase database types, chat protocol types, alert types.
- Key files: `src/types/database.ts`, `src/types/chat.ts`, `src/types/alerts.ts`

**`supabase/functions/`:**
- Purpose: Deno Edge Functions used as server-side API boundaries.
- Contains: AI analysis, Google Ads APIs, Meta APIs, attachment processing, CLI bridge endpoints, health/config endpoints.
- Key files: `supabase/functions/analyze-ads/index.ts`, `supabase/functions/google-ads-reports/index.ts`, `supabase/functions/google-ads-accounts/index.ts`, `supabase/functions/google-ads-execute/index.ts`, `supabase/functions/meta-auth/index.ts`, `supabase/functions/meta-reports/index.ts`, `supabase/functions/meta-mutate/index.ts`, `supabase/functions/process-attachment/index.ts`

**`supabase/migrations/`:**
- Purpose: Database schema, RLS policies, and incremental table changes.
- Contains: User AI settings, chat history, chat archive/account fields, project keepalive, Google CLI sessions, Meta foundation tables, Meta CLI sessions.
- Key files: `supabase/migrations/20250205_create_user_ai_settings.sql`, `supabase/migrations/20260209090000_create_chat_history.sql`, `supabase/migrations/20260408100000_meta_foundation.sql`, `supabase/migrations/20260408000000_cli_sessions.sql`, `supabase/migrations/20260408200000_meta_cli_sessions.sql`

**`.agents/skills/`:**
- Purpose: Project-local domain skills.
- Contains: Ad creative and Google Ads management guidance.
- Key files: `.agents/skills/ad-creative/SKILL.md`, `.agents/skills/google-ads-manager/SKILL.md`

## Key File Locations

**Entry Points:**
- `src/main.tsx`: Browser entry; renders `App`.
- `src/App.tsx`: Provider composition, route definitions, protected dashboard/settings shell.
- `index.html`: Vite HTML entry.

**Routing:**
- `src/App.tsx`: Defines `/login`, `/auth/callback`, `/connect/ads`, `/dashboard/*`, `/settings`, root redirect, catch-all route.
- `src/components/auth/ProtectedRoute.tsx`: Guards authenticated routes.
- `src/config/navigation.ts`: Defines Google `navItems` and Meta `metaNavItems`.

**Layout:**
- `src/components/layout/DashboardLayout.tsx`: Dashboard frame, `Outlet`, chat rail.
- `src/components/layout/Sidebar.tsx`: Platform-aware navigation list and sign-out.
- `src/components/layout/TopBar.tsx`: Platform switcher, account selectors, date range selector, refresh button.

**Configuration:**
- `src/config/app.ts`: App metadata.
- `src/config/features.ts`: Chat/AI feature flags.
- `vite.config.ts`: Vite React SWC plugin, dev server port `8000`, `@/` alias.
- `components.json`: shadcn/ui aliases and Tailwind settings.
- `supabase/config.toml`: Supabase local/project config and Edge Function `verify_jwt` settings.

**Auth and Session State:**
- `src/contexts/AuthContext.tsx`: Supabase Auth, Google OAuth, provider token capture/storage.
- `src/pages/Login.tsx`: Google login UI.
- `src/pages/AuthCallback.tsx`: OAuth callback UI.
- `src/components/auth/ProtectedRoute.tsx`: Auth loading/redirect handling.

**Dashboard State:**
- `src/contexts/DashboardContext.tsx`: Platform/account/date range/timezone/attribution/chat-width state.
- `src/components/layout/TopBar.tsx`: User controls for platform/account/date.
- `src/components/layout/Sidebar.tsx`: Navigation controlled by active platform.

**Google Ads Data:**
- `src/hooks/useGoogleAdsReport.ts`: Google report fetching/caching hook.
- `supabase/functions/google-ads-accounts/index.ts`: Google account discovery.
- `supabase/functions/google-ads-reports/index.ts`: Google Ads API v20 report queries and transforms.
- `supabase/functions/google-ads-mutate/index.ts`: Direct page-triggered Google Ads mutations.
- `supabase/functions/google-ads-execute/index.ts`: AI-approved Google Ads tool execution.

**Meta Ads Data:**
- `src/hooks/useMetaReport.ts`: Meta report fetching/caching hook.
- `src/components/settings/MetaAdsSection.tsx`: Meta connection and account management UI.
- `supabase/functions/meta-auth/index.ts`: Meta OAuth callback and token persistence.
- `supabase/functions/meta-accounts/index.ts`: Meta account discovery and persistence.
- `supabase/functions/meta-reports/index.ts`: Meta Graph API v20.0 reports.
- `supabase/functions/meta-mutate/index.ts`: AI-approved Meta mutation execution.

**AI Chat:**
- `src/components/dashboard/ChatBubble.tsx`: Data stream provider wrapper for chat.
- `src/components/dashboard/chat/ChatPanel.tsx`: Main chat panel controller.
- `src/hooks/use-chat-session.ts`: AI settings, sessions, messages, persistence.
- `src/hooks/use-chat-stream.ts`: Streaming request, SSE parsing, tool approval execution.
- `src/hooks/use-chat-context.ts`: Active platform report context aggregation.
- `src/hooks/use-chat-v2.ts`: Optional AI SDK transport adapter.
- `supabase/functions/analyze-ads/index.ts`: AI streaming function and tool schemas.
- `supabase/functions/analyze-ads/system-prompt.ts`: Platform-specific AI system prompt builders.
- `supabase/functions/process-attachment/index.ts`: Attachment/audio processing function.

**Settings:**
- `src/pages/settings/index.tsx`: Settings page composition.
- `src/pages/settings/ProfileSection.tsx`: User profile display.
- `src/pages/settings/AccountSection.tsx`: Google Ads account settings.
- `src/components/settings/AISettingsCard.tsx`: AI provider key/model preferences.
- `src/components/settings/AlertSettings.tsx`: Alert configuration.
- `src/components/settings/DataSettingsCard.tsx`: Data preferences.
- `src/components/settings/CompanySection.tsx`: Company profile for platform setup.
- `src/components/settings/MetaAdsSection.tsx`: Meta Ads connection.
- `src/components/settings/ClaudeCodeSection.tsx`: Google CLI bridge settings.
- `src/components/settings/MetaClaudeCodeSection.tsx`: Meta CLI bridge settings.

**CLI Bridge:**
- `src/hooks/useCliSession.ts`: Google CLI session creation/revocation.
- `src/hooks/useMetaCliSession.ts`: Meta CLI session creation/revocation.
- `supabase/functions/get-cli-session/index.ts`: Google CLI session lookup.
- `supabase/functions/get-meta-cli-session/index.ts`: Meta CLI session lookup.
- `supabase/migrations/20260408000000_cli_sessions.sql`: Google CLI session schema.
- `supabase/migrations/20260408200000_meta_cli_sessions.sql`: Meta CLI session schema.

**Database Schema:**
- `src/types/database.ts`: Generated or maintained Supabase type definitions.
- `supabase/migrations/20250205_create_user_ai_settings.sql`: AI settings table.
- `supabase/migrations/20260209090000_create_chat_history.sql`: Chat sessions/messages tables.
- `supabase/migrations/20260209090100_add_account_id_to_chat.sql`: Account-scoped chat sessions.
- `supabase/migrations/20260209090200_add_archived_to_chat_sessions.sql`: Archived chat sessions.
- `supabase/migrations/20260331_add_parts_to_chat_messages.sql`: Chat message parts.
- `supabase/migrations/20260408100000_meta_foundation.sql`: Company, Meta connection, Meta account tables.

**Tests:**
- `vitest.config.ts`: Test runner configuration.
- `src/test/setup.ts`: Testing Library setup.
- `src/test/useGoogleAdsReport.test.tsx`: Google report hook behavior.
- `src/test/AuthContext.test.tsx`: Auth provider behavior.
- `src/test/ErrorBoundary.test.tsx`: Error boundary behavior.

## Naming Conventions

**Files:**
- Use PascalCase for React component files: `DashboardLayout.tsx`, `ChatPanel.tsx`, `MetaAdsSection.tsx`.
- Use `use...` camelCase for hook files: `useGoogleAdsReport.ts`, `useMetaReport.ts`, `use-chat-stream.ts`.
- Use lowercase utility/config files: `utils.ts`, `errors.ts`, `features.ts`, `navigation.ts`.
- Use route page names that match the visible domain object: `Campaigns.tsx`, `AdSets.tsx`, `SearchTerms.tsx`.
- Use hyphenated Supabase function directory names: `google-ads-reports`, `meta-auth`, `process-attachment`.

**Directories:**
- Use lowercase source directories: `components/`, `contexts/`, `hooks/`, `pages/`.
- Use domain folders for route families: `src/pages/dashboard/` for Google Ads, `src/pages/dashboard/meta/` for Meta Ads.
- Use role folders under components: `layout/`, `settings/`, `dashboard/`, `auth/`, `ui/`.

**Routes:**
- Google dashboard routes live under `/dashboard/*`, for example `/dashboard/campaigns`.
- Meta dashboard routes live under `/dashboard/meta/*`, for example `/dashboard/meta/adsets`.
- Settings route lives at `/settings` but renders inside `DashboardLayout`.

## Where to Add New Code

**New Google Ads Dashboard Page:**
- Primary code: `src/pages/dashboard/NewPage.tsx`
- Navigation: add to `navItems` in `src/config/navigation.ts`
- Route: add nested `/dashboard` route in `src/App.tsx`
- Data hook: add report type to `ReportType` in `src/hooks/useGoogleAdsReport.ts`
- Backend report: add query/transform branch in `supabase/functions/google-ads-reports/index.ts`
- Shared UI: place reusable widgets in `src/components/dashboard/`
- Tests: add focused tests in `src/test/` or near the affected hook/component pattern used by existing tests.

**New Meta Ads Dashboard Page:**
- Primary code: `src/pages/dashboard/meta/NewPage.tsx`
- Navigation: add to `metaNavItems` in `src/config/navigation.ts`
- Route: add nested `/dashboard/meta` route in `src/App.tsx`
- Data hook: add report type to `MetaReportType` in `src/hooks/useMetaReport.ts`
- Backend report: add branch in `supabase/functions/meta-reports/index.ts`
- Shared UI: reuse `src/components/dashboard/` components when metric shape matches.

**New Shared Dashboard Component:**
- Implementation: `src/components/dashboard/NewComponent.tsx`
- Import from pages in `src/pages/dashboard/` or `src/pages/dashboard/meta/`.
- Keep platform-specific data fetching in pages/hooks; pass normalized props into the component.

**New Layout Feature:**
- Implementation: `src/components/layout/NewLayoutPart.tsx`
- State: extend `src/contexts/DashboardContext.tsx` only when the state is global across layout/pages.
- Navigation: update `src/config/navigation.ts` for new sidebar entries.

**New Settings Section:**
- Reusable card: `src/components/settings/NewSettingsCard.tsx`
- Page composition: import into `src/pages/settings/index.tsx`
- Page-local section: use `src/pages/settings/NewSection.tsx` only when the section belongs only to the route and is not reused elsewhere.
- Persistence: use Supabase tables through `src/integrations/supabase/client.ts`; add migrations in `supabase/migrations/`.

**New React Context:**
- Implementation: `src/contexts/NewContext.tsx`
- Provider placement: wrap it in `src/App.tsx` at the narrowest global level that covers consumers.
- Consumer hook: export `useNewContext()` from the same file and throw when used outside the provider, matching `AuthContext`, `DashboardContext`, and `OfflineContext`.

**New Hook:**
- Implementation: `src/hooks/useThing.ts` or `src/hooks/use-thing.ts` following nearby naming style.
- Use `@/` imports for project modules.
- Data fetching hooks should use React Query and stable `queryKey`s.

**New Supabase Edge Function:**
- Implementation: `supabase/functions/function-name/index.ts`
- Config: add `[functions.function-name]` in `supabase/config.toml` and set JWT behavior intentionally.
- Client calls: invoke through `supabase.functions.invoke('function-name')` for JSON functions or `fetch(`${SUPABASE_URL}/functions/v1/function-name`)` for streaming/custom responses.
- Secrets: read from `Deno.env.get(...)`; never expose service role or provider secrets through frontend code.

**New Database Table:**
- Migration: add timestamped SQL file in `supabase/migrations/`.
- Types: update `src/types/database.ts` when schema changes are meant for typed frontend access.
- Security: add RLS policies in the same migration for user-owned data.

**New AI Tool:**
- Tool schema: add to Google or Meta tool definitions in `supabase/functions/analyze-ads/index.ts`.
- Client risk/description: update `TOOL_RISK_LEVEL` and `TOOL_DESCRIPTION` in `src/hooks/use-chat-stream.ts`.
- Execution: implement approved action in `supabase/functions/google-ads-execute/index.ts` or `supabase/functions/meta-mutate/index.ts`.
- UI: reuse `src/components/dashboard/ToolApprovalDialog.tsx` and message parts in `src/types/chat.ts`.

**New shadcn/ui Primitive:**
- Generate with shadcn CLI according to `components.json`.
- Output location: `src/components/ui/`.
- Product-specific composition belongs outside `src/components/ui/`.

**New Static Asset:**
- Location: `public/`.
- Use for browser-served assets such as logos, images, icons, and robots metadata.

## Special Directories

**`src/components/ui/`:**
- Purpose: shadcn/ui primitive component source.
- Generated: Yes.
- Committed: Yes.
- Guidance: Treat as vendor-style UI foundation; compose product behavior elsewhere.

**`src/pages/dashboard/meta/`:**
- Purpose: Meta Ads route family.
- Generated: No.
- Committed: Yes.
- Guidance: Keep Meta-specific data shapes here and in `src/hooks/useMetaReport.ts`.

**`src/components/dashboard/chat/`:**
- Purpose: Current AI chat panel subcomponent architecture.
- Generated: No.
- Committed: Yes.
- Guidance: Add chat UI pieces here rather than growing `ChatPanel.tsx` when behavior can be isolated.

**`supabase/functions/`:**
- Purpose: Server-side Deno functions deployed to Supabase.
- Generated: No.
- Committed: Yes.
- Guidance: Keep external API calls and secrets here; do not call Google Ads or Meta Graph APIs directly from the browser except through public OAuth redirects.

**`supabase/migrations/`:**
- Purpose: Database schema and RLS history.
- Generated: Manually authored migration files.
- Committed: Yes.
- Guidance: Add additive timestamped migrations; do not rewrite applied historical migrations unless the project explicitly resets the database.

**`.planning/codebase/`:**
- Purpose: GSD codebase maps consumed by planning/execution commands.
- Generated: Yes.
- Committed: Project-dependent.
- Guidance: Mapper agents update only their assigned files; architecture focus owns `ARCHITECTURE.md` and `STRUCTURE.md`.

**`.agents/skills/`:**
- Purpose: Project-local skills and domain rules for agent workflows.
- Generated: No.
- Committed: Yes.
- Guidance: Read `SKILL.md` indexes before implementing domain-heavy ad or Google Ads work.

**`docs/chat/`:**
- Purpose: Durable documentation for chat rules and advanced analysis skill behavior.
- Generated: No.
- Committed: Yes.
- Guidance: Keep AI chat prompt/rule changes reflected here when they become product policy.

---

*Structure analysis: 2026-05-06*
