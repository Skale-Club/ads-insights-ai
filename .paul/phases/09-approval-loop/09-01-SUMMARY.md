---
phase: 09-approval-loop
plan: 01
type: summary
status: complete
completed_at: 2026-04-08
---

# Phase 09-01 Summary: Human Approval Loop

## Outcome

Mutation approval protocol documented in `.claude/google-ads-cli.md`.

## Changes

File: `.claude/google-ads-cli.md`

**Added sections:**
- curl examples for the 3 new mutation actions: `adjustBid`, `updateCampaignBudget`, `createBudget`
- **Human Approval Protocol** section with:
  - Standardized preview format (action, target, change, reason, estimated impact)
  - Approval rules: never execute without confirmation, batch "approve all" scoped to current list, skip/cancel support
  - Clear enumeration of which actions are mutations (require approval) vs read-only (no confirmation needed)

## Protocol Summary

Before any mutation, Claude must display:
```
Proposed change:
  Action:   [action]
  Target:   [entity name + ID]
  Change:   [before → after]
  Reason:   [why]
  Impact:   [estimated effect]

Proceed? (yes / no / skip)
```

"Approve all" is valid for a batch but scoped to items in the current list only.
