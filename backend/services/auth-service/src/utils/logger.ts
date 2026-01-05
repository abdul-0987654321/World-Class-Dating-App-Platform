import { config } from '../config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private context: string;

  constructor(context: string = 'auth-service') {
    this.context = context;
  }

  private formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] [${this.context}] ${message}${metaStr}`;
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
    console.error(this.formatMessage('error', message, errorMeta));
  }
}

export const createLogger = (context: string): Logger => new Logger(context);
export default new Logger();
