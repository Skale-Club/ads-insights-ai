---
phase: phase-3
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/functions/google-ads-reports/index.ts
  - src/hooks/useGoogleAdsReport.ts
autonomous: true
requirements:
  - AIEX-01
  - AIEX-02
  - AIEX-03

must_haves:
  truths:
    - "AI has access to campaign bidding strategy type for bid adjustment recommendations"
    - "AI has access to actual ad copy (headlines, descriptions) for ad performance analysis"
    - "AI can suggest negative keywords based on search term analysis"
    - "AI can recommend bid strategy adjustments based on performance data"
    - "AI can identify underperforming ad copy with improvement suggestions"
  artifacts:
    - path: "supabase/functions/google-ads-reports/index.ts"
      provides: "Google Ads data fetching with bidding strategy and ad creative"
      min_lines: 1500
    - path: "src/components/dashboard/ChatBubble.tsx"
      provides: "AI chat with enhanced context for recommendations"
      exports: ["builtContext"]
  key_links:
    - from: "google-ads-reports/index.ts"
      to: "analyze-ads/index.ts"
      via: "campaignData JSON in request body"
      pattern: "campaignData.*campaigns"
    - from: "ChatBubble.tsx"
      to: "analyze-ads"
      via: "useGoogleAdsReport hooks + streamChat"
      pattern: "useGoogleAdsReport.*builtContext"
---

<objective>
Add missing Google Ads data to enable AI to provide actionable recommendations for negative keywords, bid strategy adjustments, and ad copy improvements.

Purpose: Close gaps identified in discussion - missing bidding strategy type and ad copy text
Output: Enhanced campaign and ad data available to AI chat
</objective>

<context>
@supabase/functions/analyze-ads/index.ts (AI tools and system prompt)
@supabase/functions/google-ads-reports/index.ts (Data fetching)
@src/components/dashboard/ChatBubble.tsx (Context building)

Current state:
- AI already has addNegativeKeyword, adjustBid, pauseCampaign tools
- Search terms already available to AI
- System prompt already mentions negative keyword scanning
- Gaps: Missing biddingStrategyType in campaigns, missing ad creative text in ads
</context>

<tasks>

<task type="auto">
  <name>Add bidding strategy type to campaigns report</name>
  <files>supabase/functions/google-ads-reports/index.ts</files>
  <action>
Modify the campaigns query in buildQuery function to include bidding strategy:

1. Add `campaign.bidding_strategy` field to SELECT clause in campaigns query
2. Update transformCampaigns function to extract biddingStrategy field
3. Map Google Ads bidding strategy enum to readable format:
   - "TARGET_CPA" -> "Target CPA"
   - "TARGET_ROAS" -> "Target ROAS"
   - "MAXIMIZE_CONVERSIONS" -> "Maximize Conversions"
   - "MAXIMIZE_CLICKS" -> "Maximize Clicks"
   - "MANUAL_CPC" -> "Manual CPC"
   - "TARGET_SPEND" -> "Target Spend"
   - "PERFORMANCE_MAX" -> "Performance Max"
   - "NONE" or empty -> "Manual"
  </action>
  <verify>
Automated: Query campaigns report and verify biddingStrategy field appears in response
- Run: Test via frontend dashboard - open campaigns page, inspect network response for campaigns data
- Expected: Each campaign object contains "biddingStrategy" field with readable value
  </verify>
  <done>Campaign data includes readable biddingStrategy field for all campaigns</done>
</task>

<task type="auto">
  <name>Add ad creative text to ads report</name>
  <files>supabase/functions/google-ads-reports/index.ts</files>
  <action>
Modify the ads query to include actual ad copy text:

1. Add Google Ads fields to SELECT for responsive search ads:
   - `ad_group_ad.ad.responsive_search_ad.headlines`
   - `ad_group_ad.ad.responsive_search_ad.descriptions`
   - `ad_group_ad.ad.expanded_text_ad.headline_part`
   - `ad_group_ad.ad.expanded_text_ad.description`

2. Update transformAds function to extract and store:
   - headlines: Array of headline strings (limit to first 3)
   - descriptions: Array of description strings (limit to first 2)
   - Combine into a simple structure that the AI can analyze

3. Handle different ad types gracefully:
   - Responsive Search Ads: Extract from headlines[] and descriptions[]
   - Expanded Text Ads: Extract from headlinePart1, headlinePart2, description
   - Other ad types: Leave empty, focus on text ads
  </action>
  <verify>
Automated: Query ads report and verify headlines/descriptions appear
- Run: Test via frontend - open Ads page or view in AI chat context
- Expected: Each ad object contains "headlines" (array) and "descriptions" (array) fields
  </verify>
  <done>Ads data includes headline and description arrays for text-based ads</done>
</task>

<task type="auto">
  <name>Update ChatBubble context to pass new data to AI</name>
  <files>src/components/dashboard/ChatBubble.tsx</files>
  <action>
Update the builtContext in ChatBubble.tsx to include the new fields:

1. In the campaigns sample (around line 654-665), add:
   ```typescript
   biddingStrategy: c.biddingStrategy || 'Manual',
   ```

2. In the ads sample (around line 702-715), add:
   ```typescript
   headlines: ad.headlines || [],
   descriptions: ad.descriptions || [],
   ```

3. Ensure the context includes enough data for AI to make recommendations:
   - Top 25 campaigns with bidding strategy
   - Top 25 ads with creative text
   - Search terms for negative keyword analysis
  </action>
  <verify>
Automated: Build the application and verify no TypeScript errors
- Run: npm run build
- Expected: Build completes without errors
  </verify>
  <done>AI chat receives enhanced campaign and ad data with bidding strategy and creative text</done>
</task>

</tasks>

<verification>
Run npm run build to ensure no compilation errors
Test AI chat - ask "Which campaigns should I change bidding strategy?" and verify AI can see bidding strategy data
Test AI chat - ask "Which ads are underperforming?" and verify AI can see ad copy text
</verification>

<success_criteria>
1. Campaign data includes biddingStrategy field
2. Ad data includes headlines and descriptions arrays  
3. AI chat context passes this data to analyze-ads function
4. AI can make recommendations based on new data
5. No build errors introduced

After completion, create `.planning/phases/phase-3/phase-3-01-SUMMARY.md`
</success_criteria>

<output>
After completion, create `.planning/phases/phase-3/phase-3-01-SUMMARY.md`
</output>