/**
 * Authentication Middleware
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthUser {
  id: string;
  userId: string;
  email: string;
  role?: string;
}

/**
 * Require authentication middleware
 */
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'No authentication token provided',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;

      // Attach user to request
      req.user = {
        id: decoded.id,
        userId: decoded.userId || decoded.id,
        email: decoded.email,
      };

      next();
    } catch (jwtError: any) {
      if (jwtError.name === 'TokenExpiredError') {
        res.status(401).json({
          success: false,
          error: 'Token expired',
        });
        return;
      }

      res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
      return;
    }
  } catch (error: any) {
    logger.error('Authentication error', { error: error.message });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't reject if missing
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      try {
        const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
        req.user = {
          id: decoded.id,
          userId: decoded.userId || decoded.id,
          email: decoded.email,
        };
      } catch (jwtError) {
        // Invalid token, but we continue anyway
        logger.debug('Invalid token in optional auth');
      }
    }

    next();
  } catch (error: any) {
    logger.error('Optional authentication error', { error: error.message });
    next(); // Continue even if there's an error
  }
};

/**
 * Require admin role
 */
export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  if ((req.user as AuthUser).role !== 'admin') {
    res.status(403).json({
      success: false,
      error: 'Admin access required',
    });
    return;
  }

  next();
};
