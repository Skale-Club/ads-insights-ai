# External Integrations

**Analysis Date:** 2026-05-06

## APIs & External Services

**Google Ads Platform:**
- Google Ads API v20 - Google Ads account discovery, performance reporting, and mutations.
  - SDK/Client: Direct HTTP fetch from Deno Edge Functions; no official Google Ads SDK dependency is installed.
  - Auth: Google OAuth provider token from Supabase Auth plus `GOOGLE_ADS_DEVELOPER_TOKEN`.
  - Optional manager auth: `GOOGLE_ADS_LOGIN_CUSTOMER_ID`.
  - OAuth scope: `https://www.googleapis.com/auth/adwords` in `src/contexts/AuthContext.tsx`.
  - Account discovery: `supabase/functions/google-ads-accounts/index.ts` calls `customers:listAccessibleCustomers` or MCC `customer_client` search.
  - Reporting: `supabase/functions/google-ads-reports/index.ts` calls `googleAds:searchStream` for overview, campaigns, keywords, search terms, ad groups, ads, audiences, budgets, conversions, negative keywords, and demographics.
  - Direct mutations: `supabase/functions/google-ads-mutate/index.ts` handles campaign status, negative keywords, bid adjustments, campaign budgets, and shared budgets.
  - Chat-approved mutations: `supabase/functions/google-ads-execute/index.ts` maps approved AI tool calls to Google Ads mutate operations.
  - Frontend callers: `src/hooks/useGoogleAdsReport.ts`, `src/pages/ConnectGoogleAds.tsx`, `src/pages/dashboard/Campaigns.tsx`, `src/pages/dashboard/SearchTerms.tsx`, and `src/hooks/use-chat-stream.ts`.

**Meta Ads Platform:**
- Meta Marketing API v20.0 - Meta ad account connection, reporting, and mutations.
  - SDK/Client: Direct HTTP fetch to Graph API from Deno Edge Functions.
  - Auth: Meta OAuth through `META_APP_ID`, `META_APP_SECRET`, and `META_REDIRECT_URI`; long-lived access tokens are stored in Supabase.
  - OAuth UI: `src/components/settings/MetaAdsSection.tsx` builds the Facebook OAuth URL with `ads_read`, `ads_management`, and `business_management` scopes.
  - OAuth callback: `supabase/functions/meta-auth/index.ts` exchanges authorization codes for short-lived and long-lived tokens, fetches user profile data, and redirects to `/settings`.
  - App config lookup: `supabase/functions/get-platform-config/index.ts` exposes `META_APP_ID` to the frontend.
  - Account discovery: `supabase/functions/meta-accounts/index.ts` fetches `/me/adaccounts` and upserts accounts.
  - Reporting: `supabase/functions/meta-reports/index.ts` fetches account insights, campaigns, ad sets, ads, placement breakdowns, and daily performance.
  - Mutations: `supabase/functions/meta-mutate/index.ts` pauses/enables campaigns and updates daily or lifetime budgets.
  - Frontend callers: `src/components/settings/MetaAdsSection.tsx`, `src/hooks/useMetaReport.ts`, and `src/hooks/use-chat-stream.ts`.

**AI/ML:**
- Google Gemini API - AI chat, analysis, recommendations, tool-calling response generation, and image analysis.
  - SDK/Client: Direct HTTP fetch to `https://generativelanguage.googleapis.com/v1beta/models/...`.
  - Auth: User-provided API key from `src/components/settings/AISettingsCard.tsx`, stored in `user_ai_settings.openai_api_key` for compatibility naming.
  - Chat function: `supabase/functions/analyze-ads/index.ts`.
  - Image function: `supabase/functions/process-attachment/index.ts` calls `gemini-2.5-flash:generateContent`.
  - Model selection: `src/components/settings/AISettingsCard.tsx` allows Gemini 3 Flash Preview, Gemini 3 Pro Preview, Gemini 2.5 Flash, and Gemini 2.5 Pro; default is `gemini-2.5-flash`.
  - AI SDK bridge: `src/hooks/use-chat-v2.ts` wraps `@ai-sdk/react` with a custom transport, currently disabled by `features.aiSdk` in `src/config/features.ts`.

