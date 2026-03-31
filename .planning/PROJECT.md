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

### Active

- [ ] User-defined Active requirements to be added

### Out of Scope

- [Exclusion to be added based on user direction]

## Context

**Technical Environment:**
- React 18 SPA with TypeScript
- Supabase BaaS (Auth, Database, Edge Functions)
- TanStack React Query for server state
- Google Ads API v18/v20
- Gemini API for AI insights

**Current State:**
- Authentication flow working (Google OAuth)
- Dashboard with metrics and charts functional
- AI chat interface implemented
- Multiple dashboard pages (Campaigns, AdGroups, Keywords, etc.)
- Edge functions for Google Ads API integration

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

*Last updated: 2026-03-31 after initialization*