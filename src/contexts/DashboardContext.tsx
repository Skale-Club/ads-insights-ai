import React, { createContext, useContext, useState, useEffect } from 'react';
import { subDays, startOfMonth, endOfMonth, subMonths, startOfYear, subYears } from 'date-fns';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type DateRangePreset = 'last7' | 'last14' | 'last30' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'lastYear' | 'allTime' | 'custom';

const STORAGE_SELECTED_ACCOUNT_ID = 'adsinsight:selectedAccountId';
const STORAGE_HIDDEN_ACCOUNT_IDS = 'adsinsight:hiddenAccountIds';

interface DateRange {
  from: Date;
  to: Date;
}

export interface AdsAccount {
  id: string;
  customerId: string;
  name: string;
  currencyCode?: string;
  timeZone?: string;
  isManager?: boolean;
  status?: string;
}

interface DashboardContextType {
  selectedAccount: AdsAccount | null;
  setSelectedAccount: (account: AdsAccount | null) => void;
  accounts: AdsAccount[];
  visibleAccounts: AdsAccount[];
  setAccounts: (accounts: AdsAccount[]) => void;
  hiddenAccountIds: string[];
  toggleAccountHidden: (accountId: string) => void;
  unhideAllAccounts: () => void;
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  dateRangePreset: DateRangePreset;
  setDateRangePreset: (preset: DateRangePreset) => void;
  previousPeriodRange: DateRange;
  lastRefreshed: Date | null;
  setLastRefreshed: (date: Date) => void;
  // Chat State
  chatWidth: number;
  setChatWidth: (width: number) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

function safeGetLocalStorage(key: string): string | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetLocalStorage(key: string, value: string | null) {
  try {
    if (typeof window === 'undefined') return;
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // ignore storage failures (private mode, disabled storage, etc.)
  }
}

function safeGetLocalStorageJson<T>(key: string, fallback: T): T {
  const raw = safeGetLocalStorage(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSetLocalStorageJson(key: string, value: unknown) {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function getDateRangeFromPreset(preset: DateRangePreset): DateRange {
  const today = new Date();

  switch (preset) {
    case 'last7':
      return { from: subDays(today, 7), to: today };
    case 'last14':
      return { from: subDays(today, 14), to: today };
    case 'last30':
      return { from: subDays(today, 30), to: today };
    case 'thisMonth':
      return { from: startOfMonth(today), to: today };
    case 'lastMonth':
      const lastMonth = subMonths(today, 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    case 'thisYear':
      return { from: startOfYear(today), to: today };
    case 'lastYear':
      const ly = subYears(today, 1);
      return { from: startOfYear(ly), to: endOfMonth(new Date(ly.getFullYear(), 11, 31)) };
    case 'allTime':
      return { from: new Date(2020, 0, 1), to: today };
    default:
      return { from: subDays(today, 30), to: today };
  }
}

function getPreviousPeriodRange(range: DateRange): DateRange {
  const diff = range.to.getTime() - range.from.getTime();
  const prevTo = new Date(range.from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - diff);
  return { from: prevFrom, to: prevTo };
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const { session, providerToken } = useAuth();
  const { toast } = useToast();
  const [selectedAccount, setSelectedAccount] = useState<AdsAccount | null>(null);
  const [accounts, setAccounts] = useState<AdsAccount[]>([]);
  const [preferredAccountId, setPreferredAccountId] = useState<string | null>(() =>
    safeGetLocalStorage(STORAGE_SELECTED_ACCOUNT_ID)
  );
  const [hiddenAccountIds, setHiddenAccountIds] = useState<string[]>(() =>
    safeGetLocalStorageJson<string[]>(STORAGE_HIDDEN_ACCOUNT_IDS, [])
  );
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('last30');
  const [dateRange, setDateRange] = useState<DateRange>(getDateRangeFromPreset('last30'));
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [chatWidth, setChatWidth] = useState(70);

  const visibleAccounts = accounts.filter((a) => !hiddenAccountIds.includes(a.id));

  const setSelectedAccountAndPersist = (account: AdsAccount | null) => {
    setSelectedAccount(account);
    const id = account?.id ?? null;
    setPreferredAccountId(id);
    safeSetLocalStorage(STORAGE_SELECTED_ACCOUNT_ID, id);
  };

  const toggleAccountHidden = (accountId: string) => {
    setHiddenAccountIds((prev) => {
      const next = prev.includes(accountId) ? prev.filter((id) => id !== accountId) : [...prev, accountId];
      safeSetLocalStorageJson(STORAGE_HIDDEN_ACCOUNT_IDS, next);
      return next;
    });
  };

  const unhideAllAccounts = () => {
    setHiddenAccountIds([]);
    safeSetLocalStorageJson(STORAGE_HIDDEN_ACCOUNT_IDS, []);
  };

  // Auto-fetch accounts when session is available
  useEffect(() => {
    const fetchAccounts = async () => {
      if (!session?.access_token || accounts.length > 0) return;

      const token = providerToken || sessionStorage.getItem('google_provider_token');
      if (!token) return;

      try {
        console.log('[DashboardContext] Fetching accounts...');
        const { data, error: fnError } = await supabase.functions.invoke('google-ads-accounts', {
          body: { providerToken: token },
        });

        if (fnError) throw new Error(fnError.message);
        if (data.error) throw new Error(data.error);

        const fetchedAccounts = data.accounts || [];
        setAccounts(fetchedAccounts);

        // Restore previously selected account on refresh; otherwise default to first.
        if (fetchedAccounts.length > 0 && !selectedAccount) {
          const storedId = preferredAccountId || safeGetLocalStorage(STORAGE_SELECTED_ACCOUNT_ID);
          const match = storedId ? fetchedAccounts.find((a: AdsAccount) => a.id === storedId) : null;
          const matchVisible = match && !hiddenAccountIds.includes(match.id) ? match : null;
          const fallback = fetchedAccounts.find((a: AdsAccount) => !hiddenAccountIds.includes(a.id)) || fetchedAccounts[0];
          setSelectedAccountAndPersist(matchVisible || fallback);
        }
      } catch (err) {
        console.error('[DashboardContext] Error fetching accounts:', err);
        // Do not fallback to mock data - allow UI to handle empty state
      }
    };

    fetchAccounts();
  }, [session, providerToken, accounts.length, selectedAccount, preferredAccountId, hiddenAccountIds]);

  // If accounts list changes (or user refreshes) ensure selected account still exists; fall back gracefully.
  useEffect(() => {
    if (accounts.length === 0) return;
    if (!selectedAccount) return;

    const stillExists = accounts.some((a) => a.id === selectedAccount.id);
    if (!stillExists) {
      const storedId = preferredAccountId || safeGetLocalStorage(STORAGE_SELECTED_ACCOUNT_ID);
      const match = storedId ? accounts.find((a) => a.id === storedId) : null;
      const matchVisible = match && !hiddenAccountIds.includes(match.id) ? match : null;
      const fallback = accounts.find((a) => !hiddenAccountIds.includes(a.id)) || accounts[0];
      setSelectedAccountAndPersist(matchVisible || fallback);
    }
  }, [accounts, selectedAccount, preferredAccountId, hiddenAccountIds]);

  // If the currently selected account becomes hidden, move to the next visible account.
  useEffect(() => {
    if (!selectedAccount) return;
    if (!hiddenAccountIds.includes(selectedAccount.id)) return;

    const next = accounts.find((a) => !hiddenAccountIds.includes(a.id)) || null;
    setSelectedAccountAndPersist(next);
  }, [hiddenAccountIds, selectedAccount, accounts]);

  const handlePresetChange = (preset: DateRangePreset) => {
    setDateRangePreset(preset);
    if (preset !== 'custom') {
      setDateRange(getDateRangeFromPreset(preset));
    }
  };

  const previousPeriodRange = getPreviousPeriodRange(dateRange);

  return (
    <DashboardContext.Provider
      value={{
        selectedAccount,
        setSelectedAccount: setSelectedAccountAndPersist,
        accounts,
        visibleAccounts,
        setAccounts,
        hiddenAccountIds,
        toggleAccountHidden,
        unhideAllAccounts,
        dateRange,
        setDateRange,
        dateRangePreset,
        setDateRangePreset: handlePresetChange,
        previousPeriodRange,
        lastRefreshed,
        setLastRefreshed,
        chatWidth,
        setChatWidth,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}
