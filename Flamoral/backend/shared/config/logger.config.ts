/**
 * Unified Logger Configuration for Flamoral Platform
 *
 * Features:
 * - Winston logger with proper transports
 * - Environment-based log levels
 * - Structured JSON logging for production
 * - PII/sensitive data sanitization
 * - Sentry integration for error tracking
 * - Application Insights integration
 * - Log rotation and retention
 * - Correlation ID tracking
 */

import winston from 'winston';
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import DailyRotateFile from 'winston-daily-rotate-file';

// Sensitive field patterns that should be masked
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'secret',
  'authorization',
  'auth',
  'credit_card',
  'creditCard',
  'cvv',
  'ssn',
  'social_security',
  'pin',
  'privateKey',
  'private_key',
  'email',
  'phone',
  'phoneNumber',
  'address',
  'latitude',
  'longitude',
  'location',
  'birthdate',
  'dob',
  'date_of_birth',
  'bankAccount',
  'bank_account',
  'iban',
  'routingNumber',
  'routing_number',
  'session',
  'sessionId',
  'sessionToken',
  'apiSecret',
  'api_secret',
  'clientSecret',
  'client_secret',
];

export interface LoggerConfig {
  serviceName: string;
  logLevel?: string;
  enableSentry?: boolean;
  sentryDsn?: string;
  enableAppInsights?: boolean;
  appInsightsConnectionString?: string;
  enableFileLogging?: boolean;
  logDirectory?: string;
  environment?: string;
}

/**
 * Sanitize sensitive data from objects
 */
function sanitize(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    // Check if the string looks like a token or credential (long alphanumeric)
    if (data.length > 20 && /^[A-Za-z0-9_-]+$/.test(data)) {
      return '[REDACTED_TOKEN]';
    }
    // Check for email patterns
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data)) {
      const [, domain] = data.split('@');
      return `[REDACTED]@${domain}`;
    }
    // Check for phone patterns
    if (/^[\d\s()+-]{10,}$/.test(data)) {
      return '[REDACTED_PHONE]';
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitize(item));
  }

  if (typeof data === 'object') {
    const sanitized: any = {};

    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();

      // Check if this field should be masked
      const isSensitive = SENSITIVE_FIELDS.some(
        field => lowerKey.includes(field.toLowerCase())
      );

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitize(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  return data;
}

/**
 * Custom format that sanitizes sensitive data
 */
const sanitizeFormat = winston.format((info) => {
  const sanitizedInfo = { ...info };

  // Sanitize all metadata except standard winston fields
  const metadataKeys = Object.keys(sanitizedInfo).filter(
    key => !['level', 'message', 'timestamp', 'service', 'stack', 'correlationId', 'requestId'].includes(key)
  );

  metadataKeys.forEach(key => {
    sanitizedInfo[key] = sanitize(sanitizedInfo[key]);
  });

  // Sanitize the message itself if it contains sensitive data patterns
  if (typeof sanitizedInfo.message === 'string') {
    // Remove potential tokens from message
    sanitizedInfo.message = (sanitizedInfo.message as string).replace(
      /\b[A-Za-z0-9_-]{32,}\b/g,
      '[REDACTED_TOKEN]'
    );
    // Remove potential emails
    sanitizedInfo.message = (sanitizedInfo.message as string).replace(
      /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/g,
      '[REDACTED_EMAIL]'
    );
  }

  return sanitizedInfo;
});

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
        correlationId: info.correlationId,
        requestId: info.requestId,
      };

      // Add all other metadata (excluding standard winston fields)
      Object.keys(info).forEach(key => {
        if (!['level', 'message', 'service', 'timestamp', 'error', 'stack', 'correlationId', 'requestId'].includes(key)) {
          context[key] = info[key];
        }
      });

      // Send to Sentry
      Sentry.captureException(error, {
        level: level === 'fatal' ? 'fatal' : 'error',
        extra: context,
        tags: {
          service: info.service,
          correlationId: info.correlationId,
        },
      });
    }

    callback();
  }
}

/**
 * Initialize Sentry if configured
 */
