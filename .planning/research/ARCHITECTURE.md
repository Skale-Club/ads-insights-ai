# Architecture Research

**Domain:** Google Ads Analytics Platform
**Researched:** 2026-03-31
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Dashboard │  │Campaigns │  │  Reports │  │AI Chat   │    │
│  │   Page    │  │   Page   │  │   Page   │  │Interface │    │
│  └─────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
│        │             │            │            │           │
├────────┴─────────────┴────────────┴─────────────┴──────────┤
│                     State Management Layer                   │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │AuthContext│  │Dashboard │  │React     │                   │
│  │           │  │ Context  │  │Query     │                   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                   │
│       │             │            │                          │
├────────┴─────────────┴─────────────┴─────────────────────────┤
│                     API Integration Layer                     │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐    │
│  │              Supabase Edge Functions                  │    │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐     │    │
│  │  │ Google-Ads │  │  Analyze   │  │  Google    │     │    │
│  │  │  Accounts  │  │    Ads     │  │  Mutate    │     │    │
│  │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘     │    │
│  └────────┴──────────────┴───────────────┴──────────────┘    │
├─────────────────────────────────────────────────────────────┤
│                     External Services Layer                   │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │Google Ads│  │Gemini    │  │Supabase  │  │Google    │    │
│  │   API    │  │  API     │  │   Auth   │  │ OAuth    │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Dashboard Page | Render KPIs, charts, tables; handle user interactions | React components with Recharts |
| Report Hooks | Fetch, cache, transform Google Ads API data | TanStack React Query hooks |
| Auth Context | Manage Google OAuth flow, token storage | React Context + sessionStorage |
| Dashboard Context | Track selected account, date range, accounts list | React Context |
| Edge Functions | Proxy API calls, validate tokens, handle errors | Deno runtime, Supabase-hosted |
| Google-Ads Accounts | Fetch accessible customer accounts | Google Ads API v20 |
| Analyze Ads | AI-powered insights via Gemini | Gemini API with streaming |
| Google-Ads Mutate | Campaign mutations (pause, bid changes) | Google Ads API mutate |
| Supabase Auth | User authentication, session management | OAuth 2.0 flow |

## Recommended Project Structure

```
src/
├── pages/                    # Route components (presentation)
│   ├── dashboard/            # Dashboard feature pages
│   │   ├── Overview.tsx      # Main KPIs and charts
│   │   ├── Campaigns.tsx    # Campaign list/analysis
│   │   ├── AdGroups.tsx      # Ad group management
│   │   ├── Keywords.tsx      # Keyword performance
│   │   ├── SearchTerms.tsx   # Search term analysis
│   │   └── Recommendations.tsx
│   ├── Login.tsx
│   └── ConnectGoogleAds.tsx
├── components/
│   ├── ui/                   # shadcn/ui primitives
│   ├── dashboard/            # Dashboard-specific components
│   │   ├── HeroMetrics.tsx   # KPI cards
│   │   ├── PerformanceChart.tsx
│   │   ├── DataTable.tsx
│   │   └── ChatSidebar.tsx
│   └── layout/
│       ├── DashboardLayout.tsx
│       ├── Sidebar.tsx
│       └── TopBar.tsx
├── contexts/                 # Client state management
│   ├── AuthContext.tsx       # OAuth + session state
│   └── DashboardContext.tsx  # Account + date range
├── hooks/                    # Server state fetching
│   └── useGoogleAdsReport.ts
├── integrations/
│   └── supabase/
│       └── client.ts
├── config/                   # App configuration
│   ├── app.ts
│   └── navigation.ts
└── types/
    └── database.ts

supabase/
├── functions/                # Edge function handlers
│   ├── google-ads-accounts/
│   ├── analyze-ads/
│   └── google-ads-mutate/
└── config.toml
```

### Structure Rationale

- **pages/:** Route-level components organized by feature domain
- **components/ui/:** Isolated shadcn primitives for regeneration safety
- **components/dashboard/:** Project-specific components that can be modified freely
- **contexts/:** Global client state that persists across route changes
- **hooks/:** Server state abstracted into reusable, testable units
- **integrations/:** External service clients isolated from business logic
- **config/:** Static configuration that can change without redeployment
- **Edge functions/:** Backend logic runs server-side, close to data sources

