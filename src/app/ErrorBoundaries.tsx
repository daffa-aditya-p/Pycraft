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
          background: '#1C2427',
          color: '#E8EEF0',
          border: '1px solid #E0603F',
          padding: '16px',
          margin: '12px',
          maxWidth: '480px',
          borderRadius: '2px',
          boxShadow: '2px 2px 0 rgba(0,0,0,0.35)',
        }}
      >
        <h2 style={{ margin: '0 0 8px', fontSize: '18px', color: '#F2B544' }}>
          Terjadi kesalahan pada {this.props.name}
        </h2>
        <p style={{ margin: '0 0 12px', fontSize: '14px', color: '#A9B8BD' }}>
          {this.state.errorMessage}
        </p>
        <button
          type="button"
          onClick={this.handleReset}
          style={{
            background: '#F2B544',
            color: '#1C2427',
            border: 'none',
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
            background: '#1C2427',
            color: '#E8EEF0',
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <h1 style={{ color: '#F2B544', marginBottom: '8px' }}>Tampilan 3D terhenti</h1>
          <p style={{ color: '#A9B8BD', maxWidth: '420px', marginBottom: '16px' }}>
            Konteks WebGL2 mengalami gangguan. Progres dan kode Python tetap aman.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              background: '#F2B544',
              color: '#1C2427',
              border: 'none',
              padding: '10px 20px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Muat Ulang
          </button>
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
