import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import logger from '../../utils/logger';

/**
 * CSRF Protection Middleware
 * Implements token-based CSRF protection
 */

interface CsrfOptions {
  cookieName?: string;
  headerName?: string;
  tokenLength?: number;
  excludePaths?: string[];
  secureCookie?: boolean;
}

// Store for CSRF tokens (in production, use Redis)
const tokenStore = new Map<string, { token: string; expiresAt: number }>();

/**
 * Generate CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create CSRF middleware
 */
export function csrfProtection(options: CsrfOptions = {}) {
  const {
    cookieName = 'csrf-token',
    headerName = 'x-csrf-token',
    tokenLength = 64,
    excludePaths = [],
    secureCookie = process.env.NODE_ENV === 'production',
  } = options;

  return {
    /**
     * Generate and set CSRF token
     */
    generateToken: (req: Request, res: Response, next: NextFunction) => {
      try {
        const token = generateCsrfToken();
        const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

        // Store token with session
        if (req.user?.userId) {
          tokenStore.set(req.user.userId, { token, expiresAt });
        }

        // Set cookie
        res.cookie(cookieName, token, {
          httpOnly: true,
          secure: secureCookie,
          sameSite: 'strict',
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
        });

        // Also send in response for client to use in headers
        res.locals.csrfToken = token;

        next();
      } catch (error) {
        logger.error('Error generating CSRF token:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to generate CSRF token',
        });
      }
    },

    /**
     * Validate CSRF token
     */
    validateToken: (req: Request, res: Response, next: NextFunction) => {
      try {
        // Skip validation for safe methods
        if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
          return next();
        }

        // Skip validation for excluded paths
        if (excludePaths.some(path => req.path.startsWith(path))) {
          return next();
        }

        // Get token from header or body
        const token = req.headers[headerName] as string || req.body?._csrf;

        if (!token) {
          logger.warn('CSRF token missing from request');
          return res.status(403).json({
            success: false,
            message: 'CSRF token missing',
          });
        }

        // Validate token
        if (!req.user?.userId) {
          logger.warn('No user session found for CSRF validation');
          return res.status(403).json({
            success: false,
            message: 'Invalid session',
          });
        }

        const storedToken = tokenStore.get(req.user.userId);

        if (!storedToken) {
          logger.warn('CSRF token not found in store');
          return res.status(403).json({
            success: false,
            message: 'Invalid CSRF token',
          });
        }

        // Check if token expired
        if (Date.now() > storedToken.expiresAt) {
          tokenStore.delete(req.user.userId);
          logger.warn('CSRF token expired');
          return res.status(403).json({
            success: false,
            message: 'CSRF token expired',
          });
        }

        // Validate token matches
        if (token !== storedToken.token) {
          logger.warn('CSRF token mismatch');
          return res.status(403).json({
            success: false,
            message: 'Invalid CSRF token',
          });
        }

        next();
      } catch (error) {
        logger.error('Error validating CSRF token:', error);
        res.status(500).json({
          success: false,
          message: 'CSRF validation error',
        });
      }
    },

    /**
     * Clear CSRF token
     */
    clearToken: (req: Request, res: Response, next: NextFunction) => {
      try {
        if (req.user?.userId) {
          tokenStore.delete(req.user.userId);
        }
        res.clearCookie(cookieName);
        next();
      } catch (error) {
        logger.error('Error clearing CSRF token:', error);
        next();
      }
    },
  };
}

/**
 * Double-submit cookie pattern
 * Alternative CSRF protection method
 */
export function doubleSubmitCookie(options: CsrfOptions = {}) {
  const {
    cookieName = 'csrf-token',
    headerName = 'x-csrf-token',
    secureCookie = process.env.NODE_ENV === 'production',
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip validation for safe methods
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        // Generate and set token for GET requests
        if (!req.cookies[cookieName]) {
          const token = generateCsrfToken();
          res.cookie(cookieName, token, {
            httpOnly: false, // Must be accessible to JavaScript for double-submit
            secure: secureCookie,
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000,
          });
        }
        return next();
      }

      // Validate token for state-changing methods
      const cookieToken = req.cookies[cookieName];
      const headerToken = req.headers[headerName] as string;

      if (!cookieToken || !headerToken) {
        logger.warn('CSRF tokens missing');
        return res.status(403).json({
          success: false,
          message: 'CSRF protection failed',
        });
      }

      if (cookieToken !== headerToken) {
        logger.warn('CSRF token mismatch');
        return res.status(403).json({
          success: false,
          message: 'CSRF protection failed',
        });
      }

      next();
    } catch (error) {
      logger.error('Error in CSRF double-submit:', error);
      res.status(500).json({
        success: false,
        message: 'CSRF validation error',
      });
    }
  };
}

/**
 * Clean up expired tokens periodically
 */
export function cleanupExpiredTokens(): void {
  const now = Date.now();
  for (const [userId, data] of tokenStore.entries()) {
    if (now > data.expiresAt) {
      tokenStore.delete(userId);
    }
  }
}

// Clean up every hour
setInterval(cleanupExpiredTokens, 60 * 60 * 1000);

export default {
  csrfProtection,
  doubleSubmitCookie,
  generateCsrfToken,
  cleanupExpiredTokens,
};