## Architectural Patterns

### Pattern 1: API Proxy Pattern

**What:** Edge functions act as proxies between client and external APIs (Google Ads, Gemini).

**When to use:** Always — required for security (hide OAuth tokens, API keys), transformation, and error handling.

**Trade-offs:**
- Pros: Security, token management, request transformation
- Cons: Added latency, infrastructure cost, maintenance overhead

**Example:**
```typescript
// Edge function acts as secure proxy
Deno.serve(async (req) => {
  const { customerId, reportType } = await req.json();
  const token = req.headers.get('authorization');
  
  // Validate and forward to Google Ads API
  const response = await fetch(googleAdsEndpoint, {
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ query: buildGAQL(reportType) })
  });
  
  return new Response(response.body, {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

### Pattern 2: Client-Side Caching with React Query

**What:** Server state cached on client with automatic invalidation and background refetch.

**When to use:** Any data that is fetched multiple times or benefits from freshness guarantees.

**Trade-offs:**
- Pros: Reduced API calls, better UX, background updates
- Cons: Complexity, potential stale data if not configured properly

**Example:**
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['google-ads', customerId, reportType, dateRange],
  queryFn: () => fetchReport(customerId, reportType, dateRange),
  staleTime: 5 * 60 * 1000, // 5 minutes
  refetchOnWindowFocus: false
});
```

### Pattern 3: OAuth Token Relay

**What:** Google OAuth token obtained during Supabase Auth flows is passed to Edge functions for Google Ads API access.

**When to use:** When integrating with Google Ads API that requires user-level authorization.

**Trade-offs:**
- Pros: Seamless UX, no separate Google login needed
- Cons: Token expiry handling, scope management

**Example:**
```typescript
// AuthContext stores provider token after OAuth callback
const signInWithGoogle = async () => {
  const { data } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { scopes: 'https://www.googleapis.com/auth/adwords' }
  });
  // After callback, provider_token available in session
};

// Edge function receives token via Authorization header
const token = req.headers.get('Authorization');
const googleAdsResponse = await callGoogleAdsApi(token);
```

### Pattern 4: Streaming AI Responses

**What:** AI responses streamed via Server-Sent Events (SSE) for real-time chat experience.

**When to use:** When building AI-powered chat interfaces that benefit from progressive rendering.

**Trade-offs:**
- Pros: Perceived performance, immediate feedback
- Cons: Complexity in handling partial updates, connection management

**Example:**
```typescript
// Edge function streams Gemini response
const stream = await gemini.models.generateContentStream({
  model: 'gemini-2.0-flash',
  contents: messages,
  systemInstruction: systemPrompt
});

return new Response(stream.streamToReadableStream(), {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache'
  }
});
```

## Data Flow

### Authentication Flow

```
User clicks "Login"
    ↓
Supabase Auth initiates Google OAuth
    ↓
Google OAuth redirect with auth code
    ↓
Supabase Auth exchanges code for session
    ↓
sessionStorage stores provider_token
    ↓
AuthContext exposes token to app
    ↓
Edge functions receive token in Authorization header
    ↓
Google Ads API calls include valid token
```

### Report Data Flow

```
User selects account + date range
    ↓
DashboardContext updates selectedAccount, dateRange
    ↓
Page component calls useGoogleAdsReport(type)
    ↓
Hook invokes edge function via supabase.functions.invoke()
    ↓
Edge function validates token, builds GAQL query
    ↓
Edge function calls Google Ads API (SearchStream)
    ↓
Response transformed and returned to hook
    ↓
React Query caches result, triggers re-render
    ↓
Component renders charts/tables with data
```

### AI Chat Flow

```
User sends message in chat UI
    ↓
Chat component invokes analyze-ads edge function
    ↓
Edge function includes campaign context in prompt
    ↓
Gemini API receives streaming response
    ↓
Edge function converts to SSE format
    ↓
Client receives streaming chunks
    ↓
Chat UI appends chunks incrementally
```

### Key Data Flows

