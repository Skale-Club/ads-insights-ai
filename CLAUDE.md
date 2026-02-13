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
