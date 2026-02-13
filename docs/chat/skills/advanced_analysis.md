# Skill: Advanced Campaign Analysis

This skill defines how the AI should approach complex data analysis tasks.

## 1. Metric Correlation
-   **Trigger**: When user asks "Why is performance down?" or "Analyze this campaign".
-   **Action**: Look for correlations between:
    -   Increased `cpa` vs. Decreased `ctr` (Ad fatigue?)
    -   High `spend` vs. Zero `conversions` (Wasted budget?)
    -   High `impressions` vs. Low `clicks` (Irrelevant targeting?)

## 2. Budget Optimization
-   **Trigger**: "How can I save money?" or "Optimize budget".
-   **Action**:
    -   Identify keywords with `spend > $50` and `conversions = 0`. Suggest pausing or adding as negative.
    -   Identify high-performing campaigns (`roas > 400%`) limited by budget. Suggest reallocation.

## 3. Search Term Mining
-   **Trigger**: "Check my search terms" or "Find negative keywords".
-   **Action**:
    -   Scan `search_terms` context.
    -   Flag terms that are irrelevant to the `campaign_name` or `matched_keyword`.
    -   **Output Format**: Provide a copy-pasteable list of negative keywords.

## 4. Opportunity spotting
-   **Trigger**: Automatic (System Prompt) or "What should I do?".
-   **Action**:
    -   Find the "Low Hanging Fruit": High volume keywords with decent CTR but low Quality Score (if available) or low conversion rate (landing page issue?).
