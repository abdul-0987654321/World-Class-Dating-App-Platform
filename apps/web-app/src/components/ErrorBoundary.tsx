/**
 * ErrorBoundary Component
 * Catches React rendering errors and displays a fallback UI
 * Prevents the entire app from crashing on component errors
 * v1.0.1 - Improved error logging
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    // Log error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#14141f',
            color: '#ffffff',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              maxWidth: '500px',
              padding: '2rem',
              backgroundColor: '#1e1e2d',
              borderRadius: '1rem',
              border: '1px solid #2d2d3d',
            }}
          >
            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                marginBottom: '1rem',
                background: 'linear-gradient(135deg, #FF6B7A, #A855F7)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Something went wrong
            </h1>
            <p style={{ color: '#9ca3af', marginBottom: '1.5rem' }}>
              We apologize for the inconvenience. Please try refreshing the page.
            </p>
            <button
              onClick={this.handleRetry}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#FF6B7A',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'background-color 0.2s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#ff8a95')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#FF6B7A')}
            >
              Refresh Page
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details
                style={{
                  marginTop: '1.5rem',
                  textAlign: 'left',
                  padding: '1rem',
                  backgroundColor: '#0a0a0f',
                  borderRadius: '0.5rem',
                  fontSize: '0.75rem',
                  color: '#ff6b6b',
                }}
              >
                <summary style={{ cursor: 'pointer', color: '#9ca3af' }}>Error Details</summary>
                <pre style={{ marginTop: '0.5rem', overflow: 'auto' }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
