/**
 * Authentication Middleware for Analytics Service
 *
 * Provides:
 * - JWT authentication for user requests
 * - Internal service-to-service authentication
 * - Role-based access control (RBAC)
 */

import crypto from 'crypto';

import { createLogger } from '@flamoral/backend-shared';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import config from '../../config';

const logger = createLogger('auth-middleware');

/**
 * User roles for RBAC
 */
export type UserRole = 'user' | 'moderator' | 'admin' | 'support';

/**
 * JWT payload structure
 */
export interface JwtPayload {
  id: string;
  userId: string;
  email: string;
  role?: UserRole;
  iat?: number;
  exp?: number;
}

/**
 * Extended Request interface with authentication metadata
 */
export interface AuthRequest extends Request {
  user?: JwtPayload;
  correlationId?: string;
  serviceId?: string;
  requestId?: string;
}

/**
 * Generate correlation ID for request tracing
 */
const generateCorrelationId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};

/**
 * Constant-time string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  try {
    const bufferA = Buffer.from(a, 'utf8');
    const bufferB = Buffer.from(b, 'utf8');

    if (bufferA.length !== bufferB.length) {
      // Still perform comparison to prevent length-based timing attacks
      crypto.timingSafeEqual(Buffer.alloc(32, bufferA), Buffer.alloc(32, bufferB));
      return false;
    }

    return crypto.timingSafeEqual(bufferA, bufferB);
  } catch (error) {
    return false;
  }
}

/**
 * JWT authentication middleware
 * Validates access tokens and attaches user info to request
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    // Generate correlation ID for request tracing
    req.correlationId = (req.headers['x-correlation-id'] as string) || generateCorrelationId();
    res.setHeader('X-Correlation-ID', req.correlationId);

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'No token provided',
        correlationId: req.correlationId,
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const payload = jwt.verify(token, config.jwtAccessSecret) as JwtPayload;

      req.user = {
        id: payload.userId,
        userId: payload.userId,
        email: payload.email,
        role: payload.role || 'user',
      };

      return next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        correlationId: req.correlationId,
      });
    }
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication error',
    });
  }
};

// Aliases for authenticate - commonly used in routes
export const requireAuth = authenticate;
export const authenticateToken = authenticate;
export const authMiddleware = authenticate;

/**
 * RBAC: Require specific role(s) middleware
 * Must be used after authenticate middleware
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        correlationId: req.correlationId,
      });
    }

    const userRole = req.user.role || 'user';

    // Admin has access to everything
    if (userRole === 'admin') {
      return next();
    }

    // Check if user has one of the allowed roles
    if (!allowedRoles.includes(userRole)) {
      logger.warn(
        `[Auth] Role access denied: user ${req.user.userId} with role ${userRole} tried to access resource requiring ${allowedRoles.join(', ')}`
      );
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
        correlationId: req.correlationId,
      });
    }

    return next();
  };
};

/**
 * RBAC: Require admin role
 * Must be used after authenticate middleware
 */
export const requireAdmin = requireRole('admin');

/**
 * RBAC: Require moderator role (includes admin)
 * Must be used after authenticate middleware
 */
export const requireModerator = requireRole('moderator', 'admin');

/**
 * RBAC: Require support role (includes moderator and admin)
 * Must be used after authenticate middleware
 */
export const requireSupport = requireRole('support', 'moderator', 'admin');

/**
 * Internal service-to-service authentication middleware
 *
 * Validates:
 * 1. X-Service-Key header against SERVICE_API_KEY
 * 2. X-Request-ID for distributed tracing
 *
 * Security features:
 * - Constant-time comparison to prevent timing attacks
 * - Request ID validation for tracing
 */
