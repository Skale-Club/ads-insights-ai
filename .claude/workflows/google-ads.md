# Google Ads Workflows

Standard workflow prompts for Google Ads management via Claude Code CLI.

**Before running any workflow:** ensure a valid CLI session is active. See `.claude/google-ads-cli.md` for setup.

---

## Workflow 1: Campaign Audit

**Purpose:** Full health check of all active campaigns — find waste, gaps, and quick wins.

**Prompt:**
```
Run a complete campaign audit for my Google Ads account.

Steps:
1. Fetch campaigns report (last 30 days)
2. Fetch keywords report (last 30 days)
3. Fetch search_terms report (last 30 days)
4. Fetch budgets report

Analyze and report:
- Campaigns with high spend but low conversion rate (flag for pause or bid reduction)
- Campaigns with low impression share and budget headroom (flag for budget increase)
- Keywords with Quality Score < 5 (flag for pause or ad copy improvement)
- Search terms with spend > $20 and 0 conversions (flag as negative keyword candidates)
- Campaigns spending 100% of budget before end of day (flag for budget increase)

Output a prioritized action list with: issue, affected entity, recommended action, estimated impact.
Then ask which actions I want to execute.
```

---

## Workflow 2: Search Term Mining + Negative Keyword Cleanup

**Purpose:** Find irrelevant search terms and add them as negatives to reduce wasted spend.

**Prompt:**
```
Run a search term mining and negative keyword cleanup workflow.

Steps:
1. Fetch search_terms report for the last 30 days
2. Fetch negativeKeywords report (existing negatives)

Identify search terms that are likely irrelevant:
- Terms with 0 conversions and spend > $10
- Terms clearly unrelated to the business based on the campaign names and existing keywords
- Terms indicating wrong intent (e.g., "free", "DIY", "how to", job-seeking terms like "jobs", "salary", "career")

Cross-check against existing negative keywords to avoid duplicates.

Present a table of candidate negative keywords with: term, spend, clicks, match type recommendation.
Ask which ones I want to add before executing.
```

---

## Workflow 3: Bid Optimization

**Purpose:** Adjust bids based on performance data to improve ROI across campaigns and ad groups.

**Prompt:**
```
Run a bid optimization workflow for my Google Ads account.

Steps:
1. Fetch campaigns report (last 14 days)
2. Fetch adGroups report (last 14 days)
3. Fetch keywords report (last 14 days)

Apply these optimization rules:
- Keywords with conversion rate > account average AND CPC < target CPA/3: increase bid by 15–20%
- Keywords with 0 conversions and spend > 2x target CPA: decrease bid by 25%
- Ad groups with ROAS > target: increase bids by 10%
- Ad groups with ROAS < 50% of target and spend > $50: decrease bids by 20%

Present a bid change table with: entity name, current bid, proposed bid, reason, expected impact.
Group by campaign. Ask for approval before executing any changes.
```

---

## Workflow 4: Ad Copy Review

**Purpose:** Evaluate existing ad copy quality and identify underperforming ads for refresh.

**Prompt:**
```
Run an ad copy review for my Google Ads account.

Steps:
1. Fetch ads report (last 30 days)
2. Fetch campaigns report for context

For each active Responsive Search Ad, evaluate:
- CTR vs campaign average (flag ads with CTR < 50% of average)
- Ad strength (if available — flag "Poor" or "Average" rated ads)
- Headline/description diversity (flag ads that reuse the same headline across all 3 slots)
- Missing ad extensions (campaigns with no callouts, sitelinks, or structured snippets)

Output:
1. List of underperforming ads with specific improvement suggestions (using RSA best practices: pinning sparingly, 3+ unique headlines per theme, benefit-focused CTAs)
2. Missing extension opportunities per campaign
3. Top 3 highest-CTR ads as examples to replicate

Do not execute any changes — this is analysis only.
```

---

## Workflow 5: Weekly Performance Report

**Purpose:** Generate a concise weekly performance summary with trends and recommendations.

**Prompt:**
```
Generate a weekly performance report for my Google Ads account.

Fetch these reports for the current week (last 7 days) AND the prior week (days 8–14):
1. overview report for both periods
2. campaigns report for both periods

Report structure:
## Weekly Snapshot (last 7 days vs prior 7 days)
- Spend: $X (↑/↓ Y%)
- Clicks: X (↑/↓ Y%)
- Impressions: X (↑/↓ Y%)
- CTR: X% (↑/↓)
- Avg CPC: $X (↑/↓)
- Conversions: X (↑/↓ Y%)
- Cost per conversion: $X (↑/↓)

## Top Performers (campaigns improving most WoW)
## Underperformers (campaigns declining most WoW)
## Budget Pacing (on track / underspending / overspending)
## Recommended Actions (top 3 highest-priority items this week)

Keep the report concise — executive summary style, under 400 words.
```
