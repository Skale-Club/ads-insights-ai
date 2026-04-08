---
phase: 08-workflows
plan: 01
type: summary
status: complete
completed_at: 2026-04-08
---

# Phase 08-01 Summary: Standard CLI Workflows

## Outcome

5 standard workflow prompts created in `.claude/workflows/google-ads.md`.

## Workflows

| # | Name | Purpose |
|---|------|---------|
| 1 | Campaign Audit | Full health check — find waste, gaps, quick wins |
| 2 | Search Term Mining | Find irrelevant terms, propose negatives |
| 3 | Bid Optimization | Performance-based bid adjustments with approval |
| 4 | Ad Copy Review | Evaluate RSA quality and CTR; analysis only |
| 5 | Weekly Performance Report | WoW comparison snapshot with top 3 recommended actions |

## Design Decisions

- Each workflow prompt is self-contained and copy-pasteable into a Claude Code session
- Workflows that propose mutations explicitly ask for approval before executing
- Ad Copy Review is analysis-only (no mutations) — clearly documented
- Workflows leverage both live API data (via `queryAdsData`) and skill strategic frameworks (RSA best practices, bid strategy decision trees)
