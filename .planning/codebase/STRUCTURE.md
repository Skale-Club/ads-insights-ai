# Codebase Structure

**Analysis Date:** 2026-03-31

## Directory Layout

```
ads-insights-ai/
├── .planning/codebase/      # GSD planning documents
├── src/                     # Frontend source code
│   ├── components/         # React components
│   ├── config/             # App configuration
│   ├── contexts/           # React Context providers
│   ├── hooks/              # Custom React hooks
│   ├── integrations/       # External service clients
│   ├── lib/                # Utility functions
│   ├── pages/              # Page components
│   ├── test/               # Test setup and examples
│   ├── types/              # TypeScript type definitions
│   ├── App.tsx             # Main app component
│   ├── main.tsx            # App entry point
│   └── index.css           # Global styles
├── supabase/               # Supabase backend
│   ├── functions/          # Edge Functions (Deno)
│   └── config.toml         # Supabase config
├── public/                 # Static assets
├── package.json            # Node dependencies
├── tsconfig.json           # TypeScript config
├── vite.config.ts          # Vite bundler config
└── AGENTS.md               # Project documentation
```

## Directory Purposes

### `src/components/ui/` (shadcn/ui primitives)
- Purpose: Reusable UI components from shadcn/ui library
- Contains: 40+ primitive components (Button, Card, Dialog, Table, etc.)
- Key files: `button.tsx`, `card.tsx`, `table.tsx`, `dialog.tsx`, `input.tsx`
- Note: DO NOT EDIT - regenerate via shadcn CLI

### `src/components/layout/`
- Purpose: Layout shell components
- Contains: DashboardLayout, Sidebar, TopBar
- Key files: `DashboardLayout.tsx`, `Sidebar.tsx`, `TopBar.tsx`
- Dependencies: Navigation config, DashboardContext

### `src/components/dashboard/`
- Purpose: Dashboard-specific components (charts, tables, chat)
- Contains: TrendChart, TopPerformers, QuickInsights, ChatBubble, ChatSidebar
- Key files: `TrendChart.tsx`, `TopPerformers.tsx`, `QuickInsights.tsx`, `ChatBubble.tsx`
- Dependencies: Recharts, useGoogleAdsReport hook

### `src/components/auth/`
- Purpose: Authentication-related components
- Contains: ProtectedRoute wrapper
- Key files: `ProtectedRoute.tsx`

### `src/components/settings/`
- Purpose: Settings page components
- Contains: AISettingsCard
- Key files: `AISettingsCard.tsx`

### `src/components/icons/`
- Purpose: Custom icon components
- Contains: AdsLogo
- Key files: `AdsLogo.tsx`

### `src/pages/`
- Purpose: Page-level React components (routes)
- Contains: Login, ConnectGoogleAds, AuthCallback, NotFound
- Key files: `Login.tsx`, `ConnectGoogleAds.tsx`, `AuthCallback.tsx`

### `src/pages/dashboard/`
- Purpose: Dashboard page components
- Contains: Overview, Campaigns, AdGroups, Ads, Keywords, SearchTerms, Audiences, Budgets, Conversions, Reports, Recommendations
- Key files: `Overview.tsx`, `Campaigns.tsx`, `Keywords.tsx`, `Recommendations.tsx`
- Pattern: Each page uses `useGoogleAdsReport` to fetch relevant data

### `src/pages/settings/`
- Purpose: Settings pages
- Contains: Main settings, Profile, Account, Environment, Privacy sections
- Key files: `index.tsx`, `ProfileSection.tsx`, `AccountSection.tsx`, `EnvironmentSection.tsx`

### `src/contexts/`
- Purpose: React Context providers for global state
- Contains: AuthContext, DashboardContext
- Key files: `AuthContext.tsx`, `DashboardContext.tsx`
- Dependencies: Supabase client, date-fns

### `src/hooks/`
- Purpose: Custom React hooks
- Contains: useGoogleAdsReport, useMobile, useScrollToBottom, useToast
- Key files: `useGoogleAdsReport.ts`
- Dependencies: TanStack React Query, Supabase functions

### `src/integrations/supabase/`
- Purpose: Supabase client initialization
- Contains: Client configuration and mock client for dev
- Key files: `client.ts`
- Dependencies: @supabase/supabase-js

### `src/config/`
- Purpose: App-wide configuration
- Contains: App metadata, navigation items
- Key files: `app.ts` (APP_CONFIG), `navigation.ts` (navItems array)

### `src/lib/`
- Purpose: Utility functions and helpers
- Contains: cn() utility, Google Ads UI helpers, AI tools
- Key files: `utils.ts` (cn function)

### `src/types/`
- Purpose: TypeScript type definitions
- Contains: Database types (from Supabase), chat types
- Key files: `database.ts` (auto-generated from Supabase), `chat.ts`

