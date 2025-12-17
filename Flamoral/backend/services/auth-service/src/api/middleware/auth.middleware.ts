import { Request, Response, NextFunction } from 'express';
import jwtUtils from '../../utils/jwt';
import redisCache from '../../infrastructure/cache/redis';
import logger from '../../utils/logger';
import { config } from '../../config';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    userId: string;
    email: string;
  };
}

/**
 * JWT authentication middleware
 * Validates access tokens and attaches user info to request
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    // Try to get token from Authorization header first, then from cookie
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
      });
    }

    // Check if token is blacklisted
    const isBlacklisted = await redisCache.isTokenBlacklisted(token);
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        error: 'Token has been revoked',
      });
    }

    try {
      const payload = jwtUtils.verifyAccessToken(token);
      req.user = payload;
      return next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
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
