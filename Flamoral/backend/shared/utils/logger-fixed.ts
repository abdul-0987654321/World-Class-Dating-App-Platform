/**
 * Centralized Logger Configuration for Backend Services
 *
 * Features:
 * - Environment-aware log levels
 * - Automatic PII/sensitive data sanitization
 * - Production-safe JSON logging
 * - Development-friendly console logging
 * - Correlation ID support for request tracing
 * - Application Insights integration ready
 * - Structured logging with Winston
 */

import winston from 'winston';

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
    key => !['level', 'message', 'timestamp', 'service', 'stack', 'correlationId', 'environment', 'version'].includes(key)
  );

  metadataKeys.forEach(key => {
    sanitizedInfo[key] = sanitize(sanitizedInfo[key]);
  });

  // Sanitize the message itself
  if (typeof sanitizedInfo.message === 'string') {
    sanitizedInfo.message = (sanitizedInfo.message as string).replace(
      /\b[A-Za-z0-9_-]{32,}\b/g,
      '[REDACTED_TOKEN]'
    );
    sanitizedInfo.message = (sanitizedInfo.message as string).replace(
      /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/g,
      '[REDACTED_EMAIL]'
    );
  }

  return sanitizedInfo;
});

/**
 * Production JSON format
 */
const productionFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  sanitizeFormat(),
  winston.format.json()
);

/**
 * Development console format
 */
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  sanitizeFormat(),
  winston.format.colorize(),
  winston.format.printf(({ level, message, timestamp, service, correlationId, stack, ...metadata }) => {
    let msg = `${timestamp} [${service}]`;

    if (correlationId) {
      msg += ` [${correlationId}]`;
    }

    msg += ` ${level}: ${message}`;

    const metadataKeys = Object.keys(metadata).filter(key => !['environment', 'version'].includes(key));
    if (metadataKeys.length > 0) {
      const metadataObj: any = {};
      metadataKeys.forEach(key => {
        metadataObj[key] = metadata[key];
      });
      msg += ` ${JSON.stringify(metadataObj)}`;
    }

    if (stack) {
      msg += `\n${stack}`;
    }

    return msg;
  })
);

/**
 * Create a logger instance for a service
 */
export function createLogger(serviceName: string, options?: {
  level?: string;
  enableFileLogging?: boolean;
}): winston.Logger {
  const isProduction = process.env.NODE_ENV === 'production';
  const logLevel = options?.level || process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: isProduction ? productionFormat : developmentFormat,
    }),
  ];

  // Only write to files in non-production
  if (!isProduction && (options?.enableFileLogging ?? true)) {
    transports.push(
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        format: productionFormat,
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        format: productionFormat,
      })
    );
  }

  return winston.createLogger({
    level: logLevel,
    format: isProduction ? productionFormat : developmentFormat,
    defaultMeta: {
      service: serviceName,
      environment: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || '1.0.0',
    },
    transports,
    exitOnError: false,
  });
}

/**
 * Create a child logger with additional context
 */
export function createChildLogger(
  logger: winston.Logger,
  context: Record<string, any>
): winston.Logger {
  return logger.child(sanitize(context));
}

/**
 * Add correlation ID to logger
 */
export function addCorrelationId(
  logger: winston.Logger,
  correlationId: string
): winston.Logger {
  return logger.child({ correlationId });
}

export default createLogger;
export { sanitize };
