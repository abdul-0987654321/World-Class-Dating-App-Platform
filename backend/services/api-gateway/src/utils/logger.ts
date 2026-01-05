/**
 * Structured Logger for API Gateway
 *
 * Uses Winston for structured JSON logging in production,
 * with console fallback for development.
 */
import * as winston from 'winston';

// Sensitive fields that should never be logged
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'secret',
  'authorization',
  'cookie',
  'creditCard',
  'cardNumber',
  'cvv',
  'ssn',
];

/**
 * Redact sensitive fields from log data
 */
function redactSensitiveData(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(redactSensitiveData);
  }

  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_FIELDS.some((field) => lowerKey.includes(field.toLowerCase()))) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactSensitiveData(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

const isProduction = process.env.NODE_ENV === 'production';

// Create Winston logger with JSON format for production
const winstonLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    winston.format.errors({ stack: true }),
    isProduction
      ? winston.format.json()
      : winston.format.combine(winston.format.colorize(), winston.format.simple())
  ),
  defaultMeta: {
    service: 'api-gateway',
    version: process.env.APP_VERSION || '1.0.0',
  },
  transports: [
    new winston.transports.Console({
      stderrLevels: ['error'],
    }),
  ],
});

// Add file transports in production
if (isProduction) {
  winstonLogger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    })
  );
  winstonLogger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
    })
  );
}

class Logger {
  private correlationId?: string;

  setCorrelationId(id: string): void {
    this.correlationId = id;
  }

  private formatMeta(meta?: any): any {
    const sanitized = meta ? redactSensitiveData(meta) : {};
    if (this.correlationId) {
      sanitized.correlationId = this.correlationId;
    }
    return sanitized;
  }

  info(message: string, meta?: any): void {
    winstonLogger.info(message, this.formatMeta(meta));
  }

  warn(message: string, meta?: any): void {
    winstonLogger.warn(message, this.formatMeta(meta));
  }

  error(message: string, error?: any): void {
    const meta: any = this.formatMeta({});
    if (error instanceof Error) {
      meta.error = {
        name: error.name,
        message: error.message,
        stack: isProduction ? undefined : error.stack,
      };
    } else if (error) {
      meta.error = redactSensitiveData(error);
    }
    winstonLogger.error(message, meta);
  }

  debug(message: string, meta?: any): void {
    winstonLogger.debug(message, this.formatMeta(meta));
  }

  /**
   * Create a child logger with additional context
   */
  child(context: Record<string, any>): Logger {
    const childLogger = new Logger();
    childLogger.correlationId = this.correlationId;
    return childLogger;
  }
}

export const logger = new Logger();
export default logger;
