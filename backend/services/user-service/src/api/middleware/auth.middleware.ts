import { Request, Response, NextFunction } from 'express';

import { UserRepository } from '../../domain/repositories/user.repository';
import jwtUtils from '../../utils/jwt';
import logger from '../../utils/logger';

// Import types to ensure they're loaded
import '../../types';

/**
 * User roles for RBAC - includes support role
 */
export type UserRole = 'user' | 'moderator' | 'admin' | 'support';

/**
 * User status types
 */
export type UserStatus = 'active' | 'banned' | 'suspended' | 'pending_verification';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    userId: string;
    email: string;
    role?: UserRole;
    status?: UserStatus;
    subscriptionTier?: string;
    subscriptionStatus?: string;
  };
  correlationId?: string;
}

// User repository for status checks
const userRepository = new UserRepository();

/**
 * Generate correlation ID for request tracing
 */
const generateCorrelationId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};

/**
 * JWT authentication middleware with banned user check
 * SECURITY: Checks user status and returns 403 if banned
 */
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Generate correlation ID for request tracing
    req.correlationId = (req.headers['x-correlation-id'] as string) || generateCorrelationId();
    res.setHeader('X-Correlation-ID', req.correlationId);

    const authHeader = req.headers.authorization;

    // Extract token from Authorization header or httpOnly cookie
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      // Fallback to httpOnly cookie set by auth-service
      const cookieHeader = req.headers.cookie;
      if (cookieHeader) {
        const match = cookieHeader.split(';').find(c => c.trim().startsWith('access_token='));
        if (match) {
          token = match.split('=').slice(1).join('=').trim();
        }
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
        correlationId: req.correlationId,
      });
    }

    try {
      const payload = jwtUtils.verifyAccessToken(token);

      // SECURITY: Check user status in database (banned check)
      try {
        const user = await userRepository.findById(payload.userId);

        if (!user) {
          logger.warn(`User not found for token: ${payload.userId}`, {
            correlationId: req.correlationId,
          });
          return res.status(401).json({
            success: false,
            message: 'User not found',
            correlationId: req.correlationId,
          });
        }

        // SECURITY: Check if user is banned
        if (!user.is_active) {
          logger.warn(`Banned user attempted access: ${payload.userId}`, {
            correlationId: req.correlationId,
          });
          return res.status(403).json({
            success: false,
            message: 'Account has been suspended or banned. Contact support for assistance.',
            code: 'ACCOUNT_BANNED',
            correlationId: req.correlationId,
          });
        }

        req.user = {
          ...payload,
          status: user.is_active ? 'active' : 'banned',
          // SECURITY: Use subscription tier from JWT token (set during login)
          // Falls back to 'free' if not present for safety
          subscriptionTier: payload.subscriptionTier || user.subscription_tier || 'free',
          subscriptionStatus: payload.subscriptionStatus || 'inactive',
        };
      } catch (dbError) {
        // SECURITY: Fail-closed approach - deny access if we can't verify user status
        // This prevents banned users from gaining access when database is temporarily unavailable
        logger.error('Database check failed during auth - denying access (fail-closed)', {
          error: dbError,
          userId: payload.userId,
          correlationId: req.correlationId,
        });
        return res.status(503).json({
          success: false,
          message: 'Service temporarily unavailable. Please try again.',
          code: 'SERVICE_UNAVAILABLE',
          correlationId: req.correlationId,
        });
      }

      return next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        correlationId: req.correlationId,
      });
    }
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
    });
  }
};

// Aliases for authenticate - commonly used in routes
export const requireAuth = authenticate;
export const authenticateToken = authenticate;
export const authMiddleware = authenticate;

/**
 * RBAC: Require specific role(s) middleware
 * SECURITY: Enforces role-based access control
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        correlationId: req.correlationId,
      });
    }

    const userRole = req.user.role || 'user';

    // Admin has access to everything
    if (userRole === 'admin') {
      return next();
    }

    // Check if user has one of the allowed roles
    if (!allowedRoles.includes(userRole as UserRole)) {
      logger.warn(
        `Role access denied: user ${req.user.userId} with role ${userRole} tried to access resource requiring ${allowedRoles.join(', ')}`,
        {
          correlationId: req.correlationId,
        }
      );
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        code: 'FORBIDDEN',
        correlationId: req.correlationId,
      });
    }

    return next();
  };
};

/**
 * RBAC: Require admin role
 */
export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // First authenticate the user - use a flag to detect if authenticate sent a response
    let authCompleted = false;
    await authenticate(req, res, () => { authCompleted = true; });

    // If authenticate already sent a response (401, 503, etc.), don't continue
    if (!authCompleted || res.headersSent) {
      return;
    }

    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        correlationId: req.correlationId,
      });
    }

    // Check if user has admin role
    if (req.user.role !== 'admin') {
      logger.warn(`Non-admin user ${req.user.userId} attempted to access admin resource`, {
        correlationId: req.correlationId,
      });
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
        code: 'FORBIDDEN',
        correlationId: req.correlationId,
      });
    }

    return next();
  } catch (error) {
    logger.error('Admin authentication error:', error);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Authentication error',
      });
    }
  }
};

/**
 * RBAC: Require moderator role (includes admin)
 */
export const requireModerator = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // First authenticate the user - use a flag to detect if authenticate sent a response
    let authCompleted = false;
    await authenticate(req, res, () => { authCompleted = true; });

    // If authenticate already sent a response (401, 503, etc.), don't continue
    if (!authCompleted || res.headersSent) {
      return;
    }

    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        correlationId: req.correlationId,
      });
    }

    // Check if user has moderator or admin role
    if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
      logger.warn(`Non-moderator user ${req.user.userId} attempted to access moderator resource`, {
        correlationId: req.correlationId,
      });
      return res.status(403).json({
        success: false,
        message: 'Moderator or admin access required',
        code: 'FORBIDDEN',
        correlationId: req.correlationId,
      });
    }

    return next();
  } catch (error) {
    logger.error('Moderator authentication error:', error);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Authentication error',
      });
    }
  }
};

/**
 * RBAC: Require support role (includes moderator and admin)
 */
export const requireSupport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // First authenticate the user - use a flag to detect if authenticate sent a response
    let authCompleted = false;
    await authenticate(req, res, () => { authCompleted = true; });

    // If authenticate already sent a response (401, 503, etc.), don't continue
    if (!authCompleted || res.headersSent) {
      return;
    }

    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        correlationId: req.correlationId,
      });
    }

    // Check if user has support, moderator, or admin role
    const allowedRoles: UserRole[] = ['support', 'moderator', 'admin'];
    if (!allowedRoles.includes(req.user.role as UserRole)) {
      logger.warn(
        `User ${req.user.userId} with role ${req.user.role} attempted to access support resource`,
        {
          correlationId: req.correlationId,
        }
      );
      return res.status(403).json({
        success: false,
        message: 'Support, moderator, or admin access required',
        code: 'FORBIDDEN',
        correlationId: req.correlationId,
      });
    }

    return next();
  } catch (error) {
    logger.error('Support authentication error:', error);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Authentication error',
      });
    }
  }
};
