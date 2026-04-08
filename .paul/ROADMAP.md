# Roadmap: Ads Insights AI

## Milestones

| Version | Name | Phases | Status | Completed |
|---------|------|--------|--------|-----------|
| v1.0 | MVP | 1–4 | ✅ Shipped | 2026-03-31 |
| v1.1 | Audiences Fix + CLI Session | 5 | ✅ Shipped | 2026-04-08 |
| v1.2 | google-ads-manager Skill Integration | 6–9 | ✅ Shipped | 2026-04-08 |
| v1.3 | Meta Ads Integration | 10–14 | 🚧 In Progress | - |

---

## 🚧 Active Milestone: v1.3 — Meta Ads Integration

**Goal:** Add full Meta Ads (Facebook/Instagram) management to the platform alongside Google Ads. Users select their platform (Google | Meta) at the top of the dashboard. New panel suite covers campaigns, ad sets, ads, and AI chat. CLI session and workflow system mirrors what exists for Google.

**Status:** Phase 10 — Planning
**Progress:** [░░░░░░░░░░] 0%

---

### Phase 10: Foundation — Company Registration + Meta OAuth + DB Schema

**Goal:** Lay the infrastructure for Meta: database schema, OAuth flow, company profile, and the platform selector UI. No dashboard panels yet — just the ability to connect a Meta account.
**Depends on:** v1.2 (platform already has Google Ads working)
**Research:** Required — Meta OAuth v20, long-lived token exchange, Business Manager API

**Scope:**
- `companies` table: user-owned business profile (name, CNPJ, website, vertical). Required before connecting Meta Ads.
- `meta_connections` table: encrypted long-lived Meta access tokens (60-day TTL, refreshable)
- `meta_accounts` table: Meta Ad Accounts linked to user (account_id, account_name, currency, is_selected)
- `meta-auth` edge function: handles the Meta OAuth redirect (code → short-lived token → long-lived token → store in DB)
- `meta-accounts` edge function: lists ad accounts via `GET /me/adaccounts`
- Company registration form in Settings page
- "Connect Meta Ads" wizard in Settings (OAuth button → redirect → callback → account select)
- Platform selector in TopBar: Google Ads | Meta Ads toggle
- DashboardContext: add `platform: 'google' | 'meta'` + `metaAccounts` + `selectedMetaAccount`
- Route guard: Meta pages redirect to onboarding if no Meta account connected

**Plans:**
- [ ] 10-01: DB schema (companies, meta_connections, meta_accounts) + migrations
- [ ] 10-02: meta-auth + meta-accounts edge functions
- [ ] 10-03: Company registration UI + Meta OAuth connect wizard + platform selector

---

### Phase 11: Meta Reports Edge Function

**Goal:** Create `meta-reports` edge function that fetches real data from Meta Marketing API v20 — the data backbone for all Meta dashboard panels.
**Depends on:** Phase 10 (meta_connections table must exist with valid tokens)
**Research:** Unlikely (Marketing API v20 patterns well-documented)

**Scope:**
- `meta-reports` Deno edge function with Zod validation
- Report types:
  - `overview` — account-level totals (spend, reach, impressions, clicks, CTR, CPC, ROAS, conversions)
  - `campaigns` — campaign list with status, objective, budget, results, ROAS
  - `adsets` — ad set list with targeting summary, budget, schedule, performance
  - `ads` — ad list with creative preview fields (title, body, image_url), status, CTR, ROAS
  - `insights_by_placement` — performance breakdown by placement (Feed, Stories, Reels, Audience Network)
  - `daily_performance` — day-by-day spend + results for charting
- Date range parameters (startDate/endDate) with same format as google-ads-reports
- Token refresh: if `meta_connections.expires_at < now + 7 days`, trigger token refresh automatically
- Add to supabase/config.toml with `verify_jwt = false`

**Plans:**
- [ ] 11-01: meta-reports edge function (all 6 report types)

---

### Phase 12: Meta Dashboard Panels

**Goal:** Build the complete Meta Ads UI — overview, campaigns, ad sets, ads panels — behind the Meta platform selector.
**Depends on:** Phase 11 (meta-reports must return real data)
**Research:** Unlikely (mirrors Google Ads panels with Meta-specific metrics)

