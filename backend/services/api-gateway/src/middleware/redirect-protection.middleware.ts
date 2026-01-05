import { Request, Response, NextFunction } from 'express';

import logger from '../utils/logger';

/**
 * List of allowed redirect domains
 * Only these domains are permitted for redirects
 */
const ALLOWED_REDIRECT_DOMAINS = [
  'localhost',
  '127.0.0.1',
  'flamoral.com',
  'www.flamoral.com',
  'app.flamoral.com',
  'api.flamoral.com',
];

/**
 * Allowed redirect paths within the application
 */
const ALLOWED_REDIRECT_PATHS = [
  '/login',
  '/register',
  '/profile',
  '/dashboard',
  '/matches',
  '/messages',
  '/settings',
  '/verify-email',
  '/reset-password',
];

class RedirectProtectionService {
  /**
   * Validate if a URL is safe for redirection
   */
  isValidRedirectUrl(url: string): boolean {
    if (!url) {
      return false;
    }

    try {
      // Check if it's a relative path
      if (url.startsWith('/')) {
        // Validate relative path
        return this.isAllowedRelativePath(url);
      }

      // Parse absolute URL
      const parsedUrl = new URL(url);

      // Check protocol (only allow http/https)
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        logger.warn('Invalid redirect protocol', {
          url,
          protocol: parsedUrl.protocol,
        });
        return false;
      }

      // Check if domain is in whitelist
      const hostname = parsedUrl.hostname.toLowerCase();
      const isAllowedDomain = ALLOWED_REDIRECT_DOMAINS.some((domain) => {
        return hostname === domain || hostname.endsWith(`.${domain}`);
      });

      if (!isAllowedDomain) {
        logger.warn('Redirect to unauthorized domain blocked', {
          url,
          hostname,
        });
        return false;
      }

      return true;
    } catch (error) {
      // Invalid URL format
      logger.warn('Invalid redirect URL format', {
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Check if relative path is allowed
   */
  private isAllowedRelativePath(path: string): boolean {
    // Remove query string and hash
    const cleanPath = path.split('?')[0].split('#')[0];

    // Check for path traversal attempts
    if (cleanPath.includes('..') || cleanPath.includes('//')) {
      logger.warn('Path traversal attempt detected', { path });
      return false;
    }

    // Check if path starts with an allowed prefix
    const isAllowed = ALLOWED_REDIRECT_PATHS.some((allowedPath) =>
      cleanPath.startsWith(allowedPath)
    );

    if (!isAllowed) {
      logger.warn('Redirect to unauthorized path blocked', { path: cleanPath });
    }

    return isAllowed;
  }

  /**
   * Sanitize redirect URL
   * Returns the URL if safe, otherwise returns default safe URL
   */
  sanitizeRedirectUrl(url: string | undefined, defaultUrl: string = '/'): string {
    if (!url) {
      return defaultUrl;
    }

    if (this.isValidRedirectUrl(url)) {
      return url;
    }

    return defaultUrl;
  }

  /**
   * Get safe redirect URL from query parameter
   */
  getSafeRedirectFromQuery(req: Request, paramName: string = 'redirect'): string {
    const redirectUrl = req.query[paramName] as string;
    return this.sanitizeRedirectUrl(redirectUrl);
  }

  /**
   * Validate and sanitize multiple redirect parameters
   */
  validateRedirectParams(params: { [key: string]: string }): { [key: string]: string } {
    const sanitized: { [key: string]: string } = {};

    for (const [key, value] of Object.entries(params)) {
      if (value && typeof value === 'string') {
        sanitized[key] = this.sanitizeRedirectUrl(value);
      }
    }

    return sanitized;
  }

  /**
   * Check if URL contains potential XSS vectors
   */
  containsXSSVectors(url: string): boolean {
    const xssPatterns = [
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
      /on\w+=/i, // Event handlers like onclick=
      /<script/i,
      /%3c%73%63%72%69%70%74/i, // URL encoded <script
    ];

    for (const pattern of xssPatterns) {
      if (pattern.test(url)) {
        logger.warn('XSS vector detected in redirect URL', { url });
        return true;
      }
    }

    return false;
  }
}

export const redirectProtectionService = new RedirectProtectionService();

/**
 * Middleware to protect against open redirect vulnerabilities
 */
export const protectAgainstOpenRedirect = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Check common redirect parameters
    const redirectParams = ['redirect', 'return', 'returnUrl', 'next', 'url', 'callback'];

    for (const param of redirectParams) {
      const value = req.query[param] as string;

      if (value) {
        // Check for XSS vectors
        if (redirectProtectionService.containsXSSVectors(value)) {
          logger.warn('XSS attempt blocked in redirect parameter', {
            param,
            value,
            ip: req.ip,
          });

          res.status(400).json({
            success: false,
            error: 'Invalid redirect URL',
          });
          return;
        }

        // Validate redirect URL
        if (!redirectProtectionService.isValidRedirectUrl(value)) {
          logger.warn('Invalid redirect URL blocked', {
            param,
            value,
            ip: req.ip,
          });

          // Sanitize and replace with safe URL
          req.query[param] = redirectProtectionService.sanitizeRedirectUrl(value);
        }
      }
    }

    next();
  } catch (error) {
    logger.error('Error in redirect protection middleware', error);
    next(error);
  }
};

/**
 * Helper function to perform safe redirect
 */
export const safeRedirect = (res: Response, url: string, defaultUrl: string = '/'): void => {
  const safeUrl = redirectProtectionService.sanitizeRedirectUrl(url, defaultUrl);

  // Use 302 (temporary) redirect for security
  res.redirect(302, safeUrl);
};

export default redirectProtectionService;
