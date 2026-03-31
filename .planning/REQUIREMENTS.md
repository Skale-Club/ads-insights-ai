# Requirements: Ads Insights AI

**Defined:** 2026-03-31
**Core Value:** Enable marketers to quickly understand their Google Ads performance and get AI-driven recommendations to optimize campaigns — without leaving the dashboard.

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: User can sign in with Google OAuth via Supabase Auth
- [ ] **AUTH-02**: User's Google provider token persists in session for API calls
- [ ] **AUTH-03**: Protected routes redirect unauthenticated users to login
- [ ] **AUTH-04**: User can sign out and session is cleared

### Account Management

- [ ] **ACCT-01**: User can connect multiple Google Ads accounts via OAuth
- [ ] **ACCT-02**: User can switch between connected accounts
- [ ] **ACCT-03**: User can hide/show accounts from dashboard view
- [ ] **ACCT-04**: Selected account persists across sessions

### Dashboard Overview

- [ ] **DSBH-01**: Dashboard displays key metrics: Impressions, Clicks, CTR, CPC, Conversions, Cost
- [ ] **DSBH-02**: Dashboard shows date range filter with presets (7, 14, 30, 90 days, custom)
- [ ] **DSBH-03**: Dashboard displays performance chart over time
- [ ] **DSBH-04**: Dashboard shows top campaigns table with metrics
- [ ] **DSBH-05**: Date range selection updates all dashboard data

### Campaign Management

- [ ] **CAMP-01**: User can view list of all campaigns with status
- [ ] **CAMP-02**: User can view campaign performance metrics
- [ ] **CAMP-03**: User can filter campaigns by status (enabled, paused, removed)

### Ad Groups

- [ ] **ADGR-01**: User can view ad groups within a campaign
- [ ] **ADGR-02**: User can view ad group performance metrics

### Keywords

- [ ] **KEYW-01**: User can view keywords with performance data
- [ ] **KEYW-02**: User can see keyword metrics: impressions, clicks, cost, conversions

### Search Terms

- [ ] **STER-01**: User can view search terms report
- [ ] **STER-02**: User can see search term performance metrics

### AI Insights

- [ ] **AI-01**: User can send chat messages to query ad performance
- [ ] **AI-02**: AI responds with insights based on campaign data
- [ ] **AI-03**: User can ask optimization questions
- [ ] **AI-04**: AI provides actionable recommendations

### Recommendations

- [ ] **RECM-01**: User can view AI-generated optimization recommendations
- [ ] **RECM-02**: Recommendations are categorized by type

### Reliability

- [ ] **RELI-01**: API errors display user-friendly messages with retry option
- [ ] **RELI-02**: Loading states shown during data fetches
- [ ] **RELI-03**: Offline handling with appropriate user feedback

## v2 Requirements

### Alerting & Monitoring

- **ALRT-01**: User receives budget pacing alerts when spend rate is abnormal
- **ALRT-02**: User receives account health alerts for campaigns needing attention
- **ALRT-03**: User can configure alert thresholds

### Enhanced AI

- **AIEX-01**: AI can suggest negative keywords based on search term analysis
- **AIEX-02**: AI can recommend bid strategy adjustments
- **AIEX-03**: AI can identify underperforming ad copy

### Data Validation

- **VALD-01**: Data accuracy verification against Google Ads UI
- **VALD-02**: Discrepancy highlighting when data doesn't match

## Out of Scope

| Feature | Reason |
|---------|--------|
| Bulk campaign editing | High complexity, risk of accidental changes |
| Automated bid execution | Requires additional API permissions, liability concerns |
| White-label/reporting | Not core to dashboard value proposition |
| Microsoft Advertising support | Outside current scope, would require separate API integration |
| Real-time data streaming | Google Ads API doesn't support real-time; 15-min delay is standard |
| Custom report builder | Current reports page sufficient for v1 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | — | ✓ Validated |
| AUTH-02 | — | ✓ Validated |
| AUTH-03 | — | ✓ Validated |
| AUTH-04 | — | ✓ Validated |
| ACCT-01 | — | ✓ Validated |
| ACCT-02 | — | ✓ Validated |
| ACCT-03 | — | ✓ Validated |
| ACCT-04 | — | ✓ Validated |
| DSBH-01 | — | ✓ Validated |
| DSBH-02 | — | ✓ Validated |
| DSBH-03 | — | ✓ Validated |
| DSBH-04 | — | ✓ Validated |
| DSBH-05 | — | ✓ Validated |
| CAMP-01 | — | ✓ Validated |
| CAMP-02 | — | ✓ Validated |
| CAMP-03 | — | ✓ Validated |
| ADGR-01 | — | ✓ Validated |
| ADGR-02 | — | ✓ Validated |
| KEYW-01 | — | ✓ Validated |
| KEYW-02 | — | ✓ Validated |
| STER-01 | — | ✓ Validated |
| STER-02 | — | ✓ Validated |
| AI-01 | — | ✓ Validated |
| AI-02 | — | ✓ Validated |
| AI-03 | — | ✓ Validated |
| AI-04 | — | ✓ Validated |
| RECM-01 | — | ✓ Validated |
| RECM-02 | — | ✓ Validated |
| RELI-01 | — | Pending |
| RELI-02 | — | Pending |
| RELI-03 | — | Pending |

**Coverage:**
- v1 requirements: 30 total
- Mapped to phases: TBD
- Unmapped: 0 ✓ (All current features validated, new requirements for future phases)

---
*Requirements defined: 2026-03-31*
*Last updated: 2026-03-31 after initial definition*