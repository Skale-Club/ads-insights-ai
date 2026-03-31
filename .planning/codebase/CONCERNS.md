# Codebase Concerns

**Analysis Date:** 2026-03-31

## Security Concerns

### JWT Verification Disabled on All Edge Functions
- **Issue:** All Supabase Edge Functions have `verify_jwt = false` in `supabase/config.toml`
- **Files:** `supabase/config.toml` lines 24-34
- **Impact:** No authentication verification on API endpoints. Anyone with the function URL can call these endpoints.
- **Recommendation:** Implement JWT verification or add explicit authorization checks within each function.

### OAuth Tokens Stored in sessionStorage
- **Issue:** Provider tokens stored in `sessionStorage` which is accessible via JavaScript
- **Files:** `src/contexts/AuthContext.tsx` lines 54, 99, 103
- **Current mitigation:** Tokens are only stored in sessionStorage (cleared on tab close), not localStorage
- **Risk:** Vulnerable to XSS attacks. If any malicious script runs on the page, it can steal the Google OAuth token.
- **Recommendation:** Consider using httpOnly cookies for token storage if possible, or implement additional CSRF protection.

### No Rate Limiting on Edge Functions
- **Issue:** Edge functions have no rate limiting configured
- **Files:** All functions in `supabase/functions/`
- **Risk:** API abuse, potential quota exhaustion from Google Ads API
- **Recommendation:** Add rate limiting at Supabase edge or implement request throttling.

### All Edge Functions Return HTTP 200 Even on Errors
- **Issue:** Error responses return `status: 200` with error JSON, making debugging difficult
- **Files:** `supabase/functions/google-ads-reports/index.ts` lines 1466-1467, 1564-1567; `supabase/functions/google-ads-accounts/index.ts` lines 76-79, 139-142; `supabase/functions/google-ads-mutate/index.ts` lines 220-223, 288-291
- **Impact:** Makes it hard to distinguish successful responses from errors in client code and network logs
- **Recommendation:** Return appropriate HTTP status codes (400, 401, 403, 500).

---

## Known Bugs

### demographics_location Report Uses Wrong Function
- **Issue:** The `demographics_location` report type calls `fetchDemographicsAge` instead of a location-specific query
- **Files:** `supabase/functions/google-ads-reports/index.ts` line 1548
- **Trigger:** Navigate to Demographics > Location in dashboard
- **Workaround:** None - returns incorrect data (age demographics instead of location)
- **Fix approach:** Implement `fetchDemographicsLocation` function with proper geographic query (country, region, city).

### Missing verify_jwt for Two Edge Functions
- **Issue:** `google-ads-execute` and `process-attachment` functions not in config.toml
- **Files:** `supabase/config.toml` (missing entries for functions that exist)
- **Impact:** These functions also have no JWT verification but are not explicitly configured
- **Fix approach:** Add entries to config.toml with `verify_jwt = false` for consistency or implement auth.

---

## Tech Debt

### No Test Coverage
- **Issue:** Only one trivial test exists: `src/test/example.test.ts`
- **Files:** `src/test/setup.ts`, `src/test/example.test.ts`
- **Impact:** No protection against regressions, hard to refactor safely
- **Fix approach:** Add tests for: AuthContext, DashboardContext, hook utilities, edge function logic.

### Type Safety Gaps in Edge Functions
- **Issue:** Heavy use of `any` types throughout edge functions
- **Files:** `supabase/functions/google-ads-reports/index.ts`, `supabase/functions/analyze-ads/index.ts`
- **Impact:** No compile-time type checking, easy to introduce subtle bugs
- **Fix approach:** Define interfaces for API request/response shapes.

### Duplicate Code in google-ads-reports
- **Issue:** `fetchNegativeKeywordsBothLevels` and `fetchNegativeKeywordsWithErrorDetails` have nearly identical logic
- **Files:** `supabase/functions/google-ads-reports/index.ts` lines 1188-1293, 1295-1415
- **Impact:** Maintainability burden
- **Fix approach:** Consolidate into single function with error handling built-in.

### No Request Validation in Edge Functions
- **Issue:** No input sanitization or schema validation on incoming requests
- **Files:** All edge functions
- **Risk:** Malformed requests could cause runtime errors or unexpected behavior
- **Recommendation:** Add Zod validation for request bodies.

