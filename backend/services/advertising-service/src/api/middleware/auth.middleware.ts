import crypto from 'crypto';

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import logger from '../../utils/logger';

/**
 * Extended Request interface with authenticated user data
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    userId: string;
    email: string;
    isAdmin?: boolean;
    isAdvertiser?: boolean;
    roles?: string[];
  };
  serviceId?: string;
  requestId?: string;
}

/**
 * JWT Authentication Middleware
 * Validates Bearer tokens and attaches user data to request
 */
export const authenticateJWT = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Missing authorization header',
        code: 'MISSING_AUTH_HEADER',
      });
      return;
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_ACCESS_SECRET;

    if (!secret) {
      logger.error('JWT_ACCESS_SECRET not configured');
      res.status(500).json({
        success: false,
        error: 'Authentication not configured',
        code: 'AUTH_NOT_CONFIGURED',
      });
      return;
    }

    try {
      const decoded = jwt.verify(token, secret) as any;

      req.user = {
        id: decoded.userId || decoded.id || decoded.sub,
        userId: decoded.userId || decoded.id || decoded.sub,
        email: decoded.email,
        isAdmin: decoded.isAdmin || decoded.roles?.includes('admin') || false,
        isAdvertiser: decoded.isAdvertiser || decoded.roles?.includes('advertiser') || false,
        roles: decoded.roles || [],
      };

      next();
    } catch (err) {
      logger.warn('Invalid or expired token', { error: err });
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
      });
      return;
    }
  } catch (error) {
    logger.error('Authentication error', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'AUTH_ERROR',
    });
  }
};

/**
 * Optional JWT Authentication Middleware
 * Same as authenticateJWT but allows unauthenticated requests to proceed
 * Useful for routes that have different behavior for authenticated vs anonymous users
 */
export const optionalAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without user context
      next();
      return;
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_ACCESS_SECRET;

    if (!secret) {
      // No secret configured, continue without user context
      next();
      return;
    }

    try {
      const decoded = jwt.verify(token, secret) as any;

      req.user = {
        id: decoded.userId || decoded.id || decoded.sub,
        userId: decoded.userId || decoded.id || decoded.sub,
        email: decoded.email,
        isAdmin: decoded.isAdmin || decoded.roles?.includes('admin') || false,
        isAdvertiser: decoded.isAdvertiser || decoded.roles?.includes('advertiser') || false,
        roles: decoded.roles || [],
      };
    } catch (err) {
      // Invalid token, but continue without user context for optional auth
      logger.debug('Optional auth: invalid token, continuing without user context');
    }

    next();
  } catch (error) {
    logger.error('Optional authentication error', error);
    next(); // Continue even on error for optional auth
  }
};

/**
 * Require Advertiser Role Middleware
 * Must be used after authenticateJWT
 */
export const requireAdvertiser = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
    return;
  }

  if (!req.user.isAdvertiser && !req.user.isAdmin) {
    logger.warn('Advertiser access denied', { userId: req.user.userId });
    res.status(403).json({
      success: false,
      error: 'Advertiser access required',
      code: 'ADVERTISER_REQUIRED',
    });
    return;
  }

  next();
};

/**
 * Require Admin Role Middleware
 * Must be used after authenticateJWT
 */
export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
    return;
  }

  if (!req.user.isAdmin) {
    logger.warn('Admin access denied', { userId: req.user.userId });
    res.status(403).json({
      success: false,
      error: 'Admin access required',
      code: 'ADMIN_REQUIRED',
    });
    return;
  }

  next();
};

/**
 * Internal Service Authentication Middleware
 * Validates X-Service-Key header for service-to-service communication
 */
export const authenticateService = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const serviceKey = req.headers['x-service-key'] as string;
  const requestId = req.headers['x-request-id'] as string;
  const sourceService = req.headers['x-source-service'] as string;

  const expectedKey = process.env.SERVICE_API_KEY;

  if (!expectedKey) {
    logger.error('SERVICE_API_KEY not configured');
    res.status(500).json({
      success: false,
      error: 'Service authentication not configured',
      code: 'SERVICE_AUTH_NOT_CONFIGURED',
    });
    return;
  }

  if (!serviceKey) {
    logger.warn(`Service auth failed: Missing X-Service-Key - ${req.method} ${req.path}`);
    res.status(401).json({
      success: false,
      error: 'Service authentication required',
      code: 'MISSING_SERVICE_KEY',
      message: 'X-Service-Key header is required for internal API access',
    });
    return;
  }

  if (!requestId) {
    logger.warn(`Service auth failed: Missing X-Request-ID - ${req.method} ${req.path}`);
    res.status(401).json({
      success: false,
      error: 'Request ID required',
      code: 'MISSING_REQUEST_ID',
      message: 'X-Request-ID header is required for internal API access',
    });
    return;
  }

  // Constant-time comparison to prevent timing attacks
  const isValid = timingSafeEqual(serviceKey, expectedKey);

  if (!isValid) {
    logger.warn(
      `Service auth failed: Invalid key from ${sourceService || 'unknown'} - ${req.method} ${req.path}`
    );
    res.status(403).json({
      success: false,
      error: 'Invalid service credentials',
      code: 'INVALID_SERVICE_KEY',
    });
    return;
  }

  req.serviceId = sourceService || 'unknown-service';
  req.requestId = requestId;

  logger.info(`Service authenticated: ${req.serviceId} - ${req.method} ${req.path}`);
  next();
};

/**
 * Rate Limiter Middleware for Public Routes
 * Simple in-memory rate limiting (for production, use Redis-based rate limiting)
 */
const rateLimitStore: Map<string, { count: number; resetTime: number }> = new Map();

interface RateLimiterOptions {
  windowMs?: number; // Time window in milliseconds
  maxRequests?: number; // Maximum requests per window
}

export const createRateLimiter = (options: RateLimiterOptions = {}) => {
  const { windowMs = 60000, maxRequests = 100 } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const clientId = req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown';
    const now = Date.now();

    let clientData = rateLimitStore.get(clientId);

    if (!clientData || now > clientData.resetTime) {
      clientData = { count: 0, resetTime: now + windowMs };
      rateLimitStore.set(clientId, clientData);
    }

    clientData.count++;

    if (clientData.count > maxRequests) {
      logger.warn(`Rate limit exceeded for ${clientId}`);
      res.status(429).json({
        success: false,
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000),
      });
      return;
    }

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', (maxRequests - clientData.count).toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(clientData.resetTime / 1000).toString());

    next();
  };
};

// Default rate limiter instance for public routes
export const rateLimiter = createRateLimiter({ windowMs: 60000, maxRequests: 60 });

// Stricter rate limiter for sensitive operations
export const strictRateLimiter = createRateLimiter({ windowMs: 60000, maxRequests: 10 });

/**
 * Constant-time string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  try {
    const bufferA = Buffer.from(a, 'utf8');
    const bufferB = Buffer.from(b, 'utf8');

    if (bufferA.length !== bufferB.length) {
      // Perform comparison anyway to maintain constant time
      crypto.timingSafeEqual(Buffer.alloc(32, bufferA), Buffer.alloc(32, bufferB));
      return false;
    }

    return crypto.timingSafeEqual(bufferA, bufferB);
  } catch (error) {
    return false;
  }
}

// Clean up rate limit store periodically (every 5 minutes)
setInterval(
  () => {
    const now = Date.now();
    for (const [key, value] of rateLimitStore.entries()) {
      if (now > value.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  },
  5 * 60 * 1000
);

// Export authenticateJWT as authMiddleware for backward compatibility
export const authMiddleware = authenticateJWT;
