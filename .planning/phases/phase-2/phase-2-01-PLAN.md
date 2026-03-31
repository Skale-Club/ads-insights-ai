---
phase: 2-alerting
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: []
autonomous: true
requirements:
  - ALRT-01
  - ALRT-02
  - ALRT-03

must_haves:
  truths:
    - "User receives notification when campaign spend rate exceeds expected pace"
    - "User receives notification when campaign spend is under budget with time remaining"
    - "User can configure alert thresholds (budget % threshold, quality score minimum)"
    - "Alerts appear in-app with appropriate severity indicators"
  artifacts:
    - path: "src/types/alerts.ts"
      provides: "Alert type definitions and configuration interfaces"
      min_lines: 40
    - path: "src/components/dashboard/AlertSystem.tsx"
      provides: "Alert evaluation and toast display logic"
      min_lines: 100
    - path: "src/components/settings/AlertSettings.tsx"
      provides: "Alert threshold configuration UI"
      min_lines: 80
    - path: "src/config/navigation.ts"
      provides: "Alerts nav item"
      min_lines: 30
  key_links:
    - from: "src/components/dashboard/AlertSystem.tsx"
      to: "useGoogleAdsReport"
      via: "campaign data fetch"
      pattern: "useGoogleAdsReport.*campaigns"
    - from: "src/components/dashboard/AlertSystem.tsx"
      to: "sonner"
      via: "toast notifications"
      pattern: "toast.*variant"
---

<objective>
Phase 2: Alerting & Monitoring - Enable proactive monitoring with budget pacing and account health alerts.

Purpose: Implement budget pacing alerts, under-spend alerts, quality score alerts, and configurable alert thresholds. Use existing toast system for in-app notifications.

Output: Working alert system with configuration UI
</objective>

<execution_context>
@$HOME/.config/opencode/get-shit-done/workflows/execute-plan.md
@$HOME/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md (Phase 2 details)
@.planning/REQUIREMENTS.md (ALRT-01, ALRT-02, ALRT-03)
@.planning/phases/phase-1/phase-1-01-SUMMARY.md

From sonner.tsx (existing toast system):
- Uses sonner library with customized toast
- Export: { Toaster, toast }
- toast({ title, description, variant }) - variant: "default" | "success" | "warning" | "destructive"

From useGoogleAdsReport.ts (campaign data):
- reportType: "campaigns" returns budget + spend data
- Fields: budget (amount_micros), spend (totalCost), campaign status
- Date range from DashboardContext

From DashboardContext.tsx:
- selectedAccount - current Google Ads account
- dateRange - { from, to } for data fetching
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create alert types and configuration interfaces</name>
  <files>src/types/alerts.ts</files>
  <action>
Create alert type definitions:

```typescript
// Alert severity levels
export type AlertSeverity = 'info' | 'warning' | 'critical';

// Alert types
export type AlertType = 'budget_overspend' | 'budget_underspend' | 'quality_score_drop';

// Alert configuration thresholds
export interface AlertThresholds {
  // Budget alerts (percentage of expected pace)
  overspendThreshold: number;  // Default: 120 (120% = critical)
  underspendThreshold: number; // Default: 50 (50% = warning)
  
  // Quality score alerts
  minQualityScore: number;     // Default: 6 (below = warning)
  
  // Enable/disable specific alerts
  enableBudgetAlerts: boolean;
  enableQualityAlerts: boolean;
}

// Default thresholds
export const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
  overspendThreshold: 120,
  underspendThreshold: 50,
  minQualityScore: 6,
  enableBudgetAlerts: true,
  enableQualityAlerts: true,
};

// Alert instance
export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  campaignId?: string;
  campaignName?: string;
  createdAt: Date;
  dismissed: boolean;
}
```

Also update navigation.ts to add AlertSettings page.
  </action>
  <verify>
grep -n "AlertThresholds\|AlertSeverity" src/types/alerts.ts returns type definitions
  </verify>
  <done>Alert types and configuration interfaces defined</done>
</task>

<task type="auto">
  <name>Task 2: Create alert evaluation hook and component</name>
  <files>src/components/dashboard/AlertSystem.tsx</files>
  <action>
Create AlertSystem component that evaluates campaign data and shows alerts on dashboard load:

1. Load alert thresholds from localStorage (use safeGetLocalStorageJson pattern from DashboardContext)

2. Fetch campaigns using useGoogleAdsReport('campaigns')

3. Calculate alert logic:
   - **Budget overspend (ALRT-01)**: 
     - Expected pace = (budget / days_in_period) * days_elapsed
     - If spend > (expected_pace * overspendThreshold/100) → warning
     - Formula: spend > (budget * (days_elapsed / total_days) * (threshold/100))
   
   - **Budget underspend (ALRT-02)**:
     - If spend < (expected_pace * underspendThreshold/100) AND days_remaining > 2 → warning
     - Formula: spend < (budget * (days_elapsed / total_days) * (threshold/100))

   - **Quality score drop**: Check keywords with quality score < minQualityScore

