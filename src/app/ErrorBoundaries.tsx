import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { useUIStore } from '@/stores/useUIStore';

interface BoundaryProps {
  name: string;
  children: ReactNode;
  fallback?: ReactNode;
}

interface BoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class LayerErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { hasError: true, errorMessage: error.message || 'Unknown error' };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[ErrorBoundary:${this.props.name}]`, error, info.componentStack);
    useUIStore.getState().pushToast({
      kind: 'error',
      message: `Gangguan pada ${this.props.name}: ${error.message}`,
    });
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }
    if (this.props.fallback) {
      return this.props.fallback;
    }

    return (
      <div
        role="alert"
        style={{
          background: '#FFFDF7',
          color: '#172B3A',
          border: '2px solid #EF4444',
          padding: '18px',
          margin: '12px',
          maxWidth: '480px',
          borderRadius: '12px',
          boxShadow: '0 8px 20px rgba(15, 52, 76, 0.16)',
        }}
      >
        <h2 style={{ margin: '0 0 8px', fontSize: '18px', color: '#B91C1C' }}>
          Terjadi kesalahan pada {this.props.name}
        </h2>
        <p style={{ margin: '0 0 12px', fontSize: '14px', color: '#335267' }}>
          {this.state.errorMessage}
        </p>
        <button
          type="button"
          onClick={this.handleReset}
          style={{
            background: 'linear-gradient(180deg, #FBBF24 0%, #F59E0B 100%)',
            color: '#3E1F05',
            border: '2px solid #D97706',
            borderRadius: '8px',
            padding: '8px 16px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Coba Pulihkan
        </button>
      </div>
    );
  }
}

export function RootErrorBoundary({ children }: { children: ReactNode }): React.JSX.Element {
  return <LayerErrorBoundary name="Aplikasi PYCRAFT">{children}</LayerErrorBoundary>;
}

export function CanvasErrorBoundary({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <LayerErrorBoundary
      name="Tampilan 3D"
      fallback={
        <div
          role="alert"
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(180deg, #8EC5E8 0%, #D9EEF6 100%)',
            color: '#172B3A',
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              background: '#FFFDF7',
              border: '2px solid #7CC4DF',
              borderRadius: '14px',
              padding: '28px',
              boxShadow: '0 12px 28px rgba(15, 52, 76, 0.16)',
            }}
          >
            <h1 style={{ color: '#0E7490', marginBottom: '8px', marginTop: 0 }}>
              Tampilan 3D terhenti
            </h1>
            <p style={{ color: '#335267', maxWidth: '420px', marginBottom: '16px' }}>
              Konteks WebGL2 mengalami gangguan. Progres dan kode Python tetap aman.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                background: 'linear-gradient(180deg, #FBBF24 0%, #F59E0B 100%)',
                color: '#3E1F05',
                border: '2px solid #D97706',
                borderRadius: '8px',
                padding: '10px 20px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Muat Ulang
            </button>
          </div>
        </div>
      }
    >
      {children}
    </LayerErrorBoundary>
  );
}

export function EditorErrorBoundary({ children }: { children: ReactNode }): React.JSX.Element {
  return <LayerErrorBoundary name="Editor Python">{children}</LayerErrorBoundary>;
}
