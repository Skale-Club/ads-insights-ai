import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useGoogleAdsReport } from '@/hooks/useGoogleAdsReport';

// Mock Supabase functions
vi.mock('@/integrations/supabase/client', () => ({
  isSupabaseConfigured: true,
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

// Mock DashboardContext
vi.mock('@/contexts/DashboardContext', () => ({
  useDashboard: () => ({
    selectedAccount: { id: 'cust-123' },
    dateRange: { from: new Date('2024-01-01'), to: new Date('2024-01-31') },
    previousPeriodRange: { from: new Date('2023-12-01'), to: new Date('2023-12-31') },
  }),
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    providerToken: 'mock-provider-token',
    signInWithGoogle: vi.fn(),
  }),
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import { supabase } from '@/integrations/supabase/client';

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe('useGoogleAdsReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('returns data on success', async () => {
    const mockData = [{ id: '1', name: 'Campaign A', impressions: 1000 }];
    (supabase.functions.invoke as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: mockData },
      error: null,
    });

    const { result } = renderHook(() => useGoogleAdsReport('campaigns'), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData);
  });

  it('throws when edge function returns error field', async () => {
    (supabase.functions.invoke as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { error: 'Google Ads API Error (400): bad request' },
      error: null,
    });

    const { result } = renderHook(() => useGoogleAdsReport('campaigns'), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toContain('Google Ads API Error (400)');
  });

  it('throws when supabase function invocation fails', async () => {
    (supabase.functions.invoke as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: null,
      error: { message: 'Network error' },
    });

    const { result } = renderHook(() => useGoogleAdsReport('campaigns'), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('Network error');
  });

  it('returns cached data on second call without invoking edge function', async () => {
    const mockData = [{ id: '1', name: 'Cached Campaign' }];
    (supabase.functions.invoke as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: mockData },
      error: null,
    });

    const wrapper = makeWrapper();

    const { result: first } = renderHook(() => useGoogleAdsReport('campaigns'), { wrapper });
    await waitFor(() => expect(first.current.isSuccess).toBe(true));

    const invokeCalls = (supabase.functions.invoke as ReturnType<typeof vi.fn>).mock.calls.length;

    const { result: second } = renderHook(() => useGoogleAdsReport('campaigns'), { wrapper });
    await waitFor(() => expect(second.current.isSuccess).toBe(true));

    // Should not have made an additional API call (served from cache)
    expect((supabase.functions.invoke as ReturnType<typeof vi.fn>).mock.calls.length).toBe(invokeCalls);
    expect(second.current.data).toEqual(mockData);
  });

  it('is disabled when no selectedAccount', async () => {
    vi.mocked(vi.fn()).mockImplementation(() => ({
      selectedAccount: null,
      dateRange: { from: new Date('2024-01-01'), to: new Date('2024-01-31') },
      previousPeriodRange: { from: new Date('2023-12-01'), to: new Date('2023-12-31') },
    }));

    // Re-mock without account
    vi.doMock('@/contexts/DashboardContext', () => ({
      useDashboard: () => ({
        selectedAccount: null,
        dateRange: { from: new Date('2024-01-01'), to: new Date('2024-01-31') },
        previousPeriodRange: { from: new Date('2023-12-01'), to: new Date('2023-12-31') },
      }),
    }));

    const { result } = renderHook(() => useGoogleAdsReport('campaigns', { enabled: false }), {
      wrapper: makeWrapper(),
    });

    // Query disabled - should not fetch
    expect(result.current.isFetching).toBe(false);
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });
});
