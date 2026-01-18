import { createLogger } from '@flamoral/backend-shared';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const logger = createLogger('auth-middleware');

/**
 * JWT Token Payload interface
 */
interface JwtTokenPayload {
  userId?: string;
  id?: string;
  sub?: string;
  email?: string;
  isPremium?: boolean;
  subscriptionTier?: string;
}

/**
 * Authenticated user interface
 */
export interface AuthenticatedUser {
  id: string;
  userId: string;
  email: string;
  isPremium?: boolean;
  subscriptionTier?: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
  correlationId?: string;
}

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  authenticate(req, res, next);
};

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  authenticate(req, res, next);
};

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'No token provided',
      });
      return;
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_ACCESS_SECRET;

    // SECURITY: Require JWT secret to be set - fail-closed approach
    if (!secret) {
      logger.error('JWT_ACCESS_SECRET environment variable not set');
      res.status(500).json({
        success: false,
        error: 'Server configuration error',
      });
      return;
    }

    try {
      const decoded = jwt.verify(token, secret) as JwtTokenPayload;

      req.user = {
        id: decoded.userId || decoded.id || decoded.sub || '',
        userId: decoded.userId || decoded.id || decoded.sub || '',
        email: decoded.email || '',
        isPremium: decoded.isPremium,
        subscriptionTier: decoded.subscriptionTier,
      };

      next();
    } catch (err) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
      return;
    }
  } catch (error) {
    logger.error('Authentication error', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};
