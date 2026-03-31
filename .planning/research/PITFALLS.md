# Pitfalls Research

**Domain:** Google Ads Analytics Platform
**Researched:** 2026-03-31
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Ignoring Google Ads API Rate Limits

**What goes wrong:**
Requests fail with `RateExceededError`, causing dashboard timeouts and incomplete data. Users see partial results or errors.

**Why it happens:**
Google Ads API enforces queries per second (QPS) limits per customer ID and developer token. Developers assume API calls are unlimited.

**How to avoid:**
Implement token bucket algorithm with exponential backoff. Cache frequent queries. Batch requests using `GoogleAdsService.SearchStream`.

**Warning signs:**
- Dashboard loads slowly for accounts with many campaigns
- Intermittent "RateExceededError" in logs
- Partial data displayed without warning

**Phase to address:**
Foundation (infrastructure layer)

---

### Pitfall 2: Storing OAuth Tokens Insecurely

**What goes wrong:**
XSS attacks steal Google OAuth tokens from sessionStorage, allowing attackers to access user's Google Ads accounts.

**Why it happens:**
sessionStorage is accessible via JavaScript, making it vulnerable to XSS. Using httpOnly cookies requires server-side token handling.

**How to avoid:**
Implement token rotation with refresh tokens stored server-side. Use httpOnly cookies for access tokens. Add CSRF tokens.

**Warning signs:**
- Any XSS vulnerability becomes account takeover
- No token expiration mechanism visible
- Tokens visible in browser DevTools Application tab

**Phase to address:**
Foundation (security hardening)

---

### Pitfall 3: No Error Boundaries on Dashboard Components

**What goes wrong:**
Single component error (chart, table) crashes entire dashboard. Users see blank screens with no recovery option.

**Why it happens:**
React default error handling shows blank screen. Developers test happy paths only.

**How to avoid:**
Wrap all dashboard components in React error boundaries. Show graceful degradation with "Unable to load this section" message.

**Warning signs:**
- Dashboard crashes when one chart fails to render
- No error messages shown to users, just blank areas

**Phase to address:**
Foundation (reliability)

---

### Pitfall 4: Fetching All Data Without Pagination

**What goes wrong:**
Large accounts (thousands of keywords/ads) cause timeout or memory exhaustion. Dashboard becomes unusable.

**Why it happens:**
Google Ads API returns all results by default. Developers don't implement pagination from start.

**How to avoid:**
Use `pageSize` and `nextPageToken` in API calls. Implement infinite scroll or "load more" UI. Set reasonable limits (1000 records default).

**Warning signs:**
- 30+ second load times for keyword page
- Browser memory usage spikes
- Network timeout errors in console

**Phase to address:**
Foundation (performance)

---

### Pitfall 5: Silent API Failure Handling

**What goes wrong:**
Edge functions return HTTP 200 with error JSON, making it impossible to distinguish success from failure in client code.

**Why it happens:**
Developers prioritize "working" over proper HTTP status codes. Error handling is added late.

**How to avoid:**
Return appropriate HTTP status codes (400, 401, 403, 500). Parse error responses in client. Show user-friendly error messages.

**Warning signs:**
- No error toasts appear when API fails
- Console shows "status: 200" with error messages
- Users don't know something went wrong

**Phase to address:**
Foundation (reliability)

---

### Pitfall 6: No Retry Logic for Transient Failures

**What goes wrong:**
Single network hiccup causes complete request failure. Users must manually refresh.

**Why it happens:**
No retry mechanism implemented. Single fetch attempt with no resilience.

**How to avoid:**
Implement exponential backoff retry (3 attempts). Handle Google Ads retryable errors specifically. Show "Retrying..." state to users.

**Warning signs:**
- Intermittent failures on page refresh work
- Network tab shows failed requests with no retry

**Phase to address:**
Foundation (reliability)

---

### Pitfall 7: Mismatched Data Between Dashboard and Google Ads

**What goes wrong:**
Users see different numbers than Google Ads UI, losing trust in the platform.

**Why it happens:**
Timezone differences, data attribution windows, conversion tracking gaps. No validation against known values.

**How to avoid:**
Document timezone handling clearly. Add "Validate against Google Ads" feature. Show date range alignment clearly.

**Warning signs:**
- Users report "numbers don't match Google"
- CTR calculated differently than Google
- Conversion count discrepancies

**Phase to address:**
Validation (data accuracy)

---

### Pitfall 8: Building Without Test Coverage

**What goes wrong:**
Refactoring breaks features silently. Auth regressions go unnoticed. API contract changes break frontend.

