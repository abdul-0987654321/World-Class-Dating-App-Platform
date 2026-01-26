/**
 * Authentication Middleware
 * JWT verification and service-to-service authentication
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
  isServiceCall?: boolean;
}

interface JwtPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

/**
 * Verify JWT token from cookie or Authorization header
 */
export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  // Check for service-to-service authentication
  const serviceKey = req.headers['x-service-key'] as string;
  if (serviceKey === config.services.serviceKey) {
    req.isServiceCall = true;
    req.userId = req.headers['x-user-id'] as string;
    return next();
  }

  // Get token from cookie or Authorization header
  let token = req.cookies?.auth_token;

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  try {
    const decoded = config.jwt.publicKey
      ? (jwt.verify(token, config.jwt.publicKey, {
          algorithms: ['RS256'],
          issuer: config.jwt.issuer,
          audience: config.jwt.audience,
        }) as JwtPayload)
      : (jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as JwtPayload);

    req.userId = decoded.sub;
    req.userEmail = decoded.email;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
}

/**
 * Require user ID to be present
 */
export function requireUserId(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.userId) {
    res.status(401).json({
      success: false,
      error: 'User authentication required',
    });
    return;
  }
  next();
}

/**
 * Service-only authentication (for internal calls)
 */
export function serviceOnly(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const serviceKey = req.headers['x-service-key'] as string;
  if (serviceKey !== config.services.serviceKey) {
    res.status(403).json({
      success: false,
      error: 'Service authentication required',
    });
    return;
  }
  req.isServiceCall = true;
  next();
}
