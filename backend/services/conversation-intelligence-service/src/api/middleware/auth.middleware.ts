/**
 * Authentication Middleware
 */

import { createLogger } from '@flamoral/backend-shared';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import config from '../../config';

const logger = createLogger('auth-middleware');

interface JwtPayload {
  id: string;
  userId: string;
  email: string;
  role?: string;
  isPremium?: boolean;
  subscriptionTier?: string;
  iat: number;
  exp: number;
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No authorization token provided',
      });
    }

    const token = authHeader.substring(7);

    if (!config.jwt.accessSecret) {
      logger.error('JWT_ACCESS_SECRET is not configured');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error',
      });
    }

    const decoded = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;

    req.user = { ...decoded, id: decoded.id || decoded.userId };
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        code: 'TOKEN_EXPIRED',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        code: 'INVALID_TOKEN',
      });
    }

    logger.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
    });
  }
}

export function optionalAuthenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    if (config.jwt.accessSecret) {
      const decoded = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
      req.user = { ...decoded, id: decoded.id || decoded.userId };
    }

    next();
  } catch {
    next();
  }
}

export function serviceAuth(req: Request, res: Response, next: NextFunction) {
  const serviceKey = req.headers['x-service-key'];

  if (!serviceKey || serviceKey !== config.serviceApiKey) {
    return res.status(401).json({
      success: false,
      error: 'Invalid service key',
    });
  }

  next();
}
