# Roadmap: Ads Insights AI

**Created:** 2026-03-31
**Granularity:** standard
**Phases:** 4

---

## Phases

- [x] **Phase 1: Foundation & Reliability** - Infrastructure hardening and error handling
- [x] **Phase 2: Alerting & Monitoring** - Budget and account health notifications
- [ ] **Phase 3: AI Enhancement** - Deeper AI integration with Google Ads data
- [ ] **Phase 4: Validation & Polish** - Data accuracy verification and UX polish

---

## Phase Details

### Phase 1: Foundation & Reliability

**Goal:** Address critical infrastructure gaps that prevent the platform from scaling reliably.

**Depends on:** Nothing (first phase)

**Requirements:** RELI-01, RELI-02, RELI-03 + research-identified gaps

**Success Criteria** (what must be TRUE):
1. API errors display user-friendly messages with retry option
2. Loading states shown during data fetches
3. Offline handling with appropriate user feedback
4. Error boundaries wrap all dashboard components (no blank screen crashes)
5. Data tables paginate at 1000 records to prevent memory exhaustion
6. Failed API requests automatically retry 3 times with exponential backoff
7. Critical user flows have test coverage

**Plans:** 2 plans
- [x] phase-1-01-PLAN.md — Error boundaries, offline detection, retry logic, loading states
- [x] phase-1-02-PLAN.md — Pagination, HTTP status codes, test coverage

---

### Phase 2: Alerting & Monitoring

**Goal:** Enable proactive monitoring with budget pacing and account health alerts.

**Depends on:** Phase 1 (Complete)

**Requirements:** ALRT-01, ALRT-02, ALRT-03 (from v2)

**Success Criteria** (what must be TRUE):
1. User receives notification when campaign spend rate exceeds expected pace
2. User receives notification when campaign spend is under budget with time remaining
3. User receives notification when campaigns have broken URLs or quality score drops
4. User can configure alert thresholds (budget % threshold, quality score minimum)
5. Alerts appear in-app with appropriate severity indicators

**Plans:** 1 plan
- [x] phase-2-01-PLAN.md — Alert types, AlertSystem component, AlertSettings, TopBar bell icon

**UI hint:** yes

---

### Phase 3: AI Enhancement

**Goal:** Deepen AI capabilities with deeper Google Ads data integration for actionable recommendations.

**Depends on:** Phase 2

**Requirements:** AIEX-01, AIEX-02, AIEX-03 (from v2)

**Success Criteria** (what must be TRUE):
1. AI can suggest negative keywords based on search term analysis
2. AI can recommend bid strategy adjustments based on performance data
3. AI can identify underperforming ad copy with improvement suggestions
4. AI chat has access to campaign context in prompts for more relevant responses

**Plans:** 1 plan
- [ ] phase-3-01-PLAN.md — Add bidding strategy and ad creative data to AI context

---

### Phase 4: Validation & Polish

**Goal:** Ensure data accuracy and polish UX for production release.

**Depends on:** Phase 3

**Requirements:** VALD-01, VALD-02

**Success Criteria** (what must be TRUE):
1. Dashboard metrics can be compared side-by-side with Google Ads UI
2. Discrepancies between app and Google Ads are highlighted with explanation
3. Timezone and attribution window settings are documented and configurable
4. Empty states shown when no data available (no blank spaces)
5. Loading skeletons displayed during data fetches
6. Large accounts (1000+ campaigns) load without performance degradation

**Plans:** TBD

**UI hint:** yes

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Reliability | 2/2 | Complete | Yes |
| 2. Alerting & Monitoring | 1/1 | Complete | Yes |
| 3. AI Enhancement | 1/1 | Planned | - |
| 4. Validation & Polish | 0/1 | Not started | - |

---

## Notes

- All v1 requirements (AUTH, ACCT, DSBH, CAMP, ADGR, KEYW, STER, AI, RECM) are already validated and working in the current codebase
- This roadmap focuses on closing the reliability gaps and then advancing v2 features
- Phase 1 addresses research-identified pitfalls #1-6 and #8
- Phase 4 addresses research-identified pitfall #7 (data validation)