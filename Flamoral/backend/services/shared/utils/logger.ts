import winston from 'winston';

/**
 * Logger configuration interface
 */
export interface LoggerConfig {
  /**
   * Service name for log identification
   */
  serviceName: string;

  /**
   * Minimum log level
   * @default 'info'
   */
  level?: string;

  /**
   * Whether to enable console logging
   * @default true
   */
  console?: boolean;

  /**
   * Whether to enable file logging
   * @default false
   */
  file?: boolean;

  /**
   * File path for logs (if file logging is enabled)
   * @default './logs/app.log'
   */
  filePath?: string;

  /**
   * Additional metadata to include in all logs
   */
  defaultMeta?: Record<string, any>;
}

/**
 * Create a Winston logger instance configured for the service
 *
 * Features:
 * - Structured JSON logging
 * - Color-coded console output in development
 * - Timestamp for all logs
 * - Service name identification
 * - Environment-aware configuration
 *
 * @param serviceName - Name of the service creating the logger
 * @param config - Optional logger configuration
 * @returns Configured Winston logger instance
 *
 * @example
 * const logger = createLogger('auth-service');
 * logger.info('User logged in', { userId: '123', email: 'user@example.com' });
 * logger.error('Database connection failed', { error: err.message });
 */
export function createLogger(serviceName: string, config?: Omit<LoggerConfig, 'serviceName'>): winston.Logger {
  const {
    level = process.env.LOG_LEVEL || 'info',
    console: enableConsole = true,
    file: enableFile = false,
    filePath = './logs/app.log',
    defaultMeta = {},
  } = config || {};

  const isDevelopment = process.env.NODE_ENV !== 'production';

  // Define log format
  const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'service'] }),
    isDevelopment
      ? winston.format.colorize({ all: true })
      : winston.format.uncolorize(),
    winston.format.printf(({ timestamp, level, message, service, metadata, stack }) => {
      const meta = metadata && Object.keys(metadata).length > 0
        ? ` ${JSON.stringify(metadata)}`
        : '';
      const stackTrace = stack ? `\n${stack}` : '';
      return `[${timestamp}] [${service}] ${level}: ${message}${meta}${stackTrace}`;
    })
  );

  const jsonFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  );

  // Define transports
  const transports: winston.transport[] = [];

  if (enableConsole) {
    transports.push(
      new winston.transports.Console({
        format: logFormat,
      })
    );
  }

  if (enableFile) {
    transports.push(
      new winston.transports.File({
        filename: filePath,
        format: jsonFormat,
        maxsize: 10485760, // 10MB
        maxFiles: 5,
      })
    );
  }

  // Create logger
  const logger = winston.createLogger({
    level,
    defaultMeta: {
      service: serviceName,
      ...defaultMeta,
    },
    transports,
    exitOnError: false,
  });

  return logger;
}

/**
 * Default logger instance for shared utilities
 */
export const defaultLogger = createLogger('shared');

export default createLogger;
