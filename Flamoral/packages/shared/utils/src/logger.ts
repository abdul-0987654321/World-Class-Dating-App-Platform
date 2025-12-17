/**
 * Logger utility for Flamoral services
 * Provides structured logging with different levels
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

class FlomoralLogger implements Logger {
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
    this.level = options.level || (process.env.LOG_LEVEL as LogLevel) || 'info';
    this.enableColors = options.enableColors ?? true;
    this.enableTimestamp = options.enableTimestamp ?? true;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.logLevels[level] >= this.logLevels[this.level];
  }

  private formatMessage(level: LogLevel, message: string, meta?: LogMetadata): string {
    const parts: string[] = [];

    if (this.enableTimestamp) {
      parts.push(`[${new Date().toISOString()}]`);
    }

    const levelStr = level.toUpperCase().padEnd(5);
    if (this.enableColors) {
      parts.push(`${this.colors[level]}${levelStr}${this.resetColor}`);
    } else {
      parts.push(levelStr);
    }

    parts.push(`[${this.service}]`);
    parts.push(message);

    if (meta && Object.keys(meta).length > 0) {
      parts.push(JSON.stringify(meta));
    }

    return parts.join(' ');
  }

  debug(message: string, meta?: LogMetadata): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, meta));
    }
  }

  info(message: string, meta?: LogMetadata): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, meta));
    }
  }

  warn(message: string, meta?: LogMetadata): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, meta));
    }
  }

  error(message: string, meta?: LogMetadata): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, meta));
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
  return new FlomoralLogger(service, options);
}

// Default logger instance
export const logger = createLogger('flamoral', {
  level: (process.env.LOG_LEVEL as LogLevel) || 'info',
});
