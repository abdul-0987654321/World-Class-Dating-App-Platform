/**
 * Error Boundary Component
 * React error boundary for catching render errors
 *
 * Usage:
 * <ErrorBoundary fallback={<ErrorFallback />}>
 *   <YourComponent />
 * </ErrorBoundary>
 */

import React, { Component, type ReactNode, type ErrorInfo } from 'react';
import type { ErrorBoundaryProps, ErrorBoundaryState } from './types';

/**
 * Default error fallback component
 */
interface DefaultFallbackProps {
  error: Error;
  reset: () => void;
}

function DefaultErrorFallback({ error, reset }: DefaultFallbackProps): JSX.Element {
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px',
        padding: '24px',
        textAlign: 'center',
        backgroundColor: '#fef2f2',
        borderRadius: '8px',
        border: '1px solid #fecaca',
      }}
    >
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#dc2626"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ marginBottom: '16px' }}
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <h2
        style={{
          margin: '0 0 8px',
          fontSize: '18px',
          fontWeight: 600,
          color: '#991b1b',
        }}
      >
        Something went wrong
      </h2>
      <p
        style={{
          margin: '0 0 16px',
          fontSize: '14px',
          color: '#7f1d1d',
        }}
      >
        We encountered an unexpected error. Please try again.
      </p>
      <button
        onClick={reset}
        style={{
          padding: '8px 16px',
          fontSize: '14px',
          fontWeight: 500,
          color: '#ffffff',
          backgroundColor: '#dc2626',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          transition: 'background-color 0.2s',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = '#b91c1c';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = '#dc2626';
        }}
      >
        Try Again
      </button>
      {process.env.NODE_ENV === 'development' && (
        <details
          style={{
            marginTop: '16px',
            padding: '12px',
            width: '100%',
            maxWidth: '400px',
            backgroundColor: '#ffffff',
            borderRadius: '4px',
            fontSize: '12px',
            textAlign: 'left',
          }}
        >
          <summary style={{ cursor: 'pointer', fontWeight: 500 }}>
            Error Details (Development Only)
          </summary>
          <pre
            style={{
              margin: '8px 0 0',
              padding: '8px',
              overflow: 'auto',
              backgroundColor: '#f3f4f6',
              borderRadius: '4px',
              fontSize: '11px',
              lineHeight: 1.4,
            }}
          >
            {error.message}
            {'\n\n'}
            {error.stack}
          </pre>
        </details>
      )}
    </div>
  );
}

/**
 * Error Boundary class component
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private lastPathname: string | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Log error
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call onError callback if provided
    this.props.onError?.(error, errorInfo);

    // In production, report to error tracking service
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo);
    }
  }

  componentDidUpdate(): void {
    // Reset on navigation if configured
    if (this.props.resetOnNavigate && this.state.hasError) {
      const currentPathname = window.location.pathname;
      if (this.lastPathname && this.lastPathname !== currentPathname) {
        this.reset();
      }
      this.lastPathname = currentPathname;
    }
  }

  /**
   * Report error to tracking service
   */
  private reportError(error: Error, errorInfo: ErrorInfo): void {
    // This is where you would integrate with Sentry, LogRocket, etc.
    // For now, we just log to console
    try {
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      };

      // Could send to error tracking service
      console.log('Error report:', errorReport);
    } catch {
      // Silently fail error reporting
    }
  }

  /**
   * Reset error state
   */
  reset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      // Render custom fallback if provided
      if (typeof fallback === 'function') {
        return fallback(error, this.reset);
      }

      if (fallback) {
        return fallback;
      }

      // Render default fallback
      return <DefaultErrorFallback error={error} reset={this.reset} />;
    }

    return children;
  }
}

/**
 * HOC to wrap a component with error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
): React.FC<P> {
  const WithErrorBoundary: React.FC<P> = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  WithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;

  return WithErrorBoundary;
}

/**
 * Hook to throw errors in functional components for error boundary to catch
 */
export function useErrorHandler(): (error: Error) => void {
  const [, setError] = React.useState<Error | null>(null);

  return React.useCallback((error: Error) => {
    setError(() => {
      throw error;
    });
  }, []);
}

export default ErrorBoundary;