### `src/test/`
- Purpose: Test setup and example tests
- Contains: Vitest setup, example test
- Key files: `setup.ts`, `example.test.ts`

### `supabase/functions/`
- Purpose: Supabase Edge Functions (server-side)
- Contains: google-ads-accounts, google-ads-reports, analyze-ads, google-ads-mutate
- Key files: `google-ads-accounts/index.ts`, `analyze-ads/index.ts`, `google-ads-reports/index.ts`

## Key File Locations

### Entry Points:
- `src/main.tsx`: React app entry, renders App component
- `src/App.tsx`: Route definitions, provider setup, layout structure

### Configuration:
- `src/config/app.ts`: App name, description, version
- `src/config/navigation.ts`: Nav items for sidebar and routing

### Core Logic:
- `src/contexts/AuthContext.tsx`: Google OAuth flow, Supabase Auth
- `src/contexts/DashboardContext.tsx`: Account selection, date range, accounts list
- `src/hooks/useGoogleAdsReport.ts`: Google Ads API data fetching with React Query
- `supabase/functions/analyze-ads/index.ts`: AI chat proxy to Gemini API

### Authentication:
- `src/pages/Login.tsx`: Login page with "Login with Google" button
- `src/pages/AuthCallback.tsx`: OAuth callback handler
- `src/components/auth/ProtectedRoute.tsx`: Route guard for protected pages

### Dashboard Pages (all in `src/pages/dashboard/`):
- `Overview.tsx`: KPI cards, performance chart, top performers
- `Campaigns.tsx`: Campaign list and metrics
- `Keywords.tsx`: Keyword performance table
- `SearchTerms.tsx`: Search term analysis
- `Recommendations.tsx`: AI-powered optimization recommendations

### AI Integration:
- `supabase/functions/analyze-ads/index.ts`: Gemini API proxy with tool definitions
- `src/lib/ai/tools.ts`: AI tool utilities

### Testing:
- `src/test/setup.ts`: Vitest setup with testing-library
- `src/test/example.test.ts`: Example test file
- `src/hooks/useGoogleAdsReport.ts`: Error handling for 401 auth expiry

## Naming Conventions

### Files:
- PascalCase for components: `DashboardLayout.tsx`, `AuthContext.tsx`
- camelCase for hooks: `useGoogleAdsReport.ts`, `use-mobile.tsx`
- camelCase for utilities: `utils.ts`, `googleAdsUi.ts`
- kebab-case for config files: Not applicable (all lowercase)

### Directories:
- lowercase for source directories: `components/`, `contexts/`, `hooks/`
- kebab-case for pages: `dashboard/`, `settings/`

### Components:
- Function components with named exports: `export function DashboardLayout()`
- Use prefix for type: `interface DashboardContextType`

## Where to Add New Code

### New Dashboard Page:
1. Create component in `src/pages/dashboard/NewPageName.tsx`
2. Add entry to `navItems` array in `src/config/navigation.ts`
3. Add route in `src/App.tsx` under `/dashboard` path
4. Add report type to `ReportType` in `src/hooks/useGoogleAdsReport.ts` if data fetching is needed

### New UI Component (shadcn):
```bash
npx shadcn-ui@latest add <component-name>
```

### New Layout Component:
1. Create in `src/components/layout/NewComponent.tsx`
2. Import in `src/components/layout/DashboardLayout.tsx` or relevant parent

### New Dashboard Component:
1. Create in `src/components/dashboard/NewComponent.tsx`
2. Import in appropriate page in `src/pages/dashboard/`

### New Edge Function:
1. Create directory `supabase/functions/function-name/`
2. Add `index.ts` with Deno Edge Function code
3. Deploy with `supabase functions deploy function-name`

### New Hook:
1. Create in `src/hooks/useHookName.ts`
2. Export as named function
3. Use in components that need the functionality

### New Context:
1. Create in `src/contexts/ContextName.tsx`
2. Export Provider component and useContext hook
3. Wrap in `App.tsx` provider hierarchy

## Special Directories

### `src/components/ui/`:
- Purpose: shadcn/ui primitive components (NOT project-specific)
- Generated: Yes, via shadcn CLI
- Committed: Yes, in version control

### `src/components/dashboard/`:
- Purpose: Project-specific dashboard components
- Generated: No, manually created
- Committed: Yes, in version control

### `supabase/functions/`:
- Purpose: Server-side Edge Functions
- Generated: No, manually created
- Committed: Yes, in version control

### `.planning/codebase/`:
- Purpose: GSD planning documents
- Generated: Yes, by GSD mapping commands
- Committed: Not recommended (planning artifacts)

---

*Structure analysis: 2026-03-31*