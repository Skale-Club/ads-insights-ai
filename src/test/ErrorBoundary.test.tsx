import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { BrowserRouter } from 'react-router-dom';

const ThrowError = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Content rendered</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children when no error', () => {
    render(
      <BrowserRouter>
        <ErrorBoundary>
          <div>Test Content</div>
        </ErrorBoundary>
      </BrowserRouter>
    );
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('shows fallback UI when child throws error', async () => {
    render(
      <BrowserRouter>
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/try again/i)).toBeInTheDocument();
  });
});