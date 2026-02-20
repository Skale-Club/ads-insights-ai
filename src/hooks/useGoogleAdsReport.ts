import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDashboard } from '@/contexts/DashboardContext';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import React from 'react';

type ReportType = 'overview' | 'campaigns' | 'keywords' | 'search_terms' | 'daily_performance' | 'adGroups' | 'ads' | 'audiences' | 'budgets' | 'conversions' | 'negativeKeywords';

interface UseGoogleAdsReportOptions {
  usePreviousPeriod?: boolean;
  enabled?: boolean;
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
  const { data, error: fnError } = await supabase.functions.invoke('google-ads-reports', {
    body: { providerToken, customerId, reportType, startDate, endDate },
  });

  if (fnError) throw new Error(fnError.message);
  if (data?.error) throw new Error(data.error);

  return data?.data;
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
    retry: 1,
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