4. Use sonner toast to display alerts:
   ```typescript
   import { toast } from "@/components/ui/sonner";
   
   // Critical alerts (overspend >130%)
   toast("Budget Overspend Alert", {
     description: `Campaign "${name}" has spent ${spendPct}% of expected pace`,
     variant: "warning",
   });
   ```

5. Add alert bell icon in TopBar with unread count

Example calculation logic:
```typescript
function calculatePacing(campaign: CampaignRow, dateRange: DateRange) {
  const totalDays = differenceInDays(dateRange.to, dateRange.from) + 1;
  const daysElapsed = differenceInDays(new Date(), dateRange.from) + 1;
  const expectedSpend = (campaign.budget / totalDays) * daysElapsed;
  const actualSpend = campaign.spend;
  const pacePercent = (actualSpend / expectedSpend) * 100;
  return pacePercent;
}
```
  </action>
  <verify>
npm run build passes without errors
  </verify>
  <done>Alert evaluation hook shows budget pacing alerts on dashboard load</done>
</task>

<task type="auto">
  <name>Task 3: Create alert configuration UI in settings</name>
  <files>src/components/settings/AlertSettings.tsx</files>
  <action>
Create AlertSettings component for configuring thresholds:

1. Load current thresholds from localStorage (or use defaults)
2. Provide form to adjust:
   - Overspend threshold (slider: 100% - 200%, default 120%)
   - Underspend threshold (slider: 10% - 90%, default 50%)
   - Minimum quality score (slider: 1-10, default 6)
   - Toggle switches for enabling/disabling each alert type

3. Save to localStorage on change:
```typescript
const saveThresholds = (newThresholds: AlertThresholds) => {
  safeSetLocalStorageJson(STORAGE_ALERT_THRESHOLDS, newThresholds);
  setThresholds(newThresholds);
};
```

4. Use existing shadcn/ui components:
   - Card for container
   - Slider for numeric ranges
   - Switch for toggles
   - Label for descriptions

Example UI:
```tsx
<Card>
  <CardHeader>
    <CardTitle>Alert Thresholds</CardTitle>
    <CardDescription>Configure when you receive alerts</CardDescription>
  </CardHeader>
  <CardContent className="space-y-6">
    <div className="space-y-2">
      <Label>Overspend Alert Threshold</Label>
      <Slider 
        value={[thresholds.overspendThreshold]} 
        onValueChange={(v) => updateThreshold('overspendThreshold', v[0])}
        min={100} max={200} step={10}
      />
      <p className="text-sm text-muted-foreground">
        Alert when spend exceeds {thresholds.overspendThreshold}% of expected pace
      </p>
    </div>
    // ... similar for underspend and quality score
  </CardContent>
</Card>
```

Add to settings navigation: src/config/navigation.ts → settings nav item
  </action>
  <verify>
npm run build passes without errors
  </verify>
  <done>Alert threshold configuration UI available in settings</done>
</task>

<task type="auto">
  <name>Task 4: Add alert bell icon to TopBar with notification badge</name>
  <files>src/components/layout/TopBar.tsx</files>
  <action>
Update TopBar to include alert bell icon:

1. Import Bell icon from lucide-react
2. Add state for unread alert count (use Context or localStorage)
3. Add bell icon in header area (right side)
4. Show badge with count when alerts exist:
```tsx
<Button variant="ghost" size="icon" className="relative">
  <Bell className="h-5 w-5" />
  {alertCount > 0 && (
    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center">
      {alertCount}
    </span>
  )}
</Button>
```

5. Clicking bell opens a popover/dialog with recent alerts list
6. Add "Mark as read" functionality

This fulfills success criterion: "Alerts appear in-app with appropriate severity indicators"
  </action>
  <verify>
npm run build passes without errors
  </verify>
  <done>Alert bell icon with notification badge in TopBar</done>
</task>

</tasks>

<verification>
- User receives notification when campaign spend rate exceeds expected pace (toast appears)
- User receives notification when campaign spend is under budget with time remaining (toast appears)
- User can configure alert thresholds in settings (AlertSettings component)
- Alerts appear in-app with severity indicators (bell icon + toasts)
- Note: Broken URL detection not available via Google Ads API - skipped per discussion findings
</verification>

<success_criteria>
1. Budget overspend alerts work - toast appears when spend > 120% (configurable) of expected pace
2. Budget underspend alerts work - toast appears when spend < 50% (configurable) with days remaining
3. Quality score alerts work - toast appears for keywords below threshold (if data available)
4. Alert configuration persists - settings saved to localStorage
5. Alerts show on dashboard load - useEffect triggers evaluation
</success_criteria>

<output>
After completion, create .planning/phases/phase-2/phase-2-01-SUMMARY.md
</output>