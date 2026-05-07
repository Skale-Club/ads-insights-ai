# Coding Conventions

**Analysis Date:** 2026-05-06

## Naming Patterns

**Files:**
- Use PascalCase for React components and pages: `src/components/ErrorBoundary.tsx`, `src/components/dashboard/KpiCard.tsx`, `src/pages/dashboard/Overview.tsx`.
- Use camelCase with a `use` prefix for hooks: `src/hooks/useGoogleAdsReport.ts`, `src/hooks/useMetaReport.ts`, `src/hooks/useOnlineStatus.ts`.
- Use PascalCase with `Context` suffix for context modules: `src/contexts/AuthContext.tsx`, `src/contexts/DashboardContext.tsx`, `src/contexts/OfflineContext.tsx`.
- Use camelCase for shared utilities and config: `src/lib/googleAdsUi.ts`, `src/lib/utils.ts`, `src/config/navigation.ts`, `src/config/features.ts`.
- Keep shadcn/ui primitive filenames lowercase/kebab-style under `src/components/ui/`: `src/components/ui/dropdown-menu.tsx`, `src/components/ui/alert-dialog.tsx`.
- Keep tests in `src/test/` with `*.test.ts` or `*.test.tsx`: `src/test/AuthContext.test.tsx`, `src/test/useGoogleAdsReport.test.tsx`.

**Functions:**
- Use camelCase for helpers and callbacks: `getCacheKey`, `readCache`, `writeCache`, `formatDate` in `src/hooks/useGoogleAdsReport.ts`.
- Export React components as PascalCase functions: `KpiCard` in `src/components/dashboard/KpiCard.tsx`, `CompanySection` in `src/components/settings/CompanySection.tsx`.
- Export custom hooks as `useX`: `useAuth` in `src/contexts/AuthContext.tsx`, `useDashboard` in `src/contexts/DashboardContext.tsx`.
- Use `handleX` for event handlers inside components: `handleReset` in `src/components/ErrorBoundary.tsx`, `handleExpandInteraction` in `src/components/dashboard/ChatSidebar.tsx`.

**Variables:**
- Use camelCase for state and derived values: `providerToken`, `selectedAccount`, `previousPeriodRange`, `isCompact`.
- Use boolean prefixes such as `is`, `has`, `can`, and `should`: `isSupabaseConfigured` in `src/integrations/supabase/client.ts`, `hasOAuthCallback` in `src/contexts/AuthContext.tsx`, `canChat` in `src/components/dashboard/chat/MessageList.tsx`.
- Use uppercase constants for module-level fixed values: `CACHE_TTL_MS` in `src/hooks/useGoogleAdsReport.ts`, `DEFAULT_ALERT_THRESHOLDS` in `src/types/alerts.ts`.

**Types:**
- Use PascalCase for interfaces and aliases: `AuthContextType` in `src/contexts/AuthContext.tsx`, `KpiCardProps` in `src/components/dashboard/KpiCard.tsx`, `ReportType` in `src/hooks/useGoogleAdsReport.ts`.
- Use `Props` suffix for component props interfaces: `ChatSidebarProps` in `src/components/dashboard/ChatSidebar.tsx`, `ErrorBoundaryProps` in `src/components/ErrorBoundary.tsx`.
- Infer form types from Zod schemas when using React Hook Form: `FormData = z.infer<typeof schema>` in `src/components/settings/CompanySection.tsx`.

## Code Style

**Formatting:**
- Prettier is not configured; follow the existing 2-space TypeScript/TSX indentation used in `src/App.tsx`, `src/components/settings/CompanySection.tsx`, and `src/hooks/useGoogleAdsReport.ts`.
- String quote style is mixed. Use the surrounding file's style rather than normalizing unrelated imports: double quotes dominate `src/App.tsx`, single quotes dominate `src/contexts/AuthContext.tsx` and many feature components.
- Use trailing commas in multi-line object/function calls where the surrounding file already does: `src/hooks/useGoogleAdsReport.ts`, `src/components/settings/CompanySection.tsx`.
- Avoid broad reformatting. The repository has inconsistent indentation in some files, such as `src/components/dashboard/ChatSidebar.tsx`; preserve nearby style when editing a small area.

