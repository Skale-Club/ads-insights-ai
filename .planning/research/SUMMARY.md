# Research Synthesis

**Project:** Ads Insights AI  
**Synthesized:** 2026-03-31

---

## Executive Summary

**Ads Insights AI** is a Google Ads analytics platform providing campaign management, performance visualization, and AI-powered insights. The research confirms the current stack (React 18 + TypeScript + Supabase + TanStack React Query + Recharts) is well-suited for this domain, with recommended enhancements focused on upgrading dependencies and adopting the official Google Ads Node.js client for better type safety.

The platform operates in Layer 1-2 of the Google Ads analytics stack (reporting + optimization recommendations). Current table stakes features are well-implemented. Key gaps exist in proactive alerting (budget pacing, account health) and statistical ad testing. The architecture follows industry patterns correctly—OAuth tokens via sessionStorage, edge functions as API proxies, client-side caching with React Query.

**Critical risk:** Without addressing the 8 identified pitfalls in Foundation phase, the platform will fail at scale with rate limiting, data overload, and security vulnerabilities. The roadmap prioritizes infrastructure hardening before feature expansion.

---

## Key Findings

### Stack (STACK.md)

| Technology | Status | Recommendation |
|------------|--------|----------------|
| React 18.x | Stable | Stay until React 19 ecosystem matures |
| TanStack React Query | Current (5.83.0) | Upgrade to 5.95.x for security/performance |
| Supabase (Edge Functions) | Current | Follow Deno best practices |
| Recharts | Current | Sufficient for standard dashboards |
| @opteo/google-ads-api | Not yet used | Migrate from direct REST calls |
| shadcn/ui + Tailwind | In use | No changes needed |

**Key recommendation:** Migrate edge functions to use `@opteo/google-ads-api` for TypeScript-native client with automatic retry and rate limit handling.

### Features (FEATURES.md)

**Implemented (Table Stakes):**
- Google OAuth authentication
- Multi-account connection
- KPI dashboard, campaign tables, ad group/keyword/search term views
- Date range filtering, performance charts
- AI recommendations page

**Gaps (Differentiators to build):**
- Budget pacing alerts (medium complexity)
- Account health alerts (medium complexity)
- Enhanced AI chat with deeper Google Ads API integration

**Anti-Features to avoid:**
- Bulk campaign editing (use Google Ads Editor)
- Cross-platform management (Meta, Microsoft Ads)
- Automated bid execution (liability risk)

### Architecture (ARCHITECTURE.md)

**Patterns correctly implemented:**
- OAuth token relay via sessionStorage
- API proxy through edge functions
- Client-side caching with React Query
- Streaming AI responses via SSE

**Data flows work correctly:**
1. OAuth: sessionStorage → AuthContext → Edge Functions → Google Ads API
2. Reports: DashboardContext → useGoogleAdsReport → Edge Function → Google Ads API → React Query → UI
3. AI Chat: Chat Input → Edge Function → Gemini API (stream) → SSE → Chat UI

**Enhancement opportunities:**
- Add server-side caching layer
- Implement request batching for Google Ads API
- Add retry with exponential backoff

### Pitfalls (PITFALLS.md)

**Critical pitfalls to address in Foundation phase:**

| # | Pitfall | Impact | Phase |
|---|---------|--------|-------|
| 1 | Ignoring API rate limits | Dashboard timeouts | Foundation |
| 2 | OAuth tokens in sessionStorage | XSS account takeover | Foundation |
| 3 | No error boundaries | Blank screen crashes | Foundation |
| 4 | No pagination | Memory exhaustion | Foundation |
| 5 | Silent API failures | Users don't know errors | Foundation |
| 6 | No retry logic | Single network hiccup fails | Foundation |
| 7 | Data mismatch with Google Ads | Trust loss | Validation |
| 8 | No test coverage | Silent regressions | Foundation |

---

## Implications for Roadmap

### Suggested Phase Structure

#### Phase 1: Foundation (Infrastructure & Reliability)

**Rationale:** Address all 8 critical pitfalls before expanding features. Without this foundation, the platform fails at scale.

**Deliverables:**
- Implement API rate limiting with exponential backoff
- Add error boundaries to all dashboard components
- Implement pagination for all data tables (1000 record default)
- Add proper HTTP error status codes in edge functions
- Implement retry logic (3 attempts with backoff)
- Add test coverage for AuthContext, DashboardContext, useGoogleAdsReport
- Validate data alignment with Google Ads UI

**Pitfalls addressed:** #1, #3, #4, #5, #6, #8

**Duration:** 1-2 sprints

#### Phase 2: Alerting & Monitoring

**Rationale:** Differentiate from basic dashboards with proactive alerting. Low dependency on Foundation—can parallelize after infrastructure stabilizes.

**Deliverables:**
- Budget pacing alerts (over/under spend notifications)
- Account health alerts (broken URLs, quality score drops, budget overruns)
- Anomaly detection for unusual performance changes

**Features from FEATURES.md:** Budget pacing alerts, Account health alerts, Anomaly detection

**Duration:** 1-2 sprints

#### Phase 3: AI Enhancement

**Rationale:** Deepen the primary differentiator (AI chat) with richer Google Ads context.

**Deliverables:**
- Enhanced AI chat with campaign context in prompts
- Negative keyword discovery via AI
- Bid strategy recommendations via AI
- Tool definitions for Gemini to query specific report types

**Features from FEATURES.md:** AI-powered chat interface (enhanced), Automated optimization recommendations

**Duration:** 1-2 sprints

#### Phase 4: Validation & Polish

**Rationale:** Ensure data accuracy and polish UX before broader release.

**Deliverables:**
- "Validate against Google Ads" feature
- Timezone and attribution window documentation
- Empty states, loading skeletons, offline handling
- Performance tuning for large accounts

**Pitfalls addressed:** #7

**Duration:** 1 sprint

---

## Research Flags

### Needs Further Research

| Phase | Reason |
|-------|--------|
| Phase 2 (Alerting) | Notification delivery mechanism (email, push, in-app) needs specification |
| Phase 3 (AI) | Gemini tool definitions require deeper Google Ads API exploration |
| Phase 4 (Validation) | Attribution window handling needs Google Ads API documentation |

### Standard Patterns (Skip Research)

- React + Supabase + TanStack Query setup (well-documented)
- OAuth 2.0 flow via Supabase Auth (standard pattern)
- Recharts for standard dashboard charts (sufficient)

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Current stack validated; recommended upgrades are safe |
| Features | HIGH | Gaps identified align with competitive analysis |
| Architecture | HIGH | Current implementation follows documented patterns correctly |
| Pitfalls | HIGH | Comprehensive coverage from Google Ads API docs |

**Gaps to address during planning:**

1. Notification delivery mechanism for alerting features not specified
2. Specific anomaly detection algorithms not researched
3. Statistical ad testing complexity requires user feedback before inclusion

---

## Sources

- TanStack Query v5.95.2 (official npm, March 2026)
- Google Ads API client libraries documentation
- @opteo/google-ads-api npm package (v23.0.0, Jan 2026)
- Supabase Edge Functions documentation (March 2026)
- SegmentStream: "10 Best Google Ads Reporting & Analytics Tools (2026)"
- Optmyzr: "Find the Best Google Ads Tool in 2026"
- Google Ads API Best Practices & Rate Limits documentation
- Current codebase analysis (navigation.ts, dashboard pages, contexts)
