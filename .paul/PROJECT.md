# Ads Insights AI

## What This Is

A web application for managing and analyzing Google Ads campaigns with AI-powered insights. Users connect their Google Ads accounts via Google OAuth, visualize performance metrics (impressions, clicks, CTR, CPC, conversions, cost), and receive intelligent recommendations powered by the Gemini API. A CLI session feature allows Claude Code in the terminal to read and mutate campaigns directly on behalf of the logged-in user.

## Core Value

Enable marketers to quickly understand their Google Ads performance and get AI-driven recommendations — and now terminal-level execution — to optimize campaigns without leaving their workflow.

## Current State

| Attribute | Value |
|-----------|-------|
| Type | Application |
| Version | 1.1.0 |
| Status | Production |
| Last Updated | 2026-04-08 |

## Requirements

### Core Features

- Google OAuth authentication via Supabase Auth
- Google Ads account connection and account switching
- Dashboard with KPI metrics (impressions, clicks, CTR, CPC, conversions, cost)
- Campaign performance visualization (charts and tables)
- AI chat interface for ad performance analysis (Gemini API)
- Campaign management (campaigns, ad groups, keywords, search terms, audiences, budgets, conversions)
- Recommendations page with AI-generated optimization suggestions
- CLI session — Claude Code terminal can read and mutate Google Ads on behalf of logged-in user

### Validated (Shipped)

- [x] Google OAuth + Supabase Auth — v1.0
- [x] Dashboard KPI metrics and charts — v1.0
- [x] Campaign/keyword/search term tables — v1.0
- [x] Gemini AI chat interface — v1.0
- [x] Audiences page (device, location, age, gender demographics) — v1.1
- [x] CLI session system (`.ads-cli-session.json` → `get-cli-session` edge function) — v1.1
- [x] localStorage report cache with 5-min TTL — v1.1
- [x] Zod request validation on all edge functions — v1.1
- [x] React error boundaries + offline detection — v1.1

### Active (In Progress)

- [ ] **CLI-01**: google-ads-manager skill integration — v1.2
- [ ] **CLI-02**: Full mutation coverage (adjustBid, updateCampaignBudget, createBudget) — v1.2
- [ ] **CLI-03**: Standard CLI workflows (audit, mine negatives, optimize bids, review ads) — v1.2
- [ ] **CLI-04**: Human-in-the-loop approval before destructive mutations — v1.2

### Out of Scope

- Campaign creation (only management of existing campaigns)
- Multi-user teams / shared accounts
- Bid strategy automation without human approval

## Constraints

### Technical Constraints

- React 18 + TypeScript + Supabase + Vite — locked stack
- Google Ads API v20 for all data
- Gemini API for AI insights
- Edge Functions run on Deno runtime
- Google provider token expires in ~1 hour (CLI sessions expire in 2h)
- `google-ads-mutate` currently only handles `updateCampaignStatus` and `addNegativeKeywords`

### Business Constraints

- All mutations require user's live Google OAuth token
- CLI access requires user to be actively logged in to the web app
- No background/scheduled mutations allowed

## Key Decisions

| Decision | Rationale | Date | Status |
|----------|-----------|------|--------|
| Supabase for backend | Auth + DB + Edge Functions in one | 2026-03-31 | Active |
| Gemini for AI | Powers chat + tool calling | 2026-03-31 | Active |
| CLI session via `session_token` UUID | Simple, revokable, secure without JWT | 2026-04-08 | Active |
| localStorage cache for reports | Avoids quota hits, survives page refresh | 2026-04-08 | Active |

## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend | React 18 + TypeScript | Vite + SWC |
| UI | shadcn/ui + Tailwind CSS | Radix primitives |
| State | TanStack React Query + React Context | Server + client state |
| Backend | Supabase Edge Functions (Deno) | 6 functions |
| Database | Supabase PostgreSQL | RLS on all tables |
| Auth | Supabase Auth + Google OAuth | Provider token for Ads API |
| Ads API | Google Ads API v20 | SearchStream + mutate |
| AI | Gemini API | Streaming, tool calling |

---
*PROJECT.md — imported from .planning/PROJECT.md + .planning/STATE.md on 2026-04-08*
