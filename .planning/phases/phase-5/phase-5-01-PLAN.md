---
phase: phase-5
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/functions/google-ads-reports/index.ts
autonomous: true
requirements:
  - AUD-01
  - AUD-02
  - AUD-03
user_setup: []

must_haves:
  truths:
    - Audiences tab displays actual audience data from Google Ads API
    - Devices tab shows device performance metrics (Mobile, Desktop, Tablet)
    - Locations tab shows geographic performance data by country/region
    - All three tabs handle loading and error states properly
  artifacts:
    - path: "supabase/functions/google-ads-reports/index.ts"
      provides: "Google Ads API queries for audiences, device, and location demographics"
      contains: "fetchAudiencesSpecial, fetchDemographicsDevice, fetchDemographicsLocation"
  key_links:
    - from: "src/pages/dashboard/Audiences.tsx"
      to: "supabase/functions/google-ads-reports/index.ts"
      via: "useGoogleAdsReport hook with reportType: audiences, demographics_device, demographics_location"
      pattern: "useGoogleAdsReport.*audiences.*demographics_device.*demographics_location"
---

<objective>
Fix the Audiences page to properly fetch and display audience, device, and location data from Google Ads API.

Purpose: The Audiences page currently shows empty data because:
1. demographics_location calls wrong function (fetchDemographicsAge)
2. No fetchDemographicsLocation implementation exists
3. User profile queries (age, gender) may need special handling

Output: Working demographics data in all three tabs.
</objective>

<context>
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/STATE.md

# Key interfaces from existing code

From src/pages/dashboard/Audiences.tsx:
```typescript
// Uses useGoogleAdsReport hook with:
useGoogleAdsReport<Audience[]>('audiences')
useGoogleAdsReport<DemographicData[]>('demographics_device')
useGoogleAdsReport<DemographicData[]>('demographics_location')
```

From src/hooks/useGoogleAdsReport.ts:
```typescript
type ReportType = 'overview' | 'campaigns' | 'keywords' | 'search_terms' | 
  'daily_performance' | 'adGroups' | 'ads' | 'audiences' | 'budgets' | 
  'conversions' | 'negativeKeywords' | 'demographics_age' | 'demographics_gender' | 
  'demographics_device' | 'demographics_location';
```

Current issues in supabase/functions/google-ads-reports/index.ts:
1. Line 1585: demographics_location calls fetchDemographicsAge (wrong function)
2. No fetchDemographicsLocation implementation exists
3. User profile queries may need user_profile_view instead of user_profile
</context>

<tasks>

<task type="auto">
  <name>Create fetchDemographicsLocation function</name>
  <files>supabase/functions/google-ads-reports/index.ts</files>
  <action>
    1. Add new async function fetchDemographicsLocation that queries geographic data
    2. Use Google Ads geographic dimension: geographic_view or user_location view
    3. Query should fetch: country, region, city, metrics (cost, impressions, clicks, conversions)
    4. Return aggregated data by location name
    5. Add proper error handling like other fetch functions
    6. Test query structure against Google Ads API v20
  </action>
  <verify>
    <automated>grep -n "fetchDemographicsLocation" supabase/functions/google-ads-reports/index.ts</automated>
  </verify>
  <done>fetchDemographicsLocation function implemented and ready to be called</done>
</task>

<task type="auto">
  <name>Fix demographics_location case to call correct function</name>
  <files>supabase/functions/google-ads-reports/index.ts</files>
  <action>
    1. Find the case "demographics_location" in the switch statement (around line 1584)
    2. Change: const locResult = await fetchDemographicsAge(...) 
       To: const locResult = await fetchDemographicsLocation(...)
    3. Keep error handling pattern consistent with other cases
  </action>
  <verify>
    <automated>grep -n "demographics_location" supabase/functions/google-ads-reports/index.ts</automated>
  </verify>
  <done>demographics_location case correctly calls fetchDemographicsLocation</done>
</task>

<task type="auto">
  <name>Add user_profile_view query for age and gender demographics</name>
  <files>supabase/functions/google-ads-reports/index.ts</files>
  <action>
    1. Update fetchDemographicsAge to use user_profile_view instead of user_profile
    2. Update fetchDemographicsGender to use user_profile_view instead of user_profile
    3. Adjust field names: user_profile_view.age_range, user_profile_view.gender
    4. Keep metrics queries the same
    5. Test that queries are valid GAQL (Google Ads Query Language)
  </action>
  <verify>
    <automated>grep -n "user_profile_view" supabase/functions/google-ads-reports/index.ts</automated>
  </verify>
  <done>Age and gender demographic queries use correct view table</done>
</task>

<task type="auto">
  <name>Verify and test the audiences data fetching</name>
  <files>supabase/functions/google-ads-reports/index.ts</files>
  <action>
    1. Review fetchAudiencesSpecial function to ensure queries are valid
    2. Check that ad_group_audience_view and campaign_audience_view queries work
    3. Add debug logging for audience count returned
    4. Ensure error messages are descriptive
  </action>
  <verify>
    <automated>grep -n "fetchAudiencesSpecial" supabase/functions/google-ads-reports/index.ts</automated>
  </verify>
  <done>Audiences fetch function is properly implemented</done>
</task>

</tasks>

<verification>
- [ ] Deploy edge function: supabase functions deploy google-ads-reports
- [ ] Navigate to Audiences page in app
- [ ] Check Audiences tab shows audience data (or empty with no errors if no audiences configured)
- [ ] Check Devices tab shows device breakdown (Mobile, Desktop, Tablet)
- [ ] Check Locations tab shows geographic data
- [ ] Check console for any API errors
</verification>

<success_criteria>
All three tabs (Audiences, Devices, Locations) fetch and display data from Google Ads API without errors.
</success_criteria>

<output>
After completion, create .planning/phases/phase-5/phase-5-01-SUMMARY.md
</output>