import { config } from '../config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Sensitive field patterns that should be masked in logs
const SENSITIVE_FIELDS = [
  'password', 'token', 'accessToken', 'refreshToken', 'apiKey', 'secret',
  'authorization', 'credit_card', 'creditCard', 'cvv', 'ssn', 'pin',
  'privateKey', 'private_key', 'email', 'phone', 'phoneNumber',
  'address', 'bankAccount', 'bank_account', 'sessionToken',
];

/**
 * Sanitize sensitive data from log metadata objects.
 * Redacts field values whose key matches a sensitive pattern,
 * replaces standalone email strings, and masks long token-like strings.
 */
function sanitizeMeta(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') {
    // Redact standalone email patterns
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data)) {
      const parts = data.split('@');
      return '[REDACTED]@' + parts[1];
    }
    // Redact long token-like strings
    if (data.length > 20 && /^[A-Za-z0-9_-]+$/.test(data)) {
      return '[REDACTED_TOKEN]';
    }
    return data;
  }
  if (Array.isArray(data)) return data.map(sanitizeMeta);
  if (typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = SENSITIVE_FIELDS.some(f => lowerKey.includes(f.toLowerCase()));
      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeMeta(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
  return data;
}

/**
 * Sanitize a log message string by redacting inline tokens and emails
 */
function sanitizeMessage(message: string): string {
  return message
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, '[REDACTED_TOKEN]')
    .replace(/\b[^\s@]+@[^\s@]+\.[^\s@]+\b/g, '[REDACTED_EMAIL]');
}

class Logger {
  private context: string;

  constructor(context: string = 'auth-service') {
    this.context = context;
  }

  private formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const sanitizedMessage = sanitizeMessage(message);
    const metaStr = meta ? ` ${JSON.stringify(sanitizeMeta(meta))}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] [${this.context}] ${sanitizedMessage}${metaStr}`;
  }

  debug(message: string, meta?: any): void {
    if (config.nodeEnv === 'development') {
      console.debug(this.formatMessage('debug', message, meta));
    }
  }

  info(message: string, meta?: any): void {
    console.info(this.formatMessage('info', message, meta));
  }

  warn(message: string, meta?: any): void {
    console.warn(this.formatMessage('warn', message, meta));
  }

  error(message: string, error?: any): void {
    const errorMeta =
      error instanceof Error ? { message: error.message, stack: error.stack } : error;
    console.error(this.formatMessage('error', message, sanitizeMeta(errorMeta)));
  }
}

export const createLogger = (context: string): Logger => new Logger(context);
export default new Logger();
