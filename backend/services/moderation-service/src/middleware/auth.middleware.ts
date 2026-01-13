/**
 * Authentication and Authorization Middleware for Moderation Service
 *
 * This middleware handles:
 * 1. JWT token validation for user authentication
 * 2. Role-based access control (moderator, admin)
 * 3. Extracting user identity from authenticated tokens
 *
 * SECURITY NOTE: This middleware is critical for preventing admin impersonation attacks.
 * The moderatorId/adminId must ALWAYS come from the verified JWT token, never from request body.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import { createLogger } from '../utils/logger';

const logger = createLogger('auth-middleware');

/**
 * Get JWT secret from environment with production validation
 */
const getJwtSecret = (): string => {
  const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_ACCESS_SECRET or JWT_SECRET environment variable is required in production'
    );
  }
  return secret || 'dev-only-secret-do-not-use-in-production';
};

/**
 * Authenticated user interface attached to requests
 */
export interface AuthenticatedUser {
  id: string;
  userId: string;
  email: string;
  role: 'user' | 'moderator' | 'admin' | 'support';
  isModerator: boolean;
  isAdmin: boolean;
}

/**
 * Extended Request interface with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

/**
 * JWT payload structure
 */
interface JwtPayload {
  id?: string;
  userId?: string;
  sub?: string;
  email?: string;
  role?: string;
  roles?: string[];
  isModerator?: boolean;
  isAdmin?: boolean;
  iat?: number;
  exp?: number;
}

/**
 * Determine user role from JWT payload
 */
function determineRole(payload: JwtPayload): 'user' | 'moderator' | 'admin' {
  // Check explicit isAdmin/isModerator flags
  if (payload.isAdmin) return 'admin';
  if (payload.isModerator) return 'moderator';

  // Check role string
  if (payload.role === 'admin') return 'admin';
  if (payload.role === 'moderator') return 'moderator';

  // Check roles array (e.g., from identity provider groups)
  if (payload.roles) {
    if (payload.roles.includes('admin') || payload.roles.includes('Admin')) return 'admin';
    if (payload.roles.includes('moderator') || payload.roles.includes('Moderator'))
      return 'moderator';
  }

  return 'user';
}

/**
 * JWT Authentication Middleware
 *
 * Validates the JWT token from the Authorization header and attaches
 * the authenticated user to the request object.
 *
 * SECURITY: This middleware must be applied to ALL routes that require
 * user identification to prevent identity spoofing attacks.
 */
export const authenticateJWT = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn(
        `Authentication failed: Missing or invalid Authorization header - ${req.method} ${req.path}`
      );
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'MISSING_TOKEN',
        message: 'Bearer token is required in Authorization header',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'EMPTY_TOKEN',
        message: 'Token cannot be empty',
      });
      return;
    }

    try {
      const jwtSecret = getJwtSecret();
      const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

      // Extract user ID (support various JWT structures)
      const userId = decoded.id || decoded.userId || decoded.sub;

      if (!userId) {
        logger.warn('Authentication failed: Token missing user ID');
        res.status(401).json({
          success: false,
          error: 'Invalid token',
          code: 'MISSING_USER_ID',
          message: 'Token does not contain user identification',
        });
        return;
      }

      // Determine role and permissions
      const role = determineRole(decoded);

      // Attach authenticated user to request
      const authenticatedUser: AuthenticatedUser = {
        id: userId,
        userId: userId,
        email: decoded.email || '',
        role,
        isModerator: role === 'moderator' || role === 'admin',
        isAdmin: role === 'admin',
      };

      (req as AuthenticatedRequest).user = authenticatedUser;

      logger.debug(`User ${userId} authenticated with role: ${role}`);
      next();
    } catch (jwtError: any) {
      if (jwtError.name === 'TokenExpiredError') {
        logger.warn(`Authentication failed: Token expired - ${req.method} ${req.path}`);
        res.status(401).json({
          success: false,
          error: 'Token expired',
          code: 'TOKEN_EXPIRED',
          message: 'Authentication token has expired. Please log in again.',
        });
        return;
      }

      if (jwtError.name === 'JsonWebTokenError') {
        logger.warn(`Authentication failed: Invalid token - ${req.method} ${req.path}`);
        res.status(401).json({
          success: false,
          error: 'Invalid token',
          code: 'INVALID_TOKEN',
          message: 'The provided token is invalid',
        });
        return;
      }

      throw jwtError;
    }
  } catch (error: any) {
    logger.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication error',
      code: 'AUTH_ERROR',
      message: 'An error occurred during authentication',
    });
  }
};

/**
 * Require Moderator Role Middleware
 *
 * Ensures the authenticated user has at least moderator privileges.
 * Must be used AFTER authenticateJWT middleware.
 *
 * Allows: moderator, admin
 * Denies: regular users
 */
export const requireModerator = (req: Request, res: Response, next: NextFunction): void => {
  const user = (req as AuthenticatedRequest).user;

  if (!user) {
    logger.warn(`Moderator check failed: No authenticated user - ${req.method} ${req.path}`);
    res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'NOT_AUTHENTICATED',
      message: 'You must be authenticated to access this resource',
    });
    return;
  }

  if (!user.isModerator && !user.isAdmin) {
    logger.warn(
      `Authorization failed: User ${user.id} lacks moderator access - ${req.method} ${req.path}`
    );
    res.status(403).json({
      success: false,
      error: 'Moderator access required',
      code: 'INSUFFICIENT_PERMISSIONS',
      message:
        'You do not have permission to access this resource. Moderator or admin role required.',
    });
    return;
  }

  logger.debug(`Moderator access granted for user ${user.id}`);
  next();
};

/**
 * Require Admin Role Middleware
 *
 * Ensures the authenticated user has admin privileges.
 * Must be used AFTER authenticateJWT middleware.
 *
 * Allows: admin only
 * Denies: moderators, regular users
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const user = (req as AuthenticatedRequest).user;

  if (!user) {
    logger.warn(`Admin check failed: No authenticated user - ${req.method} ${req.path}`);
    res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'NOT_AUTHENTICATED',
      message: 'You must be authenticated to access this resource',
    });
    return;
  }

  if (!user.isAdmin) {
    logger.warn(
      `Authorization failed: User ${user.id} lacks admin access - ${req.method} ${req.path}`
    );
    res.status(403).json({
      success: false,
      error: 'Admin access required',
      code: 'INSUFFICIENT_PERMISSIONS',
      message: 'You do not have permission to access this resource. Admin role required.',
    });
    return;
  }

  logger.debug(`Admin access granted for user ${user.id}`);
  next();
};

/**
 * Optional Authentication Middleware
 *
 * Attempts to authenticate the user if a token is provided,
 * but allows the request to proceed even without authentication.
 * Useful for endpoints that have different behavior for authenticated users.
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      if (token) {
        try {
          const jwtSecret = getJwtSecret();
          const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
          const userId = decoded.id || decoded.userId || decoded.sub;

          if (userId) {
            const role = determineRole(decoded);
            (req as AuthenticatedRequest).user = {
              id: userId,
              userId: userId,
              email: decoded.email || '',
              role,
              isModerator: role === 'moderator' || role === 'admin',
              isAdmin: role === 'admin',
            };
          }
        } catch (jwtError) {
          // Token invalid, but we continue anyway for optional auth
          logger.debug('Invalid token in optional auth, continuing without user');
        }
      }
    }

    next();
  } catch (error: any) {
    logger.error('Optional authentication error:', error);
    next(); // Continue even if there's an error
  }
};
