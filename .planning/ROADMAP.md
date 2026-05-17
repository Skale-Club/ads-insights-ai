# Roadmap: Ads Insights AI

## Milestones

- ✅ **v1.0 MVP** — 4 phases, 4 plans (shipped 2026-03-31) - see [.planning/milestones/v1.0-ROADMAP.md](./.planning/milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Audiences Fix** — Phase 5, 1 plan (shipped 2026-03-31) - see [.planning/milestones/v1.1-ROADMAP.md](./.planning/milestones/v1.1-ROADMAP.md)
- ⏳ **v1.2 Meta Ads Full Parity** — 3 phases planned

---

## Phase Details

### Next Milestone: v1.2 Meta Ads Full Parity

**Status:** In planning

**Vision:** Bring the Meta Ads side of the product to feature parity (and beyond) with Google Ads: complete dashboard pages mirroring Google's depth, full set of AI chat manipulation tools (create / edit / duplicate / batch / target / audience / creative / schedule / A/B), plus a polish pass to eliminate lint/type/integration debt accumulated during fast Meta wiring.

**Requirements:**
- M2-01: Meta dashboard pages must reach visual + functional parity with the Google Ads page set (Overview, Campaigns, AdSets/AdGroups, Ads, Audiences/Demographics, Placements, Conversions, Reports, Budgets)
- M2-02: AI chat must be able to perform the full Meta lifecycle (create / edit / duplicate / pause / enable / batch / targeting / audience / creative / schedule / A/B) with the same approval workflow used by Google mutations
- M2-03: System must be lint-clean, type-clean (where strict), and free of dead integration paths between Google and Meta
- M2-04: No regression in Google Ads features
- M2-05: No deploy of edge functions or DB migrations done by Claude — code only; user deploys when ready

### Phase 1: Meta Ads paineis completos - paridade visual com Google

**Goal:** Build the missing Meta dashboard pages to reach feature + visual parity with Google Ads. Reuse existing components (KpiCard, DataTable, PerformanceChart, etc.) and the existing `meta-reports` edge function. New pages: `/dashboard/meta/audiences` (audience + demographics breakdown), `/dashboard/meta/placements` (placement performance: feed / stories / reels / right column / messenger), `/dashboard/meta/conversions` (pixel events, conversion tracking, attribution windows), `/dashboard/meta/reports` (custom report builder + xlsx export), `/dashboard/meta/budgets` (campaign & ad set budgets with pacing). Extend `meta-reports` edge function with `audiences`, `placements`, `conversions`, `budgets` report types if not present. Wire new routes in App.tsx. Add nav entries in navigation config. Match Google dashboard styling exactly. No edge function deploy — code only.

**Requirements**: M2-01, M2-04, M2-05
**Depends on:** Phase 0
**Plans:** 7/8 plans executed

Plans:
- [x] 01-01-PLAN.md — Extend meta-reports edge function with 5 new report types (audiences, placements, conversions, pixel-events, budgets-detail)
- [x] 01-02-PLAN.md — Meta Audiences page (4-tab breakdown: age/gender, region, device, publisher)
- [x] 01-03-PLAN.md — Meta Placements page (grouped by publisher_platform)
- [x] 01-04-PLAN.md — Meta Conversions page (funnel + per-campaign + pixel events)
- [x] 01-05-PLAN.md — Meta Reports page (field selector + xlsx export)
- [x] 01-06-PLAN.md — Meta Budgets page (campaign + adset tabs with pacing bars)
- [x] 01-07-PLAN.md — Wire 5 new routes in App.tsx + nav entries in navigation.ts
- [ ] 01-08-PLAN.md — Build/lint check + human visual smoke verification

### Phase 2: Meta Ads chat tools - paridade total de manipulacao

**Goal:** Expand the AI chat's Meta tool set from 5 to the complete set needed for "full manipulation" of Meta campaigns via conversation. Mirror the existing approval workflow used by Google mutations (no auto-approve on spend-affecting actions). New tools in `analyze-ads/index.ts` Meta tool definitions: `createCampaign`, `createAdSet`, `createAd`, `duplicateCampaign`, `duplicateAdSet`, `updateTargeting` (geo / age / gender / interests / behaviors / custom audiences / lookalikes), `createCustomAudience`, `createLookalikeAudience`, `updateBidStrategy`, `batchPauseEnable` (multiple IDs at once), `updateCreative` (copy / CTA / link / image-or-video swap), `updateSchedule` (start/end dates + dayparting), `createSplitTest` (A/B test setup). New mutation handlers in `meta-mutate/index.ts` edge function mapping each tool to the appropriate Meta Marketing API calls. New handlers in `use-chat-stream.ts` routing tool calls. Update `buildMetaSystemPrompt` to teach the AI when to use each. Keep approval modal flow intact for all spend-affecting tools. Features requiring Meta App Review (ads_management_standard_access, custom audience creation) — implement code path, document permission requirement in VERIFICATION.md, gate UX with informative error if Meta returns 200/permission error. No edge function deploy — code only.

**Requirements**: M2-02, M2-04, M2-05
**Depends on:** Phase 1
**Plans:** 5/5 plans complete

Plans:
- [x] 02-01-PLAN.md — Extend meta-mutate edge function with 13 new action handlers (createCampaign/AdSet/Ad, duplicate*, update*, createCustomAudience/Lookalike, batchPauseEnable, createSplitTest)
- [x] 02-02-PLAN.md — Add 13 new tool definitions to metaToolDefinitions + expand buildMetaSystemPrompt with usage guidance
- [x] 02-03-PLAN.md — Extend use-chat-stream.ts with tool-call routing for 13 new Meta tools (approval flow intact)
- [x] 02-04-PLAN.md — Extend ToolApprovalDialog copy + Meta App Review banner for audience-gated tools
- [x] 02-05-PLAN.md — Static checks (tsc/eslint) + write 02-VERIFICATION.md with App Review checklist

### Phase 3: Meta Ads polish - bugs lint types e integracao

**Goal:** Systematic cleanup pass. Run `npm run lint` and fix all errors + critical warnings. Run `tsc --noEmit` and fix type errors. Audit Google ↔ Meta integration points: platform switch in DashboardContext, route guards, redirects, AuthContext provider token vs Meta connection handling, chat platform routing. Find and fix: dead code from Meta wiring iterations, broken imports, missing keys in React lists, unhandled promise rejections, `console.error` calls that indicate real bugs, accessibility regressions on Meta pages. Run the test suite (`npm run test`) and fix failing tests. Verify no regressions on Google Ads side. Update CLAUDE.md / codebase map with new Meta surface. Build production bundle (`npm run build`) and resolve build errors. Do NOT deploy.

**Requirements**: M2-03, M2-04, M2-05
**Depends on:** Phase 2
**Plans:** 3/3 plans complete

Plans:
- [x] 03-01-PLAN.md — Fix lint + type errors in NEW Meta code only (5 pages + meta-reports/meta-mutate/analyze-ads + ToolApprovalDialog); baseline diff captured
- [x] 03-02-PLAN.md — Google ↔ Meta integration audit (8+ touchpoints) + fix concrete bugs found
- [x] 03-03-PLAN.md — Build + test + tsc(node.json) verification; refresh CLAUDE.md with Meta surface

### Phase 4: Security hardening - OAuth CSRF, URL cleanup, JWT, CORS, rate limit, RLS

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 3
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 4 to break down)

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-4 | v1.0 MVP | 4/4 | Complete | 2026-03-31 |
| 5 | v1.1 | 1/1 | Complete | 2026-03-31 |
| 1 | v1.2 | 7/8 | In Progress|  |
| 2 | v1.2 | 5/5 | Complete   | 2026-05-17 |
| 3 | v1.2 | 3/3 | Complete   | 2026-05-17 |
