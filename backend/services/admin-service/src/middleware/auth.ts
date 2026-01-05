import { Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';

import { db } from '../infrastructure/database';
import { AuthRequest, AdminRole, Permission, ROLE_PERMISSIONS } from '../types';
import { logger } from '../utils/logger';

// SECURITY: Admin JWT secret MUST be set in environment variables
const JWT_ADMIN_SECRET = process.env.JWT_ADMIN_SECRET;
if (!JWT_ADMIN_SECRET) {
  throw new Error(
    'CRITICAL SECURITY ERROR: JWT_ADMIN_SECRET environment variable is required for admin authentication. Never use default values.'
  );
}

// Validate admin secret strength (minimum 32 characters)
if (JWT_ADMIN_SECRET.length < 32) {
  throw new Error('CRITICAL SECURITY ERROR: JWT_ADMIN_SECRET must be at least 32 characters long');
}

interface JWTPayload {
  adminId: string;
  email: string;
  role: AdminRole;
}

/**
 * Verify JWT token and attach admin user to request
 */
export const authenticateAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Verify JWT
    const decoded = jwt.verify(token, JWT_ADMIN_SECRET) as JWTPayload;

    // Fetch admin user from database
    const admin = await db('admins').where({ id: decoded.adminId, is_active: true }).first();

    if (!admin) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Attach admin to request
    req.admin = {
      id: admin.id,
      email: admin.email,
      firstName: admin.first_name,
      lastName: admin.last_name,
      role: admin.role as AdminRole,
      permissions: ROLE_PERMISSIONS[admin.role as AdminRole] || [],
      isActive: admin.is_active,
      lastLogin: admin.last_login,
      createdAt: admin.created_at,
      updatedAt: admin.updated_at,
    };

    // Update last activity
    await db('admins').where({ id: admin.id }).update({ last_activity: db.fn.now() });

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Check if admin has required permission
 */
export const requirePermission = (permission: Permission) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.admin) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const hasPermission = req.admin.permissions.includes(permission);

    if (!hasPermission) {
      logger.warn(`Permission denied: ${req.admin.email} attempted ${permission}`);
      res.status(403).json({
        error: 'Insufficient permissions',
        required: permission,
      });
      return;
    }

    next();
  };
};

/**
 * Check if admin has required role (or higher in hierarchy)
 */
export const requireRole = (role: AdminRole) => {
  const roleHierarchy = {
    [AdminRole.SUPER_ADMIN]: 5,
    [AdminRole.ADMIN]: 4,
    [AdminRole.MODERATOR]: 3,
    [AdminRole.SUPPORT]: 2,
    [AdminRole.ANALYST]: 1,
  };

  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.admin) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userRoleLevel = roleHierarchy[req.admin.role];
    const requiredRoleLevel = roleHierarchy[role];

    if (userRoleLevel < requiredRoleLevel) {
      logger.warn(
        `Role requirement not met: ${req.admin.email} has ${req.admin.role}, needs ${role}`
      );
      res.status(403).json({
        error: 'Insufficient role',
        required: role,
        current: req.admin.role,
      });
      return;
    }

    next();
  };
};

/**
 * Check if admin can access specific user data (for privacy compliance)
 */
export const canAccessUserData = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.params.userId || req.body.userId;

  if (!userId) {
    res.status(400).json({ error: 'User ID required' });
    return;
  }

  // Super admins can access anyone
  if (req.admin?.role === AdminRole.SUPER_ADMIN) {
    next();
    return;
  }

  // Check if user is in a restricted category
  const user = await db('users').where({ id: userId }).first();

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // Add additional checks as needed (e.g., VIP users, staff, etc.)
  next();
};

/**
 * Generate admin JWT token
 */
export const generateAdminToken = (admin: {
  id: string;
  email: string;
  role: AdminRole;
}): string => {
  const expiresIn = (process.env.ADMIN_SESSION_DURATION || '12h') as SignOptions['expiresIn'];
  const options: SignOptions = {
    expiresIn,
  };

  return jwt.sign(
    {
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
    },
    JWT_ADMIN_SECRET,
    options
  );
};
