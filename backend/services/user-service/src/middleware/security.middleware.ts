import crypto from 'crypto';

import { Request, Response, NextFunction } from 'express';

import logger from '../utils/logger';

// // Extend Express Request type to include session
// declare module 'express-serve-static-core' {
//   interface Request {
//     session?: {
//       csrfToken?: string;
//     } & Record<string, any>;
//   }
// }

/**
 * Input Sanitization Middleware
 * Prevents XSS, SQL injection, and other injection attacks
 */
export class SecurityMiddleware {
  /**
   * Sanitize HTML to prevent XSS
   */
  static sanitizeHTML(input: string): string {
    if (!input) return input;

    // Replace dangerous characters
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Sanitize SQL input (use parameterized queries instead, this is backup)
   */
  static sanitizeSQL(input: string): string {
    if (!input) return input;

    // Remove SQL injection patterns
    const dangerous = [
      '--',
      ';--',
      '/*',
      '*/',
      '@@',
      '@',
      'char',
      'nchar',
      'varchar',
      'nvarchar',
      'alter',
      'begin',
      'cast',
      'create',
      'cursor',
      'declare',
      'delete',
      'drop',
      'end',
      'exec',
      'execute',
      'fetch',
      'insert',
      'kill',
      'select',
      'sys',
      'sysobjects',
      'syscolumns',
      'table',
      'update',
    ];

    let sanitized = input;
    dangerous.forEach((pattern) => {
      const regex = new RegExp(pattern, 'gi');
      sanitized = sanitized.replace(regex, '');
    });

    return sanitized;
  }

  /**
   * Validate and sanitize request body
   */
  static sanitizeBody(req: Request, res: Response, next: NextFunction): void {
    if (req.body && typeof req.body === 'object') {
      req.body = SecurityMiddleware.sanitizeObject(req.body);
    }
    next();
  }

  /**
   * Recursively sanitize object properties
   */
  private static sanitizeObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => SecurityMiddleware.sanitizeObject(item));
    }

    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];

        if (typeof value === 'string') {
          // Sanitize strings
          sanitized[key] = SecurityMiddleware.sanitizeHTML(value);
        } else if (typeof value === 'object') {
          // Recursively sanitize nested objects
          sanitized[key] = SecurityMiddleware.sanitizeObject(value);
        } else {
          sanitized[key] = value;
        }
      }
    }

    return sanitized;
  }

  /**
   * CSRF Token Generation and Validation
   */
  static generateCSRFToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * CSRF Protection Middleware
   */
  static csrfProtection(req: Request, res: Response, next: NextFunction): void | Response {
    // Skip CSRF for GET, HEAD, OPTIONS
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    // Skip CSRF for API calls with valid JWT (handled by auth middleware)
    if (req.headers.authorization?.startsWith('Bearer ')) {
      return next();
    }

    const csrfToken = req.headers['x-csrf-token'] as string;
    const sessionToken = req.session?.csrfToken;

    if (!csrfToken || !sessionToken || csrfToken !== sessionToken) {
      logger.warn(`CSRF token validation failed for ${req.ip}`);
      return res.status(403).json({
        success: false,
        message: 'Invalid CSRF token',
      });
    }

    next();
  }

  /**
   * Set CSRF token in session
   */
  static setCSRFToken(req: Request, res: Response, next: NextFunction): void {
    if (!req.session?.csrfToken) {
      req.session.csrfToken = SecurityMiddleware.generateCSRFToken();
    }

    // Send token in response header
    res.setHeader('X-CSRF-Token', req.session.csrfToken);

    next();
  }

  /**
   * Validate file upload security
   */
  static validateFileUpload(req: Request, res: Response, next: NextFunction): void | Response {
    if (!req.file && !req.files) {
      return next();
    }

    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/quicktime',
    ];

    const maxFileSize = 10 * 1024 * 1024; // 10MB

    const files = req.files
      ? Array.isArray(req.files)
        ? req.files
        : Object.values(req.files).flat()
      : req.file
        ? [req.file]
        : [];

    for (const file of files) {
      // Check mime type
      if (!allowedMimeTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid file type. Only images and videos are allowed.',
        });
      }

      // Check file size
      if (file.size > maxFileSize) {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 10MB.',
        });
      }

      // Check file extension matches mime type
      const ext = file.originalname.split('.').pop()?.toLowerCase();
      const mimeExt = file.mimetype.split('/')[1];

      if (ext !== mimeExt && !(ext === 'jpg' && mimeExt === 'jpeg')) {
        return res.status(400).json({
          success: false,
          message: 'File extension does not match file type.',
        });
      }
    }

    next();
  }

  /**
   * Content Security Policy headers
   */
  static setSecurityHeaders(req: Request, res: Response, next: NextFunction): void {
    // Content Security Policy
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "font-src 'self' data:; " +
        "connect-src 'self' wss: https:; " +
        "frame-ancestors 'none';"
    );

    // XSS Protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions Policy
    res.setHeader('Permissions-Policy', 'geolocation=(self), microphone=(), camera=()');

    // HSTS (HTTP Strict Transport Security)
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

    next();
  }

  /**
   * Validate request origin (CORS bypass prevention)
   */
  static validateOrigin(allowedOrigins: string[]) {
    return (req: Request, res: Response, next: NextFunction): void | Response => {
      const origin = req.headers.origin || req.headers.referer;

      if (!origin) {
        // Allow requests without origin (mobile apps, Postman, etc.)
        return next();
      }

      const isAllowed = allowedOrigins.some((allowed) => {
        if (allowed === '*') return true;
        return origin.startsWith(allowed);
      });

      if (!isAllowed) {
        logger.warn(`Blocked request from unauthorized origin: ${origin}`);
        return res.status(403).json({
          success: false,
          message: 'Origin not allowed',
        });
      }

      next();
    };
  }

  /**
   * Detect and block common attack patterns
   */
  static detectAttackPatterns(req: Request, res: Response, next: NextFunction): void | Response {
    const suspiciousPatterns = [
      // SQL Injection
      /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
      /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
      /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
      // XSS
      /((\%3C)|<)((\%2F)|\/)*[a-z0-9\%]+((\%3E)|>)/i,
      /((\%3C)|<)((\%69)|i|(\%49))((\%6D)|m|(\%4D))((\%67)|g|(\%47))[^\n]+((\%3E)|>)/i,
      /((\%3C)|<)[^\n]+((\%3E)|>)/i,
      // Path Traversal
      /\.\.[\/\\]/i,
      // Command Injection
      /[;&|`$()]/i,
      // NoSQL Injection
      /(\$gt|\$lt|\$ne|\$in|\$nin|\$and|\$or|\$not)/i,
    ];

    const checkString = JSON.stringify({
      url: req.url,
      query: req.query,
      body: req.body,
    });

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(checkString)) {
        logger.warn(`Attack pattern detected from ${req.ip}: ${req.url}`);
        return res.status(400).json({
          success: false,
          message: 'Invalid request',
        });
      }
    }

    next();
  }

  /**
   * Prevent parameter pollution
   */
  static preventParameterPollution(
    req: Request,
    res: Response,
    next: NextFunction
  ): void | Response {
    // Check for duplicate parameters
    const params = { ...req.query, ...req.body };

    for (const key in params) {
      if (Array.isArray(params[key]) && params[key].length > 10) {
        logger.warn(`Parameter pollution detected: ${key} has ${params[key].length} values`);
        return res.status(400).json({
          success: false,
          message: 'Too many parameter values',
        });
      }
    }

    next();
  }

  /**
   * Request size limiter
   */
  static limitRequestSize(maxSize: number = 10 * 1024 * 1024) {
    return (req: Request, res: Response, next: NextFunction): void | Response => {
      const contentLength = parseInt(req.headers['content-length'] || '0');

      if (contentLength > maxSize) {
        logger.warn(`Request size limit exceeded: ${contentLength} bytes from ${req.ip}`);
        return res.status(413).json({
          success: false,
          message: 'Request entity too large',
        });
      }

      next();
    };
  }

  /**
   * Validate user agent
   */
  static validateUserAgent(req: Request, res: Response, next: NextFunction): void | Response {
    const userAgent = req.headers['user-agent'];

    if (!userAgent) {
      logger.warn(`Request without user agent from ${req.ip}`);
      // Allow but log - some legitimate clients may not send user agent
    }

    // Block known bad bots
    const blockedBots = ['masscan', 'nmap', 'nikto', 'sqlmap', 'zgrab'];

    if (userAgent && blockedBots.some((bot) => userAgent.toLowerCase().includes(bot))) {
      logger.warn(`Blocked request from suspicious user agent: ${userAgent}`);
      return res.status(403).json({
        success: false,
        message: 'Forbidden',
      });
    }

    next();
  }

  /**
   * IP blacklist checking
   */
  static checkIPBlacklist(blacklistedIPs: Set<string>) {
    return (req: Request, res: Response, next: NextFunction): void | Response => {
      const clientIP = req.ip || req.socket.remoteAddress;

      if (clientIP && blacklistedIPs.has(clientIP)) {
        logger.warn(`Blocked request from blacklisted IP: ${clientIP}`);
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      next();
    };
  }

  /**
   * Timing attack prevention (constant time comparison)
   */
  static constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);

    return crypto.timingSafeEqual(bufA, bufB);
  }

  /**
   * Prevent timing attacks on authentication
   */
  static preventTimingAttack(req: Request, res: Response, next: NextFunction): void {
    // Add random delay to authentication endpoints
    const delay = Math.floor(Math.random() * 100);
    setTimeout(next, delay);
  }
}

// Export middleware functions
export const sanitizeBody = SecurityMiddleware.sanitizeBody;
export const csrfProtection = SecurityMiddleware.csrfProtection;
export const setCSRFToken = SecurityMiddleware.setCSRFToken;
export const validateFileUpload = SecurityMiddleware.validateFileUpload;
export const setSecurityHeaders = SecurityMiddleware.setSecurityHeaders;
export const detectAttackPatterns = SecurityMiddleware.detectAttackPatterns;
export const preventParameterPollution = SecurityMiddleware.preventParameterPollution;
export const validateUserAgent = SecurityMiddleware.validateUserAgent;
export const preventTimingAttack = SecurityMiddleware.preventTimingAttack;
