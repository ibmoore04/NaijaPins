import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { NaijaPinsLogo } from '@/components/ui/NaijaPinsLogo';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary caught error]:', error, errorInfo);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <main
          id="main-content"
          role="main"
          className="min-h-screen bg-[#F8FAF9] flex flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-8 text-center animate-fade-in"
        >
          <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex justify-center mb-2">
              <NaijaPinsLogo variant="compact" size="md" />
            </div>

            <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-bold text-black tracking-tight">
                Something went wrong
              </h1>
              <p className="text-xs sm:text-sm text-charcoal-muted leading-relaxed">
                An unexpected issue occurred while rendering this page. Our team has been notified.
              </p>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-left text-[11px] text-red-800 font-mono overflow-auto max-h-32">
                <p className="font-bold">{this.state.error.name}: {this.state.error.message}</p>
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                variant="primary"
                size="md"
                className="w-full sm:w-auto bg-[#0B6B3A] hover:bg-[#064D2A] text-white flex items-center justify-center gap-2"
                onClick={this.handleReset}
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Again</span>
              </Button>

              <Button
                variant="outline"
                size="md"
                className="w-full sm:w-auto border-gray-300 text-charcoal-dark hover:bg-gray-50 flex items-center justify-center gap-2"
                onClick={this.handleGoHome}
              >
                <Home className="w-4 h-4 text-[#0B6B3A]" />
                <span>Go Home</span>
              </Button>
            </div>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
