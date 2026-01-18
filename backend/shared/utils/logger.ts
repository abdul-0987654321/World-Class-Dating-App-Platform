/**
 * Flamoral Backend Services - Enhanced Structured Logger
 *
 * Features:
 * - Consistent JSON structured logging across all services
 * - Environment-based log levels
 * - Automatic PII/sensitive data sanitization
 * - Correlation ID integration for distributed tracing
 * - Request context propagation
 * - Error categorization and metrics
 * - Production-safe logging
 */

import winston from 'winston';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Error categories for metrics and alerting
 */
export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  RATE_LIMIT = 'rate_limit',
  CONFLICT = 'conflict',
  EXTERNAL_SERVICE = 'external_service',
  DATABASE = 'database',
  INTERNAL = 'internal',
  NETWORK = 'network',
  TIMEOUT = 'timeout',
}

/**
 * Log context for request-scoped logging
 */
export interface LogContext {
  correlationId?: string;
  userId?: string;
  requestId?: string;
  traceId?: string;
  spanId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  durationMs?: number;
  userAgent?: string;
  ip?: string;
  [key: string]: unknown;
}

/**
 * Structured log entry format
 */
export interface StructuredLogEntry {
  timestamp: string;
  level: string;
  service: string;
  message: string;
  correlationId?: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    code?: string;
    category?: ErrorCategory;
    stack?: string;
  };
  metadata?: Record<string, unknown>;
}

/**
 * Enhanced logger interface with context support
 */
export interface ObservableLogger extends winston.Logger {
  withContext(context: LogContext): ObservableLogger;
  logRequest(method: string, path: string, statusCode: number, durationMs: number, context?: LogContext): void;
  logError(error: Error, category?: ErrorCategory, context?: LogContext): void;
  logMetric(name: string, value: number, tags?: Record<string, string>): void;
}

