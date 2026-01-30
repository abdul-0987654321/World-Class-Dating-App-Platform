import winston from 'winston';

// Sensitive field patterns that should be masked in logs
const SENSITIVE_FIELDS = [
  'password', 'token', 'accessToken', 'refreshToken', 'apiKey', 'secret',
  'authorization', 'credit_card', 'creditCard', 'cvv', 'ssn', 'pin',
  'privateKey', 'private_key', 'email', 'phone', 'phoneNumber',
  'address', 'bankAccount', 'bank_account', 'sessionToken',
  'cardNumber', 'accountNumber', 'routingNumber', 'stripeKey',
];

/**
 * Sanitize sensitive data from log objects
 */
function sanitizeSensitiveData(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data)) {
      const [, domain] = data.split('@');
      return '[REDACTED]@' + domain;
    }
    if (data.length > 20 && /^[A-Za-z0-9_-]+$/.test(data)) {
      return '[REDACTED_TOKEN]';
    }
    return data;
  }
  if (Array.isArray(data)) return data.map(sanitizeSensitiveData);
  if (typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = SENSITIVE_FIELDS.some(f => lowerKey.includes(f.toLowerCase()));
      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value \!== null) {
        sanitized[key] = sanitizeSensitiveData(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
  return data;
}

const sanitizeFormat = winston.format((info) => {
  const sanitized = { ...info };
  const metaKeys = Object.keys(sanitized).filter(
    k => \!['level', 'message', 'timestamp', 'service', 'stack'].includes(k)
  );
  metaKeys.forEach(k => { sanitized[k] = sanitizeSensitiveData(sanitized[k]); });
  if (typeof sanitized.message === 'string') {
    sanitized.message = sanitized.message
      .replace(/[A-Za-z0-9_-]{32,}/g, '[REDACTED_TOKEN]')
      .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, '[REDACTED_EMAIL]');
  }
  return sanitized;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    sanitizeFormat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'payment-service' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  ],
});

if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({ filename: 'logs/error.log', level: 'error' }));
  logger.add(new winston.transports.File({ filename: 'logs/combined.log' }));
}

export default logger;
