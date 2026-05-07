# Codebase Concerns

**Analysis Date:** 2026-05-06

## Tech Debt

**Unauthenticated Supabase Edge Function Surface:**
- Issue: Every configured edge function has `verify_jwt = false`, including read endpoints, mutation endpoints, AI proxying, CLI token exchange, and health/config endpoints.
- Files: `supabase/config.toml`, `supabase/functions/analyze-ads/index.ts`, `supabase/functions/google-ads-reports/index.ts`, `supabase/functions/google-ads-mutate/index.ts`, `supabase/functions/google-ads-execute/index.ts`, `supabase/functions/meta-reports/index.ts`, `supabase/functions/meta-mutate/index.ts`, `supabase/functions/get-cli-session/index.ts`, `supabase/functions/get-meta-cli-session/index.ts`, `supabase/functions/process-attachment/index.ts`
- Impact: Function URLs can be invoked directly from outside the app. Most functions rely on bearer-like tokens in request bodies rather than Supabase auth context, so leaked provider tokens, Meta tokens, CLI session tokens, or AI API keys are enough to access data or mutate ad accounts.
- Fix approach: Enable JWT verification where browser-authenticated users call functions, pass the Supabase session bearer token from the client, and restrict no-JWT functions to purpose-built public callbacks with separate validation.

**Large Google Ads Report Module:**
- Issue: `supabase/functions/google-ads-reports/index.ts` is a 1,571-line module containing GAQL construction, API calls, special-case report fetchers, and transformation logic in one file.
- Files: `supabase/functions/google-ads-reports/index.ts`
- Impact: Report additions and fixes have high regression risk because query strings, report-type routing, and shape transformations are tightly coupled.
- Fix approach: Split by report family into query builders, fetch helpers, and transformer modules; add unit fixtures for each report type before refactoring.

**AI Tool Definitions Duplicated Across Server and Client:**
- Issue: Tool names, risk labels, descriptions, and schemas are defined in multiple places and can drift.
- Files: `supabase/functions/analyze-ads/index.ts`, `supabase/functions/google-ads-execute/index.ts`, `src/hooks/use-chat-stream.ts`, `src/lib/ai/tools.ts`, `src/components/dashboard/ToolApprovalDialog.tsx`
- Impact: The model can emit a tool call that the client labels differently or the executor handles with different required inputs, causing failed or unsafe tool execution.
- Fix approach: Define a single shared tool contract used by prompt construction, approval UI, client execution routing, and edge function validation.

**Client-Side Report Caching Bypasses Server Cache Schema:**
- Issue: Google and Meta report hooks cache responses in `localStorage`, while the typed `reports_cache` table is present but not used by current hooks or edge functions.
- Files: `src/hooks/useGoogleAdsReport.ts`, `src/hooks/useMetaReport.ts`, `src/types/database.ts`
- Impact: Cache data is per-browser, unencrypted, not shared across sessions, and not centrally invalidated; large reports can exhaust browser storage while server-side quota protection remains absent.
- Fix approach: Move report caching behind edge functions with TTL and user/account/date keys, then use React Query only as an in-memory client cache.

**Generated Database Types Do Not Cover Current Migrations:**
- Issue: `src/types/database.ts` includes earlier tables such as `profiles`, `google_connections`, `ads_accounts`, `reports_cache`, and `user_ai_settings`, but current Meta and CLI tables from later migrations are not represented.
- Files: `src/types/database.ts`, `supabase/migrations/20260408000000_cli_sessions.sql`, `supabase/migrations/20260408100000_meta_foundation.sql`, `supabase/migrations/20260408200000_meta_cli_sessions.sql`
- Impact: Code that touches `meta_connections`, `meta_accounts`, `companies`, `cli_sessions`, and `meta_cli_sessions` uses casts or untyped query results, weakening compile-time protection around sensitive token tables.
- Fix approach: Regenerate Supabase types after migrations and remove `supabase as any` call sites where typed table definitions exist.

## Known Bugs

**Google Ads Execute Budget Update Uses Campaign ID as Budget ID:**
- Symptoms: `updateCampaignBudget` in the tool execution endpoint builds `customers/{customerId}/campaignBudgets/{campaignId}` even though campaign budgets have separate resource IDs.
- Files: `supabase/functions/google-ads-execute/index.ts`
- Trigger: AI tool execution calls `updateCampaignBudget` through `google-ads-execute` with a campaign ID instead of a campaign budget resource name.
- Workaround: Prefer `google-ads-mutate` for budget mutations because it accepts `campaignBudgetId`; avoid enabling the `google-ads-execute` budget tool until IDs are corrected.

