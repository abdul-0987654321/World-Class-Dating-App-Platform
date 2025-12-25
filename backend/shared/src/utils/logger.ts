/**
 * Simple logger utility for backend shared module
 */

export interface Logger {
  debug: (message: string, ...args: any[]) => void;
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
}

function createLogger(context: string): Logger {
  const formatMessage = (level: string, message: string): string => {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] [${context}] ${message}`;
  };

  return {
    debug: (message: string, ...args: any[]) => {
      if (process.env.NODE_ENV !== 'production') {
        console.debug(formatMessage('DEBUG', message), ...args);
      }
    },
    info: (message: string, ...args: any[]) => {
      console.info(formatMessage('INFO', message), ...args);
    },
    warn: (message: string, ...args: any[]) => {
      console.warn(formatMessage('WARN', message), ...args);
    },
    error: (message: string, ...args: any[]) => {
      console.error(formatMessage('ERROR', message), ...args);
    },
  };
}

export default createLogger;
