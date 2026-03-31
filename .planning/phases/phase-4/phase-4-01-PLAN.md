---
phase: phase-4
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/contexts/DashboardContext.tsx
  - src/pages/settings/index.tsx
  - src/components/dashboard/HeroMetrics.tsx
  - src/components/dashboard/PerformanceChart.tsx
  - src/components/dashboard/TopPerformers.tsx
  - src/components/dashboard/DataTable.tsx
  - src/hooks/useGoogleAdsReport.ts
autonomous: true
requirements:
  - VALD-01
  - VALD-02
user_setup: []

must_haves:
  truths:
    - User can see timezone and attribution window settings in Settings page
    - User can configure timezone preference per account
    - User can configure attribution window settings
    - Data timestamps display in user's selected timezone
    - Metrics are calculated using the selected attribution window
  artifacts:
    - path: "src/contexts/DashboardContext.tsx"
      provides: "Timezone and attribution window state management"
      exports: ["timezone", "setTimezone", "attributionWindow", "setAttributionWindow"]
    - path: "src/pages/settings/index.tsx"
      provides: "Settings UI for timezone and attribution configuration"
      contains: "timezone selector, attribution window selector"
    - path: "src/hooks/useGoogleAdsReport.ts"
      provides: "Include timezone/attribution in API requests"
      pattern: "timezone.*attributionWindow"
  key_links:
    - from: "src/pages/settings/index.tsx"
      to: "src/contexts/DashboardContext.tsx"
      via: "useDashboard hook"
      pattern: "setTimezone.*setAttributionWindow"
    - from: "src/hooks/useGoogleAdsReport.ts"
      to: "src/contexts/DashboardContext.tsx"
      via: "useDashboard hook"
      pattern: "timezone.*dateRange"
---

<objective>
Configure and expose timezone and attribution window settings for data accuracy verification.

Purpose: Allow users to align the app's data settings with Google Ads UI settings for side-by-side comparison (VALD-01). This ensures metrics match when users compare app data against Google Ads.

Output: Timezone and attribution window settings exposed in Settings page, included in API queries.
</objective>

<context>
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/STATE.md

# Key interfaces from existing code
From src/contexts/DashboardContext.tsx:
```typescript
export interface AdsAccount {
  id: string;
  customerId: string;
  name: string;
  currencyCode?: string;
  timeZone?: string;
  isManager?: boolean;
  status?: string;
}
```

From src/hooks/useGoogleAdsReport.ts:
```typescript
// Report types: 'overview', 'campaigns', 'adGroups', 'keywords', 
// 'searchTerms', 'negativeKeywords', 'audiences', 'budget', 'conversions'
// Uses useQuery with queryKey including dateRange, customerId
```
</context>

<tasks>

<task type="auto">
  <name>Add timezone and attribution state to DashboardContext</name>
  <files>src/contexts/DashboardContext.tsx</files>
  <action>
    1. Add timezone state: string (default to 'America/New_York' or from account's timeZone)
    2. Add attributionWindow state: string (options: '7day', '14day', '30day', '60day', '90day', default: '30day')
    3. Add setTimezone and setAttributionWindow to context value
    4. Persist selections to localStorage (keys: 'adsinsight:timezone', 'adsinsight:attributionWindow')
    5. Include timezone and attributionWindow in API query params via useGoogleAdsReport hook
  </action>
  <verify>
    <automated>npm run build 2>&1 | head -20</automated>
  </verify>
  <done>DashboardContext provides timezone and attributionWindow state with setters and persistence</done>
</task>

<task type="auto">
  <name>Create timezone and attribution settings UI</name>
  <files>src/pages/settings/index.tsx</files>
  <action>
    1. Read existing Settings page to understand structure
    2. Add new "Data Settings" section with:
       - Timezone dropdown with common timezones (America/New_York, America/Los_Angeles, America/Chicago, Europe/London, Asia/Tokyo, etc.)
       - Attribution window selector (7, 14, 30, 60, 90 day click-through conversions)
    3. Add info tooltip explaining: "These settings affect how data is calculated. Match them with your Google Ads settings for accurate comparison."
    4. Use existing Select components from shadcn/ui
  </action>
  <verify>
    <automated>npm run build 2>&1 | head -20</automated>
  </verify>
  <done>Settings page shows timezone and attribution window selectors that update DashboardContext state</done>
</task>

<task type="auto">
  <name>Include timezone and attribution in API requests</name>
  <files>src/hooks/useGoogleAdsReport.ts</files>
  <action>
    1. Read useGoogleAdsReport hook to understand how queries are built
    2. Add timezone and attributionWindow to queryKey array for cache invalidation on setting changes
    3. Pass timezone and attributionWindow in request body to edge function
    4. Document expected API params in comment
  </action>
  <verify>
    <automated>npm run build 2>&1 | head -20</automated>
  </verify>
  <done>Changing timezone or attribution settings triggers refetch with new parameters</done>
</task>

</tasks>

<verification>
- [ ] Settings page shows timezone and attribution window options
- [ ] Selecting timezone updates context and persists across refresh
- [ ] Data fetches include timezone/attribution parameters
- [ ] Users can match app settings to Google Ads UI for VALD-01 verification
</verification>

<success_criteria>
Timezone and attribution window settings are documented in Settings page and configurable. Users can align app settings with Google Ads UI for data accuracy comparison.
</success_criteria>

<output>
After completion, create .planning/phases/phase-4/phase-4-01-SUMMARY.md
</output>