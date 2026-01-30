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
    const jwtSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
    if (!jwtSecret && !config.jwt.publicKey) {
      res.status(500).json({
        success: false,
        error: 'Server configuration error: JWT secret not configured',
      });
      return;
    }

    const decoded = config.jwt.publicKey
      ? (jwt.verify(token, config.jwt.publicKey, {
          algorithms: ['RS256'],
          issuer: config.jwt.issuer,
          audience: config.jwt.audience,
        }) as JwtPayload)
      : (jwt.verify(token, jwtSecret!, {
          algorithms: ['HS256'],
        }) as JwtPayload);

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
 * Optional authentication - doesn't fail if no token
 */
export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const serviceKey = req.headers['x-service-key'] as string;
  if (serviceKey === config.services.serviceKey) {
    req.isServiceCall = true;
    req.userId = req.headers['x-user-id'] as string;
    return next();
  }

  let token = req.cookies?.auth_token;

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    return next();
  }

  try {
    const jwtSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
    if (!jwtSecret && !config.jwt.publicKey) {
      // No secret configured, continue without auth
      return next();
    }

    const decoded = config.jwt.publicKey
      ? (jwt.verify(token, config.jwt.publicKey, {
          algorithms: ['RS256'],
          issuer: config.jwt.issuer,
          audience: config.jwt.audience,
        }) as JwtPayload)
      : (jwt.verify(token, jwtSecret!, {
          algorithms: ['HS256'],
        }) as JwtPayload);

    req.userId = decoded.sub;
    req.userEmail = decoded.email;
  } catch {
    // Token invalid but optional, continue without auth
  }

  next();
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
