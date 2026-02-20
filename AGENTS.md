# AGENTS.md

This document provides comprehensive guidance for AI agents working on this codebase.

## Project Overview

**Ads Insights AI** is a web application for managing and analyzing Google Ads campaigns with AI-powered insights. It enables users to connect their Google Ads accounts, visualize performance metrics, and receive intelligent recommendations powered by OpenAI.

### Core Features

- **Google Ads Integration**: OAuth authentication with Google Ads API v18
- **Dashboard Analytics**: Real-time metrics visualization (impressions, clicks, CTR, CPC, conversions, cost)
- **Campaign Management**: View and analyze campaigns, ad groups, keywords, and search terms
- **AI-Powered Insights**: Chat interface for querying ad performance with OpenAI integration
- **Recommendations**: AI-generated suggestions for campaign optimization
- **Multi-Account Support**: Switch between multiple Google Ads accounts

## Build & Development Commands

```bash
npm run dev          # Start Vite dev server (default: http://localhost:8000)
npm run build        # Production build
npm run build:dev    # Development build
npm run lint         # Run ESLint
npm run test         # Run all tests once (Vitest)
npm run test:watch   # Run tests in watch mode
npx vitest run src/path/to/file.test.ts  # Run single test file
```

Bun is also supported (`bun.lockb` present).

## Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | React 18 + TypeScript 5.8 |
| Bundler | Vite 5 (SWC) |
| Routing | React Router v6 |
| UI Components | shadcn/ui (Radix UI primitives) |
| Styling | Tailwind CSS 3 with CSS variable theming |
| State Management | React Context + TanStack React Query |
| Forms | React Hook Form + Zod validation |
| Charts | Recharts |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions) |
| Edge Functions | Deno runtime |
| External APIs | Google Ads API v18, OpenAI Chat Completions |

## Path Alias

`@/` resolves to `./src/` (configured in `tsconfig.json` and `vite.config.ts`).

## Architecture

### Frontend Structure (`src/`)

```
src/
├── pages/
│   ├── dashboard/
│   │   ├── Overview.tsx       # Main dashboard with KPIs and charts
│   │   ├── Campaigns.tsx      # Campaign list and analysis
│   │   ├── AdGroups.tsx       # Ad group management
│   │   ├── Ads.tsx            # Individual ad performance
│   │   ├── Keywords.tsx       # Keyword performance table
│   │   ├── SearchTerms.tsx    # Search term analysis
│   │   ├── Audiences.tsx      # Audience targeting
│   │   ├── Budgets.tsx        # Budget management
│   │   ├── Conversions.tsx    # Conversion tracking
│   │   ├── Reports.tsx        # Custom reports
│   │   └── Recommendations.tsx # AI-powered recommendations
│   ├── settings/
│   │   ├── index.tsx          # Main settings page
│   │   ├── ProfileSection.tsx # User profile
│   │   ├── AccountSection.tsx # Account selection
│   │   ├── EnvironmentSection.tsx # Environment config
│   │   └── PrivacySection.tsx # Privacy info
│   ├── Login.tsx
│   ├── ConnectGoogleAds.tsx
│   └── AuthCallback.tsx
├── components/
│   ├── ui/                    # shadcn/ui primitives (do not edit)
│   ├── dashboard/             # Dashboard-specific components
│   │   ├── HeroMetrics.tsx    # Top-level KPI cards
│   │   ├── PerformanceChart.tsx
│   │   ├── DataTable.tsx
│   │   ├── ChatSidebar.tsx    # AI chat interface
│   │   └── QuickInsights.tsx
│   ├── layout/
│   │   ├── DashboardLayout.tsx # Main layout wrapper
│   │   ├── Sidebar.tsx        # Navigation sidebar
│   │   └── TopBar.tsx
│   ├── auth/
│   │   └── ProtectedRoute.tsx
│   └── settings/
│       └── AISettingsCard.tsx
├── config/
│   ├── app.ts                 # App configuration
│   └── navigation.ts          # Navigation items config
├── contexts/
│   ├── AuthContext.tsx        # Google OAuth, Supabase auth state
│   └── DashboardContext.tsx   # Selected account, date range, metrics
├── integrations/
│   └── supabase/
│       └── client.ts          # Supabase client initialization
├── types/
│   └── database.ts            # Auto-generated Supabase types
├── hooks/
│   ├── use-mobile.tsx
│   └── useGoogleAdsReport.ts  # Google Ads data fetching
└── lib/
    └── utils.ts               # cn() helper (clsx + tailwind-merge)
```