**Speech and Attachments:**
- Google Cloud Speech-to-Text API - Audio transcription for chat attachments.
  - SDK/Client: Direct HTTP fetch from `supabase/functions/process-attachment/index.ts`.
  - Auth: User-provided API key sent in the request body.
  - Endpoint: `https://speech.googleapis.com/v1/speech:recognize`.
  - Frontend caller: `src/hooks/use-chat-stream.ts`.

**Analytics:**
- Vercel Analytics - Client-side analytics collection.
  - SDK/Client: `@vercel/analytics/react`.
  - Auth: Not detected.
  - Implementation: `<Analytics />` in `src/App.tsx`.

**CLI Session Access:**
- Claude Code style external session endpoints - Short-lived session-token access to ad accounts from outside the browser.
  - SDK/Client: Supabase Edge Functions with service role database reads.
  - Google endpoint: `supabase/functions/get-cli-session/index.ts` reads `cli_sessions`.
  - Meta endpoint: `supabase/functions/get-meta-cli-session/index.ts` reads `meta_cli_sessions`.
  - Auth: Random UUID `session_token` plus expiration; backed by `SUPABASE_SERVICE_ROLE_KEY`.
  - Frontend config display: `src/components/settings/ClaudeCodeSection.tsx` and `src/components/settings/MetaClaudeCodeSection.tsx`.

## Data Storage

**Databases:**
- Supabase PostgreSQL - Primary application database.
  - Connection: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for browser client in `src/integrations/supabase/client.ts`.
  - Service role connection: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Edge Functions such as `supabase/functions/meta-auth/index.ts`, `supabase/functions/meta-accounts/index.ts`, and `supabase/functions/get-cli-session/index.ts`.
  - Client: `@supabase/supabase-js` in browser and Edge Functions.
  - Typed tables in `src/types/database.ts`: `profiles`, `google_connections`, `ads_accounts`, `reports_cache`, and `user_ai_settings`.
  - Chat migrations: `supabase/migrations/20260209090000_create_chat_history.sql`, `supabase/migrations/20260209090100_add_account_id_to_chat.sql`, `supabase/migrations/20260209090200_add_archived_to_chat_sessions.sql`, and `supabase/migrations/20260331_add_parts_to_chat_messages.sql`.
  - Meta migrations: `supabase/migrations/20260408100000_meta_foundation.sql` creates `companies`, `meta_connections`, and `meta_accounts`.
  - CLI migrations: `supabase/migrations/20260408000000_cli_sessions.sql` and `supabase/migrations/20260408200000_meta_cli_sessions.sql`.
  - Keepalive migration: `supabase/migrations/20260218_create_project_keepalive.sql` and RLS migration `supabase/migrations/20260219100000_enable_rls_on_project_keepalive_heartbeat.sql`.

**File Storage:**
- Local browser payload handling - CSV, Excel, audio, and image attachment payloads are processed through chat request bodies in `src/hooks/use-chat-stream.ts` and `supabase/functions/process-attachment/index.ts`.
- Supabase Storage usage: Not detected in current source files.

**Caching:**
- Browser `localStorage` cache - Google reports use `adsinsight:cache:*` keys in `src/hooks/useGoogleAdsReport.ts`; Meta reports use `adsinsight:meta:cache:*` keys in `src/hooks/useMetaReport.ts`; both use a 5 minute TTL.
- Supabase `reports_cache` table - Present in generated types at `src/types/database.ts`, but the current report hooks cache in `localStorage`.
- React Query cache - Query keys are scoped by platform, report type, account, dates, and previous-period state in `src/hooks/useGoogleAdsReport.ts` and `src/hooks/useMetaReport.ts`.

## Authentication & Identity

