# Phase 03 Plan 02 — Google ↔ Meta Integration Audit

## Audit Findings

### IP-1: DashboardContext platform switching
- **File:** src/contexts/DashboardContext.tsx
- **Question:** Does `setPlatform('meta')` leave Google `selectedAccount` referenced by Meta queries? Does `setPlatform('google')` leave Meta state leaking into Google views?
- **Trace:**
  - `setPlatform` sets `platformState` + writes to `STORAGE_PLATFORM`. It does NOT touch `selectedAccount` or `selectedMetaAccount`.
  - Google-specific hooks (`useGoogleAdsReport`) accept an `enabled` prop. Every caller in Meta pages passes `enabled: !isMeta`, so Google queries are disabled when on Meta.
  - Meta-specific hooks (`useMetaReport`) similarly use `enabled: isMeta`.
  - `Recommendations.tsx` explicitly branches: `useGoogleAdsReport(..., { enabled: !isMeta })` and `useMetaReport(..., { enabled: isMeta })`.
  - `selectedAccount` remains populated in memory when switching to Meta, but no Meta component reads it for API calls — they read `selectedMetaAccount`.
  - `selectedMetaAccount` remains populated when switching back to Google, but Google components ignore it.
  - Google account fetch effect depends on `providerToken` — Meta connection does not trigger it.
- **Verdict:** OK
- **Fix:** none

---

### IP-2: AuthContext token isolation
- **File:** src/contexts/AuthContext.tsx
- **Question:** Does Google providerToken affect Meta operations? Does signing out of Google leave Meta connection intact (or vice versa)?
- **Trace:**
  - `providerToken` is Google-only; stored in `sessionStorage['google_provider_token']` and React state.
  - Meta tokens are fetched from `meta_connections` DB table on-demand (in `ChatPanel.tsx` useEffect on platform switch, line 84-92). They are NOT stored in AuthContext.
  - `signOut()` calls `supabase.auth.signOut()`, which triggers `SIGNED_OUT` event. This clears `providerToken` and removes `google_provider_token` from sessionStorage. It does NOT write to `meta_connections`, so the Meta DB record remains.
  - However, Supabase session is also cleared on sign-out, so any subsequent Meta API calls requiring `session.access_token` for edge function auth would fail (edge functions with `verify_jwt = false` use their own auth mechanism, which is fine for the existing Meta functions).
  - No cross-contamination between Google token and Meta operations was found.
- **Verdict:** OK
- **Fix:** none

---

### IP-3: App.tsx DashboardIndex redirect
- **File:** src/App.tsx
- **Question:** Redirect correct in both directions? What if `platform` is unset on first load?
- **Trace:**
  - `DashboardIndex` is `<Route index element={<DashboardIndex />} />` under `/dashboard`.
  - `DashboardIndex` reads `platform` from `useDashboard()` and navigates: `platform === 'meta' ? 'meta/overview' : 'overview'`.
  - `DashboardContext` initializes `platform` from `localStorage`:
    ```typescript
    const [platform, setPlatformState] = useState<AdPlatform>(() =>
      (safeGetLocalStorage(STORAGE_PLATFORM) as AdPlatform) || 'google'
    );
    ```
  - If localStorage key is absent (first visit), defaults to `'google'` → redirects to `/dashboard/overview`. Correct.
  - If `localStorage` contains `'meta'` → redirects to `/dashboard/meta/overview`. Correct.
  - The `DashboardProvider` wraps the `BrowserRouter` in `App.tsx`, so `useDashboard()` is available inside `DashboardIndex`.
  - Both `/dashboard/overview` and `/dashboard/meta/overview` are registered routes under the same parent `<Route path="/dashboard">` element.
- **Verdict:** OK
- **Fix:** none

---

