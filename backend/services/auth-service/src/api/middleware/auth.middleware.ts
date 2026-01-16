import { Request, Response, NextFunction } from 'express';

import { config } from '../../config';
import { userRepository } from '../../domain/repositories/user.repository';
import redisCache from '../../infrastructure/cache/redis';
import jwtUtils from '../../utils/jwt';
import logger from '../../utils/logger';

/**
 * User roles for RBAC
 */
export type UserRole = 'user' | 'moderator' | 'admin' | 'support';

/**
 * User status types
 */
export type UserStatus = 'active' | 'banned' | 'suspended' | 'pending_verification';

export interface AuthUser {
  id: string;
  userId: string;
  email: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
  correlationId?: string;
}

/**
 * Generate correlation ID for request tracing
 */
const generateCorrelationId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};

/**
 * JWT authentication middleware
 * Validates access tokens, checks user status (banned check), and attaches user info to request
 * SECURITY: Includes banned user check - returns 403 if user is banned
 * SECURITY: Reads tokens from httpOnly cookies first (XSS protection), falls back to Authorization header
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    // Generate correlation ID for request tracing
    req.correlationId = (req.headers['x-correlation-id'] as string) || generateCorrelationId();
    res.setHeader('X-Correlation-ID', req.correlationId);

    // SECURITY: Check httpOnly cookie first (preferred, XSS-safe), then fall back to Authorization header
    let token: string | undefined;

    // Try to get token from httpOnly cookie first
    if (req.cookies?.access_token) {
      token = req.cookies.access_token;
    } else {
      // Fallback to Authorization header for backwards compatibility and mobile apps
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
        correlationId: req.correlationId,
      });
    }

    // Check if token is blacklisted
    const isBlacklisted = await redisCache.isTokenBlacklisted(token);
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        error: 'Token has been revoked',
        correlationId: req.correlationId,
      });
    }

    try {
      const payload = jwtUtils.verifyAccessToken(token) as {
        userId: string;
        email: string;
        role?: UserRole;
      };

      // SECURITY: Check user status in database (banned check)
      const user = await userRepository.findById(payload.userId);

      if (!user) {
        logger.warn(`User not found for token: ${payload.userId}`, {
          correlationId: req.correlationId,
        });
        return res.status(401).json({
          success: false,
          error: 'User not found',
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
          error: 'Account has been suspended or banned. Contact support for assistance.',
          code: 'ACCOUNT_BANNED',
          correlationId: req.correlationId,
        });
      }

      req.user = {
        id: payload.userId,
        userId: payload.userId,
        email: payload.email,
        role: payload.role || 'user',
        status: user.is_active ? 'active' : 'banned',
      };
      return next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        correlationId: req.correlationId,
      });
    }
  } catch (error) {
    logger.error('Authentication error', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication error',
    });
  }
};

/**
 * RBAC: Require specific role(s) middleware
 * SECURITY: Enforces role-based access control
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        correlationId: req.correlationId,
      });
    }

    const userRole = req.user.role || 'user';

    // Admin has access to everything
    if (userRole === 'admin') {
      return next();
    }

    // Check if user has one of the allowed roles
    if (!allowedRoles.includes(userRole)) {
      logger.warn(
        `Role access denied: user ${req.user.userId} with role ${userRole} tried to access resource requiring ${allowedRoles.join(', ')}`,
        {
          correlationId: req.correlationId,
        }
      );
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
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
export const requireAdmin = requireRole('admin');

/**
 * RBAC: Require moderator role (includes admin)
 */
export const requireModerator = requireRole('moderator', 'admin');

/**
 * RBAC: Require support role (includes moderator and admin)
 */
export const requireSupport = requireRole('support', 'moderator', 'admin');

/**
 * Internal service authentication middleware
 * For service-to-service communication
 */
export const internalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const serviceKey = req.headers['x-service-key'];

    if (!serviceKey || serviceKey !== config.internalServiceKey) {
      return res.status(401).json({
        success: false,
        error: 'Invalid service key',
      });
    }

    return next();
  } catch (error) {
    logger.error('Internal auth error', error);
    return res.status(500).json({
      success: false,
      error: 'Internal authentication error',
    });
  }
};
