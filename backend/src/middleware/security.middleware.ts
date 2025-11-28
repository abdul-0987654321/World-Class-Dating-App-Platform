/**
 * Enhanced Security Middleware
 * Comprehensive security protection for all routes
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// SQL Injection Prevention
export function sqlInjectionPrevention(req: Request, res: Response, next: NextFunction) {
  const sqlPattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/gi;

  const checkForSQLInjection = (obj: any): boolean => {
    if (typeof obj === 'string') {
      return sqlPattern.test(obj);
    }
    if (typeof obj === 'object' && obj !== null) {
      return Object.values(obj).some(checkForSQLInjection);
    }
    return false;
  };

  if (checkForSQLInjection(req.body) || checkForSQLInjection(req.query) || checkForSQLInjection(req.params)) {
    logger.warn('SQL Injection attempt detected', {
      ip: req.ip,
      url: req.originalUrl,
      method: req.method,
      body: req.body,
      query: req.query,
    });

    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid input detected',
        code: 'INVALID_INPUT',
      },
    });
  }

  next();
}

// XSS Protection
export function xssProtection(req: Request, res: Response, next: NextFunction) {
  const xssPattern = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;

  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj.replace(xssPattern, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    }
    if (typeof obj === 'object' && obj !== null) {
      Object.keys(obj).forEach(key => {
        obj[key] = sanitize(obj[key]);
      });
    }
    return obj;
  };

  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  req.params = sanitize(req.params);

  next();
}

// NoSQL Injection Prevention
export function noSQLInjectionPrevention(req: Request, res: Response, next: NextFunction) {
  const checkForNoSQLInjection = (obj: any): boolean => {
    if (typeof obj === 'object' && obj !== null) {
      const keys = Object.keys(obj);
      // Check for MongoDB operators
      if (keys.some(key => key.startsWith('$'))) {
        return true;
      }
      return Object.values(obj).some(checkForNoSQLInjection);
    }
    return false;
  };

  if (checkForNoSQLInjection(req.body) || checkForNoSQLInjection(req.query)) {
    logger.warn('NoSQL Injection attempt detected', {
      ip: req.ip,
      url: req.originalUrl,
      method: req.method,
    });

    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid input detected',
        code: 'INVALID_INPUT',
      },
    });
  }

  next();
}

// Request Size Limiter
export function requestSizeLimiter(req: Request, res: Response, next: NextFunction) {
  const MAX_REQUEST_SIZE = 10 * 1024 * 1024; // 10MB

  const size = parseInt(req.get('content-length') || '0', 10);

  if (size > MAX_REQUEST_SIZE) {
    logger.warn('Large request blocked', {
      ip: req.ip,
      size,
      url: req.originalUrl,
    });

    return res.status(413).json({
      success: false,
      error: {
        message: 'Request entity too large',
        code: 'REQUEST_TOO_LARGE',
      },
    });
  }

  next();
}

// Secure Headers Middleware
export function secureHeaders(req: Request, res: Response, next: NextFunction) {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable XSS filter
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss: https:;"
  );

  // HSTS (HTTP Strict Transport Security)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Permissions Policy
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(self), microphone=(), camera=(), payment=()'
  );

  next();
}

// IP Blacklist Middleware
const blacklistedIPs = new Set<string>();

export function ipBlacklist(req: Request, res: Response, next: NextFunction) {
  const clientIP = req.ip || req.socket.remoteAddress;

  if (clientIP && blacklistedIPs.has(clientIP)) {
    logger.warn('Blocked blacklisted IP', { ip: clientIP });

    return res.status(403).json({
      success: false,
      error: {
        message: 'Access denied',
        code: 'ACCESS_DENIED',
      },
    });
  }

  next();
}

export function addToBlacklist(ip: string) {
  blacklistedIPs.add(ip);
  logger.info(`IP added to blacklist: ${ip}`);
}

// Session Security
export function sessionSecurity(req: Request, res: Response, next: NextFunction) {
  // Regenerate session ID periodically
  const session = (req as any).session;
  if (session && session.createdAt) {
    const sessionAge = Date.now() - session.createdAt;
    const MAX_SESSION_AGE = 24 * 60 * 60 * 1000; // 24 hours

    if (sessionAge > MAX_SESSION_AGE) {
      session.destroy((err: any) => {
        if (err) {
          logger.error('Session destruction error:', err);
        }
      });

      return res.status(401).json({
        success: false,
        error: {
          message: 'Session expired',
          code: 'SESSION_EXPIRED',
        },
      });
    }
  }

  next();
}

// HTTP Methods Restriction
export function restrictHTTPMethods(allowedMethods: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!allowedMethods.includes(req.method)) {
      return res.status(405).json({
        success: false,
        error: {
          message: 'Method not allowed',
          code: 'METHOD_NOT_ALLOWED',
        },
      });
    }
    next();
  };
}

// Content Type Validation
export function validateContentType(req: Request, res: Response, next: NextFunction) {
  const allowedContentTypes = [
    'application/json',
    'application/x-www-form-urlencoded',
    'multipart/form-data',
  ];

  const contentType = req.get('content-type');

  if (req.method !== 'GET' && req.method !== 'DELETE' && contentType) {
    const isValid = allowedContentTypes.some(type => contentType.includes(type));

    if (!isValid) {
      logger.warn('Invalid content type', {
        ip: req.ip,
        contentType,
        url: req.originalUrl,
      });

      return res.status(415).json({
        success: false,
        error: {
          message: 'Unsupported media type',
          code: 'UNSUPPORTED_MEDIA_TYPE',
        },
      });
    }
  }

  next();
}

// Request ID Middleware
export function requestId(req: Request, res: Response, next: NextFunction) {
  const id = req.get('X-Request-ID') || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  req.headers['x-request-id'] = id;
  res.setHeader('X-Request-ID', id);
  next();
}

// Security Audit Logger
export function securityAuditLogger(req: Request, res: Response, next: NextFunction) {
  const securityEvents = {
    timestamp: new Date().toISOString(),
    ip: req.ip,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('user-agent'),
    referer: req.get('referer'),
    authorization: !!req.get('authorization'),
  };

  // Log sensitive operations
  const sensitivePaths = ['/auth/', '/password', '/payment', '/admin'];
  if (sensitivePaths.some(path => req.path.includes(path))) {
    logger.info('Security audit', securityEvents);
  }

  next();
}