**Google Ads Execute Campaign-Level Bid Adjustment Ignores New Bid Amount:**
- Symptoms: `adjustBid` sets `manualCpc.enhancedCpcEnabled = false` for campaign-level requests and does not apply `newBid`.
- Files: `supabase/functions/google-ads-execute/index.ts`
- Trigger: AI tool execution calls `adjustBid` with only `campaignId`, `bidType`, and `newBid`.
- Workaround: Restrict bid adjustment tools to ad group or keyword-level resource names until campaign-level behavior is redesigned.

**Meta OAuth State Is Only User ID:**
- Symptoms: Meta callback treats the `state` query parameter as `user_id` and upserts a long-lived token for that user without nonce/session verification.
- Files: `supabase/functions/meta-auth/index.ts`, `src/components/settings/MetaAdsSection.tsx`
- Trigger: Meta OAuth callback receives a valid `code` and attacker-controlled or stale `state` value.
- Workaround: None detected; replace raw user ID state with a signed, single-use OAuth state nonce tied to the authenticated user.

**One Hook Test Does Not Actually Re-Mock Dashboard Context:**
- Symptoms: The disabled-query test creates a mock with `vi.doMock` after the hook module is already imported, so it only verifies `{ enabled: false }`, not the no-account branch it names.
- Files: `src/test/useGoogleAdsReport.test.tsx`
- Trigger: Running the existing `useGoogleAdsReport` test suite.
- Workaround: Split no-account behavior into a separate test module with module reset or make the hook dependencies injectable for tests.

## Security Considerations

**Ad Account Mutation Endpoints Trust Body Tokens:**
- Risk: Any caller with a Google provider token or Meta access token can invoke campaign status, bid, budget, and negative keyword mutations directly because endpoints do not bind the token/account to the authenticated Supabase user.
- Files: `supabase/functions/google-ads-mutate/index.ts`, `supabase/functions/google-ads-execute/index.ts`, `supabase/functions/meta-mutate/index.ts`, `src/hooks/use-chat-stream.ts`
- Current mitigation: Client-side tool approval UI exists in `src/components/dashboard/ToolApprovalDialog.tsx`, and mutation functions validate request shape with Zod in `supabase/functions/google-ads-mutate/index.ts` and `supabase/functions/meta-mutate/index.ts`.
- Recommendations: Enforce server-side user/account ownership, require an authenticated Supabase JWT, record immutable audit logs for all mutations, and keep client approval as UX rather than authorization.

**Google Provider Token Stored in Browser Session Storage:**
- Risk: XSS can read `google_provider_token` and use it against unauthenticated edge functions or Google Ads API proxy endpoints.
- Files: `src/contexts/AuthContext.tsx`, `src/hooks/useGoogleAdsReport.ts`, `src/hooks/useCliSession.ts`, `src/pages/ConnectGoogleAds.tsx`, `src/pages/dashboard/Campaigns.tsx`, `src/pages/dashboard/SearchTerms.tsx`
- Current mitigation: The token uses `sessionStorage` rather than `localStorage`, and `useGoogleAdsReport` clears it after unauthenticated API errors.
- Recommendations: Move Google Ads API access to server-managed tokens or short-lived server sessions, keep provider tokens out of JavaScript-accessible storage, and add strict CSP before expanding attachment or rich chat rendering.

**Meta Tokens Are Stored and Read as Plain Text:**
- Risk: Long-lived Meta access tokens are stored as plain `TEXT` and are readable by the owning browser client through RLS; CLI session tokens also expose raw access tokens via token lookup.
- Files: `supabase/migrations/20260408100000_meta_foundation.sql`, `supabase/migrations/20260408200000_meta_cli_sessions.sql`, `src/hooks/useMetaReport.ts`, `src/hooks/useMetaCliSession.ts`, `supabase/functions/get-meta-cli-session/index.ts`
- Current mitigation: RLS limits direct table access to the owning authenticated user, and CLI sessions expire after two hours.
- Recommendations: Store encrypted tokens using a server-only key or Supabase Vault, avoid selecting raw access tokens in browser code, and proxy Meta API calls through authenticated edge functions.

