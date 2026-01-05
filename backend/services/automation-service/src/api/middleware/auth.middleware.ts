import { createLogger } from '@flamoral/backend-shared';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import config from '../../config';

const logger = createLogger('automation-service:auth');

/**
 * Extended Request with user information
 */
export interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: any;
}

/**
 * JWT Authentication Middleware
 * Validates JWT tokens and adds user info to request
 */
export const authenticateUser = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'MISSING_TOKEN',
      });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, config.jwt.accessSecret) as any;
      req.userId = decoded.userId || decoded.sub;
      req.user = decoded;
      next();
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Token expired',
          code: 'TOKEN_EXPIRED',
        });
      }

      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        code: 'INVALID_TOKEN',
      });
    }
  } catch (error: any) {
    logger.error('Authentication error', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
export const optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, config.jwt.accessSecret) as any;
      req.userId = decoded.userId || decoded.sub;
      req.user = decoded;
    } catch (error) {
      // Silently fail for optional auth
    }

    next();
  } catch (error: any) {
    next();
  }
};
