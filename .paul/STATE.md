# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-04-08)

**Core value:** Enable marketers to understand performance across Google Ads AND Meta Ads, get AI-driven recommendations, and execute changes from the dashboard or CLI terminal.
**Current focus:** v1.3 — Meta Ads Integration

## Current Position

Milestone: v1.3 Meta Ads Integration
Phase: 10 of 14 (Foundation — Company Registration + Meta OAuth + DB Schema) — Ready to plan
Plan: None yet
Status: Research complete — ready for Phase 10 plans
Last activity: 2026-04-08 — v1.3 milestone defined, architecture researched

Progress:
- Milestone v1.3: [░░░░░░░░░░] 0%
- Phase 10: [░░░░░░░░░░] 0%

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ○        ○        ○     [Ready for Phase 10 PLAN]
```

## Accumulated Context

### Architecture Decisions (v1.3)

| Decision | Rationale |
|----------|-----------|
| Meta OAuth as custom edge function (not Supabase Auth) | Supabase doesn't support `ads_management` + `business_management` scopes natively |
| `companies` table required before Meta connect | Meta App Review compliance; also needed for multi-user future |
| Platform selector in TopBar context (not route-based) | Minimal refactoring to existing routes; platform = DashboardContext state |
| `meta_connections` stores long-lived tokens (60-day) | Meta long-lived tokens via code→short-lived→long-lived exchange |
| Parallel edge function naming: `meta-*` mirrors `google-ads-*` | Consistent developer experience; same request/response patterns |

### Key Meta API Facts

| Fact | Detail |
|------|--------|
| Base URL | `https://graph.facebook.com/v20.0/` |
| Auth | OAuth 2.0, long-lived user access tokens (60 days) |
| Required scopes | `ads_read`, `ads_management`, `business_management` |
| Ad Account list | `GET /me/adaccounts?fields=id,name,currency,account_status` |
| Campaign insights | `GET /{adAccountId}/insights?fields=spend,reach,...&time_range={...}` |
| Campaign mutate | `POST /{campaignId}` with `status=PAUSED|ACTIVE` |
| Budget mutate | `POST /{adSetId}` with `daily_budget=N` (in account currency × 100) |
| Token refresh | `GET /oauth/access_token?grant_type=fb_exchange_token` |
| App Review needed | Yes — `ads_management` requires App Review for non-test users |

### Required Env Vars (new for v1.3)

```
META_APP_ID
META_APP_SECRET
META_REDIRECT_URI   (= SUPABASE_URL + /functions/v1/meta-auth)
```

### Deferred Issues

| Issue | Origin | Effort | Revisit |
|-------|--------|--------|---------|
| No pagination on large Google Ads datasets | v1.1 audit | L | v1.4 |
| TypeScript strict mode off | v1.0 | M | v1.4 |
| Edge functions JWT verify disabled | v1.0 | M | v2.0 |
| Meta App Review (production access) | v1.3 | M | v1.3 launch |
| TikTok / LinkedIn integrations | v1.3 planning | XL | v1.4 |

### Blockers/Concerns

- Meta App Review required for production Meta Ads access. In development, only Facebook test users can authenticate. Build and test with test user, document prod setup steps.

## Session Continuity

Last session: 2026-04-08
Stopped at: v1.3 milestone planned (phases 10–14), ad-creative skill assessed as relevant
Next action: Run /paul:plan for Phase 10 plans (10-01, 10-02, 10-03)
Resume file: .paul/ROADMAP.md

---
*STATE.md — Updated after every significant action*
