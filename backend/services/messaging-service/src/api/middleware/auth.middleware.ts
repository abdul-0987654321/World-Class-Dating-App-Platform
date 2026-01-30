import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import { createLogger } from '../../utils/logger';

const logger = createLogger('messaging-auth-middleware');

export interface AuthUser {
  id: string;
  userId: string;
  email: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
  file?: Express.Multer.File;
}

/**
 * JWT Authentication middleware for messaging service
 * Validates access tokens from the auth service
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const jwtSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;

    // SECURITY: Require JWT secret to be set - fail-closed approach
    if (!jwtSecret) {
      logger.error('JWT_ACCESS_SECRET / JWT_SECRET environment variable not set');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error',
      });
    }

    try {
      const payload = jwt.verify(token, jwtSecret, {
        algorithms: ['HS256'],
      }) as { userId: string; email: string };
      req.user = {
        id: payload.userId,
        userId: payload.userId,
        email: payload.email,
      };
      return next();
    } catch (error) {
      logger.warn('Invalid token attempt');
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
    }
  } catch (error) {
    logger.error('Authentication error:', error);
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
    const expectedKey = process.env.INTERNAL_SERVICE_KEY;

    // SECURITY: Require internal service key to be set
    if (!expectedKey) {
      logger.error('INTERNAL_SERVICE_KEY environment variable not set');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error',
      });
    }

    if (!serviceKey || serviceKey !== expectedKey) {
      return res.status(401).json({
        success: false,
        error: 'Invalid service key',
      });
    }

    return next();
  } catch (error) {
    logger.error('Internal auth error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal authentication error',
    });
  }
};
