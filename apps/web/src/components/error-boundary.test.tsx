import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './error-boundary';

function Boom(): never {
  throw new Error('kaboom dari child');
}

describe('ErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('menampilkan fallback ketika child melempar error render', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Terjadi kesalahan tak terduga')).toBeInTheDocument();
    expect(screen.getByText(/kaboom dari child/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /kembali ke dashboard/i })).toBeInTheDocument();
    spy.mockRestore();
  });

  it('melewatkan child normal tanpa fallback', () => {
    render(
      <ErrorBoundary>
        <p>konten normal</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText('konten normal')).toBeInTheDocument();
  });
});
