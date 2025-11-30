/**
 * Role-Based Access Control (RBAC) Middleware
 * Provides role verification, hierarchical permissions, and access control
 */

import { Request, Response, NextFunction } from 'express';
import { db } from '../config/database.config';
import { getRedisClient } from '../config/redis.config';
import { logger } from '../utils/logger';

// Role hierarchy (higher index = more permissions)
export enum UserRole {
  GUEST = 'guest',
  USER = 'user',
  VERIFIED_USER = 'verified_user',
  PREMIUM = 'premium',
  VIP = 'vip',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
}

// Role hierarchy levels
const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.GUEST]: 0,
  [UserRole.USER]: 1,
  [UserRole.VERIFIED_USER]: 2,
  [UserRole.PREMIUM]: 3,
  [UserRole.VIP]: 4,
  [UserRole.MODERATOR]: 5,
  [UserRole.ADMIN]: 6,
  [UserRole.SUPER_ADMIN]: 7
};

// Permission sets for each role
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.GUEST]: ['read:public'],
  [UserRole.USER]: [
    'read:public',
    'read:own_profile',
    'write:own_profile',
    'read:matches',
    'write:messages',
    'read:discovery'
  ],
  [UserRole.VERIFIED_USER]: [
    'read:public',
    'read:own_profile',
    'write:own_profile',
    'read:matches',
    'write:messages',
    'read:discovery',
    'read:detailed_profiles',
    'write:video_calls'
  ],
  [UserRole.PREMIUM]: [
    'read:public',
    'read:own_profile',
    'write:own_profile',
    'read:matches',
    'write:messages',
    'read:discovery',
    'read:detailed_profiles',
    'write:video_calls',
    'read:who_liked',
    'write:super_likes',
    'write:boosts',
    'read:read_receipts'
  ],
  [UserRole.VIP]: [
    'read:public',
    'read:own_profile',
    'write:own_profile',
    'read:matches',
    'write:messages',
    'read:discovery',
    'read:detailed_profiles',
    'write:video_calls',
    'read:who_liked',
    'write:super_likes',
    'write:boosts',
    'read:read_receipts',
    'read:incognito',
    'write:priority_likes',
    'read:analytics_personal'
  ],
  [UserRole.MODERATOR]: [
    'read:all',
    'write:moderation',
    'read:reports',
    'write:user_warnings',
    'write:content_removal',
    'read:user_details'
  ],
  [UserRole.ADMIN]: [
    'read:all',
    'write:all',
    'manage:users',
    'manage:content',
    'read:analytics',
    'read:revenue',
    'manage:ab_tests',
    'manage:campaigns'
  ],
  [UserRole.SUPER_ADMIN]: [
    '*' // All permissions
  ]
};

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      userRole?: UserRole;
      userPermissions?: string[];
    }
  }
}

