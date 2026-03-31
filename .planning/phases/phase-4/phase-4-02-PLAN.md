---
phase: phase-4
plan: 02
type: execute
wave: 2
depends_on:
  - phase-4-01
files_modified:
  - src/components/dashboard/DataDiscrepancyBanner.tsx
  - src/components/dashboard/HeroMetrics.tsx
  - src/components/dashboard/TopPerformers.tsx
  - src/components/dashboard/PerformanceChart.tsx
  - src/pages/dashboard/Campaigns.tsx
  - src/pages/dashboard/AdGroups.tsx
  - src/pages/dashboard/Keywords.tsx
autonomous: true
requirements:
  - VALD-02
user_setup: []

must_haves:
  truths:
    - Users see visual indicators when data may differ from Google Ads UI
    - Discrepancy explanations are clear and actionable
    - Common discrepancy causes are documented
  artifacts:
    - path: "src/components/dashboard/DataDiscrepancyBanner.tsx"
      provides: "Reusable banner component for showing discrepancy info"
      exports: ["DataDiscrepancyBanner"]
    - path: "src/components/dashboard/HeroMetrics.tsx"
      provides: "Show discrepancy warning when attribution window != 30 days"
      contains: "DataDiscrepancyBanner usage"
  key_links:
    - from: "HeroMetrics.tsx, TopPerformers.tsx, PerformanceChart.tsx"
      to: "DataDiscrepancyBanner.tsx"
      via: "import and conditional render"
      pattern: "attributionWindow.*DataDiscrepancyBanner"
---

<objective>
Implement discrepancy highlighting to alert users when app data may differ from Google Ads UI.

Purpose: Address VALD-02 by making users aware of factors that cause data differences (attribution window, timezone, data latency, etc.). Show clear explanations so users understand why discrepancies occur.

Output: DataDiscrepancyBanner component added to key dashboard areas with contextual explanations.
</objective>

<context>
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/STATE.md

# Dependencies
- phase-4-01 (Settings page with timezone/attribution configuration)
</context>

<tasks>

<task type="auto">
  <name>Create DataDiscrepancyBanner component</name>
  <files>src/components/dashboard/DataDiscrepancyBanner.tsx</files>
  <action>
    1. Create new component in src/components/dashboard/
    2. Component accepts: type ('attribution' | 'timezone' | 'latency'), explanation, timestamp
    3. Use Alert component from shadcn/ui with info variant
    4. Include dismissible option (localStorage flag to hide permanently)
    5. Provide clear explanation text for each type:
       - Attribution: "Data uses X-day click attribution. Google Ads default is 30-day."
       - Timezone: "Data shown in {timezone}. Google Ads may use account timezone."
       - Latency: "Data may be delayed up to 15 minutes from Google Ads."
  </action>
  <verify>
    <automated>npm run build 2>&1 | head -20</automated>
  </verify>
  <done>DataDiscrepancyBanner component created with export, works with HeroMetrics</done>
</task>

<task type="auto">
  <name>Add discrepancy banner to overview components</name>
  <files>src/components/dashboard/HeroMetrics.tsx</files>
  <action>
    1. Read HeroMetrics component
    2. Import DataDiscrepancyBanner
    3. Add conditional banner when:
       - Attribution window is not 30 days (common Google Ads default)
       - Timezone differs from account's native timezone
    4. Banner shows at top of HeroMetrics section with clear explanation
  </action>
  <verify>
    <automated>npm run build 2>&1 | head -20</automated>
  </verify>
  <done>HeroMetrics shows discrepancy banner when settings differ from Google Ads defaults</done>
</task>

<task type="auto">
  <name>Add discrepancy banner to PerformanceChart</name>
  <files>src/components/dashboard/PerformanceChart.tsx</files>
  <action>
    1. Read PerformanceChart component
    2. Import DataDiscrepancyBanner
    3. Add latency warning banner explaining data refresh delay
    4. Position below chart header, above chart area
  </action>
  <verify>
    <automated>npm run build 2>&1 | head -20</automated>
  </verify>
  <done>PerformanceChart shows latency disclaimer</done>
</task>

<task type="auto">
  <name>Add discrepancy info to data table headers</name>
  <files>src/components/dashboard/TopPerformers.tsx</files>
  <action>
    1. Read TopPerformers component
    2. Add tooltip or small info icon next to column headers showing "Data based on {attributionWindow} day attribution"
    3. Use existing Tooltip component from shadcn/ui
  </action>
  <verify>
    <automated>npm run build 2>&1 | head -20</automated>
  </verify>
  <done>TopPerformers shows attribution info on hover</done>
</task>

</tasks>

<verification>
- [ ] DataDiscrepancyBanner renders with correct explanations
- [ ] HeroMetrics shows banner when attribution != 30 days
- [ ] PerformanceChart shows latency disclaimer
- [ ] Users understand why data might differ from Google Ads UI
</verification>

<success_criteria>
Discrepancies between app and Google Ads are highlighted with explanation. Users see clear indicators when settings cause data differences.
</success_criteria>

<output>
After completion, create .planning/phases/phase-4/phase-4-02-SUMMARY.md
</output>