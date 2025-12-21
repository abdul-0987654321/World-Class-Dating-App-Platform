import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

/**
 * Initialize Sentry for error tracking and performance monitoring
 *
 * @param serviceName - Name of the service (e.g., 'user-service', 'payment-service')
 */
export function initializeSentry(serviceName: string): void {
  if (!process.env.SENTRY_DSN) {
    console.warn(
      `Sentry DSN not configured for ${serviceName}. Error tracking disabled.`
    );
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    serverName: serviceName,

    // Set sample rate for performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Enable profiling
    profilesSampleRate: 1.0,

    integrations: [
      // Profiling integration
      nodeProfilingIntegration(),
    ] as any,

    // Filter sensitive data
    beforeSend(event, hint) {
      // Don't send errors in development (console log them instead)
      if (process.env.NODE_ENV !== 'production') {
        console.error('Sentry Error (not sent):', hint.originalException || hint.syntheticException);
        return null;
      }

      // Remove sensitive data from event
      if (event.request) {
        // Remove auth headers
        if (event.request.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
        }

        // Remove sensitive query parameters
        if (event.request.query_string && typeof event.request.query_string === 'string') {
          event.request.query_string = event.request.query_string
            .replace(/password=[^&]+/gi, 'password=[REDACTED]')
            .replace(/token=[^&]+/gi, 'token=[REDACTED]');
        }
      }

      return event;
    },

    // Release tracking (for source maps and deployment tracking)
    release: `${serviceName}@${process.env.APP_VERSION || 'dev'}`,

    // Set user context automatically from request
    beforeBreadcrumb(breadcrumb) {
      // Sanitize breadcrumb URLs
      if (breadcrumb.data && breadcrumb.data.url) {
        breadcrumb.data.url = breadcrumb.data.url
          .replace(/password=[^&]+/gi, 'password=[REDACTED]')
          .replace(/token=[^&]+/gi, 'token=[REDACTED]');
      }
      return breadcrumb;
    },

    // Ignore common non-critical errors
    ignoreErrors: [
      // Network errors
      'Network request failed',
      'NetworkError',
      'Failed to fetch',

      // Browser extensions
      'top.GLOBALS',
      'ResizeObserver loop limit exceeded',

      // Non-critical errors
      'Non-Error promise rejection captured',
    ],
  });

  console.log(`✓ Sentry initialized for ${serviceName}`);
}

/**
 * Capture an exception manually
 */
export function captureException(error: Error, context?: Record<string, any>): void {
  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture a message
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  Sentry.captureMessage(message, level);
}

/**
 * Set user context for error tracking
 */
export function setUser(user: { id: string; email?: string; username?: string }): void {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
}

/**
 * Clear user context
 */
export function clearUser(): void {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, data?: Record<string, any>): void {
  Sentry.addBreadcrumb({
    message,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Start a new transaction for performance monitoring
 */
export function startTransaction(name: string, op: string): Sentry.Transaction {
  return Sentry.startTransaction({
    name,
    op,
  });
}

export default Sentry;