// ============================================================================
// Constants
// ============================================================================

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
    return data.map((item) => sanitize(item));
  }

  if (typeof data === 'object') {
    const sanitized: any = {};

    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();

      // Check if this field should be masked
      const isSensitive = SENSITIVE_FIELDS.some((field) => lowerKey.includes(field.toLowerCase()));

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
  // Sanitize the metadata
  const sanitizedInfo = { ...info };

  // Sanitize all metadata except standard winston fields
  const metadataKeys = Object.keys(sanitizedInfo).filter(
    (key) => !['level', 'message', 'timestamp', 'service', 'stack'].includes(key)
  );

  metadataKeys.forEach((key) => {
    sanitizedInfo[key] = sanitize(sanitizedInfo[key]);
  });

  // Sanitize the message itself if it contains sensitive data patterns
  if (typeof sanitizedInfo.message === 'string') {
    // Remove potential tokens from message
    sanitizedInfo.message = sanitizedInfo.message.replace(
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

// ============================================================================
// Error Categorization
// ============================================================================

/**
 * Categorize an error based on its properties
 */
export function categorizeError(error: Error): ErrorCategory {
  const errorName = error.name.toLowerCase();
  const errorMessage = error.message.toLowerCase();
  const errorCode = (error as any).code?.toLowerCase() || '';
  const statusCode = (error as any).statusCode || (error as any).status || 500;

  // Check by status code first
  if (statusCode === 400) return ErrorCategory.VALIDATION;
  if (statusCode === 401) return ErrorCategory.AUTHENTICATION;
  if (statusCode === 403) return ErrorCategory.AUTHORIZATION;
  if (statusCode === 404) return ErrorCategory.NOT_FOUND;
  if (statusCode === 409) return ErrorCategory.CONFLICT;
  if (statusCode === 429) return ErrorCategory.RATE_LIMIT;

  // Check by error name/type
  if (errorName.includes('validation') || errorCode.includes('validation')) {
    return ErrorCategory.VALIDATION;
  }
  if (errorName.includes('unauthorized') || errorName.includes('authentication') || errorMessage.includes('jwt')) {
    return ErrorCategory.AUTHENTICATION;
  }
  if (errorName.includes('forbidden') || errorName.includes('authorization')) {
    return ErrorCategory.AUTHORIZATION;
  }
  if (errorName.includes('notfound') || errorMessage.includes('not found')) {
    return ErrorCategory.NOT_FOUND;
  }
  if (errorMessage.includes('timeout') || errorCode.includes('timeout') || errorCode === 'etimedout') {
    return ErrorCategory.TIMEOUT;
  }
  if (errorCode.includes('econnrefused') || errorCode.includes('enotfound') || errorMessage.includes('network')) {
    return ErrorCategory.NETWORK;
  }
  if (errorMessage.includes('database') || errorMessage.includes('postgres') || errorMessage.includes('sql')) {
    return ErrorCategory.DATABASE;
  }
  if (errorMessage.includes('external') || errorMessage.includes('service unavailable')) {
    return ErrorCategory.EXTERNAL_SERVICE;
  }

  return ErrorCategory.INTERNAL;
}

// ============================================================================
// Async Local Storage for Request Context
// ============================================================================

// Store for request-scoped context (correlation ID, user ID, etc.)
let currentContext: LogContext = {};

/**
 * Set the current logging context (call at start of request)
 */
export function setLogContext(context: LogContext): void {
  currentContext = { ...context };
}

/**
 * Get the current logging context
 */
export function getLogContext(): LogContext {
  return { ...currentContext };
}

/**
 * Clear the current logging context (call at end of request)
 */
export function clearLogContext(): void {
  currentContext = {};
}

// ============================================================================
// Enhanced Logger Factory
// ============================================================================

/**
 * Create an enhanced logger with observability features
 */
const createLogger = (serviceName: string): ObservableLogger => {
  const isProduction = process.env.NODE_ENV === 'production';
  const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');
  const enableJsonLogs = process.env.LOG_FORMAT === 'json' || isProduction;

  // JSON format for production/structured logging
  const jsonFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    winston.format.errors({ stack: !isProduction }),
    sanitizeFormat(),
    winston.format.printf((info) => {
      const { timestamp, level, message, service, stack, ...metadata } = info;
      const context = getLogContext();

      const logEntry: StructuredLogEntry = {
        timestamp: String(timestamp),
        level: String(level),
        service: String(service),
        message: String(message),
        correlationId: context.correlationId || String(metadata.correlationId || ''),
        context: Object.keys(context).length > 0 ? context : undefined,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      };

      // Add error info if present
      if (metadata.error || stack) {
        logEntry.error = {
          name: String(metadata.errorName || 'Error'),
          message: String(metadata.errorMessage || message),
          code: metadata.errorCode ? String(metadata.errorCode) : undefined,
          category: metadata.errorCategory as ErrorCategory,
          stack: !isProduction && stack ? String(stack) : undefined,
        };
      }

      return JSON.stringify(logEntry);
    })
  );

  // Human-readable format for development
  const devFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.colorize(),
    sanitizeFormat(),
    winston.format.printf(({ level, message, timestamp, service, stack, ...metadata }) => {
      const context = getLogContext();
      const correlationId = context.correlationId || (metadata.correlationId as string);
      const correlationStr = correlationId ? ` [${correlationId.substring(0, 8)}]` : '';

      let msg = `${timestamp} [${service}]${correlationStr} ${level}: ${message}`;

      // Add important context fields
      const contextFields: string[] = [];
      if (metadata.method && metadata.path) {
        contextFields.push(`${metadata.method} ${metadata.path}`);
      }
      if (metadata.statusCode) {
        contextFields.push(`status=${metadata.statusCode}`);
      }
      if (metadata.durationMs !== undefined) {
        contextFields.push(`duration=${metadata.durationMs}ms`);
      }
      if (contextFields.length > 0) {
        msg += ` (${contextFields.join(', ')})`;
      }

      // Add other metadata
      const extraKeys = Object.keys(metadata).filter(
        (k) => !['method', 'path', 'statusCode', 'durationMs', 'correlationId', 'errorCategory'].includes(k)
      );
      if (extraKeys.length > 0) {
        const extraMeta: Record<string, unknown> = {};
        extraKeys.forEach((k) => {
          extraMeta[k] = metadata[k];
        });
        msg += ` ${JSON.stringify(extraMeta)}`;
      }

      if (stack) {
        msg += `\n${stack}`;
      }

      return msg;
    })
  );

  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: enableJsonLogs ? jsonFormat : devFormat,
    }),
  ];

  // Only write to files in non-production environments
  if (!isProduction) {
    transports.push(
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        maxsize: 5242880,
        maxFiles: 5,
        format: jsonFormat,
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        maxsize: 5242880,
        maxFiles: 5,
        format: jsonFormat,
      })
    );
  }

  const baseLogger = winston.createLogger({
    level: logLevel,
    format: enableJsonLogs ? jsonFormat : devFormat,
    defaultMeta: { service: serviceName },
    transports,
    exitOnError: false,
  });

  // Extend with observability methods
  const logger = baseLogger as ObservableLogger;

  /**
   * Create a child logger with additional context
   */
  logger.withContext = function (context: LogContext): ObservableLogger {
    const childLogger = this.child(context) as ObservableLogger;
    // Copy methods to child logger
    childLogger.withContext = this.withContext.bind(childLogger);
    childLogger.logRequest = this.logRequest.bind(childLogger);
    childLogger.logError = this.logError.bind(childLogger);
    childLogger.logMetric = this.logMetric.bind(childLogger);
    return childLogger;
  };

  /**
   * Log HTTP request with timing
   */
  logger.logRequest = function (
    method: string,
    path: string,
    statusCode: number,
    durationMs: number,
    context?: LogContext
  ): void {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    const message = `${method} ${path} ${statusCode} ${durationMs}ms`;

    this.log(level, message, {
      method,
      path,
      statusCode,
      durationMs,
      ...context,
    });
  };

  /**
   * Log error with categorization
   */
  logger.logError = function (
    error: Error,
    category?: ErrorCategory,
    context?: LogContext
  ): void {
    const errorCategory = category || categorizeError(error);
    const statusCode = (error as any).statusCode || (error as any).status || 500;
    const level = statusCode >= 500 ? 'error' : 'warn';

    this.log(level, error.message, {
      errorName: error.name,
      errorMessage: error.message,
      errorCode: (error as any).code,
      errorCategory,
      stack: error.stack,
      ...context,
    });
  };

  /**
   * Log a metric (for custom metrics collection)
   */
  logger.logMetric = function (
    name: string,
    value: number,
    tags?: Record<string, string>
  ): void {
    this.info(`metric:${name}`, {
      metricName: name,
      metricValue: value,
      metricTags: tags,
    });
  };

  return logger;
};

export default createLogger;

// Named exports for convenience
export { createLogger, sanitize };
