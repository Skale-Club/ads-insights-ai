import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

import { supabase } from '@/integrations/supabase/client';

function TestConsumer() {
  const { user, loading, providerToken, isConfigured } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user?.email ?? 'null'}</span>
      <span data-testid="token">{providerToken ?? 'null'}</span>
      <span data-testid="configured">{String(isConfigured)}</span>
    </div>
  );
}

function renderWithAuth() {
  return render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();

    (supabase.auth.onAuthStateChange as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it('starts in loading state', async () => {
    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(() => {}) // never resolves
    );

    renderWithAuth();
    expect(screen.getByTestId('loading').textContent).toBe('true');
  });

  it('sets loading=false and user=null when no session exists', async () => {
    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(screen.getByTestId('user').textContent).toBe('null');
    expect(screen.getByTestId('token').textContent).toBe('null');
  });

  it('sets user and providerToken from session on init', async () => {
    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        session: {
          user: { email: 'test@example.com', id: 'user-1' },
          provider_token: 'provider-abc',
        },
      },
      error: null,
    });

    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('test@example.com');
    });
    expect(screen.getByTestId('token').textContent).toBe('provider-abc');
    expect(sessionStorage.getItem('google_provider_token')).toBe('provider-abc');
  });

  it('restores providerToken from sessionStorage when session has no provider_token', async () => {
    sessionStorage.setItem('google_provider_token', 'stored-token-xyz');

    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        session: {
          user: { email: 'test@example.com', id: 'user-1' },
          provider_token: null,
        },
      },
      error: null,
    });

    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByTestId('token').textContent).toBe('stored-token-xyz');
    });
  });

  it('clears providerToken on SIGNED_OUT auth event', async () => {
    sessionStorage.setItem('google_provider_token', 'some-token');

    let capturedCallback: (event: string, session: null) => void;
    (supabase.auth.onAuthStateChange as ReturnType<typeof vi.fn>).mockImplementation((cb) => {
      capturedCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    act(() => {
      capturedCallback('SIGNED_OUT', null);
    });

    expect(sessionStorage.getItem('google_provider_token')).toBeNull();
  });

  it('throws if useAuth is used outside AuthProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow('useAuth must be used within an AuthProvider');
    spy.mockRestore();
  });
});
