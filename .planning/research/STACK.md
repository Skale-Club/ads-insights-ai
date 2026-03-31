# Technology Stack

**Project:** Ads Insights AI
**Researched:** 2026-03-31
**Confidence:** HIGH

## Recommendation Summary

The current stack (React 18 + TypeScript + Supabase + TanStack React Query + Recharts) is well-suited for Google Ads analytics. Recommended enhancements focus on keeping versions current, adopting React 19 when stable, and using the official Google Ads Node.js client for better API integration.

## Current Stack Assessment

| Layer | Current | Status | Recommendation |
|-------|---------|--------|----------------|
| Frontend Framework | React 18.3.1 | Stable | Monitor React 19 upgrade path |
| State Management | TanStack React Query v5.83.0 | Current | Keep updated |
| Backend | Supabase (Edge Functions/Deno) | Current | Follow Supabase best practices |
| Charts | Recharts 2.15.4 | Current | Evaluate alternatives for complex viz |
| AI Integration | Gemini API | Current | Consider OpenAI for broader ecosystem |

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React | 18.x (or 19.x when stable) | UI library | Current is solid; React 19 offers compiler but adds migration complexity. Stay on 18.x until ecosystem stabilizes. |
| TypeScript | 5.8+ | Type safety | Already in use; continue with current strict mode configuration |
| Vite | 5.4.x | Build tool | Already in use; SWC plugin provides fast HMR |

**Recommendation:** Stay on React 18.x for stability. React 19's compiler (React Compiler) offers automatic optimization but requires careful migration. Evaluate in Q3 2026.

### Server State Management

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| TanStack React Query | 5.95.x | Server state | Already in use; v5 is production stable. Key patterns for analytics: |

- **Stale Time:** Set `staleTime: 5 * 60 * 1000` (5 min) for Google Ads reports — data doesn't change rapidly
- **Cache Time:** `cacheTime: 30 * 60 * 1000` (30 min) for user navigation within sessions
- **Refetch on Window Focus:** Keep enabled for real-time awareness when user returns to tab
- **Placeholder Data:** Use for dashboard skeletons during loading

**Source:** TanStack Query v5.95.2 (March 2026), official docs and best practices guides.

### Data Visualization

| Technology | Version | Purpose | When to Use |
|------------|---------|---------|-------------|
| Recharts | 2.15.x | Primary charting | Default for standard dashboards — declarative JSX, good TypeScript support |
| Chart.js (react-chartjs-2) | 4.x | Alternative | When needing canvas-based rendering for high-volume data |
| D3.js | 7.x | Custom visualizations | Only if building highly custom visualizations Recharts can't handle |

**Recommendation:** Recharts is sufficient for current use cases (line charts, bar charts, area charts). If performance issues emerge with large datasets (>1000 data points), consider Chart.js for canvas-based rendering.

**Source:** PkgPulse React Charting 2026 comparison — Recharts leads for React dashboards due to declarative API.

### Google Ads API Integration

| Technology | Purpose | Why |
|------------|---------|-----|
| @opteo/google-ads-api | Node.js client library | Official community library (150K+ weekly downloads); TypeScript-native; actively maintained |
| REST API (direct) | Alternative | Use only if needing minimal dependencies; client library provides better DX |

**Recommendation:** Use `@opteo/google-ads-api` (npm: `google-ads-api`) for Edge Functions. Benefits:

- TypeScript types included (no manual type definitions)
- Automatic retry with exponential backoff for rate limiting
- Structured error handling aligned with Google Ads API errors
- Query builder for GAQL (Google Ads Query Language)

**Current Gap:** The existing codebase uses direct REST calls in Edge Functions. Migrating to the client library would improve type safety and maintainability.

**Source:** Google Ads API official documentation, npm registry (google-ads-api v23.0.0, published Jan 2026).

### Forms & Validation

| Technology | Version | Purpose | Status |
|------------|---------|---------|--------|
| React Hook Form | 7.61.x | Form handling | Already in use |
| Zod | 3.25.x | Schema validation | Already in use |

**Status:** Adequate for current needs. No changes recommended.

### UI Components

| Technology | Version | Status |
|------------|---------|--------|
| shadcn/ui | Latest | Already in use — good |
| Tailwind CSS | 3.4.x | Already in use — keep updated |
| Radix UI | Latest via shadcn | Already in use — good |

**Status:** No changes needed. shadcn/ui + Tailwind is the recommended pattern for React dashboards in 2026.

### Backend

| Technology | Purpose | Recommendation |
|------------|---------|----------------|
| Supabase | BaaS (Auth, DB, Edge Functions) | Keep — excellent for this use case |
| Edge Functions (Deno) | API proxy | Follow Deno best practices (see below) |

**Edge Functions Best Practices (2026):**

- **Dependencies:** Use ESM imports from `npm:` specifier or JSR. Avoid bundling unused dependencies — 20MB bundle limit.
- **Cold Starts:** Minimize top-level await; defer heavy initialization
- **Testing:** Use Deno's built-in test runner (`deno test`)
- **Secrets:** Use Supabase secrets management, not hardcoded values
- **Error Handling:** Return proper HTTP status codes; log structured errors

**Source:** Supabase Edge Functions documentation (updated March 2026).

---

## Alternatives Considered

| Category | Current | Alternative | Why Not |
|----------|---------|-------------|---------|
| Charts | Recharts | Tremor | Tremor is React-only but less mature; Recharts has larger ecosystem |
| State | React Query | SWR | Both excellent; React Query's mutations are better for analytics with write operations |
| Backend | Supabase | Firebase | Supabase's PostgreSQL is better for analytics queries; RLS more intuitive |
| AI | Gemini | OpenAI | Gemini works; OpenAI has broader third-party integration ecosystem |

---

## Version Updates Needed

| Package | Current | Recommended | Reason |
|---------|---------|-------------|--------|
| @tanstack/react-query | 5.83.0 | 5.95.x | Security fixes, performance improvements |
| react | 18.3.1 | Stay on 18.x | Wait for React 19 ecosystem maturity |
| recharts | 2.15.4 | 2.15.x (latest) | Bug fixes |
| date-fns | 3.6.0 | Stay | Current is fine |

---

## What NOT to Use and Why

| Technology | Reason |
|------------|--------|
| Redux Toolkit | Overkill for this use case — React Query handles server state, Context handles client state. Adding Redux adds unnecessary complexity without benefit. |
| Apollo Client | React Query is better suited for REST API (Google Ads) — Apollo is optimized for GraphQL. |
| Material UI (MUI) | Heavy bundle size; conflicts with Tailwind/shadcn pattern already in use. |
| styled-components | Not needed — Tailwind CSS provides all styling capability. |
| Jest (instead of Vitest) | Already using Vitest — keep it. Faster and more modern. |
| MongoDB (instead of PostgreSQL) | PostgreSQL (via Supabase) is better for analytics queries with aggregation; schema is well-defined for Google Ads data. |

---

## Installation Guidance

```bash
# Update critical dependencies
npm install @tanstack/react-query@latest @tanstack/react-query-devtools@latest

# For Edge Functions (if migrating to client library)
# In supabase/functions/ directory:
deno add npm:google-ads-api

# Keep UI dependencies current
npm install lucide-react@latest date-fns@latest
```

---

## Sources

- TanStack Query v5.95.2 (official npm, March 2026)
- Google Ads API client libraries documentation (developers.google.com)
- @opteo/google-ads-api npm package (v23.0.0, Jan 2026)
- Supabase Edge Functions documentation (March 2026)
- PkgPulse React Charting Libraries 2026 comparison
- React 19 vs React 18 comparison articles (2026)