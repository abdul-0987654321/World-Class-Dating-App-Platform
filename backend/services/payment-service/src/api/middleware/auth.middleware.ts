/**
 * Authentication Middleware for Payment Service
 *
 * SECURITY: This middleware validates JWT tokens and extracts user identity.
 * The userId attached to the request MUST come from the verified JWT token,
 * never from the request body, to prevent user impersonation attacks.
 */

import { createLogger } from '@flamoral/backend-shared';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

const logger = createLogger('payment-auth-middleware');

/**
 * Authenticated user data extracted from JWT token
 */
export interface AuthUser {
  id: string;
  userId: string;
  email: string;
}

/**
 * Extended Request interface with authenticated user data
 */
export interface AuthRequest extends Request {
  user?: AuthUser;
  userId?: string; // For backward compatibility with existing code
}

/**
 * JWT Authentication Middleware
 *
 * Validates the JWT token from the Authorization header and attaches
 * the authenticated user to the request object.
 *
 * SECURITY: This middleware MUST be applied to all payment endpoints
 * to ensure user identity comes from a verified JWT token.
 */
export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Bearer token is required in Authorization header',
      });
      return;
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_ACCESS_SECRET;

    if (!secret) {
      logger.error('[PaymentAuth] JWT_ACCESS_SECRET not configured');
      res.status(500).json({
        success: false,
        error: 'Server configuration error',
      });
      return;
    }

    try {
      // Verify and decode the JWT token
      const decoded = jwt.verify(token, secret) as {
        userId?: string;
        id?: string;
        sub?: string;
        email?: string;
      };

      // Extract user ID from various JWT structures
      const userId = decoded.userId || decoded.id || decoded.sub;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Invalid token',
          message: 'Token does not contain user identification',
        });
        return;
      }

      // Attach user data to request
      req.user = {
        id: userId,
        userId: userId,
        email: decoded.email || '',
      };

      // Also set userId for backward compatibility
      req.userId = userId;

      next();
    } catch (jwtError: any) {
      if (jwtError.name === 'TokenExpiredError') {
        res.status(401).json({
          success: false,
          error: 'Token expired',
          message: 'Authentication token has expired. Please log in again.',
        });
        return;
      }

      res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'The provided token is invalid',
      });
      return;
    }
  } catch (error) {
    logger.error('[PaymentAuth] Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
    return;
  }
};

// Export alias for convenience
export { authenticate as requireAuth };

/**
 * Admin Authorization Middleware
 *
 * Checks if the authenticated user has admin role.
 * Must be used after authenticate middleware.
 */
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'You must be authenticated to access this resource',
      });
      return;
    }

    // Check for admin role in JWT claims
    const userWithRole = req.user as AuthUser & { role?: string; roles?: string[] };
    const isAdmin =
      userWithRole.role === 'admin' ||
      userWithRole.roles?.includes('admin') ||
      userWithRole.roles?.includes('super_admin');

    if (!isAdmin) {
      logger.warn(`[PaymentAuth] Non-admin access attempt by user ${req.user.id}`);
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Admin access required',
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('[PaymentAuth] Admin authorization error:', error);
    res.status(500).json({
      success: false,
      error: 'Authorization failed',
    });
    return;
  }
};
