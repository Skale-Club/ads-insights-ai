# Technology Stack

**Analysis Date:** 2026-03-31

## Languages

**Primary:**
- TypeScript 5.8.3 - Frontend application code
- JavaScript (ES2020) - ESLint configuration

**Backend:**
- TypeScript/Deno - Supabase Edge Functions (runtime: Deno)

## Runtime

**Environment:**
- Node.js - Frontend build and development
- Deno - Supabase Edge Functions runtime

**Package Manager:**
- npm - Primary package manager
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- React 18.3.1 - UI library
- React Router v6.30.1 - Client-side routing

**UI Components:**
- shadcn/ui - Component library built on Radix UI primitives
- Tailwind CSS 3.4.17 - Utility-first CSS framework
- class-variance-authority 0.7.1 - Component variants
- tailwind-merge 2.6.0 - Tailwind class merging

**State Management:**
- TanStack React Query v5.83.0 - Server state management
- React Context - Client state (Auth, Dashboard)

**Forms:**
- React Hook Form 7.61.1 - Form handling
- Zod 3.25.76 - Schema validation

**Data Visualization:**
- Recharts 2.15.4 - Charting library

**Build/Dev:**
- Vite 5.4.19 - Build tool (uses SWC for fast HMR)
- @vitejs/plugin-react-swc 3.11.0 - React plugin for Vite

**Testing:**
- Vitest 3.2.4 - Test runner
- @testing-library/react 16.0.0 - React component testing
- jsdom 20.0.3 - DOM environment for tests

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.94.0 - Supabase client library
- lucide-react 0.462.0 - Icon library
- date-fns 3.6.0 - Date manipulation
- xlsx 0.18.5 - Excel file export

**Infrastructure:**
- @vercel/analytics 1.6.1 - Analytics tracking

**Radix UI Primitives (shadcn/ui):**
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

**Utilities:**
- clsx 2.1.1 - Conditional class names
- tailwind-merge 2.6.0 - Tailwind class merging
- next-themes 0.3.0 - Theme management

## Configuration

**Environment:**
- Environment variables via `.env.local` or Vite env prefixed with `VITE_`
- Key vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

**Build:**
- `vite.config.ts` - Vite configuration with path aliases
- `tsconfig.json` - TypeScript project references
- `tailwind.config.ts` - Tailwind configuration
- `postcss.config.js` - PostCSS for Tailwind
- `eslint.config.js` - ESLint flat config

**TypeScript:**
- `tsconfig.app.json` - Application code (strict mode OFF)
- `tsconfig.node.json` - Build config (strict mode ON)
- Path alias: `@/` maps to `./src/`

## Platform Requirements

**Development:**
- Node.js 18+
- npm or Bun for package management
- Supabase CLI (for local edge function development)

**Production:**
- Browser support: Modern browsers (ES2020+)
- Supabase hosted infrastructure
- Google Ads API access

---

*Stack analysis: 2026-03-31*
