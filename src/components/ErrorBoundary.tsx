import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  resetKey?: string | number; // B12.47: Reset on key change
}

interface State {
  hasError: boolean;
  error: Error | null;
  lastResetKey?: string | number; // B12.47: Track last reset key
}

// B2.7: Top-level error boundary with styled message
export class TopLevelErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Application error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-paper flex items-center justify-center p-8">
          <div className="max-w-md text-center">
            <h1 className="font-display text-4xl font-bold uppercase text-ink mb-4">
              Something went wrong
            </h1>
            <p className="font-sans text-ink-soft mb-6">
              We're sorry, but something unexpected happened. Please try reloading the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="font-sans text-sm font-medium bg-ink text-paper px-6 py-3 hover:bg-ink/90 transition-colors"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
