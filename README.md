# 🎯 Ads Insights AI

> AI-powered advertising analytics and optimization platform

A comprehensive dashboard that connects to your advertising accounts and provides intelligent insights, performance analytics, and AI-driven recommendations to optimize your advertising campaigns.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646cff.svg)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e.svg)](https://supabase.com/)

---

## ✨ Features

### 📊 **Dashboard Analytics**
- **Real-time Metrics** - Monitor clicks, impressions, CTR, CPC, conversions, and ROAS
- **Performance Charts** - Visualize campaign performance over time with interactive charts
- **Date Range Filtering** - Analyze data for Today, Last 7/30/90 days, or custom ranges
- **Comparison Mode** - Compare current period with previous period metrics

### 🔍 **Campaign Intelligence**
- **Campaign Overview** - Detailed breakdown of all active campaigns
- **Keyword Analysis** - Deep dive into keyword performance and opportunities
- **Search Terms Report** - Discover what users are actually searching for
- **Top Performers** - Identify best-performing campaigns and keywords

### 🤖 **AI-Powered Insights**
- **OpenAI Integration** - Chat with your campaign data using GPT-4/GPT-3.5
- **Smart Recommendations** - Get actionable suggestions to improve performance
- **Natural Language Queries** - Ask questions about your campaigns in plain English
- **Streaming Responses** - Real-time AI analysis with streaming output

### 🔐 **Secure & Scalable**
- **OAuth Authentication** - Secure authentication via Supabase Auth
- **Row-Level Security** - PostgreSQL RLS policies protect user data
- **Edge Functions** - Serverless Deno functions for API integration
- **Encrypted Storage** - Sensitive tokens stored securely

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ (or Bun/Yarn)
- **Supabase Account** - [Sign up free](https://supabase.com)
- **Ads Platform Developer Token** - Required for API access
- **OpenAI API Key** (optional) - [Get one here](https://platform.openai.com/api-keys)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Skale-Club/ads-insights-ai.git
   cd ads-insights-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Configure environment variables**

   Copy `.env.example` to `.env` and fill in your credentials:
   ```bash
   cp .env.example .env
   ```

   Update `.env` with your values:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_public_key
   ```

4. **Set up Supabase**

   - Create a new project at [supabase.com](https://supabase.com)
   - Run database migrations (see [Database Setup](#database-setup))
   - Configure OAuth provider in Supabase Auth settings
   - Add developer token to Edge Function secrets

5. **Run development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:8080](http://localhost:8080)

---

## 🏗️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Frontend** | React 18, TypeScript 5.8, Vite 5 (SWC) |
| **Routing** | React Router v6 |
| **UI Components** | shadcn/ui (Radix UI primitives) |
| **Styling** | Tailwind CSS 3 with CSS variables |
| **State Management** | React Context + TanStack React Query |
| **Forms** | React Hook Form + Zod validation |
| **Charts** | Recharts |
| **Backend** | Supabase (PostgreSQL, Auth, Edge Functions) |
| **Runtime** | Deno (Edge Functions) |
| **APIs** | Advertising Platform API v18, OpenAI Chat Completions |
| **Testing** | Vitest + Testing Library |

---

## 📁 Project Structure

```
ads-insights-ai/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui primitives
│   │   ├── dashboard/       # Dashboard-specific components
│   │   ├── auth/            # Auth guards and flows
│   │   └── layout/          # Layout components (TopBar, DashboardLayout)
│   ├── pages/
│   │   ├── dashboard/       # Dashboard pages (Overview, Campaigns, etc.)
│   │   ├── Login.tsx
│   │   └── Settings.tsx
│   ├── contexts/
│   │   ├── AuthContext.tsx       # OAuth + Supabase Auth
│   │   └── DashboardContext.tsx  # Selected account, date range
│   ├── hooks/
│   │   └── useGoogleAdsReport.ts # TanStack Query hook for reports
│   ├── integrations/
│   │   └── supabase/
│   │       └── client.ts         # Supabase client initialization
│   ├── types/
│   │   └── database.ts           # Auto-generated Supabase types
│   └── lib/
│       ├── utils.ts              # cn() helper
│       └── googleAdsUi.ts        # Ads platform UI constants
├── supabase/
│   ├── functions/
│   │   ├── google-ads-accounts/  # Fetch user's advertising accounts
│   │   ├── google-ads-reports/   # Fetch campaign reports
│   │   └── analyze-ads/          # OpenAI Chat Completions proxy
│   ├── migrations/               # Database schema migrations
│   └── config.toml               # Supabase configuration
├── public/                       # Static assets
├── .env.example                  # Environment variables template
└── CLAUDE.md                     # AI assistant instructions
```

---

## 🗄️ Database Setup

The project uses Supabase PostgreSQL with the following tables:

| Table | Purpose |
|-------|---------|
| `profiles` | User profile data (synced from auth) |
| `google_connections` | Encrypted OAuth tokens |
| `ads_accounts` | User's advertising accounts with `is_selected` flag |
| `reports_cache` | Cached report payloads (JSONB) |
| `user_ai_settings` | OpenAI API key and preferred model (RLS enforced) |
| `chat_sessions` | AI chat conversation history |
| `chat_messages` | Individual chat messages |

### Run Migrations

```bash
npx supabase db push
```

Or manually execute SQL files in `supabase/migrations/`.

---

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server on port 8080 |
| `npm run build` | Production build |
| `npm run build:dev` | Development build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run all tests once (Vitest) |
| `npm run test:watch` | Run tests in watch mode |

---

## 🔐 Authentication Flow

1. User clicks "Sign in with OAuth"
2. Redirected to OAuth provider (via Supabase Auth)
3. User grants access to advertising platform scope
4. Provider token stored in `sessionStorage`
5. Token passed to Edge Functions for API calls
6. RLS policies enforce data isolation per user

---

## 🌐 API Integration

### Advertising Platform API

Edge Functions use the Ads API v18 to fetch:
- Customer accounts
- Campaign performance reports
- Keyword metrics
- Search terms data

Requires developer token set in Supabase Edge Function secrets.

### OpenAI API

The `/analyze-ads` Edge Function proxies OpenAI Chat Completions with:
- Streaming support (Server-Sent Events)
- User-provided API key (stored in `user_ai_settings`)
- GPT-4, GPT-4 Turbo, or GPT-3.5 Turbo models

---

## 🧪 Testing

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# Run specific test file
npx vitest run src/components/Dashboard.test.tsx
```

Test setup uses Vitest with jsdom environment (`src/test/setup.ts`).

---

## 📦 Deployment

### Frontend (Vite App)

Deploy to Vercel, Netlify, or any static hosting:

```bash
npm run build
# Upload dist/ folder
```

### Backend (Supabase)

1. **Create Supabase project** at [supabase.com](https://supabase.com)
2. **Link local project**:
   ```bash
   npx supabase link --project-ref your-project-ref
   ```
3. **Deploy Edge Functions**:
   ```bash
   npx supabase functions deploy google-ads-accounts
   npx supabase functions deploy google-ads-reports
   npx supabase functions deploy analyze-ads
   ```
4. **Set secrets**:
   ```bash
   npx supabase secrets set ADS_DEVELOPER_TOKEN=your_token
   ```

### Keepalive Cron (Prevents Project Pausing)

This repo includes `.github/workflows/supabase-keepalive.yml`, which runs daily and calls:

- `POST /rest/v1/rpc/touch_project_keepalive`

That RPC updates `public.project_keepalive_heartbeat` with:

- `last_heartbeat_at` (timestamp)
- `last_heartbeat_hour_utc` (hour in UTC)
- `run_count` (how many times the job has run)

Set these GitHub repository secrets before enabling the workflow:

- `SUPABASE_URL` (example: `https://your-project-ref.supabase.co`)
- `SUPABASE_SERVICE_ROLE_KEY`

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) - Beautiful UI components
- [Supabase](https://supabase.com/) - Backend infrastructure
- [OpenAI](https://openai.com/) - AI-powered insights
- [Recharts](https://recharts.org/) - Data visualization

---

## 📞 Support

For questions or issues:
- Open an issue on [GitHub](https://github.com/Skale-Club/ads-insights-ai/issues)

---

**Built with ❤️ using React, TypeScript, and AI**