1. **OAuth Token Flow:** sessionStorage → AuthContext → Edge Functions → Google Ads API
2. **Report Data Flow:** DashboardContext → useGoogleAdsReport → Edge Function → Google Ads API → React Query Cache → UI
3. **AI Response Flow:** Chat Input → Edge Function → Gemini API (stream) → SSE → Chat UI

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users | Current architecture sufficient — React SPA + Supabase Edge Functions |
| 1k-10k users | Add Redis caching layer for report data, implement request batching for Google Ads API |
| 10k-100k users | Split into dedicated services, consider data warehouse for historical analytics |

### Scaling Priorities

1. **First bottleneck:** Google Ads API rate limits
   - Mitigation: Implement caching at edge function level, batch requests, add request queue
   - Google Ads enforces ~15,000 operations per hour per developer token

2. **Second bottleneck:** Edge function cold starts
   - Mitigation: Keep functions warm with periodic pings, use Deno Deploy cache
   - Supabase edge functions have ~300ms cold start

3. **Third bottleneck:** Client-side state management complexity
   - Mitigation: Consider extracting to dedicated state management (Zustand) if context grows complex

## Anti-Patterns

### Anti-Pattern 1: Storing OAuth Tokens in LocalStorage

**What people do:** Persist Google OAuth tokens in localStorage for long-term access.

**Why it's wrong:** localStorage is vulnerable to XSS attacks; tokens may be exposed to malicious scripts.

**Do this instead:** Use sessionStorage (cleared on tab close) or server-side token management via refresh tokens.

### Anti-Pattern 2: Direct API Calls from Client

**What people do:** Call Google Ads API directly from React components using the JavaScript client library.

**Why it's wrong:** Exposes OAuth tokens and developer token to client; creates CORS issues; makes token rotation difficult.

**Do this instead:** Route all API calls through edge functions that hold credentials server-side.

### Anti-Pattern 3: Ignoring API Rate Limits

**What people do:** Make unbounded parallel requests to Google Ads API.

**Why it's wrong:** Google Ads API enforces strict rate limits (Token Bucket algorithm); hitting limits causes request failures and potential account restrictions.

**Do this instead:** Implement request queuing, batch operations, and exponential backoff retry logic.

### Anti-Pattern 4: Caching at Client Only

**What people do:** Rely solely on React Query for caching without server-side cache.

**Why it's wrong:** Each new user session fetches fresh data; API quota consumed for duplicate requests across sessions.

**Do this instead:** Implement server-side caching in edge functions (database or Redis) with TTL.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Google Ads API | OAuth 2.0 + REST via edge functions | Requires developer token, uses GAQL query language |
| Gemini API | REST API via edge functions | Streaming supported, requires user API key or system key |
| Supabase Auth | OAuth 2.0 flow with Google provider | Handles session, provides provider_token |
| Google OAuth | OAuth 2.0 via Supabase Auth | Scopes: `https://www.googleapis.com/auth/adwords` |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| UI Components ↔ Contexts | React Context (direct) | Components subscribe to context changes |
| Hooks ↔ Edge Functions | async function calls | Hook returns Promise, handles loading/error states |
| Edge Functions ↔ External APIs | REST/HTTP | All external calls happen server-side |

### Current Architecture Alignment

The existing codebase follows these patterns correctly:

- OAuth tokens stored in sessionStorage (not localStorage) — follows Anti-Pattern 1 guidance
- All Google Ads API calls go through edge functions — follows Anti-Pattern 2 guidance
- React Query handles client-side caching — follows Pattern 2
- Edge functions proxy all external API calls — follows Pattern 1

**Enhancement opportunities:**
- Add server-side caching layer for report data
- Implement request batching for Google Ads API
- Add retry with exponential backoff for rate limit errors

## Sources

- Google Ads API Documentation: https://developers.google.com/google-ads/api/docs/reporting/overview
- Google Ads API Rate Limits: https://developers.google.com/google-ads/api/docs/productionize/rate-limits
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- TanStack React Query: https://tanstack.com/query/latest
- Marketing Data Warehouse Architecture: https://improvado.io/blog/marketing-data-warehousing

---

*Architecture research for: Google Ads Analytics Platform*
*Researched: 2026-03-31*