import { Request, Response, NextFunction } from 'express';
import { verify } from 'jsonwebtoken';
import config from '../config';
import { createLogger } from '@flamoral/backend-shared';

const logger = createLogger('automation-service:auth-middleware');

/**
 * User authentication middleware
 */
export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Authentication required',
      });
      return;
    }

    const token = authHeader.substring(7);

    try {
      const decoded = verify(token, config.jwt.accessSecret) as any;
      req.user = {
        id: decoded.userId || decoded.id,
        userId: decoded.userId || decoded.id,
        email: decoded.email,
      };

      next();
    } catch (error: any) {
      logger.warn('Invalid token', { error: error.message });
      res.status(401).json({
        error: 'Invalid or expired token',
      });
    }
  } catch (error: any) {
    logger.error('Authentication error', { error: error.message });
    res.status(500).json({
      error: 'Authentication failed',
    });
  }
};

/**
 * Service-to-service authentication middleware
 */
export const authenticateService = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKey = req.headers['x-service-api-key'] as string;

    if (!apiKey) {
      res.status(401).json({
        error: 'Service API key required',
      });
      return;
    }

    if (apiKey !== config.serviceAuth.apiKey) {
      logger.warn('Invalid service API key');
      res.status(403).json({
        error: 'Invalid service API key',
      });
      return;
    }

    next();
  } catch (error: any) {
    logger.error('Service authentication error', { error: error.message });
    res.status(500).json({
      error: 'Authentication failed',
    });
  }
};

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        userId: string;
        email: string;
      };
    }
  }
}
