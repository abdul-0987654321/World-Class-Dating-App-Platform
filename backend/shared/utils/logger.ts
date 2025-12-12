/**
 * Secure, Environment-Aware Logger for Backend Services
 *
 * Features:
 * - Environment-based log levels
 * - Automatic PII/sensitive data sanitization
 * - Production-safe logging
 * - Structured logging with Winston
 * - Error tracking integration
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
  // Sanitize the metadata
  const sanitizedInfo = { ...info };

  // Sanitize all metadata except standard winston fields
  const metadataKeys = Object.keys(sanitizedInfo).filter(
    key => !['level', 'message', 'timestamp', 'service', 'stack'].includes(key)
  );

  metadataKeys.forEach(key => {
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
    sanitizedInfo.message = sanitizedInfo.message.replace(
      /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/g,
      '[REDACTED_EMAIL]'
    );
  }

  return sanitizedInfo;
});

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: process.env.NODE_ENV !== 'production' }), // Only include stack in non-prod
  winston.format.splat(),
  sanitizeFormat(), // Apply sanitization
  winston.format.json()
);

const createLogger = (serviceName: string) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const logLevel = process.env.LOG_LEVEL || (isProduction ? 'warn' : 'debug');

  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, service, ...metadata }) => {
          let msg = `${timestamp} [${service}] ${level}: ${message}`;

          // Only show metadata in non-production or if explicitly enabled
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

  // Only write to files in non-production environments
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

  return winston.createLogger({
    level: logLevel,
    format: logFormat,
    defaultMeta: { service: serviceName },
    transports,
    // Don't exit on uncaught exceptions
    exitOnError: false,
  });
};

export default createLogger;

// Export sanitization function for testing
export { sanitize };
