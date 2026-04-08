# Google Ads CLI Integration

This file explains how Claude Code can interact with the user's Google Ads account when a CLI session is active.

## Prerequisites

1. User must be logged in to the web app
2. User must have a Google Ads account selected
3. User must have clicked **"Activate Claude Code Access"** in Settings → Claude Code Access
4. The file `.ads-cli-session.json` must exist in the project root with this structure:
   ```json
   { "supabase_url": "https://xxx.supabase.co", "session_token": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" }
   ```

## How to use (Claude Code workflow)

### 1. Read the session config
```bash
cat .ads-cli-session.json
```

### 2. Get the Google OAuth token and customer ID
```bash
# Replace SESSION_TOKEN and SUPABASE_URL with values from .ads-cli-session.json
curl -s -X POST "SUPABASE_URL/functions/v1/get-cli-session" \
  -H "Content-Type: application/json" \
  -d '{"session_token":"SESSION_TOKEN"}'
```
Response: `{ "provider_token": "...", "customer_id": "...", "expires_at": "..." }`

### 3. Call Google Ads Reports
```bash
curl -s -X POST "SUPABASE_URL/functions/v1/google-ads-reports" \
  -H "Content-Type: application/json" \
  -d '{
    "providerToken": "PROVIDER_TOKEN",
    "customerId": "CUSTOMER_ID",
    "reportType": "campaigns",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  }'
```

Available report types: `overview`, `campaigns`, `keywords`, `search_terms`, `adGroups`, `ads`,
`audiences`, `budgets`, `conversions`, `negativeKeywords`, `demographics_age`,
`demographics_gender`, `demographics_device`, `demographics_location`, `daily_performance`

### 4. Mutate Google Ads data

#### Pause a campaign
```bash
curl -s -X POST "SUPABASE_URL/functions/v1/google-ads-mutate" \
  -H "Content-Type: application/json" \
  -d '{
    "providerToken": "PROVIDER_TOKEN",
    "customerId": "CUSTOMER_ID",
    "action": "updateCampaignStatus",
    "campaignId": "CAMPAIGN_ID",
    "newStatus": "PAUSED"
  }'
```

#### Enable a campaign
Same as above but `"newStatus": "ENABLED"`

#### Add negative keywords
```bash
curl -s -X POST "SUPABASE_URL/functions/v1/google-ads-mutate" \
  -H "Content-Type: application/json" \
  -d '{
    "providerToken": "PROVIDER_TOKEN",
    "customerId": "CUSTOMER_ID",
    "action": "addNegativeKeywords",
    "keywords": ["bad keyword 1", "bad keyword 2"],
    "matchType": "PHRASE"
  }'
```

matchType options: `EXACT`, `PHRASE`, `BROAD`

#### Adjust bid (keyword level)
```bash
curl -s -X POST "SUPABASE_URL/functions/v1/google-ads-mutate" \
  -H "Content-Type: application/json" \
  -d '{
    "providerToken": "PROVIDER_TOKEN",
    "customerId": "CUSTOMER_ID",
    "action": "adjustBid",
    "keywordResourceName": "customers/CUSTOMER_ID/adGroupCriteria/ADGROUP_ID~CRITERION_ID",
    "newBidMicros": 1500000
  }'
```

Use `adGroupId` to bid at ad-group level, or `campaignId` for campaign-level Manual CPC.
`newBidMicros` is in micros: 1 USD = 1,000,000 micros.

#### Update campaign budget
```bash
curl -s -X POST "SUPABASE_URL/functions/v1/google-ads-mutate" \
  -H "Content-Type: application/json" \
  -d '{
    "providerToken": "PROVIDER_TOKEN",
    "customerId": "CUSTOMER_ID",
    "action": "updateCampaignBudget",
    "campaignBudgetId": "BUDGET_ID",
    "newAmountMicros": 50000000
  }'
```

`campaignBudgetId` can be a numeric ID or full resource name (`customers/.../campaignBudgets/...`).

#### Create a new budget
```bash
curl -s -X POST "SUPABASE_URL/functions/v1/google-ads-mutate" \
  -H "Content-Type: application/json" \
  -d '{
    "providerToken": "PROVIDER_TOKEN",
    "customerId": "CUSTOMER_ID",
    "action": "createBudget",
    "budgetName": "My New Budget",
    "newAmountMicros": 30000000,
    "deliveryMethod": "STANDARD"
  }'
```

## Human Approval Protocol

**IMPORTANT: Always show a mutation preview and ask for explicit confirmation before executing any mutate call.**

### Before any mutation, show this preview:

```
Proposed change:
  Action:   [action name]
  Target:   [campaign/ad group/keyword name and ID]
  Change:   [what will change — e.g., "bid: $1.20 → $1.50", "status: ENABLED → PAUSED"]
  Reason:   [why this change is recommended]
  Impact:   [estimated effect — e.g., "~25% increase in impressions", "stops $X/day waste"]

Proceed? (yes / no / skip)
```

### Approval rules

- **Never execute a mutation without user confirmation**, even if the user said "do everything" earlier in the conversation. Each mutation requires its own approval.
- **Batch approvals**: If the user says "approve all" after seeing the full preview list, you may execute all at once. "Approve all" applies only to the items in the current preview list — not future items.
- **Skip**: If the user says "skip" for an item, do not execute it. Move to the next item.
- **Cancel**: If the user says "cancel" or "stop", abort the entire batch.
- **Single-item**: If only one change is proposed, a simple "yes" is sufficient confirmation.

### What counts as a mutation

These actions mutate live campaign data and require approval:
- `updateCampaignStatus` (pause/enable)
- `adjustBid`
- `updateCampaignBudget`
- `createBudget`
- `addNegativeKeywords`

Read-only actions (`google-ads-reports`, `queryAdsData`) do not require confirmation.

## Error handling

- **401 expired**: Session expired. Ask user to click "Refresh Session" in Settings → Claude Code Access
- **404 not found**: `.ads-cli-session.json` missing or wrong session_token. Ask user to re-activate
- **400 bad request**: Invalid request parameters

## Security notes

- The session token is equivalent to a Google OAuth token — keep `.ads-cli-session.json` private
- Sessions expire automatically after 2 hours
- Users can revoke access anytime via Settings → Claude Code Access → Revoke
- The file is git-ignored automatically