### Supabase Edge Functions (`supabase/functions/`)

| Function | Purpose |
|----------|---------|
| `google-ads-accounts/` | Fetches accessible Google Ads customer accounts using OAuth token. Requires `GOOGLE_ADS_DEVELOPER_TOKEN` env var. |
| `analyze-ads/` | Proxies OpenAI Chat Completions with streaming support. Accepts user's OpenAI API key in request body. |

Both functions have `verify_jwt = false` in `supabase/config.toml` and handle CORS internally.

### Database Schema (PostgreSQL via Supabase)

| Table | Description |
|-------|-------------|
| `profiles` | User profile (synced from auth) |
| `google_connections` | Encrypted OAuth tokens |
| `ads_accounts` | User's Google Ads accounts with `is_selected` flag |
| `reports_cache` | Cached report payloads (JSONB) |
| `user_ai_settings` | OpenAI API key and preferred model per user (RLS enforced) |

## Authentication Flow

```
1. User clicks "Login with Google"
2. Google OAuth redirect (scope: https://www.googleapis.com/auth/adwords)
3. Supabase Auth handles callback
4. Provider token stored in sessionStorage
5. Token passed to edge functions for Google Ads API calls
```

## Key Contexts

### AuthContext (`src/contexts/AuthContext.tsx`)
- Manages Google OAuth flow via Supabase
- Stores provider token in sessionStorage
- Provides `user`, `session`, `loading` state

### DashboardContext (`src/contexts/DashboardContext.tsx`)
- Manages selected Google Ads account
- Handles date range presets (Last 7 days, Last 30 days, etc.)
- Calculates previous period for comparison
- Provides metrics data to dashboard components

## UI Component Guidelines

- **shadcn/ui components** in `src/components/ui/` should NOT be edited directly
- To modify shadcn components, regenerate via the shadcn CLI
- **Dashboard components** in `src/components/dashboard/` are project-specific and can be modified

## Testing

- Framework: Vitest with jsdom environment
- Setup file: `src/test/setup.ts`
- Pattern: `src/**/*.{test,spec}.{ts,tsx}`
- Testing Library: `@testing-library/react`, `@testing-library/jest-dom`

## TypeScript Configuration

- `tsconfig.app.json`: Application code (strict mode **OFF**)
- `tsconfig.node.json`: Vite config (strict mode **ON**)

## Code Conventions

1. **No comments** in code unless explicitly requested
2. Use `@/` path alias for imports from `src/`
3. Follow existing patterns in the codebase
4. Use React Hook Form + Zod for form validation
5. Use TanStack React Query for server state management
6. Style with Tailwind CSS classes; use `cn()` for conditional merging

## Common Tasks

### Adding a new dashboard page

1. Create component in `src/pages/dashboard/`
2. Add entry to `navItems` array in `src/config/navigation.ts`
3. Add route in `src/App.tsx` under `/dashboard` path
4. Add report type to `ReportType` in `src/hooks/useGoogleAdsReport.ts` if data fetching is needed

### Adding a new UI component

```bash
npx shadcn-ui@latest add <component-name>
```

### Modifying Google Ads API calls

- Edge functions are in `supabase/functions/`
- Deploy with: `supabase functions deploy <function-name>`

## Environment Variables

Required for Supabase Edge Functions:
- `GOOGLE_ADS_DEVELOPER_TOKEN` - Google Ads API developer token
- `OPENAI_API_KEY` - OpenAI API key (optional, users can provide their own)

Required for Frontend (via Supabase client):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Security Notes

- Never expose secrets in client-side code
- User OpenAI API keys are stored encrypted in `user_ai_settings` table
- RLS (Row Level Security) is enabled on all user-specific tables
- Google OAuth tokens are stored encrypted in `google_connections` table