export class RBACMiddleware {
  /**
   * Load user role and permissions into request
   */
  static async loadUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        req.userRole = UserRole.GUEST;
        req.userPermissions = ROLE_PERMISSIONS[UserRole.GUEST];
        return next();
      }

      // Try to get from Redis cache first
      const redis = getRedisClient();
      const cachedRole = await redis.get(`role:${userId}`);

      if (cachedRole) {
        const roleData = JSON.parse(cachedRole);
        req.userRole = roleData.role as UserRole;
        req.userPermissions = roleData.permissions;
        return next();
      }

      // Get from database
      const user = await db('users')
        .select('role', 'subscription_tier', 'is_verified', 'is_moderator', 'is_admin')
        .where({ id: userId })
        .first();

      if (!user) {
        req.userRole = UserRole.GUEST;
        req.userPermissions = ROLE_PERMISSIONS[UserRole.GUEST];
        return next();
      }

      // Determine role based on user attributes
      let role: UserRole = UserRole.USER;

      if (user.is_admin) {
        role = user.role === 'super_admin' ? UserRole.SUPER_ADMIN : UserRole.ADMIN;
      } else if (user.is_moderator) {
        role = UserRole.MODERATOR;
      } else if (user.subscription_tier === 'vip' || user.subscription_tier === 'diamond') {
        role = UserRole.VIP;
      } else if (user.subscription_tier === 'premium' || user.subscription_tier === 'gold' || user.subscription_tier === 'platinum') {
        role = UserRole.PREMIUM;
      } else if (user.is_verified) {
        role = UserRole.VERIFIED_USER;
      }

      // Get permissions for role (including inherited)
      const permissions = RBACMiddleware.getPermissionsForRole(role);

      // Cache for 5 minutes
      await redis.setex(`role:${userId}`, 300, JSON.stringify({ role, permissions }));

      req.userRole = role;
      req.userPermissions = permissions;
      next();
    } catch (error) {
      logger.error('Error loading user role:', error);
      req.userRole = UserRole.GUEST;
      req.userPermissions = ROLE_PERMISSIONS[UserRole.GUEST];
      next();
    }
  }

  /**
   * Get all permissions for a role (including inherited from lower roles)
   */
  static getPermissionsForRole(role: UserRole): string[] {
    const permissions = new Set<string>();
    const roleLevel = ROLE_HIERARCHY[role];

    // Add permissions from this role and all lower roles
    for (const [r, level] of Object.entries(ROLE_HIERARCHY)) {
      if (level <= roleLevel) {
        const rolePerms = ROLE_PERMISSIONS[r as UserRole] || [];
        rolePerms.forEach(p => permissions.add(p));
      }
    }

    return Array.from(permissions);
  }

  /**
   * Require minimum role level
   */
  static requireRole(...allowedRoles: UserRole[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      const userRole = req.userRole || UserRole.GUEST;
      const userLevel = ROLE_HIERARCHY[userRole];

      // Check if user's role is in allowed roles or has higher level
      const minRequiredLevel = Math.min(...allowedRoles.map(r => ROLE_HIERARCHY[r]));

      if (userLevel >= minRequiredLevel) {
        return next();
      }

      logger.warn('Insufficient role', {
        userId: req.user?.userId,
        userRole,
        requiredRoles: allowedRoles
      });

      return res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions',
          code: 'FORBIDDEN',
          requiredRole: allowedRoles[0]
        }
      });
    };
  }

  /**
   * Require specific permission
   */
  static requirePermission(...requiredPermissions: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      const userPermissions = req.userPermissions || [];

      // Super admin has all permissions
      if (userPermissions.includes('*')) {
        return next();
      }

      // Check if user has all required permissions
      const hasAllPermissions = requiredPermissions.every(
        perm => userPermissions.includes(perm) || userPermissions.includes('write:all') || userPermissions.includes('read:all')
      );

      if (hasAllPermissions) {
        return next();
      }

      logger.warn('Missing permission', {
        userId: req.user?.userId,
        required: requiredPermissions,
        has: userPermissions
      });

      return res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions',
          code: 'FORBIDDEN',
          requiredPermissions
        }
      });
    };
  }

  /**
   * Admin-only middleware (convenience method)
   */
  static adminOnly(req: Request, res: Response, next: NextFunction) {
    return RBACMiddleware.requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN)(req, res, next);
  }

  /**
   * Moderator or higher middleware
   */
  static moderatorOrHigher(req: Request, res: Response, next: NextFunction) {
    return RBACMiddleware.requireRole(UserRole.MODERATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)(req, res, next);
  }

  /**
   * Premium or higher middleware
   */
  static premiumOrHigher(req: Request, res: Response, next: NextFunction) {
    return RBACMiddleware.requireRole(UserRole.PREMIUM, UserRole.VIP, UserRole.MODERATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)(req, res, next);
  }

  /**
   * Invalidate user role cache
   */
  static async invalidateRoleCache(userId: string): Promise<void> {
    const redis = getRedisClient();
    await redis.del(`role:${userId}`);
    logger.info('Role cache invalidated', { userId });
  }
}

export default RBACMiddleware;