**Linting:**
- Use ESLint 9 flat config from `eslint.config.js`.
- `eslint.config.js` extends `@eslint/js` recommended rules and `typescript-eslint` recommended rules for `**/*.{ts,tsx}`.
- `eslint.config.js` enables `eslint-plugin-react-hooks` recommended rules and `react-refresh/only-export-components` as a warning with `allowConstantExport: true`.
- `eslint.config.js` disables `@typescript-eslint/no-unused-vars`; lint does not enforce unused locals or unused parameters.
- Run `npm run lint` from `package.json` before completing code changes that touch TypeScript/TSX.

**TypeScript:**
- Application strictness is intentionally relaxed in `tsconfig.app.json`: `strict: false`, `noImplicitAny: false`, `strictNullChecks: false`, `noUnusedLocals: false`, and `noUnusedParameters: false`.
- Vite config strictness is enabled in `tsconfig.node.json`, which includes `vite.config.ts`.
- Prefer explicit local interfaces and typed helper signatures even though app strictness is off. Existing examples include `KpiCardProps` in `src/components/dashboard/KpiCard.tsx` and `fetchReport(...)` in `src/hooks/useGoogleAdsReport.ts`.
- Avoid adding new `any` unless matching an existing API boundary pattern. Current generic report hooks default to `T = any` in `src/hooks/useGoogleAdsReport.ts` and `src/hooks/useMetaReport.ts`.

## Import Organization

**Order:**
1. React imports and React-adjacent types: `react`, `ReactNode`.
2. External libraries: `@tanstack/react-query`, `react-router-dom`, `date-fns`, `lucide-react`, `zod`.
3. Project UI primitives and components from `@/components/...`.
4. Project hooks, contexts, config, lib, integrations, and types from `@/...`.
5. Relative imports for siblings in the same feature folder, as in `src/pages/settings/index.tsx`.

**Path Aliases:**
- Use `@/` for imports from `src/`. The alias is configured in `tsconfig.json`, `tsconfig.app.json`, `vite.config.ts`, and `vitest.config.ts`.
- shadcn aliases are configured in `components.json`: `@/components`, `@/components/ui`, `@/hooks`, `@/lib`, and `@/lib/utils`.
- Relative imports are acceptable within tight page/component groups, such as `./ProfileSection` in `src/pages/settings/index.tsx`.

**Examples:**
```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDashboard } from '@/contexts/DashboardContext';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
```

## Error Handling

**Patterns:**
- Use `try`/`catch` around browser storage access and optional APIs that can fail. Examples: `readCache` and `writeCache` in `src/hooks/useGoogleAdsReport.ts`, `useMetaReport.ts`.
- Throw `Error` from data-fetching helpers when Supabase functions or external APIs report failure. Examples: `fetchReport` in `src/hooks/useGoogleAdsReport.ts`, `fetchMetaReport` in `src/hooks/useMetaReport.ts`.
- Convert unknown errors to user-readable messages with `instanceof Error` checks. Examples: `src/hooks/useGoogleAdsReport.ts`, `supabase/functions/google-ads-accounts/index.ts`.
- Use `ErrorBoundary` for React render failures. `src/components/ErrorBoundary.tsx` logs caught errors, supports a custom `fallback`, and renders a shadcn card fallback with reset/navigation actions.
- Use toast notifications for user-facing save/fetch failures. Examples: `src/components/settings/CompanySection.tsx`, `src/components/settings/AISettingsCard.tsx`, `src/hooks/useGoogleAdsReport.ts`.
- Edge functions return JSON error objects and CORS headers for failures. Examples: `supabase/functions/google-ads-accounts/index.ts`, `supabase/functions/google-ads-mutate/index.ts`.

## Logging

**Framework:** console

**Patterns:**
- Use direct `console.log` and `console.error`; no structured logging library is present.
- Prefix logs with a bracketed component/function tag when possible: `[Auth]` in `src/contexts/AuthContext.tsx`, `[ProtectedRoute]` in `src/components/auth/ProtectedRoute.tsx`, `[google-ads-mutate]` in `supabase/functions/google-ads-mutate/index.ts`.
- Avoid logging secrets or OAuth/API tokens. Token-bearing modules include `src/contexts/AuthContext.tsx`, `src/hooks/useGoogleAdsReport.ts`, and Supabase functions under `supabase/functions/`.
- Tests may suppress expected React error output with `vi.spyOn(console, 'error').mockImplementation(() => {})`, as in `src/test/ErrorBoundary.test.tsx`.

## Comments

