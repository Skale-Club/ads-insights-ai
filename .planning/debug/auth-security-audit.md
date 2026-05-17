---
status: investigating
trigger: "Security audit of the authentication system — token-in-URL, PKCE, RLS, edge function auth"
created: 2026-05-17T00:00:00Z
updated: 2026-05-17T00:00:00Z
---

## Current Focus

hypothesis: Audit complete — findings documented below
test: Static analysis of all auth-adjacent files, migrations, and edge functions
expecting: N/A
next_action: Deliver audit report to user

## Symptoms

expected: OAuth uses PKCE, no token in URL after redirect, RLS on all sensitive tables, edge functions validate JWT, no token logging
actual: Token reportedly visible in URL at some past point; current state unknown across all surfaces
errors: None — proactive audit
reproduction: Static code analysis + pattern search
started: Unspecified past event; now auditing proactively

## Eliminated

- hypothesis: Meta app secrets bundled into frontend
  evidence: get-platform-config only returns META_APP_ID (non-secret). META_APP_SECRET stays server-side.
  timestamp: 2026-05-17

- hypothesis: Google client secret in frontend bundle
  evidence: EnvironmentSection.tsx only shows the name "GOOGLE_CLIENT_SECRET" as a label — it does not read or expose the value.
  timestamp: 2026-05-17

- hypothesis: Token values logged directly (full token in log output)
  evidence: All console.log calls with "token" in src/ log presence-only ("Token exists"/"Provider token captured") or meta info, not the token value itself.
  timestamp: 2026-05-17

## Evidence

- timestamp: 2026-05-17
  checked: src/integrations/supabase/client.ts
  found: createClient called with auth.flowType NOT set. detectSessionInUrl: true. persistSession: true. storageKey: 'supabase.auth.token'
  implication: flowType defaults to 'pkce' in @supabase/supabase-js >= 2.x (installed: 2.94.0). PKCE is active by default. BUT no explicit opt-in means any future downgrade or fork could silently regress.

