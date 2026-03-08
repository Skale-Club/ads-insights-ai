import { z } from 'zod';

export const addNegativeKeywordSchema = z.object({
    keyword: z.string().describe('The negative keyword to add'),
    matchType: z.enum(['broad', 'phrase', 'exact']).describe('Match type for the negative keyword'),
    level: z.enum(['campaign', 'adGroup']).describe('Level to add the negative keyword at'),
    campaignId: z.string().describe('Campaign ID to add the negative keyword to'),
    adGroupId: z.string().optional().describe('Ad Group ID (required if level is adGroup)'),
});

export const addNegativeKeywordTool = {
    name: 'addNegativeKeyword',
    description: 'Add a negative keyword to a campaign or ad group to prevent ads from showing on specific searches',
    parameters: addNegativeKeywordSchema,
};

export const adjustBidSchema = z.object({
    campaignId: z.string().optional().describe('Campaign ID to adjust bids for'),
    adGroupId: z.string().optional().describe('Ad Group ID to adjust bids for'),
    keywordId: z.string().optional().describe('Keyword ID to adjust bid for'),
    bidType: z.enum(['cpc', 'cpm', 'targetCpa', 'targetRoas']).describe('Type of bid to adjust'),
    newBid: z.number().positive().describe('New bid amount in account currency'),
    reason: z.string().describe('Reason for the bid adjustment'),
});

export const adjustBidTool = {
    name: 'adjustBid',
    description: 'Adjust bids for a campaign, ad group, or keyword',
    parameters: adjustBidSchema,
};

export const pauseCampaignSchema = z.object({
    campaignId: z.string().describe('Campaign ID to pause'),
    reason: z.string().describe('Reason for pausing the campaign'),
});

export const pauseCampaignTool = {
    name: 'pauseCampaign',
    description: 'Pause a running campaign',
    parameters: pauseCampaignSchema,
};

export const enableCampaignSchema = z.object({
    campaignId: z.string().describe('Campaign ID to enable'),
    reason: z.string().describe('Reason for enabling the campaign'),
});

export const enableCampaignTool = {
    name: 'enableCampaign',
    description: 'Enable a paused campaign',
    parameters: enableCampaignSchema,
};

export const createBudgetSchema = z.object({
    name: z.string().describe('Name for the budget'),
    amountMicros: z.number().positive().describe('Budget amount in micros (1 USD = 1,000,000 micros)'),
    deliveryMethod: z.enum(['STANDARD', 'ACCELERATED']).optional().describe('Budget delivery method'),
});

export const createBudgetTool = {
    name: 'createBudget',
    description: 'Create a new campaign budget',
    parameters: createBudgetSchema,
};

export const updateCampaignBudgetSchema = z.object({
    campaignId: z.string().describe('Campaign ID to update budget for'),
    newBudgetAmountMicros: z.number().positive().describe('New budget amount in micros'),
    reason: z.string().describe('Reason for the budget change'),
});

export const updateCampaignBudgetTool = {
    name: 'updateCampaignBudget',
    description: 'Update the daily budget for a campaign',
    parameters: updateCampaignBudgetSchema,
};

export const queryAdsDataSchema = z.object({
    reportType: z.enum(['campaigns', 'adGroups', 'ads', 'keywords', 'searchTerms', 'audiences', 'budgets', 'conversions']),
    startDate: z.string().describe('Start date in YYYY-MM-DD format'),
    endDate: z.string().describe('End date in YYYY-MM-DD format'),
    filters: z.array(z.object({
        field: z.string(),
        operator: z.enum(['>', '<', '=', '>=', '<=', '!=', 'contains', 'notContains']),
        value: z.union([z.string(), z.number()]),
    })).optional().describe('Filters to apply to the query'),
    limit: z.number().min(1).max(1000).optional().describe('Maximum number of results to return'),
    orderBy: z.string().optional().describe('Field to order by'),
    orderDirection: z.enum(['asc', 'desc']).optional().describe('Order direction'),
});

export const queryAdsDataTool = {
    name: 'queryAdsData',
    description: 'Query Google Ads data with specific filters and parameters',
    parameters: queryAdsDataSchema,
};

export type ToolName = typeof addNegativeKeywordTool.name
    | typeof adjustBidTool.name
    | typeof pauseCampaignTool.name
    | typeof enableCampaignTool.name
    | typeof createBudgetTool.name
    | typeof updateCampaignBudgetTool.name
    | typeof queryAdsDataTool.name;

export const chatTools = {
    addNegativeKeyword: addNegativeKeywordTool,
    adjustBid: adjustBidTool,
    pauseCampaign: pauseCampaignTool,
    enableCampaign: enableCampaignTool,
    createBudget: createBudgetTool,
    updateCampaignBudget: updateCampaignBudgetTool,
    queryAdsData: queryAdsDataTool,
};

export type ChatTools = typeof chatTools;
