import { createLogger } from '@flamoral/backend-shared';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const logger = createLogger('auth-middleware');

interface AuthRequest extends Request {
  user?: {
    id: string;
    userId: string;
    email: string;
  };
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
    const secret = process.env.JWT_ACCESS_SECRET || 'dev-secret-key';

    try {
      const decoded = jwt.verify(token, secret) as any;

      req.user = {
        id: decoded.userId || decoded.id,
        userId: decoded.userId || decoded.id,
        email: decoded.email,
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
