/**
 * CSRF Protection Middleware
 * Cross-Site Request Forgery protection
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { getRedisClient } from '../config/redis.config';
import { logger } from '../utils/logger';

const CSRF_TOKEN_LENGTH = 32;
const CSRF_TOKEN_EXPIRY = 3600; // 1 hour

export class CSRFProtection {
  /**
   * Generate CSRF token
   */
  static async generateToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');

    // Store token in Redis
    const redis = getRedisClient();
    await redis.setex(`csrf:${userId}`, CSRF_TOKEN_EXPIRY, token);

    return token;
  }

  /**
   * Verify CSRF token
   */
  static async verifyToken(userId: string, token: string): Promise<boolean> {
    if (!token || typeof token !== 'string') {
      return false;
    }

    const redis = getRedisClient();
    const storedToken = await redis.get(`csrf:${userId}`);

    if (!storedToken) {
      return false;
    }

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(storedToken)
    );
  }

  /**
   * Middleware to protect routes
   */
  static protect() {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Skip CSRF check for GET, HEAD, OPTIONS
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
      }

      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Authentication required',
            code: 'NO_AUTH',
          },
        });
      }

      // Get token from header or body
      const token =
        req.headers['x-csrf-token'] ||
        req.headers['csrf-token'] ||
        req.body._csrf;

      if (!token) {
        logger.warn('CSRF token missing', {
          userId: user.userId,
          url: req.originalUrl,
        });

        return res.status(403).json({
          success: false,
          error: {
            message: 'CSRF token missing',
            code: 'CSRF_MISSING',
          },
        });
      }

      // Verify token
      const isValid = await CSRFProtection.verifyToken(user.userId, String(token));

      if (!isValid) {
        logger.warn('Invalid CSRF token', {
          userId: user.userId,
          url: req.originalUrl,
        });

        return res.status(403).json({
          success: false,
          error: {
            message: 'Invalid CSRF token',
            code: 'CSRF_INVALID',
          },
        });
      }

      next();
    };
  }

  /**
   * Endpoint to get CSRF token
   */
  static async getTokenEndpoint(req: Request, res: Response) {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'NO_AUTH',
        },
      });
    }

    try {
      const token = await CSRFProtection.generateToken(user.userId);

      res.json({
        success: true,
        data: {
          csrfToken: token,
        },
      });
    } catch (error) {
      logger.error('Error generating CSRF token:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to generate CSRF token',
          code: 'CSRF_ERROR',
        },
      });
    }
  }
}
