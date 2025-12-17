import { Request, Response, NextFunction } from 'express';
import jwtUtils from '../../utils/jwt';
import logger from '../../utils/logger';

// Import types to ensure they're loaded
import '../../types';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    userId: string;
    email: string;
    role?: 'user' | 'admin' | 'moderator';
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const payload = jwtUtils.verifyAccessToken(token);
      req.user = payload;
      return next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
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

// Admin authentication middleware
export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // First authenticate the user
    await authenticate(req, res, () => {});

    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Check if user has admin role
    if (req.user.role !== 'admin') {
      logger.warn(`Non-admin user ${req.user.userId} attempted to access admin resource`);
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
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

// Moderator or Admin authentication middleware
export const requireModerator = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // First authenticate the user
    await authenticate(req, res, () => {});

    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Check if user has moderator or admin role
    if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
      logger.warn(`Non-moderator user ${req.user.userId} attempted to access moderator resource`);
      return res.status(403).json({
        success: false,
        message: 'Moderator or admin access required',
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
