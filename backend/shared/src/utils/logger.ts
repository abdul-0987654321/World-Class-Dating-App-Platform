/**
 * Simple logger utility for backend shared module
 * Includes PII sanitization for production safety
 */

// Sensitive field patterns that should be masked in logs
const SENSITIVE_FIELDS = [
  'password', 'token', 'accessToken', 'refreshToken', 'apiKey', 'secret',
  'authorization', 'email', 'phone', 'phoneNumber', 'address',
];

function sanitizeArg(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data)) return '[REDACTED_EMAIL]';
    if (data.length > 20 && /^[A-Za-z0-9_-]+$/.test(data)) return '[REDACTED_TOKEN]';
    return data;
  }
  if (Array.isArray(data)) return data.map(sanitizeArg);
  if (typeof data === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(data)) {
      const isSensitive = SENSITIVE_FIELDS.some(f => k.toLowerCase().includes(f.toLowerCase()));
      out[k] = isSensitive ? '[REDACTED]' : (typeof v === 'object' && v !== null ? sanitizeArg(v) : v);
    }
    return out;
  }
  return data;
}

function sanitizeMessage(msg: string): string {
  return msg
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, '[REDACTED_TOKEN]')
    .replace(/\b[^\s@]+@[^\s@]+\.[^\s@]+\b/g, '[REDACTED_EMAIL]');
}

export interface Logger {
  debug: (message: string, ...args: any[]) => void;
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
}

function createLogger(context: string): Logger {
  const formatMessage = (level: string, message: string): string => {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] [${context}] ${sanitizeMessage(message)}`;
  };

  return {
    debug: (message: string, ...args: any[]) => {
      if (process.env.NODE_ENV !== 'production') {
        console.debug(formatMessage('DEBUG', message), ...args.map(sanitizeArg));
      }
    },
    info: (message: string, ...args: any[]) => {
      console.info(formatMessage('INFO', message), ...args.map(sanitizeArg));
    },
    warn: (message: string, ...args: any[]) => {
      console.warn(formatMessage('WARN', message), ...args.map(sanitizeArg));
    },
    error: (message: string, ...args: any[]) => {
      console.error(formatMessage('ERROR', message), ...args.map(sanitizeArg));
    },
  };
}

export default createLogger;
