import winston from 'winston';

const logLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

// PII sanitization for log security
const SENSITIVE_LOG_FIELDS = [
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
      const isSensitive = SENSITIVE_LOG_FIELDS.some(f => k.toLowerCase().includes(f.toLowerCase()));
      out[k] = isSensitive ? '[REDACTED]' : (typeof v === 'object' && v !== null ? sanitizeLogData(v) : v);
    }
    return out;
  }
  return data;
}

const sanitizeFormat = winston.format((info) => {
  const s = { ...info };
  Object.keys(s).filter(k => !['level','message','timestamp','service','stack'].includes(k))
    .forEach(k => { s[k] = sanitizeLogData(s[k]); });
  if (typeof s.message === 'string') {
    s.message = s.message.replace(/[A-Za-z0-9_-]{32,}/g, '[REDACTED_TOKEN]')
      .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, '[REDACTED_EMAIL]');
  }
  return s;
});

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    sanitizeFormat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'admin-service' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
});
