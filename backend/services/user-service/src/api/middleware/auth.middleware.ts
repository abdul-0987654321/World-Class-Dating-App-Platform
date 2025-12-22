import { Request, Response, NextFunction } from 'express';
import jwtUtils from '../../utils/jwt';
import logger from '../../utils/logger';
import { UserRepository } from '../../domain/repositories/user.repository';

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
    req.correlationId = req.headers['x-correlation-id'] as string || generateCorrelationId();
    res.setHeader('X-Correlation-ID', req.correlationId);

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
        correlationId: req.correlationId,
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const payload = jwtUtils.verifyAccessToken(token);

      // SECURITY: Check user status in database (banned check)
      try {
        const user = await userRepository.findById(payload.userId);

        if (!user) {
          logger.warn(`User not found for token: ${payload.userId}`, { correlationId: req.correlationId });
          return res.status(401).json({
            success: false,
            message: 'User not found',
            correlationId: req.correlationId,
          });
        }

        // SECURITY: Check if user is banned
        if (!user.is_active) {
          logger.warn(`Banned user attempted access: ${payload.userId}`, { correlationId: req.correlationId });
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
        };
      } catch (dbError) {
        // If database check fails, log but still allow request (fail open for availability)
        // In production, consider fail-closed approach
        logger.error('Database check failed during auth', { error: dbError, correlationId: req.correlationId });
        req.user = payload;
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
      logger.warn(`Role access denied: user ${req.user.userId} with role ${userRole} tried to access resource requiring ${allowedRoles.join(', ')}`, {
        correlationId: req.correlationId,
      });
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
    // First authenticate the user
    await authenticate(req, res, () => {});

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
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
    });
  }
};

/**
 * RBAC: Require moderator role (includes admin)
 */
export const requireModerator = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // First authenticate the user
    await authenticate(req, res, () => {});

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
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
    });
  }
};

/**
 * RBAC: Require support role (includes moderator and admin)
 */
export const requireSupport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // First authenticate the user
    await authenticate(req, res, () => {});

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
      logger.warn(`User ${req.user.userId} with role ${req.user.role} attempted to access support resource`, {
        correlationId: req.correlationId,
      });
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
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
    });
  }
};