**When to Comment:**
- Follow `AGENTS.md`: do not add comments unless there is a clear need.
- Keep comments short and operational when they protect future behavior. Existing examples explain OAuth/session sequencing in `src/contexts/AuthContext.tsx` and cache/storage failure behavior in `src/hooks/useGoogleAdsReport.ts`.
- Do not add explanatory comments to shadcn/ui primitives in `src/components/ui/`; those files are generated-style components and should not be edited directly unless explicitly regenerating/updating UI primitives.

**JSDoc/TSDoc:**
- Not used as a standard pattern. Prefer self-documenting names plus TypeScript interfaces in files such as `src/types/chat.ts`, `src/types/alerts.ts`, and `src/components/dashboard/chat/types.ts`.

## Function Design

**Size:** Keep helpers small and colocated with the feature that uses them. Examples: cache helpers in `src/hooks/useGoogleAdsReport.ts`, trend helpers in `src/components/dashboard/KpiCard.tsx`, and form schema setup in `src/components/settings/CompanySection.tsx`.

**Parameters:** Use typed parameter lists for helpers and destructured props with defaults for components. Examples: `KpiCard({ changeLabel = 'vs previous period', format = 'number' })` in `src/components/dashboard/KpiCard.tsx`, `useGoogleAdsReport(reportType, options = {})` in `src/hooks/useGoogleAdsReport.ts`.

**Return Values:** Return React Query result objects from data hooks (`src/hooks/useGoogleAdsReport.ts`, `src/hooks/useMetaReport.ts`), JSX from components, and typed primitive values from utilities (`src/lib/errors.ts`, `src/lib/googleAdsUi.ts`).

## Module Design

**Exports:**
- Use named exports for reusable components, hooks, utilities, and context providers: `KpiCard`, `AuthProvider`, `useAuth`, `cn`.
- Use default exports for route/page modules: `src/pages/Login.tsx`, `src/pages/dashboard/Campaigns.tsx`, `src/pages/settings/index.tsx`.
- Barrel files are not a common pattern. Import directly from concrete modules such as `@/components/dashboard/KpiCard` or `@/hooks/useGoogleAdsReport`.

**React Components:**
- Define props interfaces above the component.
- Use shadcn/ui primitives from `src/components/ui/` and Tailwind utility classes for layout and state.
- Use `cn()` from `src/lib/utils.ts` for conditional classes.
- Use lucide icons for UI actions and indicators, as in `src/components/dashboard/KpiCard.tsx`, `src/components/dashboard/ChatSidebar.tsx`, and `src/components/settings/CompanySection.tsx`.

**Context Pattern:**
- Create contexts with `createContext<Type | undefined>(undefined)`.
- Export a provider and a guard hook that throws when used outside the provider. Examples: `src/contexts/AuthContext.tsx`, `src/contexts/DashboardContext.tsx`, `src/contexts/OfflineContext.tsx`.
- Persist browser-session-only OAuth provider tokens in `sessionStorage`, as in `src/contexts/AuthContext.tsx`; do not introduce client-side secret storage for durable credentials.

**Forms and Validation:**
- Use React Hook Form with Zod validation for structured forms. Current example: `src/components/settings/CompanySection.tsx`.
- Define the Zod schema in the same module when it is feature-specific, infer `FormData`, and surface field errors near inputs.
- Use shadcn form primitives from `src/components/ui/form.tsx` when building larger forms that need shared labeling/error semantics.

**Server State:**
- Use TanStack React Query for remote/report state. The app-level `QueryClient` is in `src/App.tsx`; report hooks use `useQuery` in `src/hooks/useGoogleAdsReport.ts` and `src/hooks/useMetaReport.ts`.
- Use stable query keys that include platform/report/account/date dimensions, as in `['google-ads', reportType, customerId, startDate, endDate, ...]` and `['meta', reportType, accountId, startDate, endDate]`.
- Keep short-lived report cache keys namespaced in localStorage: `adsinsight:cache:*` and `adsinsight:meta:cache:*`.

**Project Skill Constraints:**
- When code or tests model Google Ads creative, follow RSA constraints from `.agents/skills/ad-creative/SKILL.md` and `.agents/skills/google-ads-manager/SKILL.md`: headline limit 30 characters, description limit 90 characters, up to 15 headlines and 4 descriptions, and campaign/ad-group/keyword vocabulary aligned to Google Ads.
- Keep ad platform language precise in fixtures and UI labels. Existing platform-specific code lives in `src/hooks/useGoogleAdsReport.ts`, `src/hooks/useMetaReport.ts`, `src/pages/dashboard/meta/`, and `supabase/functions/google-ads-*`.

---

*Convention analysis: 2026-05-06*
