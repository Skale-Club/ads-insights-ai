# Phase 03 Plan 03 — Build Verification

Run date: 2026-05-17T10:25:00Z

## Build Verification

### Gate 1: npm run build
Command: `npm run build`
Exit code: 0
Output (last 50 lines):
```
vite v5.4.19 building for production...
Browserslist: browsers data (caniuse-lite) is 11 months old. Please run:
  npx update-browserslist-db@latest
  Why you should do it regularly: https://github.com/browserslist/update-db#readme
✓ 3886 modules transformed.
[plugin vite:reporter]
(!) C:/Users/Vanildo/Dev/ads-insights-ai/node_modules/xlsx/xlsx.mjs is dynamically imported by
C:/Users/Vanildo/Dev/ads-insights-ai/src/components/dashboard/ChatAttachments.tsx but also statically imported
by C:/Users/Vanildo/Dev/ads-insights-ai/src/pages/dashboard/meta/Reports.tsx, dynamic import will not move
module into another chunk.

dist/index.html                  1.01 kB │ gzip:   0.42 kB
dist/assets/index-RwyrUpfF.css  96.20 kB │ gzip:  15.77 kB
dist/assets/index-BSjvZT0M.js 2,236.57 kB │ gzip: 644.14 kB

(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rollupOptions.output.manualChunks to improve chunking
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 9.61s
```
Bundle size warnings: yes — single main chunk ~2.2MB (644KB gzip). Pre-existing; xlsx static import in meta/Reports.tsx contributes. Code splitting is a separate milestone per CONTEXT.md.
Result: PASS

### Gate 2: npm run test
Command: `npm run test`
Exit code: 0
Output summary: 14 passed, 0 failed (4 test files)
```
 ✓ src/test/example.test.ts (1 test)
 ✓ src/test/AuthContext.test.tsx (6 tests)
 ✓ src/test/ErrorBoundary.test.tsx (2 tests)
 ✓ src/test/useGoogleAdsReport.test.tsx (5 tests)

 Test Files  4 passed (4)
       Tests 14 passed (14)
    Duration 4.82s
```
Result: PASS

### Gate 3: tsc --noEmit -p tsconfig.node.json
Command: `npx tsc --noEmit -p tsconfig.node.json`
Exit code: 0
Output: (empty — no type errors)
Result: PASS

## Failures and Fixes

No failures. All three gates passed on first run with no fixes required.

## Deferred / Out of Scope (do not fix here)

- Pre-existing bundle size warning (>500kb main chunk) — code split is a separate milestone per CONTEXT.md
- Browserslist refresh (`npx update-browserslist-db@latest`) — optional, separate milestone
- xlsx dual-import warning (dynamic + static) — pre-existing; fixing requires restructuring ChatAttachments.tsx or meta/Reports.tsx import strategy, out of phase scope
- process-attachment/* lint debt — separate milestone
- tailwind.config.ts lint debt — separate milestone

## M2-05 Deploy Boundary Check

- No `supabase functions deploy` command run: CONFIRMED
- No DB migration applied: CONFIRMED
- No `git push` to any remote: CONFIRMED
