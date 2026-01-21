/**
 * Secure, Environment-Aware Logger for Production
 *
 * Features:
 * - Environment-based log levels (verbose in dev, minimal in prod)
 * - Automatic PII/sensitive data sanitization
 * - No console logging in production
 * - Crash reporting integration
 * - Performance monitoring
 */

import Config from 'react-native-config';
import * as Sentry from '@sentry/react-native';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

interface LogContext {
  [key: string]: any;
}

class Logger {
  private static instance: Logger;
  private minLogLevel: LogLevel;
  private isProduction: boolean;
  private isDevelopment: boolean;

  // Sensitive field patterns that should be masked
  private sensitiveFields = [
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
  ];

  private constructor() {
    this.isProduction = Config.ENV === 'production';
    this.isDevelopment = __DEV__;

    // Set minimum log level based on environment
    if (this.isProduction) {
      this.minLogLevel = LogLevel.ERROR; // Only log errors in production
    } else if (Config.ENV === 'staging') {
      this.minLogLevel = LogLevel.WARN;
    } else {
      this.minLogLevel = LogLevel.DEBUG; // Log everything in development
    }
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Sanitize sensitive data from log context
   */
  private sanitize(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'string') {
      // Check if the string looks like a token or credential
      if (data.length > 20 && /^[A-Za-z0-9_-]+$/.test(data)) {
        return '[REDACTED_TOKEN]';
      }
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitize(item));
    }

    if (typeof data === 'object') {
      const sanitized: any = {};

      for (const [key, value] of Object.entries(data)) {
        const lowerKey = key.toLowerCase();

        // Check if this field should be masked
        const isSensitive = this.sensitiveFields.some((field) =>
          lowerKey.includes(field.toLowerCase())
        );

        if (isSensitive) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'object') {
          sanitized[key] = this.sanitize(value);
        } else {
          sanitized[key] = value;
        }
      }

      return sanitized;
    }

    return data;
  }

  /**
   * Format log message with context
   */
  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] [${level}] ${message}`;

    if (context && Object.keys(context).length > 0) {
      const sanitizedContext = this.sanitize(context);
      logMessage += ` ${JSON.stringify(sanitizedContext)}`;
    }

    return logMessage;
  }

  /**
   * Should this log level be processed?
   */
  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLogLevel;
  }

  /**
   * Log to external services (Sentry, Analytics)
   */
  private logToExternalServices(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): void {
    // Only log to Sentry for WARN and above
    if (level >= LogLevel.WARN) {
      const sanitizedContext = this.sanitize(context);

      if (error) {
        Sentry.captureException(error, {
          level: level === LogLevel.WARN ? 'warning' : 'error',
          contexts: {
            custom: sanitizedContext,
          },
        });
      } else {
        Sentry.captureMessage(message, {
          level: level === LogLevel.WARN ? 'warning' : 'error',
          contexts: {
            custom: sanitizedContext,
          },
        });
      }
    }
  }

  /**
   * Debug level logging - development only
   */
  public debug(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;

    const formattedMessage = this.formatMessage('DEBUG', message, context);

    if (this.isDevelopment) {
      console.log(formattedMessage);
    }
  }

  /**
   * Info level logging
   */
  public info(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.INFO)) return;

    const formattedMessage = this.formatMessage('INFO', message, context);

    if (this.isDevelopment) {
      console.info(formattedMessage);
    }
  }

  /**
   * Warning level logging
   */
  public warn(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.WARN)) return;

    const formattedMessage = this.formatMessage('WARN', message, context);

    if (this.isDevelopment) {
      console.warn(formattedMessage);
    }

    this.logToExternalServices(LogLevel.WARN, message, context);
  }

  /**
   * Error level logging
   */
  public error(message: string, error?: Error, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    const errorContext = {
      ...context,
      error: error
        ? {
            name: error.name,
            message: error.message,
            // Only include stack trace in development
            ...(this.isDevelopment && { stack: error.stack }),
          }
        : undefined,
    };

    const formattedMessage = this.formatMessage('ERROR', message, errorContext);

    if (this.isDevelopment) {
      console.error(formattedMessage);
      if (error) {
        console.error(error);
      }
    }

    this.logToExternalServices(LogLevel.ERROR, message, errorContext, error);
  }

  /**
   * Fatal level logging - for critical errors
   */
  public fatal(message: string, error?: Error, context?: LogContext): void {
    const errorContext = {
      ...context,
      error: error
        ? {
            name: error.name,
            message: error.message,
            // Only include stack trace in development
            ...(this.isDevelopment && { stack: error.stack }),
          }
        : undefined,
    };

    const formattedMessage = this.formatMessage('FATAL', message, errorContext);

    if (this.isDevelopment) {
      console.error(formattedMessage);
      if (error) {
        console.error(error);
      }
    }

    this.logToExternalServices(LogLevel.FATAL, message, errorContext, error);
  }

  /**
   * Performance logging
   */
  public performance(metricName: string, duration: number, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.INFO)) return;

    const perfContext = {
      ...context,
      duration,
      metricName,
    };

    this.info(`Performance: ${metricName}`, perfContext);

    // Send to performance monitoring
    if (!this.isDevelopment) {
      // Integration with performance monitoring service
      // e.g., Firebase Performance, New Relic, etc.
    }
  }

  /**
   * Network logging
   */
  public network(
    method: string,
    url: string,
    status: number,
    duration: number,
    context?: LogContext
  ): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;

    const networkContext = {
      ...context,
      method,
      url: this.sanitizeUrl(url),
      status,
      duration,
    };

    if (status >= 400) {
      this.warn(`Network Error: ${method} ${url}`, networkContext);
    } else {
      this.debug(`Network: ${method} ${url}`, networkContext);
    }
  }

  /**
   * Remove sensitive data from URLs (tokens in query params)
   */
  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const sensitiveParams = ['token', 'access_token', 'refresh_token', 'api_key', 'key'];

      sensitiveParams.forEach((param) => {
        if (urlObj.searchParams.has(param)) {
          urlObj.searchParams.set(param, '[REDACTED]');
        }
      });

      return urlObj.toString();
    } catch {
      // If URL parsing fails, just return the original
      return url;
    }
  }

  /**
   * User action logging (analytics)
   */
  public userAction(action: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.INFO)) return;

    const sanitizedContext = this.sanitize(context);

    this.info(`User Action: ${action}`, sanitizedContext);

    // Send to analytics service
    // e.g., Firebase Analytics, Mixpanel, etc.
  }
}

// Export singleton instance
const logger = Logger.getInstance();
export default logger;

// Convenience exports for common use cases
export const debug = (message: string, context?: LogContext) => logger.debug(message, context);
export const info = (message: string, context?: LogContext) => logger.info(message, context);
export const warn = (message: string, context?: LogContext) => logger.warn(message, context);
export const error = (message: string, err?: Error, context?: LogContext) =>
  logger.error(message, err, context);
export const fatal = (message: string, err?: Error, context?: LogContext) =>
  logger.fatal(message, err, context);
export const performance = (metricName: string, duration: number, context?: LogContext) =>
  logger.performance(metricName, duration, context);
export const network = (
  method: string,
  url: string,
  status: number,
  duration: number,
  context?: LogContext
) => logger.network(method, url, status, duration, context);
export const userAction = (action: string, context?: LogContext) =>
  logger.userAction(action, context);
