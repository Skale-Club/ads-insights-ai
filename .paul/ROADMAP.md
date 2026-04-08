# Roadmap: Ads Insights AI

## Milestones

| Version | Name | Phases | Status | Completed |
|---------|------|--------|--------|-----------|
| v1.0 | MVP | 1–4 | ✅ Shipped | 2026-03-31 |
| v1.1 | Audiences Fix + CLI Session | 5 | ✅ Shipped | 2026-04-08 |
| v1.2 | google-ads-manager Skill Integration | 6–9 | ✅ Shipped | 2026-04-08 |

---

## 🚧 Active Milestone: v1.2 — google-ads-manager Skill Integration

**Goal:** Install the `google-ads-manager` skill and close the gap between what Gemini declares it can do and what the API actually implements, enabling full CLI-driven Google Ads management with strategic AI guidance.

**Status:** Complete ✅
**Progress:** [██████████] 100%

### Phase 6: Skill Install + Full Mutation Coverage

**Goal:** Install `google-ads-manager` skill and implement the 3 missing mutations (`adjustBid`, `updateCampaignBudget`, `createBudget`) so Gemini tool calls actually execute against the Google Ads API.
**Depends on:** v1.1 CLI session (complete)
**Research:** Unlikely (Google Ads API v20 patterns already established in codebase)

**Scope:**
- Install skill via `npx skills add`
- Implement `adjustBid` action in `google-ads-mutate`
- Implement `updateCampaignBudget` action in `google-ads-mutate`
- Implement `createBudget` action in `google-ads-mutate`

**Plans:**
- [x] 06-01: Install skill + implement adjustBid + updateCampaignBudget + createBudget

### Phase 7: Dynamic queryAdsData

**Goal:** Enable Gemini to call `google-ads-reports` mid-conversation via the `queryAdsData` tool, so it can fetch additional data beyond what's in the initial context.
**Depends on:** Phase 6 (analyze-ads must be aligned with mutate capabilities)
**Research:** Unlikely (calls existing edge function)

**Scope:**
- Wire `queryAdsData` tool call in `analyze-ads` to invoke `google-ads-reports` edge function
- Return results back into the Gemini conversation stream

**Plans:**
- [x] 07-01: Implement queryAdsData tool execution in analyze-ads

### Phase 8: Standard CLI Workflows

**Goal:** Create `.claude/workflows/google-ads.md` with standard workflow prompts that combine skill strategic frameworks with real API data.
**Depends on:** Phase 7 (dynamic data fetching needed for workflows)
**Research:** Unlikely (authoring markdown workflows)

**Scope:**
- Campaign audit workflow
- Search term mining + negative keyword workflow
- Bid optimization workflow
- Ad copy review workflow
- Weekly performance report workflow

**Plans:**
- [x] 08-01: Author standard workflow definitions

### Phase 9: Human Approval Loop

**Goal:** Add confirmation step before any destructive mutation executes via CLI, so users review proposed changes before they go live.
**Depends on:** Phase 6 (mutations must exist before guarding them)
**Research:** Unlikely (pattern change in Claude Code interaction)

**Scope:**
- Update `.claude/google-ads-cli.md` with approval protocol
- Define mutation preview format (what will change, why, impact estimate)
- Document "approve all" / "approve selected" / "cancel" interaction patterns

**Plans:**
- [x] 09-01: Define and document human approval protocol

---

## ✅ Completed Milestones

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
