export type AlertSeverity = 'info' | 'warning' | 'critical';

export type AlertType = 'budget_overspend' | 'budget_underspend' | 'quality_score_drop';

export interface AlertThresholds {
  overspendThreshold: number;
  underspendThreshold: number;
  minQualityScore: number;
  enableBudgetAlerts: boolean;
  enableQualityAlerts: boolean;
}

export const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
  overspendThreshold: 120,
  underspendThreshold: 50,
  minQualityScore: 6,
  enableBudgetAlerts: true,
  enableQualityAlerts: true,
};

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  campaignId?: string;
  campaignName?: string;
  createdAt: Date;
  dismissed: boolean;
}

export interface CampaignAlertData {
  id: string;
  name: string;
  status: string;
  budget: number;
  spend: number;
  startDate: string;
  endDate: string;
}

export interface KeywordAlertData {
  id: string;
  keyword: string;
  qualityScore: number;
  campaignId: string;
  campaignName: string;
}