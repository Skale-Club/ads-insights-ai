# Phase 3: Meta Ads polish - bugs lint types e integracao - Context

**Gathered:** 2026-05-17
**Status:** Ready for planning
**Mode:** Pre-written (skip_discuss=true, autonomous mode, user explicitly authorized)

<domain>
## Phase Boundary

Systematic quality pass after the Meta feature build (Phases 1-2). Find and fix:
- ESLint errors + critical warnings
- TypeScript errors (where strict is on — tsconfig.node.json)
- Dead code introduced during Meta iterations
- Broken Google ↔ Meta integration points (platform switch, redirects, token handling, chat routing)
- Missing React keys, unhandled promise rejections, console.error indicating real bugs
- Failing tests; build errors (`npm run build`)
- Stale documentation (CLAUDE.md, codebase map)

Out of scope: new features, refactors beyond fix scope, dependency upgrades.

</domain>

<decisions>
## Implementation Decisions

### Investigation Approach
- Use `/gsd:debug` for any single bug that needs scientific-method investigation (per user's explicit request)
- For sweeps: run `npm run lint`, `npm run test`, `npm run build`, capture all output, triage by severity
- Run `tsc --noEmit -p tsconfig.node.json` to catch strict-mode build config issues
- Grep for `TODO`, `FIXME`, `XXX`, `HACK` comments — triage each

### Fix Policy
- **Fix in this phase:** lint errors, type errors, build errors, failing tests, broken imports, dead code from Meta wiring, integration bugs between Google and Meta (real bugs)
- **Defer (file as deferred ideas):** ergonomic improvements, refactors, performance optimizations that need design work
- Each fix → atomic commit
- No behavior changes beyond bug fixes
- No new features

### Integration Audit Checklist
- `src/contexts/DashboardContext.tsx` — platform switching: does `selectedAccount` clear when platform changes? Stale data risk?
- `src/contexts/AuthContext.tsx` — does Meta connection state interact correctly with Google provider token?
- `src/App.tsx` DashboardIndex — platform-aware redirect: correct on both directions (Google→Meta and Meta→Google)?
- `src/hooks/use-chat-stream.ts` — when platform switches mid-conversation, what happens to in-flight tool calls?
- `src/components/auth/ProtectedRoute.tsx` — Meta-only routes properly guarded?
- Settings page — both Google and Meta connection panels visible and functional?
- Recommendations page — platform-aware?

### Regression Guards
- Google Ads side of the product must not regress — run through key Google flows mentally and via build
- Existing tests must pass
- New tests only added where a bug was fixed and a regression test makes sense

### Documentation Updates
- Update CLAUDE.md if any architectural assumption changed
- Refresh `.planning/codebase/` maps if any structure changed (run `/gsd:map-codebase` only if substantial change)

### Claude's Discretion
- Severity triage thresholds for lint warnings
- Whether to add a regression test or rely on type system
- Order of fixes (suggest: build errors → type errors → lint errors → integration bugs → dead code → tests)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `npm run lint` — ESLint 9 with typescript-eslint
- `npm run test` — Vitest
- `npm run build` — Vite production build
- `/gsd:debug` skill for single-bug investigation

### Established Patterns
- ESLint flat config in `eslint.config.js`
- No formal logging framework — `console.log/error` with `[Tag]` prefix
- Toast feedback via `useToast`
- React Query for server state

### Integration Points
- See Integration Audit Checklist above
- Edge function deploy boundary — code lives in repo, deploy is user action

</code_context>

<specifics>
## Specific Ideas

- After Phases 1 + 2 land, expect: many new files, possibly broken type imports, new tool-call branches in use-chat-stream that the linter will scrutinize
- Particular attention: the platform string union type `'google' | 'meta'` — make sure no place uses raw strings
- Check that approval modal flow correctly distinguishes Google vs Meta tools (mixing approval state across platforms would be a bug)
- Verify localStorage keys don't collide across platforms

</specifics>

<deferred>
## Deferred Ideas

- Migrate to strict TypeScript across the whole app (separate milestone)
- Add Playwright E2E tests for Meta flows (separate milestone)
- Performance optimization pass (separate milestone)
- Accessibility audit (separate milestone)

</deferred>
