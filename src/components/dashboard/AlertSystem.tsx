import { useEffect, useMemo, useState } from 'react';
import { useGoogleAdsReport } from '@/hooks/useGoogleAdsReport';
import { useDashboard } from '@/contexts/DashboardContext';
import { toast } from '@/components/ui/sonner';
import {
  Alert,
  AlertThresholds,
  DEFAULT_ALERT_THRESHOLDS,
  CampaignAlertData,
  KeywordAlertData,
} from '@/types/alerts';
import { differenceInDays, parseISO, isAfter, isBefore, startOfDay } from 'date-fns';

const STORAGE_KEY = 'adsinsight:alertThresholds';

function getStoredThresholds(): AlertThresholds {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_ALERT_THRESHOLDS, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('[AlertSystem] Failed to parse thresholds:', e);
  }
  return DEFAULT_ALERT_THRESHOLDS;
}

function saveThresholds(thresholds: AlertThresholds): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(thresholds));
}

function calculatePacing(
  campaign: CampaignAlertData,
  dateRangeFrom: Date,
  dateRangeTo: Date,
  threshold: number,
  isOverspend: boolean
): boolean {
  const today = startOfDay(new Date());
  const rangeStart = startOfDay(parseISO(campaign.startDate));
  const rangeEnd = startOfDay(parseISO(campaign.endDate));

  if (isBefore(today, rangeStart)) return false;

  const effectiveStart = isAfter(rangeStart, dateRangeFrom) ? rangeStart : dateRangeFrom;
  const effectiveEnd = isBefore(rangeEnd, dateRangeTo) ? rangeEnd : dateRangeTo;

  const totalDays = Math.max(1, differenceInDays(effectiveEnd, effectiveStart) + 1);
  const daysElapsed = Math.max(1, Math.min(differenceInDays(today, effectiveStart) + 1, totalDays));

  if (campaign.budget <= 0) return false;

  const expectedSpend = (campaign.budget / totalDays) * daysElapsed;
  const pacePercent = (campaign.spend / expectedSpend) * 100;

  if (isOverspend) {
    return pacePercent > threshold;
  } else {
    const daysRemaining = totalDays - daysElapsed;
    return pacePercent < threshold && daysRemaining > 2;
  }
}

export function AlertSystem() {
  const { dateRange } = useDashboard();
  const [thresholds, setThresholds] = useState<AlertThresholds>(getStoredThresholds);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const { data: campaigns, isLoading: loadingCampaigns } = useGoogleAdsReport<CampaignAlertData[]>('campaigns', {
    enabled: thresholds.enableBudgetAlerts,
  });

  const { data: keywords } = useGoogleAdsReport<KeywordAlertData[]>('keywords', {
    enabled: thresholds.enableQualityAlerts,
  });

  const alerts = useMemo(() => {
    const newAlerts: Alert[] = [];
    const now = new Date();

    if (thresholds.enableBudgetAlerts && campaigns) {
      for (const campaign of campaigns) {
        if (campaign.status === 'REMOVED') continue;

        const isOverspend = calculatePacing(
          campaign,
          dateRange.from,
          dateRange.to,
          thresholds.overspendThreshold,
          true
        );

        if (isOverspend) {
          const alertId = `overspend-${campaign.id}`;
          if (!dismissedAlerts.has(alertId)) {
            newAlerts.push({
              id: alertId,
              type: 'budget_overspend',
              severity: 'warning',
              title: 'Budget Overspend Alert',
              message: `Campaign "${campaign.name}" has exceeded ${thresholds.overspendThreshold}% of expected pace`,
              campaignId: campaign.id,
              campaignName: campaign.name,
              createdAt: now,
              dismissed: false,
            });
          }
        }

        const isUnderspend = calculatePacing(
          campaign,
          dateRange.from,
          dateRange.to,
          thresholds.underspendThreshold,
          false
        );

        if (isUnderspend) {
          const alertId = `underspend-${campaign.id}`;
          if (!dismissedAlerts.has(alertId)) {
            newAlerts.push({
              id: alertId,
              type: 'budget_underspend',
              severity: 'warning',
              title: 'Budget Underspend Alert',
              message: `Campaign "${campaign.name}" is at ${thresholds.underspendThreshold}% of expected pace with time remaining`,
              campaignId: campaign.id,
              campaignName: campaign.name,
              createdAt: now,
              dismissed: false,
            });
          }
        }
      }
    }

    if (thresholds.enableQualityAlerts && keywords) {
      for (const kw of keywords) {
        if (kw.qualityScore > 0 && kw.qualityScore < thresholds.minQualityScore) {
          const alertId = `quality-${kw.id}`;
          if (!dismissedAlerts.has(alertId)) {
            newAlerts.push({
              id: alertId,
              type: 'quality_score_drop',
              severity: 'warning',
              title: 'Low Quality Score Alert',
              message: `Keyword "${kw.keyword}" has quality score ${kw.qualityScore} (below ${thresholds.minQualityScore})`,
              campaignId: kw.campaignId,
              campaignName: kw.campaignName,
              createdAt: now,
              dismissed: false,
            });
          }
        }
      }
    }

    return newAlerts;
  }, [campaigns, keywords, dateRange, thresholds, dismissedAlerts]);

  useEffect(() => {
    if (loadingCampaigns || alerts.length === 0) return;

    for (const alert of alerts) {
      if (alert.type === 'budget_overspend' || alert.type === 'budget_underspend') {
        toast.warning(alert.title, {
          description: alert.message,
          duration: 10000,
        });
      } else if (alert.type === 'quality_score_drop') {
        toast.warning(alert.title, {
          description: alert.message,
          duration: 8000,
        });
      }
    }
  }, [alerts, loadingCampaigns]);

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts((prev) => new Set([...prev, alertId]));
  };

  const updateThresholds = (newThresholds: AlertThresholds) => {
    setThresholds(newThresholds);
    saveThresholds(newThresholds);
  };

  return {
    alerts,
    thresholds,
    updateThresholds,
    dismissAlert,
    alertCount: alerts.length,
  };
}

export function useAlertCount(): number {
  const { alerts } = AlertSystem();
  return alerts.length;
}