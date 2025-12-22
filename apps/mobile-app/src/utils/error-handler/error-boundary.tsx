/**
 * Error Boundary Component for React Native
 * Catches render errors in React Native apps
 *
 * Usage:
 * <ErrorBoundary fallback={<ErrorFallback />}>
 *   <YourComponent />
 * </ErrorBoundary>
 */

import React, { Component, type ReactNode, type ErrorInfo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import type { ErrorBoundaryProps, ErrorBoundaryState } from './types';

/**
 * Default error fallback component for React Native
 */
interface DefaultFallbackProps {
  error: Error;
  reset: () => void;
}

function DefaultErrorFallback({ error, reset }: DefaultFallbackProps): JSX.Element {
  const isDev = __DEV__;

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>!</Text>
      </View>

      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>
        We encountered an unexpected error. Please try again.
      </Text>

      <TouchableOpacity style={styles.button} onPress={reset} activeOpacity={0.8}>
        <Text style={styles.buttonText}>Try Again</Text>
      </TouchableOpacity>

      {isDev && (
        <ScrollView style={styles.detailsContainer}>
          <Text style={styles.detailsTitle}>Error Details (Development Only)</Text>
          <Text style={styles.detailsText}>{error.message}</Text>
          {error.stack && (
            <Text style={styles.stackText}>{error.stack}</Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fef2f2',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fee2e2',
    borderWidth: 2,
    borderColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#991b1b',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#7f1d1d',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#dc2626',
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  detailsContainer: {
    marginTop: 24,
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    maxHeight: 200,
    width: '100%',
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  detailsText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  stackText: {
    fontSize: 10,
    color: '#9ca3af',
    fontFamily: 'monospace',
  },
});

/**
 * Error Boundary class component for React Native
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
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
    if (!__DEV__) {
      this.reportError(error, errorInfo);
    }
  }

  /**
   * Report error to tracking service
   */
  private reportError(error: Error, errorInfo: ErrorInfo): void {
    // This is where you would integrate with Sentry, Crashlytics, etc.
    // For now, we just log to console
    try {
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
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

  const displayName =
    WrappedComponent.displayName || WrappedComponent.name || 'Component';
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
