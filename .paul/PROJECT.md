# Ads Insights AI

## What This Is

A multi-platform web application for managing and analyzing paid advertising campaigns with AI-powered insights. Users connect their Google Ads and Meta Ads (Facebook/Instagram) accounts via OAuth, visualize performance metrics across both platforms, and receive intelligent recommendations powered by the Gemini API. A CLI session feature allows Claude Code in the terminal to read and mutate campaigns directly on behalf of the logged-in user.

## Core Value

Enable marketers to quickly understand their paid advertising performance across Google and Meta — and get AI-driven recommendations and terminal-level execution — to optimize campaigns without leaving their workflow.

## Current State

| Attribute | Value |
|-----------|-------|
| Type | Application |
| Version | 1.2.0 |
| Status | Production |
| Last Updated | 2026-04-08 |

## Requirements

### Core Features

- Google OAuth authentication via Supabase Auth
- **Platform selector**: Google Ads | Meta Ads toggle throughout the dashboard
- Google Ads account connection and account switching
- **Meta Ads (Facebook/Instagram)** account connection via custom OAuth
- Dashboard with KPI metrics per platform
- Campaign/ad performance visualization (charts and tables)
- AI chat interface for ad performance analysis (Gemini API) — platform-aware
- Campaign management per platform
- Recommendations page with AI-generated optimization suggestions
- CLI session — Claude Code terminal can read and mutate both Google Ads and Meta Ads
- **Company registration** — business profile required before connecting Meta Ads

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
- [x] google-ads-manager skill + full mutation coverage (adjustBid, updateCampaignBudget, createBudget) — v1.2
- [x] Dynamic queryAdsData server-side execution — v1.2
- [x] Standard Google Ads CLI workflows — v1.2
- [x] Human approval protocol for mutations — v1.2

### Active (In Progress)

- [ ] **META-01**: Company registration (business profile) — v1.3
- [ ] **META-02**: Meta OAuth + meta_connections + meta_accounts DB schema — v1.3
- [ ] **META-03**: Platform selector (Google | Meta) in TopBar — v1.3
- [ ] **META-04**: meta-reports edge function (overview, campaigns, adsets, ads, placements) — v1.3
- [ ] **META-05**: Meta dashboard panels (overview, campaigns, ad sets, ads) — v1.3
- [ ] **META-06**: Meta AI chat + meta-mutate edge function — v1.3
- [ ] **META-07**: ad-creative skill + Meta CLI workflows — v1.3

### Out of Scope

- Campaign creation from scratch (only management of existing)
- Multi-user teams / shared accounts
- Bid strategy automation without human approval
- TikTok / LinkedIn / Pinterest integrations (possible v1.4+)

## Constraints

### Technical Constraints

- React 18 + TypeScript + Supabase + Vite — locked stack
- Google Ads API v20 for Google data
- Meta Marketing API v20 for Meta data
- Gemini API for AI insights (platform-aware system prompts)
- Edge Functions run on Deno runtime
- Google provider token expires in ~1 hour (CLI sessions 2h)
- Meta long-lived access tokens expire in ~60 days (auto-refresh at < 7 days)
- Meta App requires Facebook App Review for `ads_management` scope (test users only in dev)

### Business Constraints

- All mutations require user's live OAuth token
- CLI access requires user to be actively logged in to the web app
- No background/scheduled mutations allowed
- Meta connection requires company profile first (Meta App Review compliance)

## Key Decisions

| Decision | Rationale | Date | Status |
|----------|-----------|------|--------|
| Supabase for backend | Auth + DB + Edge Functions in one | 2026-03-31 | Active |
| Gemini for AI | Powers chat + tool calling | 2026-03-31 | Active |
| CLI session via `session_token` UUID | Simple, revokable, secure without JWT | 2026-04-08 | Active |
| localStorage cache for reports | Avoids quota hits, survives page refresh | 2026-04-08 | Active |
| Meta OAuth as custom flow (not Supabase Auth) | Supabase doesn't support `ads_management` scope natively | 2026-04-08 | Proposed |
| Company registration required before Meta connect | Meta App Review compliance + future multi-user | 2026-04-08 | Proposed |
| Platform selector in TopBar (not separate routes) | Less refactoring, platform is a context switch not a navigation | 2026-04-08 | Proposed |

## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend | React 18 + TypeScript | Vite + SWC |
| UI | shadcn/ui + Tailwind CSS | Radix primitives |
| State | TanStack React Query + React Context | Server + client state |
| Backend | Supabase Edge Functions (Deno) | 8 functions (Google) + 4 planned (Meta) |
| Database | Supabase PostgreSQL | RLS on all tables |
| Auth | Supabase Auth + Google OAuth | Provider token for Ads API |
| Google Ads API | Google Ads API v20 | SearchStream + mutate |
| Meta Ads API | Meta Marketing API v20 | Insights + mutate |
| AI | Gemini API | Streaming, tool calling, platform-aware |

---
*PROJECT.md — Updated 2026-04-08 for v1.3 Meta Ads integration*
