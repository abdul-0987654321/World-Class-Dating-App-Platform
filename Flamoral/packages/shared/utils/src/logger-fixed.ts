/**
 * Logger utility for Flamoral shared packages
 * Provides structured logging with different levels
 * Compatible with browser and Node.js environments
 */

export interface LoggerOptions {
  service?: string;
  level?: LogLevel;
  enableColors?: boolean;
  enableTimestamp?: boolean;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogMetadata {
  [key: string]: any;
}

export interface Logger {
  debug(message: string, meta?: LogMetadata): void;
  info(message: string, meta?: LogMetadata): void;
  warn(message: string, meta?: LogMetadata): void;
  error(message: string, meta?: LogMetadata): void;
}

// Sensitive fields to redact
const SENSITIVE_FIELDS = new Set([
  'password', 'token', 'accesstoken', 'refreshtoken', 'apikey', 'secret',
  'authorization', 'auth', 'creditcard', 'cvv', 'ssn', 'pin', 'privatekey',
  'email', 'phone', 'phonenumber', 'session', 'sessionid', 'sessiontoken',
]);

class FlamoralLogger implements Logger {
  private service: string;
  private level: LogLevel;
  private enableColors: boolean;
  private enableTimestamp: boolean;

  private logLevels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  private colors: Record<LogLevel, string> = {
    debug: '\x1b[36m', // Cyan
    info: '\x1b[32m',  // Green
    warn: '\x1b[33m',  // Yellow
    error: '\x1b[31m', // Red
  };

  private resetColor = '\x1b[0m';

  constructor(service: string, options: LoggerOptions = {}) {
    this.service = service;
    this.level = options.level || (this.getEnvVar('LOG_LEVEL') as LogLevel) || 'info';
    this.enableColors = options.enableColors ?? this.isBrowser() ? false : true;
    this.enableTimestamp = options.enableTimestamp ?? true;
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof window.document !== 'undefined';
  }

  private getEnvVar(key: string): string | undefined {
    if (this.isBrowser()) {
      return undefined;
    }
    return process?.env?.[key];
  }

  private shouldLog(level: LogLevel): boolean {
    return this.logLevels[level] >= this.logLevels[this.level];
  }

  private sanitizeData(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'string') {
      // Redact long tokens
      if (data.length > 20 && /^[A-Za-z0-9_-]+$/.test(data)) {
        return '[REDACTED]';
      }
      // Redact emails
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data)) {
        const [, domain] = data.split('@');
        return `[REDACTED]@${domain}`;
      }
      return data;
    }

    if (typeof data === 'object') {
      if (Array.isArray(data)) {
        return data.map(item => this.sanitizeData(item));
      }

      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitizeData(value);
        }
      }
      return sanitized;
    }

    return data;
  }

  private formatMessage(level: LogLevel, message: string, meta?: LogMetadata): string {
    const parts: string[] = [];

    if (this.enableTimestamp) {
      parts.push(`[${new Date().toISOString()}]`);
    }

    const levelStr = level.toUpperCase().padEnd(5);
    if (this.enableColors && !this.isBrowser()) {
      parts.push(`${this.colors[level]}${levelStr}${this.resetColor}`);
    } else {
      parts.push(levelStr);
    }

    parts.push(`[${this.service}]`);
    parts.push(message);

    if (meta && Object.keys(meta).length > 0) {
      const sanitized = this.sanitizeData(meta);
      parts.push(JSON.stringify(sanitized));
    }

    return parts.join(' ');
  }

  debug(message: string, meta?: LogMetadata): void {
    if (this.shouldLog('debug')) {
      const formatted = this.formatMessage('debug', message, meta);
      if (this.isBrowser()) {
        console.debug(formatted);
      } else {
        console.debug(formatted);
      }
    }
  }

  info(message: string, meta?: LogMetadata): void {
    if (this.shouldLog('info')) {
      const formatted = this.formatMessage('info', message, meta);
      if (this.isBrowser()) {
        console.info(formatted);
      } else {
        console.info(formatted);
      }
    }
  }

  warn(message: string, meta?: LogMetadata): void {
    if (this.shouldLog('warn')) {
      const formatted = this.formatMessage('warn', message, meta);
      if (this.isBrowser()) {
        console.warn(formatted);
      } else {
        console.warn(formatted);
      }
    }
  }

  error(message: string, meta?: LogMetadata): void {
    if (this.shouldLog('error')) {
      const formatted = this.formatMessage('error', message, meta);
      if (this.isBrowser()) {
        console.error(formatted);
      } else {
        console.error(formatted);
      }
    }
  }
}

/**
 * Create a logger instance for a service
 * @param service - The name of the service using the logger
 * @param options - Logger configuration options
 * @returns A configured logger instance
 */
export function createLogger(service: string, options?: LoggerOptions): Logger {
  return new FlamoralLogger(service, options);
}

// Default logger instance
export const logger = createLogger('flamoral');
