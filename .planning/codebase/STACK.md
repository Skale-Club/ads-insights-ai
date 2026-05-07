# Technology Stack

**Analysis Date:** 2026-05-06

## Languages

**Primary:**
- TypeScript 5.8.3 - React application code in `src/`, Vite config in `vite.config.ts`, Vitest config in `vitest.config.ts`, and Supabase Edge Functions in `supabase/functions/`.
- TSX - React page, context, hook, and component files under `src/pages/`, `src/components/`, `src/contexts/`, and `src/hooks/`.

**Secondary:**
- JavaScript ES modules - Tooling configuration in `eslint.config.js` and `postcss.config.js`.
- SQL - Supabase PostgreSQL migrations in `supabase/migrations/`.
- TOML - Supabase local/service configuration in `supabase/config.toml`.
- CSS - Tailwind entrypoint and CSS variable theme in `src/index.css`.

## Runtime

**Environment:**
- Node.js - Frontend development, test, lint, and production build runtime for Vite scripts in `package.json`.
- Browser ES2020+ - Client app target from `tsconfig.app.json` with DOM and DOM.Iterable libraries.
- Deno - Supabase Edge Functions runtime, using `serve` from `https://deno.land/std@0.168.0/http/server.ts` in `supabase/functions/*/index.ts`.
- Supabase local stack - API on `54321`, database on `54322`, and Studio on `54323` from `supabase/config.toml`.

**Package Manager:**
- npm - Primary package manager through `package-lock.json` lockfile version 3 and scripts in `package.json`.
- Bun - Supported by committed `bun.lockb`.
- Lockfile: `package-lock.json` present, `bun.lockb` present.

## Frameworks

**Core:**
- React 18.3.1 - Frontend UI runtime, mounted from `src/main.tsx` and composed in `src/App.tsx`.
- React Router DOM 6.30.1 - Browser routing and protected dashboard/settings routes in `src/App.tsx`.
- Supabase 2.94.0 - Auth, PostgreSQL access, and Edge Function invocation through `src/integrations/supabase/client.ts`.
- TanStack React Query 5.83.0 - Server state and report fetching in `src/hooks/useGoogleAdsReport.ts`, `src/hooks/useMetaReport.ts`, and app-level defaults in `src/App.tsx`.

**UI Components:**
- shadcn/ui - Component conventions configured by `components.json`, with primitives in `src/components/ui/`.
- Radix UI - Underlying component primitives, including dialog, dropdown, select, tabs, toast, tooltip, accordion, avatar, checkbox, popover, progress, radio group, scroll area, separator, slider, switch, and toggle packages from `package.json`.
- Tailwind CSS 3.4.17 - Styling system configured in `tailwind.config.ts`, `postcss.config.js`, and `src/index.css`.
- class-variance-authority 0.7.1 - Variant styling for reusable components.
- tailwind-merge 2.6.0 and clsx 2.1.1 - Class composition through helpers such as `src/lib/utils.ts`.
- lucide-react 0.462.0 - Icon set used throughout settings and dashboard components.

**AI and Chat:**
- Google Gemini API - Direct HTTP integration from `supabase/functions/analyze-ads/index.ts` and `supabase/functions/process-attachment/index.ts`.
- Vercel AI SDK packages `ai` 6.0.142 and `@ai-sdk/react` 3.0.144 - Optional client chat transport in `src/hooks/use-chat-v2.ts`; feature flag `features.aiSdk` is currently `false` in `src/config/features.ts`.
- react-markdown 10.1.0 and remark-gfm 4.0.1 - Markdown rendering dependencies for chat/output surfaces.

**Forms and Validation:**
- React Hook Form 7.61.1 - Form state in settings components such as `src/components/settings/CompanySection.tsx` and `src/components/settings/AISettingsCard.tsx`.
- Zod 3.25.76 - Frontend validation dependency and Deno edge request validation via `npm:zod@3.22.4` in Supabase functions.
- @hookform/resolvers 3.10.0 - Hook form schema resolver dependency.

**Data and Visualization:**
- Recharts 2.15.4 - Dashboard charting dependency used by performance visualization components.
- @tanstack/react-table 8.21.3 - Table abstraction dependency for data-heavy dashboard views.
- date-fns 3.6.0 - Date range formatting and calculations in report hooks.
- xlsx 0.18.5 - Spreadsheet import/export support for reports and attachments.

**Testing:**
- Vitest 3.2.4 - Test runner configured in `vitest.config.ts`.
- jsdom 20.0.3 - DOM test environment configured in `vitest.config.ts`.
- @testing-library/react 16.0.0 - React component testing.
- @testing-library/jest-dom 6.6.0 - DOM matchers loaded from `src/test/setup.ts`.