**CLI Session Token Is a Bearer Secret:**
- Risk: `get-cli-session` and `get-meta-cli-session` intentionally bypass RLS with service role and return provider tokens when given a UUID session token.
- Files: `supabase/functions/get-cli-session/index.ts`, `supabase/functions/get-meta-cli-session/index.ts`, `supabase/migrations/20260408000000_cli_sessions.sql`, `supabase/migrations/20260408200000_meta_cli_sessions.sql`
- Current mitigation: Session tokens are UUIDs, unique, and expire after two hours.
- Recommendations: Treat session tokens as credentials, add one-time reveal or rotation, hash session tokens at rest, add revocation/audit metadata, and rate-limit token lookup failures.

**AI API Key Naming and Storage Are Inconsistent:**
- Risk: The app labels the user setting as Gemini in UI comments while the database column remains `openai_api_key`; the full key is stored in a user-readable table.
- Files: `supabase/migrations/20250205_create_user_ai_settings.sql`, `src/components/settings/AISettingsCard.tsx`, `src/hooks/use-chat-session.ts`, `src/pages/dashboard/Recommendations.tsx`, `src/types/database.ts`
- Current mitigation: RLS restricts access to the owning user; UI masks existing keys after load.
- Recommendations: Rename the field through a migration, encrypt keys server-side, and pass AI calls through authenticated edge functions without exposing stored keys back to the browser.

**Wildcard CORS on Sensitive Functions:**
- Risk: All public functions return `Access-Control-Allow-Origin: *`, including functions that accept provider tokens, Meta tokens, AI keys, attachments, and mutation commands.
- Files: `supabase/functions/analyze-ads/index.ts`, `supabase/functions/google-ads-reports/index.ts`, `supabase/functions/google-ads-mutate/index.ts`, `supabase/functions/google-ads-execute/index.ts`, `supabase/functions/meta-reports/index.ts`, `supabase/functions/meta-mutate/index.ts`, `supabase/functions/process-attachment/index.ts`
- Current mitigation: Browser CORS alone is not relied upon for direct API security; functions require body tokens for most sensitive work.
- Recommendations: Restrict production origins, add explicit authentication/authorization, and add rate limiting at the edge gateway.

## Performance Bottlenecks

**Google Ads SearchStream Responses Are Fully Materialized:**
- Problem: Every report fetch reduces full `searchStream` batches into memory before transforming data.
- Files: `supabase/functions/google-ads-reports/index.ts`, `supabase/functions/google-ads-accounts/index.ts`, `supabase/functions/google-ads-mutate/index.ts`
- Cause: The implementation does not page, cap, stream-transform, or persist intermediate results for large accounts.
- Improvement path: Add report-specific limits, server-side cache TTLs, pagination controls, and streaming transformations for large report families such as keywords, search terms, ads, and audiences.

**Meta Reports Hard-Limit Lists to 200 Without Pagination:**
- Problem: Campaign, ad set, and ad reports request `limit=200` and do not follow `paging.next`.
- Files: `supabase/functions/meta-reports/index.ts`
- Cause: The Meta report function maps only the first Graph API page.
- Improvement path: Implement cursor pagination with a max page budget and surface partial-data warnings when limits are reached.

**AI Query Tool Loop Can Multiply Upstream Latency:**
- Problem: `analyze-ads` can perform up to four non-streaming Gemini calls to resolve data-query tools, then perform a final streaming call.
- Files: `supabase/functions/analyze-ads/index.ts`
- Cause: Tool resolution loops are serial and call Google/Meta report functions inside each iteration.
- Improvement path: Bound tool loops per request type, add request timeouts, reuse report cache results, and return transparent partial responses when the loop budget is exhausted.

**Attachment Processing Has No Size Guard:**
- Problem: Audio and image data are accepted as base64 strings without schema validation or max payload checks.
- Files: `supabase/functions/process-attachment/index.ts`, `src/components/dashboard/ChatAttachments.tsx`, `src/hooks/use-chat-stream.ts`
- Cause: Request body parsing and provider calls happen before explicit size and MIME allow-list enforcement.
- Improvement path: Validate payload size and MIME type before decoding or forwarding, reject oversized files with 413, and move large uploads to storage-backed processing.

## Fragile Areas

