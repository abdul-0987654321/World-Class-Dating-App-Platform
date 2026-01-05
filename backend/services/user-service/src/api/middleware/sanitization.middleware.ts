import { Request, Response, NextFunction } from 'express';

import logger from '../../utils/logger';

/**
 * Input Sanitization Middleware
 * Protects against XSS, SQL injection, and other injection attacks
 */

/**
 * Sanitize string to prevent XSS attacks
 */
function sanitizeString(input: string): string {
  if (typeof input !== 'string') return input;

  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

/**
 * Sanitize HTML by removing script tags and dangerous attributes
 */
function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') return input;

  return (
    input
      // Remove script tags
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove event handlers
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/on\w+\s*=\s*[^\s>]*/gi, '')
      // Remove javascript: protocol
      .replace(/javascript:/gi, '')
      // Remove data: protocol (can be used for XSS)
      .replace(/data:text\/html/gi, '')
      .trim()
  );
}

/**
 * Detect SQL injection patterns
 */
function hasSqlInjection(input: string): boolean {
  if (typeof input !== 'string') return false;

  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    /(UNION\s+SELECT)/gi,
    /(;\s*DROP)/gi,
    /(--|\#|\/\*|\*\/)/g, // SQL comments
    /(\bOR\b\s+\d+\s*=\s*\d+)/gi, // OR 1=1
    /(\bAND\b\s+\d+\s*=\s*\d+)/gi, // AND 1=1
    /(\\x[0-9a-f]{2})/gi, // Hex encoding
  ];

  return sqlPatterns.some((pattern) => pattern.test(input));
}

/**
 * Detect XSS patterns
 */
function hasXss(input: string): boolean {
  if (typeof input !== 'string') return false;

  const xssPatterns = [
    /<script/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /javascript:/gi,
    /onerror\s*=/gi,
    /onload\s*=/gi,
    /onclick\s*=/gi,
    /<img[^>]+src\s*=\s*["']?javascript:/gi,
  ];

  return xssPatterns.some((pattern) => pattern.test(input));
}

/**
 * Detect command injection patterns
 */
function hasCommandInjection(input: string): boolean {
  if (typeof input !== 'string') return false;

  const commandPatterns = [
    /[;&|`$(){}[\]<>]/g, // Shell metacharacters
    /\$\(.*\)/g, // Command substitution
    /`.*`/g, // Backtick command execution
  ];

  return commandPatterns.some((pattern) => pattern.test(input));
}

/**
 * Sanitize object recursively
 */
function sanitizeObject(obj: any, allowHtml: boolean = false): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return allowHtml ? sanitizeHtml(obj) : sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, allowHtml));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Sanitize the key as well
        const sanitizedKey = sanitizeString(key);
        sanitized[sanitizedKey] = sanitizeObject(obj[key], allowHtml);
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Middleware to sanitize request body, query, and params
 */
export const sanitizeInput = (options: { allowHtml?: boolean } = {}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const { allowHtml = false } = options;

      // Sanitize body
      if (req.body) {
        req.body = sanitizeObject(req.body, allowHtml);
      }

      // Sanitize query params
      if (req.query) {
        req.query = sanitizeObject(req.query, false); // Never allow HTML in query params
      }

      // Sanitize URL params
      if (req.params) {
        req.params = sanitizeObject(req.params, false);
      }

      next();
    } catch (error) {
      logger.error('Error in sanitization middleware:', error);
      res.status(500).json({
        success: false,
        message: 'Input sanitization error',
      });
    }
  };
};

/**
 * Middleware to detect and block injection attacks
 */
export const detectInjection = (req: Request, res: Response, next: NextFunction) => {
  try {
    const checkValue = (value: any, path: string): boolean => {
      if (typeof value === 'string') {
        if (hasSqlInjection(value)) {
          logger.warn(`SQL injection attempt detected in ${path}: ${value.substring(0, 100)}`);
          return true;
        }
        if (hasXss(value)) {
          logger.warn(`XSS attempt detected in ${path}: ${value.substring(0, 100)}`);
          return true;
        }
        if (hasCommandInjection(value)) {
          logger.warn(`Command injection attempt detected in ${path}: ${value.substring(0, 100)}`);
          return true;
        }
      } else if (typeof value === 'object' && value !== null) {
        for (const key in value) {
          if (checkValue(value[key], `${path}.${key}`)) {
            return true;
          }
        }
      }
      return false;
    };

    // Check body
    if (req.body && checkValue(req.body, 'body')) {
      return res.status(400).json({
        success: false,
        message: 'Potential security threat detected in request',
      });
    }

    // Check query
    if (req.query && checkValue(req.query, 'query')) {
      return res.status(400).json({
        success: false,
        message: 'Potential security threat detected in request',
      });
    }

    // Check params
    if (req.params && checkValue(req.params, 'params')) {
      return res.status(400).json({
        success: false,
        message: 'Potential security threat detected in request',
      });
    }

    next();
  } catch (error) {
    logger.error('Error in injection detection middleware:', error);
    res.status(500).json({
      success: false,
      message: 'Security validation error',
    });
  }
};

/**
 * Middleware to validate content type
 */
export const validateContentType = (allowedTypes: string[] = ['application/json']) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip validation for GET requests (no body expected)
    if (req.method === 'GET' || req.method === 'DELETE') {
      return next();
    }

    const contentType = req.headers['content-type'];

    if (!contentType) {
      return res.status(400).json({
        success: false,
        message: 'Content-Type header is required',
      });
    }

    const isAllowed = allowedTypes.some((type) => contentType.includes(type));

    if (!isAllowed) {
      return res.status(415).json({
        success: false,
        message: `Unsupported Media Type. Allowed types: ${allowedTypes.join(', ')}`,
      });
    }

    next();
  };
};

/**
 * Middleware to limit request body size
 */
export const limitBodySize = (maxSizeBytes: number = 1024 * 1024) => {
  return (req: Request, res: Response, next: NextFunction) => {
    let bodySize = 0;

    req.on('data', (chunk) => {
      bodySize += chunk.length;
      if (bodySize > maxSizeBytes) {
        req.pause();
        res.status(413).json({
          success: false,
          message: 'Request body too large',
        });
      }
    });

    next();
  };
};

/**
 * Middleware to validate email format
 */
export const validateEmail = (field: string = 'email') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const email = req.body[field];

    if (!email) {
      return res.status(400).json({
        success: false,
        message: `${field} is required`,
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
    }

    // Check for suspicious patterns in email
    const suspiciousPatterns = [/<script/gi, /javascript:/gi, /[;&|`$()]/g];

    if (suspiciousPatterns.some((pattern) => pattern.test(email))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
    }

    next();
  };
};

/**
 * Middleware to validate UUID format
 */
export const validateUuid = (
  field: string = 'id',
  location: 'params' | 'body' | 'query' = 'params'
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const value = req[location][field];

    if (!value) {
      return res.status(400).json({
        success: false,
        message: `${field} is required`,
      });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${field} format`,
      });
    }

    next();
  };
};

export default {
  sanitizeInput,
  detectInjection,
  validateContentType,
  limitBodySize,
  validateEmail,
  validateUuid,
};