- timestamp: 2026-05-17
  checked: src/pages/AuthCallback.tsx
  found: No window.history.replaceState() call. No navigate({replace:true}) to clean the URL. The page reads window.location.hash and window.location.search but never erases them.
  implication: If Supabase returns an implicit-flow token in the hash (#access_token=...), it will linger in the URL until the user navigates away. On PKCE flow the URL contains ?code=... which is also sensitive — exchanged server-side but still visible in browser history and server logs.

- timestamp: 2026-05-17
  checked: src/contexts/AuthContext.tsx line 33-35
  found: hashParams checked for 'access_token' presence — comment "Check for OAuth callback tokens in URL" confirms the implicit flow has occurred historically.
  implication: The code explicitly guards for #access_token appearing in the hash, which is the fingerprint of the implicit flow. Even if PKCE is now default, the fact this guard exists confirms the token-in-URL report is real and was produced by the implicit flow.

- timestamp: 2026-05-17
  checked: src/contexts/AuthContext.tsx line 35 console.log
  found: console.log('[Auth] Mount - URL hash:', hashParams ? 'present' : 'none', ...) — does NOT log the hash value itself.
  implication: Safe. Presence-only logging.

- timestamp: 2026-05-17
  checked: supabase/config.toml [auth]
  found: site_url = "http://localhost:5173". No additional_redirect_urls or allowed_redirect_urls allowlist. 14 edge functions all have verify_jwt = false.
  implication: Redirect URL allowlist not configured in local config.toml. In Supabase hosted dashboard the redirect URLs are configured separately; absence here is a gap. ALL edge functions bypass JWT verification — each must do manual auth or use a shared secret.

- timestamp: 2026-05-17
  checked: All edge functions for auth validation pattern
  found: analyze-ads, google-ads-accounts, google-ads-reports, google-ads-mutate, google-ads-execute, meta-reports, meta-accounts, meta-mutate — none call supabase.auth.getUser() or validate the Authorization header. They accept providerToken / accessToken from the request body as the credential. No server-side JWT check. process-attachment accepts apiKey from body with no auth. get-platform-config returns metaAppId with no auth.
  implication: Any caller who knows the Supabase project URL can call these functions. The security model relies on the caller not knowing a valid providerToken/accessToken — which is reasonable for provider tokens (short-lived, user-specific), but means the functions are unauthenticated at the Supabase layer.

- timestamp: 2026-05-17
  checked: supabase/functions/get-cli-session/index.ts and get-meta-cli-session/index.ts
  found: Auth via session_token UUID (validated as UUID format). Looks up session in DB. Checks expiry. No JWT check. Returns provider_token / access_token in plaintext JSON response.
  implication: The session_token IS the credential here — UUID v4 is ~122 bits of entropy (adequate). But the endpoint returns the full provider_token in response body to any caller who knows the session_token. No rate limiting visible.

- timestamp: 2026-05-17
  checked: supabase/functions/meta-auth/index.ts
  found: state = userId (Supabase user UUID). No CSRF token or nonce — state is used directly as the user ID to associate the OAuth result. No verification that state matches any pending OAuth request. Service role used to upsert to meta_connections.
  implication: CRITICAL CSRF risk: Attacker can initiate Meta OAuth as themselves, but modify the redirect to include victim's state=<victim_user_id>. The edge function will then link the attacker's Meta token to the victim's account. This is a classic OAuth CSRF (cross-account linkage).

- timestamp: 2026-05-17
  checked: src/components/settings/MetaAdsSection.tsx line 13-21
  found: buildOAuthUrl() sets state: userId — user's Supabase UUID. This UUID is visible in the URL bar during the Meta OAuth redirect.
  implication: The state parameter is a static user ID, not a random nonce. It can be captured by attacker (browser history, Referer header) and replayed to link their Meta account to the victim's Supabase user.

- timestamp: 2026-05-17
  checked: src/components/settings/MetaAdsSection.tsx line 73
  found: window.history.replaceState({}, '', window.location.pathname) — URL cleaned after meta_connected=true callback.
  implication: Good. Meta redirect URL (/settings?meta_connected=true) does NOT include a token, so no token-in-URL issue on the Meta side. URL is cleaned promptly.

- timestamp: 2026-05-17
  checked: src/components/settings/MetaAdsSection.tsx lines 77-84 and 134-137
  found: Browser fetches access_token from meta_connections table via JS client: .select('meta_user_name, expires_at, access_token'). Token is then passed to fetchAccounts() and on to meta-accounts edge function in request body.
  implication: The long-lived Meta access token is pulled from the DB into browser memory on each settings page load and after Meta OAuth. It transits over HTTPS but is in browser JS heap and in the XHR request body. This is an acceptable pattern (better than storing it in localStorage) but worth noting.

- timestamp: 2026-05-17
  checked: supabase/migrations — all 10 files
  found: RLS status per table:
    - user_ai_settings: RLS ENABLED, full CRUD policies
    - chat_sessions: RLS ENABLED, SELECT/INSERT/DELETE/UPDATE policies
    - chat_messages: RLS ENABLED, SELECT/INSERT policies via session join
    - cli_sessions: RLS ENABLED, owner ALL policy
    - meta_connections: RLS ENABLED, owner ALL policy
    - meta_accounts: RLS ENABLED, owner ALL policy
    - meta_cli_sessions: RLS ENABLED, owner ALL policy
    - companies: RLS ENABLED, owner ALL policy
    - project_keepalive_heartbeat: RLS ENABLED (migration 20260219100000), NO policies — table has no read/write policies for any user
    - profiles: NO migration found — RLS status unknown
    - google_connections: NO migration found — RLS status unknown
    - ads_accounts: NO migration found — RLS status unknown
    - reports_cache: NO migration found — RLS status unknown
  implication: profiles, google_connections, ads_accounts, reports_cache exist in database.ts type definitions but have no migration files in the codebase. Their RLS status cannot be verified statically. project_keepalive_heartbeat has RLS enabled but no policies — meaning no authenticated user can read/write it (only service_role), which is correct given the restricted GRANT on touch_project_keepalive().

- timestamp: 2026-05-17
  checked: src/contexts/AuthContext.tsx signInWithGoogle
  found: scopes: 'https://www.googleapis.com/auth/adwords', queryParams: { access_type: 'offline', prompt: 'consent' }. No state parameter or CSRF token added to the OAuth request.
  implication: Google OAuth initiated via Supabase's signInWithOAuth which internally handles state/nonce for PKCE. This is handled by the SDK — not a manual vulnerability.

- timestamp: 2026-05-17
  checked: src/pages/AuthCallback.tsx for open-redirect
  found: navigate('/dashboard') is a hardcoded destination — no returnTo URL parameter processed from the URL.
  implication: No open redirect vulnerability in AuthCallback. Safe.

- timestamp: 2026-05-17
  checked: CORS headers across all edge functions
  found: All functions use "Access-Control-Allow-Origin": "*" — no origin restriction.
  implication: Wildcard CORS means any website can make credentialless requests to these functions. Since the functions use body-based credentials (providerToken/accessToken), not cookies, this is lower risk than if they relied on cookie auth. However, it means any site can call these endpoints if it somehow obtains a valid token.

- timestamp: 2026-05-17
  checked: Token logging in supabase/functions/
  found: meta-auth logs "[meta-auth] Short-lived token error:" with the error string (not the token). meta-auth logs "[meta-auth] Connected Meta user {metaUserId} ({metaUserName}) for user {state}" — state = userId. meta-reports logs "Refreshed token for user {userId}". No functions log actual token values.
  implication: Safe — no token values reach server logs.

## Resolution

root_cause: Multiple issues — documented in full audit below
fix: N/A — report only
verification: N/A
files_changed: []
