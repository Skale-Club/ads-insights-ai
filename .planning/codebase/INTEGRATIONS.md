# External Integrations

**Analysis Date:** 2026-03-31

## APIs & External Services

**Google Ads Platform:**
- Google Ads API v20 - Campaign data fetching
  - SDK: Direct HTTP fetch (no official SDK in edge functions)
  - Auth: OAuth 2.0 via Supabase Auth (provider token)
  - Edge function: `supabase/functions/google-ads-reports/index.ts`
  - Edge function: `supabase/functions/google-ads-accounts/index.ts`
  - Edge function: `supabase/functions/google-ads-mutate/index.ts`
  - Edge function: `supabase/functions/google-ads-execute/index.ts`
  - Required: `GOOGLE_ADS_DEVELOPER_TOKEN` environment variable
  - Optional: `GOOGLE_ADS_LOGIN_CUSTOMER_ID` for MCC account access

**AI/ML:**
- Google Gemini API - AI-powered insights and recommendations
  - SDK: Direct HTTP fetch in edge function
  - Edge function: `supabase/functions/analyze-ads/index.ts`
  - Auth: User-provided API key (stored in database)
  - Models: gemini-2.5-flash (default), configurable
  - Features: Streaming responses, function calling for campaign actions

**Backend-as-a-Service:**
- Supabase - Database, Auth, Edge Functions
  - Client: `@supabase/supabase-js` 2.94.0
  - Auth: Google OAuth 2.0
  - Database: PostgreSQL with Row Level Security (RLS)
  - Edge Functions: Deno runtime

## Data Storage

**Databases:**
- PostgreSQL (via Supabase)
  - Connection: `VITE_SUPABASE_URL` environment variable
  - Client: Supabase JS client
  - Tables: profiles, google_connections, ads_accounts, reports_cache, user_ai_settings, chat_history

**File Storage:**
- Supabase Storage (for potential future use - not currently active)

**Caching:**
- reports_cache table in PostgreSQL for cached report payloads

## Authentication & Identity

**Auth Provider:**
- Supabase Auth with Google OAuth
  - Implementation: OAuth 2.0 flow via Supabase
  - Scope: `https://www.googleapis.com/auth/adwords`
  - Token storage: sessionStorage for provider token
  - Database: `google_connections` table stores encrypted OAuth tokens
  - RLS: Enabled on user-specific tables

## Monitoring & Observability

**Error Tracking:**
- None configured (potential improvement)

**Logs:**
- Supabase Edge Functions: Built-in logging to Deno console
- Frontend: Console logging for development

**Analytics:**
- @vercel/analytics 1.6.1 - Page view tracking
  - Configured in main.tsx

## CI/CD & Deployment

**Hosting:**
- Vercel (frontend) - Implied by @vercel/analytics usage
- Supabase (backend) - Edge Functions deployed to Supabase

**CI Pipeline:**
- Not explicitly configured in repository

**Deployment:**
- Frontend: Vite build via `npm run build`
- Edge Functions: `supabase functions deploy <function-name>`

## Environment Configuration

**Required env vars:**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

**Edge Function env vars:**
- `GOOGLE_ADS_DEVELOPER_TOKEN` - Google Ads API developer token
- `GOOGLE_ADS_LOGIN_CUSTOMER_ID` - Optional MCC account ID
- `OPENAI_API_KEY` - Optional default OpenAI key

**User-provided (stored in database):**
- User's own Google Gemini API key (stored in user_ai_settings table)

## Webhooks & Callbacks

**Incoming:**
- Supabase Auth callback: `/auth-callback` route handles OAuth callback

**Outgoing:**
- Google Ads API calls from edge functions
- Gemini API calls from analyze-ads edge function

---

*Integration audit: 2026-03-31*