### IP-4: use-chat-stream platform routing & in-flight tool calls
- **File:** src/hooks/use-chat-stream.ts
- **Question:** When user switches platform while a tool call is awaiting approval, does approval send the call to the right edge function? What if `platform` is the new value but `pendingToolCallRef` was captured under the old value?
- **Trace:**
  - `pendingToolCallRef` stores `{ messageId, part }` — it does NOT snapshot `platform` at capture time (line 332).
  - `approveTool` reads `platform` from closure. Because `platform` is in `approveTool`'s dependency array (line 578), React re-creates `approveTool` when `platform` changes.
  - RACE CONDITION: If a Meta tool call is pending approval and the user switches to Google platform before clicking Approve, `approveTool` is re-created with `isMeta = false`. The pending tool call (`pendingToolCallRef.current`) still exists (it's a ref, not re-created), but `approveTool` will now route to `google-ads-execute` instead of `meta-mutate`, and the Google-side guard `if (!isMeta && (!selectedAccountId || !providerToken))` may or may not fail, depending on whether Google credentials are present.
  - If the user previously had Google connected, `providerToken` is non-null, so the guard passes and the Meta tool call body gets sent to `google-ads-execute` — which is entirely wrong.
  - This is a real behavioral bug: tool approval after platform switch can send a Meta mutation to Google's edge function (or vice versa).
  - **Fix:** Snapshot `platform` inside `pendingToolCallRef` at capture time. `approveTool` should use the captured platform, not the current closure platform.
- **Verdict:** BUG
- **Fix:** Change `pendingToolCallRef` type to include `platform` snapshot:
  ```typescript
  // Before:
  pendingToolCallRef.current = { messageId: assistantMessage.id, part: toolPart };
  // After:
  pendingToolCallRef.current = { messageId: assistantMessage.id, part: toolPart, platform };
  ```
  Then in `approveTool`, read `const isMeta = pending.platform === 'meta'` instead of `const isMeta = platform === 'meta'`.

---

### IP-5: ProtectedRoute
- **File:** src/components/auth/ProtectedRoute.tsx
- **Question:** Does it guard Meta-only routes with only Google session? (Currently it checks `user` — does any Meta page require additional state?)
- **Trace:**
  - `ProtectedRoute` checks `user` from `useAuth()` — which is populated whenever there is a Supabase session (Google OAuth sets this).
  - Meta pages do NOT require a separate Meta auth session at the route level. They fetch Meta data on mount by reading `meta_connections` from DB and constructing API calls via edge functions.
  - If a user has a Supabase session (Google sign-in) but no Meta connection, navigating to `/dashboard/meta/overview` is allowed by `ProtectedRoute`, and the page handles the "no Meta account" empty state gracefully.
  - This design is intentional: `ProtectedRoute` gates on Supabase identity, not on per-platform connection state. Per-platform empty states are handled in each page.
  - No Meta-specific state is needed for routing decisions.
- **Verdict:** OK
- **Fix:** none

---

### IP-6: Settings page — both panels visible/functional
- **Files:** src/pages/settings/index.tsx, src/pages/settings/AccountSection.tsx, src/components/settings/MetaAdsSection.tsx, src/components/settings/CompanySection.tsx
- **Question:** Is the Meta connection panel rendered? Reachable? Does it function (button -> meta-auth)?
- **Trace:**
  - `SettingsPage` renders: `<AccountSection />` (Google Ads account list), then `<CompanySection />` and `<MetaAdsSection />` under an "Ad Platforms" heading.
  - `AccountSection` shows Google accounts with hide/unhide controls.
  - `MetaAdsSection` is a dedicated component for Meta connection.
  - Both panels are unconditionally rendered regardless of `platform` — users can see and manage both connections regardless of active platform. This is correct; settings should be platform-agnostic.
  - No platform gating was found in `SettingsPage`.
- **Verdict:** OK
- **Fix:** none

---

### IP-7: Recommendations page platform awareness
- **File:** src/pages/dashboard/Recommendations.tsx
- **Question:** Is this Google-only? If so, is the entry hidden or disabled when `platform === 'meta'`? If shown, does it fetch Meta data correctly or crash?
- **Trace:**
  - Navigation: both `navItems` (Google) and `metaNavItems` (Meta) include `{ path: '/dashboard/recommendations', label: 'AI Recommendations', icon: Lightbulb }`. The page is reachable from both sidebars.
  - The page reads `platform` and `selectedMetaAccount` from `useDashboard()`. It is fully platform-aware.
  - Google reports use `useGoogleAdsReport(..., { enabled: !isMeta })` and Meta reports use `useMetaReport(..., { enabled: isMeta })`. Correct mutual exclusion.
  - **CRITICAL BUG (TDZ):** `currencyCode` is declared at line 645 (`const currencyCode = isMeta ? ...`), but it is referenced inside `useMemo` hooks declared earlier in the function body at:
    - Line 445 (`campaignContext` memo) — `currencyCode` in the returned object and in `formatCurrency()` calls within the memo
    - Line 463 — `currencyCode` in the `useMemo` dependency array
    - Lines 489, 491, 493, 497, 518, 520, 523, 549-553, 604-605, 616 — inside `recommendations` memo
  - In JavaScript, `const` bindings are in the temporal dead zone (TDZ) until their declaration is reached. However, `useMemo` callbacks are executed lazily by React, not at the point the `useMemo` call is evaluated. React executes the `useMemo` callback during rendering, after the full function body setup. Because React calls these memos during the same render tick (after state initialization but during the render cycle), the `currencyCode` TDZ issue is non-trivially ordered.
  - **Actual runtime behavior:** In React function components, `useMemo` callbacks are called synchronously during render. The JS engine resolves `const currencyCode` BEFORE the first `useMemo` is called because `const` declarations are hoisted to the top of the function scope but not initialized. The callbacks close over the `currencyCode` binding — when React calls the memo callback, `currencyCode` has already been assigned (since the full function body runs top to bottom to produce closures, then React flushes them). However, the `useMemo` callbacks capture `currencyCode` by reference to the closure, not by value. The memos run inline, so by the time the `campaignContext` memo runs, `currencyCode` at line 645 has NOT yet been assigned (the function hasn't reached that line).
  - **Confirmed TDZ bug:** `campaignContext` memo at line 391 uses `currencyCode` but `const currencyCode` is declared at line 645. Since `useMemo` runs its callback synchronously during render (not lazily deferred), and the function body executes top-to-bottom, the line `const currencyCode = ...` at 645 has not been reached when the `useMemo(() => { ... currencyCode ... }, [...])` at line 391 runs.
  - Wait — this needs more careful analysis. In JavaScript, `useMemo` does NOT run its callback inline at the point `useMemo(...)` is called. React's `useMemo` stores the callback and only calls it if the dependencies changed. The callback is called DURING the render phase, but React controls when, not the function call sequence. The closure over `currencyCode` captures the binding, not the value. When React actually invokes the callback, the function has completed its body, so `currencyCode` IS initialized. **Therefore this is NOT a TDZ bug at runtime.**
  - However, the dependency array `[..., currencyCode]` at line 463 — if `currencyCode` is undefined during the first evaluation, this is a bug. But `const currencyCode` has `undefined` in TDZ only if accessed before `const` declaration is reached. Since the `useMemo` call itself (not the callback) is what runs inline, and the dependency array `currencyCode` IS evaluated inline at the point `useMemo(deps)` is called... this means:
    - Line 463 `}, [selectedAccount, ..., currencyCode])` — the dependency array IS evaluated at line 463, which is BEFORE line 645. So `currencyCode` is in TDZ here. This IS a TDZ ReferenceError.
  - Similarly, line 616 `}, [keywords, ..., currencyCode])` — same bug.
  - **Why does it seem to work?** TypeScript strict mode is OFF, so no compile error. At runtime in modern V8, `const` in TDZ throws a ReferenceError, but — looking more carefully at V8's behavior — the `useMemo` hook itself doesn't throw because `useMemo` wraps the dependency comparison in a try-catch internally in development mode. In production, this would silently fail, causing the memo to never recompute correctly.
  - **Actually:** V8 does throw ReferenceError for TDZ access. The fact that the app appears to work suggests either the TDZ analysis is incorrect or there's something about module scope. Re-examining: `currencyCode` at line 645 is a `const` in the FUNCTION body of `RecommendationsPage`. `useMemo` at line 391 is also in that function body. The full function body runs top-to-bottom. The `useMemo(callback, deps)` call runs inline at line 391 — the `deps` array `[..., currencyCode]` at line 463 is evaluated at that point. At that point, `const currencyCode` at line 645 is in TDZ. **This is a ReferenceError.**
  - The fact the app works in practice suggests the error is caught silently or `currencyCode` is evaluated differently. Given TypeScript strict mode is OFF and the project uses jsdom tests, this is likely a live latent bug that surfaces in certain browser engines or when deps change.
- **Verdict:** BUG — `currencyCode` used in `useMemo` dependency arrays (lines 463, 616) before declaration at line 645. Move `currencyCode` declaration to before the first `useMemo` that references it.
- **Fix:** Move the `currencyCode` const declaration from line 645 to before the `campaignContext` useMemo (after line 209, `const isMeta = platform === 'meta'`). This makes the declaration order match usage order.

---

### IP-8: localStorage key collision
- **Files:** src/contexts/DashboardContext.tsx, src/hooks/useGoogleAdsReport.ts, src/hooks/useMetaReport.ts, src/components/settings/AlertSettings.tsx, src/components/dashboard/AlertSystem.tsx
- **Question:** Do Google and Meta keys collide? Are there any orphaned keys from removed features?
- **Trace:**
  - All `adsinsight:` keys found in the codebase:
    - `adsinsight:selectedAccountId` — Google selected account (DashboardContext)
    - `adsinsight:hiddenAccountIds` — Google hidden accounts (DashboardContext)
    - `adsinsight:timezone` — shared (DashboardContext)
    - `adsinsight:attributionWindow` — shared (DashboardContext)
    - `adsinsight:platform` — platform toggle (DashboardContext)
    - `adsinsight:metaSelectedAccountId` — Meta selected account (DashboardContext)
    - `adsinsight:cache:{reportType}:{customerId}:{start}:{end}` — Google report cache (useGoogleAdsReport)
    - `adsinsight:meta:cache:{reportType}:{accountId}:{start}:{end}` — Meta report cache (useMetaReport)
    - `adsinsight:alertThresholds` — shared alert config (AlertSettings, AlertSystem)
    - `ai_chat_panel_width` — chat panel width (ChatPanel, not adsinsight-prefixed)
    - `ai_chat_sidebar_width` — chat sidebar width (ChatPanel, not adsinsight-prefixed)
  - Google cache key: `adsinsight:cache:*` vs Meta cache key: `adsinsight:meta:cache:*` — distinct prefix, no collision.
  - Google account key: `adsinsight:selectedAccountId` vs Meta: `adsinsight:metaSelectedAccountId` — distinct, no collision.
  - No orphaned keys from removed features were found.
  - `ai_chat_*` keys are intentionally not prefixed with `adsinsight:` — no collision.
- **Verdict:** OK
- **Fix:** none

---

### IP-9 (bonus): ToolApprovalDialog Google vs Meta copy
- **File:** src/components/dashboard/ToolApprovalDialog.tsx
- **Question:** Does the dialog show the right tool description per platform? Any Google-only copy showing up in a Meta tool approval?
- **Trace:**
  - `ToolApprovalDialog` has its own `toolDescriptions` map (distinct from `TOOL_DESCRIPTION` in `use-chat-stream.ts`).
  - Google tools: `addNegativeKeyword`, `adjustBid`, `pauseCampaign`, `enableCampaign`, `createBudget`, `updateCampaignBudget`, `queryAdsData` — descriptions reference "Google Ads account" or are generic.
  - Meta tools: `queryMetaData`, `analyzeCreative`, `updateBudget`, `createCampaign`, `createAdSet`, etc. — descriptions reference "Meta" explicitly.
  - `queryAdsData` description: "Retrieve performance data from your Google Ads account" — this is Google-only. ✓
  - `queryMetaData` description: "Retrieve performance data from your Meta Ads account" — this is Meta-only. ✓
  - `pauseCampaign`/`enableCampaign` descriptions are generic ("Stop a running campaign", "Resume a paused campaign") — these tool names exist only in the Google `TOOL_RISK_LEVEL` map (lines 18-19 of `use-chat-stream.ts`), so they will only be invoked for Google. No copy bleed.
  - The dialog's fallback description (`'Execute an action on your ads account'`) is generic and acceptable.
  - The `DialogDescription` text "The AI assistant wants to perform an action on your ads account" is generic — not Google-specific.
  - `META_APP_REVIEW_GATED` set correctly identifies only Meta-specific audience tools.
  - No Google-specific copy bleeds into Meta tool descriptions or vice versa.
- **Verdict:** OK
- **Fix:** none

---

## Summary

- **OK count:** 7 (IP-1, IP-2, IP-3, IP-5, IP-6, IP-8, IP-9)
- **BUG count:** 2 (IP-4, IP-7) — fixed in Task 2
- **RISK count:** 0

### Bugs to Fix in Task 2

1. **IP-4** — `src/hooks/use-chat-stream.ts`: Platform race condition in `approveTool`. `pendingToolCallRef` does not snapshot `platform` at tool-call capture time. If user switches platform while a tool call is pending approval, `approveTool` uses the new platform value and routes the mutation to the wrong edge function. Fix: add `platform` field to `pendingToolCallRef` type and snapshot current `platform` when setting `pendingToolCallRef.current`. In `approveTool`, read `const isMeta = pending.platform === 'meta'`.

2. **IP-7** — `src/pages/dashboard/Recommendations.tsx`: `currencyCode` declared at line 645 but referenced in `useMemo` dependency arrays at lines 463 and 616, which are evaluated before line 645. Move `currencyCode` declaration to immediately after `const isMeta = platform === 'meta'` (line 211) so it precedes all useMemo calls that depend on it. Also impacts `campaignContext` memo body at line 445.

### Deferred Issues (Out of Scope This Plan)

- **ChatPanel.tsx `handleSubmit` Google-only guard:** `handleSubmit` in `src/components/dashboard/chat/ChatPanel.tsx` (line 196-221) checks `if (!selectedAccount?.id)` and shows a toast "Choose a Google Ads account before sending messages" even when `platform === 'meta'`. Meta users with no Google account connected cannot use the AI chat. This file is not in `files_modified` for plan 03-02 so it is deferred to a follow-up plan.

## Resolution Log

- **IP-4 fix** — `src/hooks/use-chat-stream.ts`, lines 110 and 332 and 388: Extended `pendingToolCallRef` type to include `platform` field. Snapshot `platform` at tool-call capture time (`pendingToolCallRef.current = { ..., platform }`). In `approveTool`, changed `const isMeta = platform === 'meta'` → `const isMeta = pending?.platform === 'meta'` so the platform used for routing is the one active when the tool call was initiated, not the (potentially changed) current platform.

- **IP-7 fix** — `src/pages/dashboard/Recommendations.tsx`, line 211→215 (moved from 649): Moved `const currencyCode = isMeta ? safeCurrency(selectedMetaAccount?.currency) : safeCurrency(selectedAccount?.currencyCode)` from after all `useMemo` hooks to immediately after `const isMeta = platform === 'meta'`. Removed duplicate declaration at original location. This eliminates the temporal dead zone access in `useMemo` dependency arrays.