**Build/Dev:**
- Vite 5.4.19 - Dev server and build tool configured in `vite.config.ts`.
- @vitejs/plugin-react-swc 3.11.0 - React fast refresh and SWC transform plugin in `vite.config.ts` and `vitest.config.ts`.
- TypeScript compiler - App project configured by `tsconfig.app.json`; Node/tooling project configured by `tsconfig.node.json`.
- ESLint 9.32.0 with `typescript-eslint` 8.38.0 - Flat config in `eslint.config.js`.
- Autoprefixer 10.4.21 and PostCSS 8.5.6 - CSS processing through `postcss.config.js`.

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` 2.94.0 - Required for client auth/session state, database reads/writes, and Edge Function calls in `src/integrations/supabase/client.ts`.
- `@tanstack/react-query` 5.83.0 - Required for Google and Meta report fetching/caching hooks in `src/hooks/useGoogleAdsReport.ts` and `src/hooks/useMetaReport.ts`.
- `react-router-dom` 6.30.1 - Required for public, protected, dashboard, settings, and Meta dashboard routes in `src/App.tsx`.
- `zod` 3.25.76 - Required for request validation patterns mirrored in edge functions.
- `ai` 6.0.142 and `@ai-sdk/react` 3.0.144 - Present for the alternate AI SDK chat path in `src/hooks/use-chat-v2.ts`.

**Infrastructure:**
- `@vercel/analytics` 1.6.1 - Frontend analytics rendered as `<Analytics />` in `src/App.tsx`.
- `vite` 5.4.19 - Production build and local dev server.
- `vitest` 3.2.4 - Automated test runner.
- `eslint` 9.32.0 - Linting through `npm run lint`.
- Supabase Edge Function remote imports - Deno functions import `std@0.168.0`, `@supabase/supabase-js@2` from `esm.sh`, and `zod@3.22.4` from npm specifiers.

## Configuration

**Environment:**
- Frontend environment variables are read through Vite `import.meta.env` in `src/integrations/supabase/client.ts`.
- Frontend required variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Supabase Auth Google provider uses `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `supabase/config.toml`.
- Google Ads Edge Functions require `GOOGLE_ADS_DEVELOPER_TOKEN`; `GOOGLE_ADS_LOGIN_CUSTOMER_ID` is optional for MCC access.
- Meta Edge Functions use `META_APP_ID`, `META_APP_SECRET`, `META_REDIRECT_URI`, `SITE_URL`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`.
- Supabase runtime functions also use `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SB_REGION` in selected functions.
- `.env` and `.env.example` are present; contents were not read.

**Build:**
- `vite.config.ts` - Vite dev server on host `::`, port `8000`, HMR overlay disabled, React SWC plugin, and `@` alias to `./src`.
- `vitest.config.ts` - Vitest jsdom setup, global test APIs, `src/test/setup.ts`, and `src/**/*.{test,spec}.{ts,tsx}` include pattern.
- `tsconfig.json` - TypeScript project references.
- `tsconfig.app.json` - Application TypeScript config with strict mode disabled and `@/*` path mapping.
- `tsconfig.node.json` - Node/tooling TypeScript config with strict mode enabled.
- `tailwind.config.ts` - shadcn-compatible CSS variable theme, content globs for `src/`, and typography/animation plugins.
- `components.json` - shadcn aliases for `@/components`, `@/components/ui`, `@/lib`, and `@/hooks`.
- `eslint.config.js` - ESLint flat config for TypeScript and TSX, React Hooks rules, React Refresh warnings, and unused vars disabled.
- `supabase/config.toml` - Local ports, Google auth provider, and `verify_jwt = false` for all listed Edge Functions.

## Platform Requirements

**Development:**
- Install dependencies with npm or Bun using `package.json`, `package-lock.json`, or `bun.lockb`.
- Run frontend dev server with `npm run dev`; Vite listens on `http://localhost:8000` from `vite.config.ts`.
- Run production build with `npm run build`; development mode build with `npm run build:dev`.
- Run lint with `npm run lint`.
- Run tests with `npm run test` or `npm run test:watch`.
- Use Supabase CLI for local database/functions when working under `supabase/`.
- Configure Supabase frontend variables before using auth or functions; otherwise `src/integrations/supabase/client.ts` creates a mock auth client.

**Production:**
- Frontend builds to static assets with Vite and is compatible with Vercel analytics.
- Backend runs on Supabase hosted PostgreSQL, Auth, and Edge Functions.
- Edge Functions are Deno functions deployed from `supabase/functions/`.
- Google Ads API access requires a valid Google OAuth provider token plus developer token.
- Meta Marketing API access requires a configured Meta App and long-lived user access token.
- Gemini and Google Speech requests use a user-provided API key passed to Edge Functions from the app.

---

*Stack analysis: 2026-05-06*
