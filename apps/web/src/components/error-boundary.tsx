import { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Menahan crash render agar tidak menjatuhkan seluruh SPA — user tetap
 * mendapat pesan yang bisa dimengerti, bukan layar putih.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error('Unhandled render error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
          <h1 className="text-xl font-semibold">Terjadi kesalahan tak terduga</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            {this.state.error?.message || 'Halaman gagal dirender.'}
          </p>
          <Button onClick={() => window.location.assign('/')}>Kembali ke Dashboard</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
