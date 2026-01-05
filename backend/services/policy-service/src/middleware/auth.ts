/**
 * Authentication Middleware
 *
 * Provides JWT authentication for admin users and API key authentication
 * for internal service-to-service communication.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import { logger } from '../utils/logger';

/**
 * Get JWT secret with validation
 */
const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  return secret || 'dev-only-secret-do-not-use-in-production';
};

/**
 * Get internal API key with validation
 */
const getInternalApiKey = (): string => {
  const apiKey = process.env.INTERNAL_API_KEY;
  if (!apiKey && process.env.NODE_ENV === 'production') {
    throw new Error('INTERNAL_API_KEY environment variable is required in production');
  }
  return apiKey || 'dev-internal-api-key';
};

/**
 * Authenticated user interface
 */
export interface AuthUser {
  id: string;
  userId: string;
  email: string;
  role?: 'user' | 'admin' | 'moderator' | 'support';
  isAdmin?: boolean;
}

/**
 * Extended Request interface with authentication fields
 */
export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  isInternalService?: boolean;
}

/**
 * JWT Authentication Middleware
 *
 * Validates Bearer token from Authorization header and attaches user to request.
 * Used for admin user authentication.
 */
export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'No authentication token provided',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const decoded = jwt.verify(token, getJwtSecret()) as any;

      // Attach user to request
      req.user = {
        id: decoded.userId || decoded.id || decoded.sub,
        userId: decoded.userId || decoded.id || decoded.sub,
        email: decoded.email,
        role: decoded.role,
        isAdmin: decoded.role === 'admin' || decoded.isAdmin === true,
      };

      logger.debug('User authenticated', { userId: req.user.id, email: req.user.email });
      next();
    } catch (jwtError: any) {
      if (jwtError.name === 'TokenExpiredError') {
        logger.warn('Token expired', { ip: req.ip });
        res.status(401).json({
          success: false,
          error: 'Token expired',
          message: 'Authentication token has expired',
        });
        return;
      }

      logger.warn('Invalid token', { ip: req.ip, error: jwtError.message });
      res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'Authentication token is invalid',
      });
      return;
    }
  } catch (error: any) {
    logger.error('Authentication error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An error occurred during authentication',
    });
  }
};

/**
 * Alias for authMiddleware for consistency with other services
 */
export const authenticateJWT = authMiddleware;

/**
 * API Key Authentication Middleware
 *
 * Validates API key from x-api-key or x-internal-api-key header.
 * Used for internal service-to-service communication.
 */
export const apiKeyMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const apiKey =
      (req.headers['x-api-key'] as string) || (req.headers['x-internal-api-key'] as string);

    if (!apiKey) {
      logger.warn('Missing API key', { ip: req.ip, path: req.path });
      res.status(401).json({
        success: false,
        error: 'API key required',
        message: 'No API key provided in request headers',
      });
      return;
    }

    if (apiKey !== getInternalApiKey()) {
      logger.warn('Invalid API key attempt', { ip: req.ip, path: req.path });
      res.status(401).json({
        success: false,
        error: 'Invalid API key',
        message: 'The provided API key is not valid',
      });
      return;
    }

    // Mark request as coming from internal service
    req.isInternalService = true;
    logger.debug('Internal service authenticated', { path: req.path });
    next();
  } catch (error: any) {
    logger.error('API key authentication error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An error occurred during API key authentication',
    });
  }
};

/**
 * Alias for apiKeyMiddleware for service-to-service auth
 */
export const internalApiKeyAuth = apiKeyMiddleware;

/**
 * Require Admin Role Middleware
 *
 * Must be used after authMiddleware or apiKeyMiddleware.
 * Allows access if user has admin role OR if request is from internal service.
 */
export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  // Internal service requests are allowed
  if (req.isInternalService) {
    logger.debug('Admin access granted via internal service');
    next();
    return;
  }

  // Check if user is authenticated
  if (!req.user) {
    logger.warn('Admin access denied - no user', { ip: req.ip, path: req.path });
    res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'You must be authenticated to access this resource',
    });
    return;
  }

  // Check if user has admin role
  if (!req.user.isAdmin && req.user.role !== 'admin') {
    logger.warn('Admin access denied - insufficient privileges', {
      userId: req.user.id,
      role: req.user.role,
      path: req.path,
    });
    res.status(403).json({
      success: false,
      error: 'Admin access required',
      message: 'You do not have sufficient privileges to access this resource',
    });
    return;
  }

  logger.debug('Admin access granted', { userId: req.user.id });
  next();
};

/**
 * Optional Authentication Middleware
 *
 * Attaches user to request if valid token is provided, but doesn't reject
 * requests without authentication. Useful for endpoints that have different
 * behavior for authenticated vs unauthenticated users.
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      try {
        const decoded = jwt.verify(token, getJwtSecret()) as any;
        req.user = {
          id: decoded.userId || decoded.id || decoded.sub,
          userId: decoded.userId || decoded.id || decoded.sub,
          email: decoded.email,
          role: decoded.role,
          isAdmin: decoded.role === 'admin' || decoded.isAdmin === true,
        };
        logger.debug('Optional auth: user authenticated', { userId: req.user.id });
      } catch (jwtError) {
        // Invalid token, but we continue anyway for optional auth
        logger.debug('Optional auth: invalid token, continuing without user');
      }
    }

    next();
  } catch (error: any) {
    logger.error('Optional authentication error', { error: error.message });
    next(); // Continue even if there's an error
  }
};