**AI Chat, Tool Approval, and Execution Flow:**
- Files: `src/hooks/use-chat-stream.ts`, `src/components/dashboard/chat/ChatPanel.tsx`, `src/components/dashboard/ToolApprovalDialog.tsx`, `supabase/functions/analyze-ads/index.ts`, `supabase/functions/google-ads-execute/index.ts`, `supabase/functions/meta-mutate/index.ts`
- Why fragile: The same chat path streams model output, persists chat history, handles attachments, creates tool approval requests, and executes live ad-platform mutations.
- Safe modification: Change one tool at a time, add contract tests around tool-call payloads, and verify both approval UI and server execution behavior for Google and Meta.
- Test coverage: No tests detected for `use-chat-stream`, chat persistence hooks, tool approval state, `analyze-ads`, `google-ads-execute`, or `meta-mutate`.

**Auth and Account Selection State:**
- Files: `src/contexts/AuthContext.tsx`, `src/contexts/DashboardContext.tsx`, `src/pages/ConnectGoogleAds.tsx`, `src/components/settings/MetaAdsSection.tsx`
- Why fragile: Google auth state depends on Supabase session, provider token restoration, `sessionStorage`, selected account persistence, and separate Meta connection state.
- Safe modification: Preserve current restoration order unless tests are expanded; add regression cases for expired provider token, account disconnect, Meta disconnect, and multi-platform switching.
- Test coverage: `src/test/AuthContext.test.tsx` covers basic Google session restoration but not Supabase OAuth redirects, selected account loading, Meta connection flows, or disconnect side effects.

**Database Migrations and Type Drift:**
- Files: `supabase/migrations/20250205_create_user_ai_settings.sql`, `supabase/migrations/20260408000000_cli_sessions.sql`, `supabase/migrations/20260408100000_meta_foundation.sql`, `supabase/migrations/20260408200000_meta_cli_sessions.sql`, `src/types/database.ts`
- Why fragile: Later migrations introduce sensitive tables not present in generated client types, while legacy names such as `openai_api_key` remain in active Gemini-related code.
- Safe modification: Regenerate types immediately after schema changes and keep table/column renames behind compatibility migrations.
- Test coverage: No migration tests or typed Supabase query tests detected.

**Google Ads GAQL Query Construction:**
- Files: `supabase/functions/google-ads-reports/index.ts`, `supabase/functions/google-ads-mutate/index.ts`, `supabase/functions/google-ads-accounts/index.ts`
- Why fragile: Query strings are assembled manually, report-type values map to custom branches, and Google Ads API version is hardcoded to `v20` in multiple functions.
- Safe modification: Centralize API version and query builders, and validate each GAQL query against fixture responses before changing report types.
- Test coverage: `src/test/useGoogleAdsReport.test.tsx` tests client hook invocation only; no edge-function query or transformer tests detected.

## Scaling Limits

**Browser Storage Cache:**
- Current capacity: Limited by each browser's `localStorage` quota, commonly around a few MB per origin.
- Limit: Large keyword, search term, ads, audience, or Meta report payloads can fail cache writes silently and force repeated API calls.
- Scaling path: Use server-side `reports_cache` with TTL, compression if needed, and account/date/report indexes.

**Two-Hour CLI Sessions With Raw Tokens:**
- Current capacity: Each CLI session row carries one raw provider token or Meta access token and one selected account.
- Limit: Multiple accounts, token rotation, revocation tracking, and auditability are limited by the current schema.
- Scaling path: Store hashed session tokens, encrypted provider credentials, account scopes, revocation timestamps, last-used metadata, and mutation audit rows.

**Single Edge Function Per Reporting Platform:**
- Current capacity: One large Google report endpoint and one Meta report endpoint handle all read report types.
- Limit: Heavy report families compete with lightweight overview requests and share deployment/runtime failure modes.
- Scaling path: Split high-volume reports from overview reads, add per-report timeout budgets, and cache expensive reports separately.

## Dependencies at Risk

**Google Ads API Version v20:**
- Risk: The active functions target Google Ads API `v20`, while project guidance still references v18 in `AGENTS.md`.
- Impact: Future API deprecations or schema changes can break manually written GAQL queries across report and mutation functions.
- Migration plan: Centralize `API_VERSION`, document the supported API version in `.planning/codebase/STACK.md` and `AGENTS.md`, and run contract checks when upgrading.