export const authenticateInternal = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void | Response => {
  const startTime = Date.now();

  // Extract headers
  const serviceKey = req.headers['x-service-key'] as string;
  const requestId = req.headers['x-request-id'] as string;
  const sourceService = req.headers['x-source-service'] as string;

  // Get expected service key from config
  const expectedKey = config.serviceApiKey;

  // Validate service key exists in config
  if (!expectedKey) {
    logger.error('[ServiceAuth] SERVICE_API_KEY not configured');
    return res.status(500).json({
      success: false,
      error: 'Service authentication not configured',
      code: 'SERVICE_AUTH_NOT_CONFIGURED',
    });
  }

  // Validate service key is provided in request
  if (!serviceKey) {
    logger.warn(`[ServiceAuth] Missing X-Service-Key header - ${req.method} ${req.path}`);
    return res.status(401).json({
      success: false,
      error: 'Service authentication required',
      code: 'MISSING_SERVICE_KEY',
      message: 'X-Service-Key header is required for internal API access',
    });
  }

  // Validate request ID (for tracing)
  if (!requestId) {
    logger.warn(`[ServiceAuth] Missing X-Request-ID header - ${req.method} ${req.path}`);
    return res.status(401).json({
      success: false,
      error: 'Request ID required',
      code: 'MISSING_REQUEST_ID',
      message: 'X-Request-ID header is required for internal API access',
    });
  }

  // Perform constant-time comparison to prevent timing attacks
  const isValid = timingSafeEqual(serviceKey, expectedKey);

  if (!isValid) {
    logger.warn(
      `[ServiceAuth] Invalid service key from ${sourceService || 'unknown'} - ${req.method} ${req.path}`
    );
    return res.status(403).json({
      success: false,
      error: 'Invalid service credentials',
      code: 'INVALID_SERVICE_KEY',
    });
  }

  // Authentication successful - add metadata to request
  req.serviceId = sourceService || 'unknown-service';
  req.requestId = requestId;
  req.correlationId = requestId;

  // Log successful authentication
  const duration = Date.now() - startTime;
  logger.info(
    `[ServiceAuth] Authenticated: ${req.serviceId} - ${req.method} ${req.path} - RequestID: ${req.requestId} (${duration}ms)`
  );

  next();
};

/**
 * Combined authentication: accepts either JWT or internal service key
 * Useful for endpoints that can be called by both users and internal services
 */
export const authenticateAny = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  // Generate correlation ID
  req.correlationId =
    (req.headers['x-correlation-id'] as string) ||
    (req.headers['x-request-id'] as string) ||
    generateCorrelationId();
  res.setHeader('X-Correlation-ID', req.correlationId);

  // Check for internal service key first
  const serviceKey = req.headers['x-service-key'] as string;
  if (serviceKey) {
    const expectedKey = config.serviceApiKey;
    if (expectedKey && timingSafeEqual(serviceKey, expectedKey)) {
      req.serviceId = (req.headers['x-source-service'] as string) || 'internal-service';
      req.requestId = req.headers['x-request-id'] as string;
      return next();
    }
  }

  // Fall back to JWT authentication
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const payload = jwt.verify(token, config.jwtAccessSecret) as JwtPayload;
      req.user = {
        id: payload.userId,
        userId: payload.userId,
        email: payload.email,
        role: payload.role || 'user',
      };
      return next();
    } catch (error) {
      // Token invalid, continue to error
    }
  }

  // No valid authentication provided
  return res.status(401).json({
    success: false,
    error: 'Authentication required',
    message: 'Valid JWT token or internal service key required',
    correlationId: req.correlationId,
  });
};

/**
 * Optional authentication: continues even without auth, but attaches user if present
 * Useful for endpoints that have different behavior for authenticated vs anonymous users
 */
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Generate correlation ID
  req.correlationId = (req.headers['x-correlation-id'] as string) || generateCorrelationId();
  res.setHeader('X-Correlation-ID', req.correlationId);

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const payload = jwt.verify(token, config.jwtAccessSecret) as JwtPayload;
      req.user = {
        id: payload.userId,
        userId: payload.userId,
        email: payload.email,
        role: payload.role || 'user',
      };
    } catch (error) {
      // Token invalid, but continue anyway since auth is optional
    }
  }

  next();
};
