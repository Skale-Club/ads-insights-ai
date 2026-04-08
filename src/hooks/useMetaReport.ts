import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDashboard } from '@/contexts/DashboardContext';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

type MetaReportType = 'overview' | 'campaigns' | 'adsets' | 'ads' | 'insights_by_placement' | 'daily_performance';

interface UseMetaReportOptions {
  enabled?: boolean;
}

const CACHE_TTL_MS = 5 * 60 * 1000;

function getCacheKey(reportType: MetaReportType, accountId: string, startDate: string, endDate: string): string {
  return `adsinsight:meta:cache:${reportType}:${accountId}:${startDate}:${endDate}`;
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
    // ignore
  }
}

async function fetchMetaReport(
  reportType: MetaReportType,
  accountId: string,
  startDate: string,
  endDate: string,
  accessToken: string,
  userId: string,
) {
  const cacheKey = getCacheKey(reportType, accountId, startDate, endDate);
  const cached = readCache(cacheKey);
  if (cached !== null) return cached;

  const { data, error: fnError } = await supabase.functions.invoke('meta-reports', {
    body: { accessToken, accountId, reportType, startDate, endDate, userId },
  });

  if (fnError) throw new Error(fnError.message);
  if (data?.error) throw new Error(data.error);

  const result = data?.data;
  writeCache(cacheKey, result);
  return result;
}

export function useMetaReport<T = any>(
  reportType: MetaReportType,
  options: UseMetaReportOptions = {},
) {
  const { selectedMetaAccount, dateRange } = useDashboard();
  const { user } = useAuth();
  const [accessToken, setAccessToken] = React.useState<string | null>(null);

  const accountId = selectedMetaAccount?.account_id;
  const startDate = format(dateRange.from, 'yyyy-MM-dd');
  const endDate = format(dateRange.to, 'yyyy-MM-dd');

  // Load access token from meta_connections
  React.useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('meta_connections')
      .select('access_token')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => setAccessToken(data?.access_token ?? null));
  }, [user?.id]);

  return useQuery<T>({
    queryKey: ['meta', reportType, accountId, startDate, endDate],
    queryFn: () => fetchMetaReport(reportType, accountId!, startDate, endDate, accessToken!, user!.id),
    enabled: (options.enabled !== false) && !!accountId && !!accessToken && !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}