**Gemini API Stored Behind Legacy OpenAI Naming:**
- Risk: User-facing AI behavior depends on Gemini endpoints while database and types retain `openai_api_key` naming.
- Impact: Future OpenAI/Gemini provider additions will be harder to reason about and may route keys to the wrong provider.
- Migration plan: Introduce provider-specific credential records or a normalized `ai_provider_settings` table, then migrate `openai_api_key` to a clearly named Gemini key field.

**Deno URL Imports Without Locking:**
- Risk: Edge functions import Deno std, Supabase JS, and Zod directly from remote URLs.
- Impact: Local and deployed builds can drift if remote dependency resolution changes.
- Migration plan: Use Supabase import maps or pinned vendored versions for Deno dependencies.

## Missing Critical Features

**Server-Side Authorization for Account Ownership:**
- Problem: Edge functions receive `customerId`, `accountId`, provider tokens, and user IDs from the client without consistently checking ownership against Supabase auth.
- Blocks: Safe production use of AI-driven mutations, direct API access, and shared/public deployment.

**Mutation Audit Trail and Rollback Metadata:**
- Problem: Google and Meta mutation endpoints do not persist who approved a change, which account/resource changed, the before/after value, or the model recommendation that caused it.
- Blocks: Compliance review, debugging accidental budget/status changes, and reliable rollback.

**Rate Limiting and Abuse Protection:**
- Problem: No function-level rate limits, token lookup attempt limits, AI request budgets, or Google/Meta quota backoff policies are detected.
- Blocks: Cost control for AI/attachment processing and quota protection for Google Ads and Meta APIs.

**Open Questions for Next Planning Pass:**
- Problem: The repo contains Meta Ads functionality and Gemini AI behavior while core project docs still emphasize Google Ads and OpenAI.
- Blocks: Clear product scope, credential policy, API provider naming, and roadmap priority decisions.

## Test Coverage Gaps

**Untested Edge Functions:**
- What's not tested: Request validation, CORS/auth behavior, Google Ads report transformations, Meta report pagination/token refresh, attachment processing, AI SSE translation, and mutation error handling.
- Files: `supabase/functions/analyze-ads/index.ts`, `supabase/functions/google-ads-reports/index.ts`, `supabase/functions/google-ads-mutate/index.ts`, `supabase/functions/google-ads-execute/index.ts`, `supabase/functions/meta-reports/index.ts`, `supabase/functions/meta-mutate/index.ts`, `supabase/functions/process-attachment/index.ts`
- Risk: API contract changes or provider response changes can break dashboards and AI tools without test failures.
- Priority: High

**Untested AI Tool Execution Flow:**
- What's not tested: Tool-call parsing, approval modal state, approved/rejected execution paths, Google vs Meta tool routing, and persistence of tool-call parts in chat history.
- Files: `src/hooks/use-chat-stream.ts`, `src/components/dashboard/ToolApprovalDialog.tsx`, `src/components/dashboard/chat/ChatPanel.tsx`, `src/hooks/use-chat-session.ts`, `supabase/migrations/20260331_add_parts_to_chat_messages.sql`
- Risk: A model-emitted mutation can be routed incorrectly or fail after approval with poor recovery.
- Priority: High

**Untested Meta Ads Integration:**
- What's not tested: Meta OAuth callback, token refresh, account loading, Meta report hook caching, Meta CLI session flow, and Meta mutation endpoints.
- Files: `supabase/functions/meta-auth/index.ts`, `supabase/functions/meta-accounts/index.ts`, `supabase/functions/meta-reports/index.ts`, `supabase/functions/meta-mutate/index.ts`, `src/hooks/useMetaReport.ts`, `src/hooks/useMetaCliSession.ts`, `src/components/settings/MetaAdsSection.tsx`
- Risk: Token expiry, pagination, account switching, or mutation regressions can ship unnoticed.
- Priority: High

**Limited Frontend Coverage:**
- What's not tested: Dashboard pages, report tables, recommendations, data stream context, offline context, settings forms, and account selection persistence.
- Files: `src/pages/dashboard/*.tsx`, `src/pages/dashboard/meta/*.tsx`, `src/contexts/DashboardContext.tsx`, `src/contexts/DataStreamContext.tsx`, `src/contexts/OfflineContext.tsx`, `src/components/settings/*.tsx`
- Risk: Visual and state-management regressions can break core workflows despite passing the current small test suite.
- Priority: Medium

---

*Concerns audit: 2026-05-06*
