/**
 * Logger Utility with PII Sanitization
 */

// Sensitive field patterns that should be masked in logs
const SENSITIVE_FIELDS = [
  'password', 'token', 'accessToken', 'refreshToken', 'apiKey', 'secret',
  'authorization', 'email', 'phone', 'phoneNumber', 'address',
];

function sanitizeLogData(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data)) return '[REDACTED_EMAIL]';
    if (data.length > 20 && /^[A-Za-z0-9_-]+$/.test(data)) return '[REDACTED_TOKEN]';
    return data;
  }
  if (Array.isArray(data)) return data.map(sanitizeLogData);
  if (typeof data === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(data)) {
      const isSensitive = SENSITIVE_FIELDS.some(f => k.toLowerCase().includes(f.toLowerCase()));
      out[k] = isSensitive ? '[REDACTED]' : (typeof v === 'object' && v !== null ? sanitizeLogData(v) : v);
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

export const logger = {
  info: (message: string, meta?: any) => {
    console.log(`[INFO] ${sanitizeMessage(message)}`, meta ? sanitizeLogData(meta) : '');
  },
  warn: (message: string, meta?: any) => {
    console.warn(`[WARN] ${sanitizeMessage(message)}`, meta ? sanitizeLogData(meta) : '');
  },
  error: (message: string, meta?: any) => {
    console.error(`[ERROR] ${sanitizeMessage(message)}`, meta ? sanitizeLogData(meta) : '');
  },
  debug: (message: string, meta?: any) => {
    console.debug(`[DEBUG] ${sanitizeMessage(message)}`, meta ? sanitizeLogData(meta) : '');
  },
};
