# Ads Insights AI

## What This Is

A web application for managing and analyzing Google Ads campaigns with AI-powered insights. It enables users to connect their Google Ads accounts via OAuth, visualize performance metrics (impressions, clicks, CTR, CPC, conversions, cost), and receive intelligent recommendations powered by OpenAI/Gemini.

## Core Value

Enable marketers to quickly understand their Google Ads performance and get AI-driven recommendations to optimize campaigns — without leaving the dashboard.

## Requirements

### Validated

- ✓ Google OAuth authentication via Supabase Auth
- ✓ Google Ads account connection and account switching
- ✓ Dashboard with KPI metrics (impressions, clicks, CTR, CPC, conversions, cost)
- ✓ Campaign performance visualization (charts and tables)
- ✓ Date range filtering (presets: last 7/14/30/90 days, custom)
- ✓ AI chat interface for ad performance queries (via Gemini)
- ✓ Campaign management (view campaigns, ad groups, keywords, search terms)
- ✓ Recommendations page with AI-generated optimization suggestions

### v1.1 Active

- [ ] **AUD-01**: Audiences page fetches and displays audience data correctly
- [ ] **AUD-02**: Device demographics show device performance data
- [ ] **AUD-03**: Location demographics show geographic performance data

### Out of Scope

- [Exclusion to be added based on user direction]

## Context

**Technical Environment:**
- React 18 SPA with TypeScript
- Supabase BaaS (Auth, Database, Edge Functions)
- TanStack React Query for server state
- Google Ads API v18/v20
- Gemini API for AI insights

**Current State (v1.0 shipped):**
- All v1 features validated and working
- Phase 1-4 infrastructure enhancements complete
- Error handling, offline detection, retry logic
- Budget pacing and quality score alerts
- AI enhanced with bidding strategy and ad copy data
- Timezone and attribution window settings available

## Current State

**v1.0 MVP shipped:** 2026-03-31
- 4 phases complete, 4 plans executed
- All RELI, ALRT, AIEX, VALD requirements delivered
- Ready for production use

## Next Milestone Goals

**v1.1 (In Progress):** Audiences Page Fix
- Fix Audiences page to fetch data from Google Ads
- Show device demographics performance
- Show location demographics performance

## Constraints

- **Tech Stack**: React 18, TypeScript, Supabase, Vite — constrained by existing codebase
- **API**: Google Ads API v18/v20 required for data fetching
- **AI**: Gemini API (or OpenAI-compatible) for insights

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase for backend | Existing choice — provides Auth, DB, Edge Functions | ✓ Good |
| React Query for data fetching | Existing choice — handles caching, retries | ✓ Good |
| Gemini for AI | Existing choice — powers chat interface | ✓ Good |

---

*Last updated: 2026-03-31 for v1.1 milestone*