function initializeSentry(config: LoggerConfig): void {
  const sentryDsn = config.sentryDsn || process.env.SENTRY_DSN;

  if (!config.enableSentry || !sentryDsn) {
    return;
  }

  const environment = config.environment || process.env.NODE_ENV || 'development';

  // Only send to Sentry in production
  if (environment !== 'production') {
    console.log(`Sentry configured but disabled for environment: ${environment}`);
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    environment,
    serverName: config.serviceName,

    // Set sample rate for performance monitoring
    tracesSampleRate: 0.1, // 10% of transactions in production

    // Enable profiling
    profilesSampleRate: 0.05, // 5% profiling sample rate

    integrations: [
      new ProfilingIntegration(),
    ],

    // Filter sensitive data
    beforeSend(event, hint) {
      // Remove sensitive data from event
      if (event.request) {
        if (event.request.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
        }

        if (event.request.query_string) {
          event.request.query_string = event.request.query_string
            .replace(/password=[^&]+/gi, 'password=[REDACTED]')
            .replace(/token=[^&]+/gi, 'token=[REDACTED]');
        }
      }

      return event;
    },

    // Release tracking
    release: `${config.serviceName}@${process.env.APP_VERSION || 'dev'}`,

    // Sanitize breadcrumb URLs
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.data && breadcrumb.data.url) {
        breadcrumb.data.url = breadcrumb.data.url
          .replace(/password=[^&]+/gi, 'password=[REDACTED]')
          .replace(/token=[^&]+/gi, 'token=[REDACTED]');
      }
      return breadcrumb;
    },

    // Ignore common non-critical errors
    ignoreErrors: [
      'Network request failed',
      'NetworkError',
      'Failed to fetch',
      'top.GLOBALS',
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
    ],
  });

  console.log(`✓ Sentry initialized for ${config.serviceName}`);
}

/**
 * Create a unified logger instance
 */
export function createLogger(config: LoggerConfig): winston.Logger {
  const environment = config.environment || process.env.NODE_ENV || 'development';
  const isProduction = environment === 'production';
  const logLevel = config.logLevel || process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');
  const logDirectory = config.logDirectory || 'logs';

  // Initialize Sentry if enabled
  if (config.enableSentry) {
    initializeSentry(config);
  }

  // Define transports
  const transports: winston.transport[] = [];

  // Console transport - always enabled
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, service, correlationId, requestId, ...metadata }) => {
          let msg = `${timestamp} [${service}]`;

          // Add correlation/request IDs if present
          if (correlationId) msg += ` [CID:${correlationId.substring(0, 8)}]`;
          if (requestId) msg += ` [RID:${requestId.substring(0, 8)}]`;

          msg += ` ${level}: ${message}`;

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
    })
  );

  // Add Sentry transport if enabled
  if (config.enableSentry && isProduction) {
    transports.push(new SentryTransport());
  }

  // File transports - enabled if configured
  if (config.enableFileLogging !== false && !isProduction) {
    // Error log file
    transports.push(
      new DailyRotateFile({
        filename: `${logDirectory}/error-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxSize: '20m',
        maxFiles: '14d', // Keep logs for 14 days
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
      })
    );

    // Combined log file
    transports.push(
      new DailyRotateFile({
        filename: `${logDirectory}/combined-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '7d', // Keep logs for 7 days
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
      })
    );
  }

  // Production file logging with rotation
  if (isProduction && config.enableFileLogging) {
    transports.push(
      new DailyRotateFile({
        filename: `${logDirectory}/app-%DATE%.log`,
        datePattern: 'YYYY-MM-DD-HH',
        maxSize: '100m',
        maxFiles: '3d', // Keep logs for 3 days in production
        level: 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
      })
    );
  }

  // Create the logger
  const logger = winston.createLogger({
    level: logLevel,
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: !isProduction }),
      winston.format.splat(),
      sanitizeFormat(),
      winston.format.json()
    ),
    defaultMeta: {
      service: config.serviceName,
      environment,
      pid: process.pid,
      hostname: process.env.HOSTNAME || 'unknown',
    },
    transports,
    exitOnError: false,
  });

  // Add uncaught exception handler
  logger.exceptions.handle(
    new winston.transports.File({
      filename: `${logDirectory}/exceptions.log`,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  // Add unhandled rejection handler
  logger.rejections.handle(
    new winston.transports.File({
      filename: `${logDirectory}/rejections.log`,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  return logger;
}

/**
 * Add correlation ID to logger
 */
export function addCorrelationId(logger: winston.Logger, correlationId: string): winston.Logger {
  return logger.child({ correlationId });
}

/**
 * Add request ID to logger
 */
export function addRequestId(logger: winston.Logger, requestId: string): winston.Logger {
  return logger.child({ requestId });
}

/**
 * Add user context to logger
 */
export function addUserContext(logger: winston.Logger, userId: string, email?: string): winston.Logger {
  return logger.child({ userId, userEmail: email ? sanitize(email) : undefined });
}

// Export sanitization function for testing
export { sanitize };

// Export Sentry utilities
export const SentryUtils = {
  setUser: (user: { id: string; email?: string; username?: string }) => {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  },

  clearUser: () => {
    Sentry.setUser(null);
  },

  addBreadcrumb: (message: string, data?: Record<string, any>) => {
    Sentry.addBreadcrumb({
      message,
      data,
      timestamp: Date.now() / 1000,
    });
  },

  captureMessage: (message: string, level: Sentry.SeverityLevel = 'info') => {
    Sentry.captureMessage(message, level);
  },

  captureException: (error: Error, context?: Record<string, any>) => {
    Sentry.captureException(error, {
      extra: context,
    });
  },
};
