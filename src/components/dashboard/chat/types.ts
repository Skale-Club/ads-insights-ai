import type { ChatAttachment } from '@/components/dashboard/ChatAttachments';
import type { MessagePart } from '@/types/chat';

export type ChatSession = {
  id: string;
  title: string;
  created_at: string;
  account_id?: string;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
  attachments?: ChatAttachment[];
  parts?: MessagePart[];
};

export interface UserAISettings {
  openai_api_key: string | null;
  preferred_model: string;
}

export type OverviewData = {
  spend: number;
  conversions: number;
  conversionsValue: number;
  impressions: number;
  clicks: number;
  cpa: number;
  roas: number;
  ctr: number;
};

export type CampaignRow = {
  id: string;
  name: string;
  status: string;
  type: string;
  budget: number;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  cpa: number;
  roas?: number;
  conversionsValue?: number;
  biddingStrategy?: string;
};

export type KeywordRow = {
  id: string;
  keyword: string;
  matchType: string;
  status: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  ctr: number;
  cpa: number;
  qualityScore: number | null;
};

export type SearchTermRow = {
  id: string;
  searchTerm: string;
  matchedKeyword: string;
  matchType: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  ctr: number;
  cpa: number;
  qualityScore: number | null;
};

export type DailyPerformanceRow = {
  date: string;
  conversions: number;
  spend: number;
  impressions: number;
  clicks: number;
};

export type AdGroupRow = {
  id: string;
  name: string;
  campaignName: string;
  status: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  ctr: number;
  cpa: number;
};

export type AdRow = {
  id: string;
  name: string;
  adGroup: string;
  campaign: string;
  type: string;
  status: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  ctr: number;
  headlines?: string[];
  descriptions?: string[];
};

export type AudienceRow = {
  id: string;
  name: string;
  type: string;
  status: string;
  reach: number;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  ctr: number;
  cpa: number;
};

export type BudgetRow = {
  id: string;
  name: string;
  status: string;
  amount: number;
  spent: number;
  campaignsCount: number;
  remaining: number;
  utilization: number;
};

export type ConversionRow = {
  id: string;
  name: string;
  category: string;
  type: string;
  countingType: string;
  status: string;
  primaryForGoal: boolean;
  campaign?: string;
  adGroup?: string;
  conversions: number;
  allConversions: number;
  value: number;
  cost: number;
  clicks: number;
  cpa: number;
  conversionRate: number;
  roas: number;
  hasConversions: boolean;
};

export type NegativeKeywordRow = {
  id: string;
  keyword: string;
  matchType: string;
  status: string;
  adGroup?: string;
  campaign?: string;
  level?: string;
};

export function buildWelcomeMessage(accountName?: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role: 'assistant',
    content: accountName
      ? `Hi. I'm your Ads Insights AI for ${accountName}. Ask about performance, budget, keywords, or optimization opportunities.`
      : `Hi. I'm your Ads Insights AI. Select an account to start an analysis.`,
    parts: undefined,
  };
}

export function normalizeModel(model: string | null | undefined): string {
  const normalized = String(model || '').trim();
  if (normalized.startsWith('gemini-')) {
    return normalized;
  }

  return 'gemini-2.5-flash';
}

export function normalizeAssistantMarkdown(content: string): string {
  let next = content.replace(/\r\n/g, '\n');
  next = next.replace(/\n{3,}/g, '\n\n');
  next = next.replace(/^\s{5,}/gm, '    ');

  const quoteLines = (next.match(/^\s*>\s?/gm) || []).length;
  if (quoteLines >= 3) {
    next = next.replace(/^\s*>\s?/gm, '');
  }

  return next.trim();
}
