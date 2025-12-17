/**
 * Sentry Integration for Winston Logger
 *
 * This module enhances the Winston logger with Sentry error tracking.
 * Errors logged at ERROR or FATAL level are automatically sent to Sentry.
 */

import winston from 'winston';
import * as Sentry from '@sentry/node';

/**
 * Custom Winston transport that sends errors to Sentry
 */
class SentryTransport extends winston.Transport {
  constructor(opts?: winston.TransportStreamOptions) {
    super(opts);
  }

  log(info: any, callback: () => void): void {
    setImmediate(() => {
      this.emit('logged', info);
    });

    // Only send ERROR and above to Sentry
    const level = info.level;
    if (level === 'error' || level === 'fatal') {
      // Extract error object if present
      const error = info.error instanceof Error ? info.error : new Error(info.message);

      // Add context from metadata
      const context: Record<string, any> = {
        service: info.service,
        timestamp: info.timestamp,
        level: info.level,
      };

      // Add all other metadata (excluding standard winston fields)
      Object.keys(info).forEach(key => {
        if (!['level', 'message', 'service', 'timestamp', 'error', 'stack'].includes(key)) {
          context[key] = info[key];
        }
      });

      // Send to Sentry
      Sentry.captureException(error, {
        level: level === 'fatal' ? 'fatal' : 'error',
        extra: context,
        tags: {
          service: info.service,
        },
      });
    }

    callback();
  }
}

/**
 * Create a logger with Sentry integration
 *
 * @param serviceName - Name of the service
 * @param options - Optional configuration
 */
export function createLoggerWithSentry(
  serviceName: string,
  options?: {
    sentryDsn?: string;
    logLevel?: string;
    enableSentry?: boolean;
  }
): winston.Logger {
  const {
    sentryDsn = process.env.SENTRY_DSN,
    logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'warn' : 'debug'),
    enableSentry = !!sentryDsn && process.env.NODE_ENV === 'production',
  } = options || {};

  // Initialize Sentry if DSN is provided and enabled
  if (enableSentry && sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: process.env.NODE_ENV || 'development',
      serverName: serviceName,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      beforeSend(event) {
        // Don't send events in non-production environments
        if (process.env.NODE_ENV !== 'production') {
          return null;
        }
        return event;
      },
    });

    console.log(`✓ Sentry initialized for ${serviceName}`);
  }

  const isProduction = process.env.NODE_ENV === 'production';

  // Define transports
  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, service, ...metadata }) => {
          let msg = `${timestamp} [${service}] ${level}: ${message}`;

          // Show metadata in non-production or if explicitly enabled
          if (!isProduction || process.env.LOG_METADATA === 'true') {
            const metadataKeys = Object.keys(metadata).filter(key => key !== 'stack');
            if (metadataKeys.length > 0) {
              const metadataObj: any = {};
              metadataKeys.forEach(key => {
                metadataObj[key] = metadata[key];
              });
              msg += ` ${JSON.stringify(metadataObj)}`;
            }
          }

          // Add stack trace in development only
          if (!isProduction && metadata.stack) {
            msg += `\n${metadata.stack}`;
          }

          return msg;
        })
      ),
    }),
  ];

  // Add Sentry transport if enabled
  if (enableSentry) {
    transports.push(new SentryTransport());
  }

  // Add file transports in non-production
  if (!isProduction) {
    transports.push(
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      })
    );
  }

  // Create logger with Sentry transport
  const logger = winston.createLogger({
    level: logLevel,
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: !isProduction }),
      winston.format.splat(),
      winston.format.json()
    ),
    defaultMeta: { service: serviceName },
    transports,
    exitOnError: false,
  });

  return logger;
}

/**
 * Set user context for Sentry
 */
export function setSentryUser(user: { id: string; email?: string; username?: string }): void {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
}

/**
 * Clear user context
 */
export function clearSentryUser(): void {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 */
export function addSentryBreadcrumb(message: string, data?: Record<string, any>): void {
  Sentry.addBreadcrumb({
    message,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Capture a message to Sentry
 */
export function captureSentryMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  Sentry.captureMessage(message, level);
}

export default createLoggerWithSentry;