**Why it happens:**
Tests seen as "nice to have". No test infrastructure setup. Edge functions considered "too hard to test".

**How to avoid:**
Add tests for AuthContext, DashboardContext, useGoogleAdsReport hook. Use Vitest with jsdom. Test edge functions via integration tests.

**Warning signs:**
- One trivial test in entire codebase
- Refactoring avoided due to fear of breaking
- Bug fixes create new bugs

**Phase to address:**
Foundation (quality infrastructure)

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Using `any` types in edge functions | Fast to write, compiles | Type safety lost, silent bugs | Never — define interfaces |
| Duplicating similar API fetch functions | Quick to implement | Maintenance burden, drift | Only in prototyping phase |
| Hardcoding system prompts | Works immediately | Hard to maintain, test, version | Never — use config/DB |
| CORS wildcard "*" | Works locally | Security risk in production | Development only |
| No request validation | Faster to ship | Runtime errors, security risk | Never — use Zod |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Google Ads API | Not handling `QuotaUserError` | Implement per-user rate limiting |
| Google Ads API | Using v18 features with v20 token | Match API version to token |
| Google Ads API | Ignoring `AuthenticationError` | Implement automatic token refresh |
| OpenAI/Gemini API | No request timeout | Set 30s timeout, show loading state |
| Supabase | No JWT verification | Verify in every function or config.toml |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Fetching all campaigns at once | 30s+ load time, timeout | Use pagination, lazy load | 100+ campaigns |
| No caching of reports | Every dashboard visit hits API | Implement cache with TTL | Repeated views |
| Sequential API calls | Double load time | Parallelize with Promise.all | Multiple report types |
| Rendering 1000+ table rows | Browser freeze | Virtual scrolling, pagination | Large accounts |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| No JWT verification on edge functions | Anonymous API access | Enable verify_jwt in config.toml |
| Storing tokens in sessionStorage | XSS token theft | Use httpOnly cookies or server-side |
| No rate limiting on functions | DoS, quota exhaustion | Add Supabase rate limiting |
| Exposing developer token in client | Account takeover | Keep server-side only |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Inconsistent loading states | Confusing, feels broken | Use skeleton loaders everywhere |
| No offline handling | Errors when network drops | Detect offline, show message |
| Silent failures | Users don't know something wrong | Toast notifications for errors |
| No empty states | Confusing when no data | Show helpful message with action |
| Date range not obvious | Wrong time period analyzed | Prominent date selector, defaults clear |

---

## "Looks Done But Isn't" Checklist

- [ ] **Google Ads connection:** Token stored but refresh logic not tested — verify token refresh works after 1 hour
- [ ] **Report caching:** Cache table exists but nothing writes to it — verify cache hits on repeat queries
- [ ] **Error handling:** Edge functions return errors but client doesn't show them — verify user sees error toast
- [ ] **Date filtering:** Date picker exists but API queries don't use it — verify filtered results differ
- [ ] **Account switching:** Dropdown works but doesn't refetch data — verify data updates on switch

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Rate limit exceeded | LOW | Add backoff, cache responses, retry |
| XSS token theft | HIGH | Rotate tokens, implement server-side storage |
| No pagination timeout | MEDIUM | Implement pagination, increase timeout |
| Silent API failure | MEDIUM | Add proper HTTP status codes, error handling |
| Data mismatch | HIGH | Validate against Google Ads, document attribution |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| API rate limits | Foundation | Test with large account, verify no 429s |
| Insecure token storage | Foundation | Security audit, XSS test |
| No error boundaries | Foundation | Trigger error, verify graceful message |
| No pagination | Foundation | Load large account, verify responsive |
| Silent API failures | Foundation | Trigger API error, verify toast appears |
| No retry logic | Foundation | Network throttling test |
| Data mismatch | Validation | Compare numbers with Google Ads UI |
| No test coverage | Foundation | Run coverage report, add CI |

---

## Sources

- Google Ads API Best Practices: https://developers.google.com/google-ads/api/docs/best-practices/overview
- Google Ads API Error Handling: https://developers.google.com/google-ads/api/docs/get-started/handle-errors
- Google Ads API Rate Limits: https://developers.google.com/google-ads/api/docs/productionize/rate-limits
- Common Google Ads API Errors: https://developers.google.com/google-ads/api/docs/common-errors
- Current codebase concerns: .planning/codebase/CONCERNS.md

---

*Pitfalls research for: Google Ads Analytics Platform*
*Researched: 2026-03-31*