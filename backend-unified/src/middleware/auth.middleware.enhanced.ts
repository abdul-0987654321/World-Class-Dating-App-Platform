/**
 * Enhanced Authentication Middleware
 * With additional security features
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getRedisClient } from '../config/redis.config';
import { logger } from '../utils/logger';

interface JWTPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

// Track failed login attempts
const failedAttempts = new Map<string, { count: number; lastAttempt: number }>();
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

export class AuthMiddleware {
  /**
   * Verify JWT token with enhanced security
   */
  static async verifyToken(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Authentication required',
            code: 'NO_TOKEN',
          },
        });
      }

      // Check if token is blacklisted (revoked)
      const redis = getRedisClient();
      const isBlacklisted = await redis.get(`blacklist:${token}`);

      if (isBlacklisted) {
        logger.warn('Blacklisted token used', { token: token.substring(0, 20) });
        return res.status(401).json({
          success: false,
          error: {
            message: 'Token has been revoked',
            code: 'TOKEN_REVOKED',
          },
        });
      }

      // Verify token
      const secret = process.env.JWT_ACCESS_SECRET;
      if (!secret) {
        throw new Error('JWT secret not configured');
      }

      const decoded = jwt.verify(token, secret) as JWTPayload;

      // Check token age
      const tokenAge = Date.now() / 1000 - decoded.iat;
      const MAX_TOKEN_AGE = 24 * 60 * 60; // 24 hours

      if (tokenAge > MAX_TOKEN_AGE) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Token expired',
            code: 'TOKEN_EXPIRED',
          },
        });
      }

      // Check if user session exists in Redis
      const session = await redis.get(`session:${decoded.userId}`);
      if (!session) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Session expired',
            code: 'SESSION_EXPIRED',
          },
        });
      }

      req.user = decoded;
      next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('Invalid token', { error: error.message });
        return res.status(401).json({
          success: false,
          error: {
            message: 'Invalid token',
            code: 'INVALID_TOKEN',
          },
        });
      }

      logger.error('Auth middleware error:', error);
      return res.status(500).json({
        success: false,
        error: {
          message: 'Authentication error',
          code: 'AUTH_ERROR',
        },
      });
    }
  }

  /**
   * Rate limiting for authentication attempts
   */
  static checkAuthRateLimit(req: Request, res: Response, next: NextFunction) {
    const identifier = req.body.email || req.ip;

    const attempts = failedAttempts.get(identifier);

    if (attempts) {
      const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;

      // Check if locked out
      if (attempts.count >= MAX_ATTEMPTS && timeSinceLastAttempt < LOCKOUT_DURATION) {
        const remainingTime = Math.ceil((LOCKOUT_DURATION - timeSinceLastAttempt) / 1000 / 60);

        logger.warn('Account locked due to too many failed attempts', { identifier });

        return res.status(429).json({
          success: false,
          error: {
            message: `Too many failed attempts. Try again in ${remainingTime} minutes`,
            code: 'ACCOUNT_LOCKED',
          },
        });
      }

      // Reset if lockout period has passed
      if (timeSinceLastAttempt >= LOCKOUT_DURATION) {
        failedAttempts.delete(identifier);
      }
    }

    next();
  }

  /**
   * Record failed login attempt
   */
  static recordFailedAttempt(identifier: string) {
    const attempts = failedAttempts.get(identifier) || { count: 0, lastAttempt: 0 };

    attempts.count += 1;
    attempts.lastAttempt = Date.now();

    failedAttempts.set(identifier, attempts);

    logger.warn('Failed login attempt', { identifier, count: attempts.count });
  }

  /**
   * Clear failed attempts on successful login
   */
  static clearFailedAttempts(identifier: string) {
    failedAttempts.delete(identifier);
  }

  /**
   * Verify user owns the resource
   */
  static async verifyResourceOwnership(req: Request, res: Response, next: NextFunction) {
    const { user } = req;
    const resourceUserId = req.params.userId || req.body.userId;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'NO_AUTH',
        },
      });
    }

    if (user.userId !== resourceUserId) {
      logger.warn('Unauthorized resource access attempt', {
        requestingUser: user.userId,
        targetResource: resourceUserId,
      });

      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied',
          code: 'FORBIDDEN',
        },
      });
    }

    next();
  }

  /**
   * Blacklist (revoke) a token
   */
  static async revokeToken(token: string, expiresIn: number = 86400): Promise<void> {
    const redis = getRedisClient();
    await redis.setex(`blacklist:${token}`, expiresIn, '1');
    logger.info('Token revoked', { token: token.substring(0, 20) });
  }

  /**
   * Create secure session
   */
  static async createSession(userId: string, data: any): Promise<void> {
    const redis = getRedisClient();
    const sessionData = JSON.stringify({
      ...data,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    });

    await redis.setex(`session:${userId}`, 86400, sessionData); // 24 hours
    logger.info('Session created', { userId });
  }

  /**
   * Destroy session
   */
  static async destroySession(userId: string): Promise<void> {
    const redis = getRedisClient();
    await redis.del(`session:${userId}`);
    logger.info('Session destroyed', { userId });
  }

  /**
   * Check if email is verified
   */
  static async requireEmailVerification(req: Request, res: Response, next: NextFunction) {
    const { user } = req;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'NO_AUTH',
        },
      });
    }

    const redis = getRedisClient();
    const userData = await redis.get(`user:${user.userId}`);

    if (!userData) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        },
      });
    }

    const user Data = JSON.parse(userData);

    if (!userData.emailVerified) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Email verification required',
          code: 'EMAIL_NOT_VERIFIED',
        },
      });
    }

    next();
  }

  /**
   * Require specific permissions
   */
  static requirePermissions(...permissions: string[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const { user } = req;

      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Authentication required',
            code: 'NO_AUTH',
          },
        });
      }

      // Check user permissions (would normally come from database)
      const redis = getRedisClient();
      const userPermissions = await redis.get(`permissions:${user.userId}`);

      if (!userPermissions) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Insufficient permissions',
            code: 'FORBIDDEN',
          },
        });
      }

      const permissionsArray = JSON.parse(userPermissions);
      const hasAllPermissions = permissions.every(perm => permissionsArray.includes(perm));

      if (!hasAllPermissions) {
        logger.warn('Permission denied', {
          userId: user.userId,
          required: permissions,
          has: permissionsArray,
        });

        return res.status(403).json({
          success: false,
          error: {
            message: 'Insufficient permissions',
            code: 'FORBIDDEN',
          },
        });
      }

      next();
    };
  }
}
