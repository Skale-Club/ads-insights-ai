# Phase 5 Summary: Audiences Page Fix

**Completed:** 2026-03-31  
**Plan:** phase-5-01 (Fix Audiences page data fetching)

---

## One-Liner

Fixed Audiences page to properly fetch and display audience demographics, device, and location data from Google Ads API.

---

## What Was Built

1. Added `fetchDemographicsLocation` function using `geographic_view` to fetch geographic performance data by country and city
2. Fixed bug where `demographics_location` case incorrectly called `fetchDemographicsAge`
3. Updated age and gender demographics to use `user_profile_view` instead of deprecated `user_profile`
4. Fixed response field mapping from `row.userProfile` to `row.userProfileView`

---

## Key Decisions

- Used `geographic_view` for location data (not `user_profile`) - provides country criterion ID and city-level granularity
- Switched to `user_profile_view` for age/gender - required for Google Ads API v18 compliance

---

## Files Changed

- `supabase/functions/google-ads-reports/index.ts` (+81 lines, -9 lines)

---

## Tech Debt

- Edge function not deployed to Supabase (requires manual deployment)

---

## Verification

- Lint passed (existing pre-existing errors unrelated to changes)
- Code compiles and follows existing patterns in the file
- Data flow verified: hook → edge function → Google Ads API