**Auth Provider:**
- Supabase Auth with Google OAuth.
  - Implementation: `src/contexts/AuthContext.tsx` calls `supabase.auth.signInWithOAuth({ provider: 'google' })`.
  - Provider config: `[auth.external.google]` in `supabase/config.toml` uses `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
  - Redirect path: frontend redirects to `/auth/callback`, routed in `src/App.tsx` to `src/pages/AuthCallback.tsx`.
  - Token storage: Supabase session persists under `supabase.auth.token`; Google provider token is also stored in `sessionStorage` as `google_provider_token`.
  - Google Ads auth: Edge Functions receive the provider token in request bodies.

**Meta Identity:**
- Meta OAuth is handled independently of Supabase Auth.
  - Entry point: `src/components/settings/MetaAdsSection.tsx`.
  - Callback: `supabase/functions/meta-auth/index.ts`.
  - Token storage: `meta_connections.access_token`, `token_type`, `meta_user_id`, `meta_user_name`, and `expires_at` from `supabase/migrations/20260408100000_meta_foundation.sql`.
  - Token refresh: `supabase/functions/meta-reports/index.ts` refreshes tokens through Meta OAuth when near expiry.

**Database Authorization:**
- Row Level Security is enabled in migrations for user-specific tables including `user_ai_settings`, `chat_sessions`, `chat_messages`, `companies`, `meta_connections`, `meta_accounts`, `cli_sessions`, and `meta_cli_sessions`.
- Service role bypass is used only in Edge Functions that need server-side token/session access, including `supabase/functions/meta-auth/index.ts`, `supabase/functions/meta-accounts/index.ts`, `supabase/functions/meta-reports/index.ts`, `supabase/functions/get-cli-session/index.ts`, and `supabase/functions/get-meta-cli-session/index.ts`.

## Monitoring & Observability

**Error Tracking:**
- Dedicated error tracking service: Not detected.
- Frontend error boundary: `src/components/ErrorBoundary.tsx` wraps routes in `src/App.tsx`.

**Logs:**
- Frontend logs use `console.log` and `console.error` in `src/contexts/AuthContext.tsx` and settings/report flows.
- Edge Function logs use Deno `console.log` and `console.error` in `supabase/functions/*/index.ts`.
- Supabase function platform logs are the operational log destination for deployed functions.

**Health Checks:**
- `supabase/functions/healthcheck/index.ts` returns function health data and `SB_REGION` when present.
- `supabase/config.toml` registers `healthcheck` with `verify_jwt = false`.

## CI/CD & Deployment

**Hosting:**
- Frontend hosting target: Static Vite app; Vercel is indicated by `@vercel/analytics` and `<Analytics />` in `src/App.tsx`.
- Backend hosting target: Supabase hosted PostgreSQL, Auth, and Edge Functions.
- Local Supabase ports: API `54321`, database `54322`, Studio `54323` in `supabase/config.toml`.

**CI Pipeline:**
- Repository CI workflow: Not detected in inspected files.

**Deployment:**
- Frontend build command: `npm run build` from `package.json`.
- Frontend development server: `npm run dev` on port `8000` from `vite.config.ts`.
- Edge Function deployment: Supabase CLI command pattern `supabase functions deploy <function-name>`.
- Edge Function JWT verification: `verify_jwt = false` for all listed functions in `supabase/config.toml`; functions handle CORS internally.

## Environment Configuration

**Required env vars:**
- `VITE_SUPABASE_URL` - Browser Supabase project URL used in `src/integrations/supabase/client.ts`.
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Browser Supabase publishable/anon key used in `src/integrations/supabase/client.ts`.
- `GOOGLE_CLIENT_ID` - Supabase Google auth provider setting in `supabase/config.toml`.
- `GOOGLE_CLIENT_SECRET` - Supabase Google auth provider setting in `supabase/config.toml`.
- `GOOGLE_ADS_DEVELOPER_TOKEN` - Google Ads API developer token read in `supabase/functions/google-ads-accounts/index.ts`, `supabase/functions/google-ads-reports/index.ts`, `supabase/functions/google-ads-mutate/index.ts`, and `supabase/functions/google-ads-execute/index.ts`.
- `SUPABASE_URL` - Edge Function server-side Supabase URL used by Meta, CLI session, and analyze-ads helper flows.
- `SUPABASE_SERVICE_ROLE_KEY` - Edge Function service role key used for server-side database access.
- `META_APP_ID` - Meta OAuth app ID used in `supabase/functions/meta-auth/index.ts`, `supabase/functions/get-platform-config/index.ts`, and `supabase/functions/meta-reports/index.ts`.
- `META_APP_SECRET` - Meta OAuth app secret used in `supabase/functions/meta-auth/index.ts` and `supabase/functions/meta-reports/index.ts`.
- `META_REDIRECT_URI` - Meta OAuth redirect URI used in `supabase/functions/meta-auth/index.ts`.

**Optional env vars:**
- `GOOGLE_ADS_LOGIN_CUSTOMER_ID` - Optional MCC/customer login header for Google Ads functions.
- `SITE_URL` - Optional Meta OAuth post-callback redirect base; defaults to `http://localhost:5173` in `supabase/functions/meta-auth/index.ts`.
- `SB_REGION` - Optional region field returned by `supabase/functions/healthcheck/index.ts`.

**User-provided secrets:**
- Gemini API key - Entered in `src/components/settings/AISettingsCard.tsx`, stored as `user_ai_settings.openai_api_key`, and sent to `supabase/functions/analyze-ads/index.ts` plus `supabase/functions/process-attachment/index.ts`.
- Google provider token - Captured from Supabase Auth and stored in `sessionStorage` as `google_provider_token` by `src/contexts/AuthContext.tsx`.
- Meta access token - Stored in `meta_connections.access_token` by `supabase/functions/meta-auth/index.ts`.
- CLI session tokens - Stored in `cli_sessions.session_token` and `meta_cli_sessions.session_token` by migrations under `supabase/migrations/`.

**Secrets location:**
- Local environment files exist as `.env` and `.env.example`; contents were not read.
- Supabase Edge Function secrets are expected in the Supabase project environment.
- User AI and platform tokens are persisted in Supabase tables with RLS policies.

## Webhooks & Callbacks

**Incoming:**
- `/auth/callback` - Frontend Supabase Google OAuth callback route in `src/App.tsx`.
- `supabase/functions/meta-auth/index.ts` - Meta OAuth callback Edge Function, configured through `META_REDIRECT_URI`.
- `supabase/functions/get-cli-session/index.ts` - External caller session-token exchange for Google Ads CLI access.
- `supabase/functions/get-meta-cli-session/index.ts` - External caller session-token exchange for Meta Ads CLI access.
- `supabase/functions/healthcheck/index.ts` - Health endpoint.

**Outgoing:**
- Google Ads API calls to `https://googleads.googleapis.com/v20/...` from `supabase/functions/google-ads-accounts/index.ts`, `supabase/functions/google-ads-reports/index.ts`, `supabase/functions/google-ads-mutate/index.ts`, and `supabase/functions/google-ads-execute/index.ts`.
- Meta Graph API calls to `https://graph.facebook.com/v20.0/...` from `supabase/functions/meta-auth/index.ts`, `supabase/functions/meta-accounts/index.ts`, `supabase/functions/meta-reports/index.ts`, and `supabase/functions/meta-mutate/index.ts`.
- Gemini API calls to `https://generativelanguage.googleapis.com/v1beta/models/...` from `supabase/functions/analyze-ads/index.ts` and `supabase/functions/process-attachment/index.ts`.
- Google Speech-to-Text calls to `https://speech.googleapis.com/v1/speech:recognize` from `supabase/functions/process-attachment/index.ts`.
- Supabase Edge Function cross-calls from `supabase/functions/analyze-ads/index.ts` to `google-ads-reports` and `meta-reports`.

---

*Integration audit: 2026-05-06*