**Scope:**
- Platform-aware routing: when `platform === 'meta'`, sidebar shows Meta nav; pages load Meta data
- Sidebar: conditional nav items per platform (Meta-specific: Ad Sets, Ads — no Keywords/Search Terms)
- `pages/dashboard/meta/OverviewPage.tsx` — KPI cards (Spend, Reach, Impressions, CPM, CTR, CPC, ROAS, Conversions) + daily spend chart + placement breakdown
- `pages/dashboard/meta/CampaignsPage.tsx` — campaign table (name, status, objective, budget type/amount, results, cost/result, ROAS)
- `pages/dashboard/meta/AdSetsPage.tsx` — ad set table (name, status, targeting summary, budget, schedule, impressions, CTR, ROAS)
- `pages/dashboard/meta/AdsPage.tsx` — ads table (thumbnail, headline, body preview, status, impressions, CTR, CPC, ROAS)
- `hooks/useMetaReport.ts` — React Query hook mirroring `useGoogleAdsReport`, with localStorage cache
- Route additions in App.tsx: `/dashboard/meta/overview`, `/dashboard/meta/campaigns`, `/dashboard/meta/adsets`, `/dashboard/meta/ads`
- Redirect `/dashboard` to platform-appropriate overview when platform changes

**Plans:**
- [ ] 12-01: Platform-aware routing + Sidebar + useMetaReport hook
- [ ] 12-02: MetaOverviewPage (KPIs + charts)
- [ ] 12-03: MetaCampaignsPage + MetaAdSetsPage + MetaAdsPage

---

### Phase 13: Meta AI Chat + Mutations + Creative Skill

**Goal:** Enable AI chat for Meta campaigns and add mutation capabilities (pause/enable, budget update). Install `ad-creative` skill for cross-platform creative intelligence.
**Depends on:** Phase 11 (data available for context), Phase 12 (UI complete)
**Research:** Unlikely (mirrors Google analyze-ads + mutate patterns)

**Scope:**
- Install `ad-creative` skill: `npx skills add https://skills.sh/coreyhaines31/marketingskills --skill ad-creative`
- `meta-mutate` edge function:
  - `pauseCampaign` — POST to `/{campaign_id}?status=PAUSED`
  - `enableCampaign` — POST to `/{campaign_id}?status=ACTIVE`
  - `updateDailyBudget` — PATCH `/{adset_id}?daily_budget=X`
  - `updateLifetimeBudget` — PATCH `/{campaign_id}?lifetime_budget=X`
- Update `analyze-ads` to accept `platform: 'meta'` in request and switch:
  - System prompt (Meta-specific: ROAS/CPM/placement focus vs. keyword/QS for Google)
  - Tool definitions (Meta tools: queryMetaData, pauseCampaign, updateBudget, adjustAdSetBid)
  - `queryMetaData` resolved server-side via `meta-reports` (same pattern as `queryAdsData`)
- Add meta-mutate to supabase/config.toml

**Plans:**
- [ ] 13-01: Install ad-creative skill + meta-mutate edge function
- [ ] 13-02: Update analyze-ads for Meta platform support + Meta tool execution

---

### Phase 14: Meta CLI Session + Workflows

**Goal:** Extend the CLI session system to Meta Ads so Claude Code can read and mutate Meta campaigns from the terminal.
**Depends on:** Phase 13 (mutations must exist before CLI workflows)
**Research:** Unlikely (mirrors Google Ads CLI session pattern exactly)

**Scope:**
- `get-meta-cli-session` edge function: same pattern as `get-cli-session` but reads from `meta_connections`
- `MetaClaudeCodeSection.tsx` in Settings: activate/revoke Meta CLI session (separate from Google)
- `.ads-meta-cli-session.json` config file (gitignored)
- `.claude/meta-ads-cli.md` — full CLI guide for Meta (curl examples for meta-reports + meta-mutate)
- `.claude/workflows/meta-ads.md` — 5 standard Meta workflows:
  - Campaign Performance Audit
  - Creative Fatigue Detection (ads running > 14 days with declining CTR)
  - Audience Overlap Analysis
  - Budget Pacing Review
  - Weekly Meta Performance Report
- Human approval protocol applied to Meta mutations (same pattern as Google)

**Plans:**
- [ ] 14-01: get-meta-cli-session edge function + MetaClaudeCodeSection UI
- [ ] 14-02: meta-ads-cli.md + workflows/meta-ads.md

---

## ✅ Completed Milestones

<details>
<summary>v1.2 google-ads-manager Skill Integration (Phases 6–9) — Shipped 2026-04-08</summary>

- Phase 6: Skill install + adjustBid + updateCampaignBudget + createBudget
- Phase 7: Dynamic queryAdsData (server-side Gemini tool execution)
- Phase 8: Standard CLI workflows (5 workflows)
- Phase 9: Human approval loop protocol

</details>

<details>
<summary>v1.0 MVP (Phases 1–4) — Shipped 2026-03-31</summary>

- Phase 1: Foundation (auth, accounts, dashboard)
- Phase 2: Data layer (campaign/keyword/search term tables)
- Phase 3: AI chat interface
- Phase 4: Reliability + enhancements

</details>

<details>
<summary>v1.1 Audiences Fix + CLI Session — Shipped 2026-04-08</summary>

- Phase 5: Fix audiences page demographics + add CLI session system

</details>

---
*Last updated: 2026-04-08*
