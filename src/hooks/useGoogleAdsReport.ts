import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDashboard } from '@/contexts/DashboardContext';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import React from 'react';

type ReportType = 'overview' | 'campaigns' | 'keywords' | 'search_terms' | 'daily_performance' | 'adGroups' | 'ads' | 'audiences' | 'budgets' | 'conversions' | 'negativeKeywords' | 'demographics_age' | 'demographics_gender' | 'demographics_device' | 'demographics_location';

interface UseGoogleAdsReportOptions {
  usePreviousPeriod?: boolean;
  enabled?: boolean;
}

const CACHE_TTL_MS = 5 * 60 * 1000;

function getCacheKey(reportType: ReportType, customerId: string, startDate: string, endDate: string): string {
  return `adsinsight:cache:${reportType}:${customerId}:${startDate}:${endDate}`;
}

function readCache(key: string): unknown | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function writeCache(key: string, data: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // localStorage full or unavailable — silently skip
  }
}

function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

async function fetchReport(
  reportType: ReportType,
  customerId: string,
  startDate: string,
  endDate: string,
  providerToken: string,
) {
  const cacheKey = getCacheKey(reportType, customerId, startDate, endDate);
  const cached = readCache(cacheKey);
  if (cached !== null) return cached;

  const { data, error: fnError } = await supabase.functions.invoke('google-ads-reports', {
    body: { providerToken, customerId, reportType, startDate, endDate },
  });

  if (fnError) throw new Error(fnError.message);
  if (data?.error) throw new Error(data.error);

  const result = data?.data;
  writeCache(cacheKey, result);
  return result;
}

export function useGoogleAdsReport<T = any>(
  reportType: ReportType,
  options: UseGoogleAdsReportOptions = {},
) {
  const { selectedAccount, dateRange, previousPeriodRange } = useDashboard();
  const { providerToken, signInWithGoogle } = useAuth();
  const { toast } = useToast();

  const token = providerToken || sessionStorage.getItem('google_provider_token');
  const customerId = selectedAccount?.id;

  const range = options.usePreviousPeriod ? previousPeriodRange : dateRange;
  const startDate = formatDate(range.from);
  const endDate = formatDate(range.to);

  return useQuery<T>({
    queryKey: ['google-ads', reportType, customerId, startDate, endDate, options.usePreviousPeriod ? 'prev' : 'curr'],
    queryFn: () => fetchReport(reportType, customerId!, startDate, endDate, token!),
    enabled: (options.enabled !== false) && !!customerId && !!token,
    staleTime: 5 * 60 * 1000,
    onError: (err) => {
      const message = err instanceof Error ? err.message : String(err);
      const isUnauth =
        message.includes('Google Ads API Error (401)') ||
        message.includes('UNAUTHENTICATED') ||
        message.includes('"status": "UNAUTHENTICATED"');

      if (!isUnauth) return;

      // Avoid repeated failing calls with an expired token.
      sessionStorage.removeItem('google_provider_token');

      toast({
        title: 'Google session expired',
        description: 'Your Google Ads connection expired. Click reconnect to sign in again.',
        variant: 'destructive',
        action: React.createElement(
          ToastAction,
          {
            altText: 'Reconnect Google',
            onClick: () => {
              // Trigger OAuth redirect.
              signInWithGoogle();
            },
          },
          'Reconnect',
        ),
      });
    },
  });
}