### Reports Cache Table Not Used
- **Issue:** `reports_cache` table exists in schema but caching is never implemented
- **Files:** `src/types/database.ts` lines 93-124
- **Impact:** Every dashboard request hits Google Ads API directly, slower performance
- **Fix approach:** Implement caching logic with TTL in edge functions.

---

## Performance Concerns

### No Pagination on Large Datasets
- **Issue:** Google Ads queries return all results without pagination
- **Files:** `supabase/functions/google-ads-reports/index.ts`
- **Impact:** Large accounts (thousands of keywords/ads) will be slow or timeout
- **Fix approach:** Implement paged fetching with limit/offset or seek method.

### Multiple Sequential API Calls in fetchConversionsSpecial
- **Issue:** Makes two separate API calls that could be combined
- **Files:** `supabase/functions/google-ads-reports/index.ts` lines 625-808
- **Impact:** Slower response times
- **Fix approach:** Combine queries or parallelize with Promise.all.

### No Retry Logic for Google Ads API Calls
- **Issue:** Single fetch attempt with no retry on transient failures
- **Files:** All edge functions
- **Impact:** Unreliable in production (network issues, rate limits)
- **Recommendation:** Add exponential backoff retry (3 attempts).

---

## Database Concerns

### No Indexes on Common Query Columns
- **Issue:** `user_id`, `customer_id`, `date_start`, `date_end` likely unindexed
- **Files:** Migrations in `supabase/migrations/`
- **Impact:** Slow queries as data grows
- **Fix approach:** Add composite indexes: (user_id, customer_id), (customer_id, date_start, date_end).

### Token Encryption Method Unknown
- **Issue:** Tokens stored as `access_token_encrypted` but encryption method not visible in codebase
- **Files:** `src/types/database.ts` lines 38-66
- **Risk:** May be using weak or no encryption
- **Recommendation:** Verify encryption is implemented server-side or via Supabase vault.

---

## Fragile Areas

### AuthContext Token Restoration
- **Issue:** Complex token restoration logic with potential race conditions
- **Files:** `src/contexts/AuthContext.tsx` lines 79-112
- **Why fragile:** Relies on sessionStorage + Supabase session + provider_token, order matters
- **Safe modification:** Add integration tests covering all token states
- **Test coverage:** Currently none

### Hardcoded System Prompts
- **Issue:** Large system prompt strings embedded in edge function code
- **Files:** `supabase/functions/analyze-ads/index.ts` lines 125-160
- **Why fragile:** Hard to maintain, test, or version control
- **Recommendation:** Move to separate configuration or database table.

### CORS Wildcard "*" Allowed
- **Issue:** All edge functions use `"Access-Control-Allow-Origin": "*"`
- **Files:** All functions in `supabase/functions/`
- **Impact:** Allows any website to call these APIs
- **Recommendation:** Restrict to specific domains in production.

---

## Missing Critical Features

### Error Boundaries in React
- **Issue:** No React error boundaries to catch component crashes
- **Impact:** Full app crashes on component errors
- **Fix approach:** Add error boundary around main content areas.

### Offline Handling
- **Issue:** No offline detection or graceful degradation
- **Impact:** App shows errors when network is down
- **Recommendation:** Add online/offline event listeners and user feedback.

### Loading States Consistency
- **Issue:** Different components handle loading differently (some use skeletons, some spinners, some nothing)
- **Impact:** Inconsistent UX
- **Recommendation:** Standardize loading state components.

---

## Test Coverage Gaps

### Untested: All Authentication Flows
- **What's not tested:** Login, logout, token refresh, session restoration
- **Files:** `src/contexts/AuthContext.tsx`
- **Risk:** Auth regressions would go unnoticed
- **Priority:** High

### Untested: Dashboard Data Fetching
- **What's not tested:** useGoogleAdsReport hook, report transformations
- **Files:** `src/hooks/useGoogleAdsReport.ts`
- **Risk:** Data parsing bugs in edge cases
- **Priority:** Medium

### Untested: Edge Functions
- **What's not tested:** All 6 edge functions have no test coverage
- **Files:** `supabase/functions/**/*.ts`
- **Risk:** API contract changes break frontend silently
- **Priority:** Medium

---

*Concerns audit: 2026-03-31*
