/**
 * User Routes
 * User profile management with full security protection
 * Demonstrates: Authentication, CSRF Protection, Input Sanitization
 */

import { Router, Request, Response } from 'express';
import { AuthMiddleware } from '../../middleware/auth.middleware.enhanced';
import { CSRFProtection } from '../../middleware/csrf.middleware';
import { Sanitizer } from '../../utils/sanitizer';
import { logger } from '../../utils/logger';
import { UserService } from '../../services/core';
import { UserRepository } from '../../repositories';
import { db } from '../../config/database.config';

const router = Router();

// Initialize services
const userRepo = new UserRepository(db);
const userService = new UserService(userRepo);

/**
 * GET /api/users/me
 * Get current user profile
 * Requires: Authentication
 */
router.get('/me', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const user = await userService.getUserById(req.user!.userId);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    logger.error('Get user error:', error);
    res.status(404).json({
      success: false,
      error: {
        message: error.message || 'User not found',
        code: 'USER_NOT_FOUND',
      },
    });
  }
});

/**
 * PUT /api/users/me
 * Update current user profile
 * Requires: Authentication + CSRF Protection
 */
router.put(
  '/me',
  AuthMiddleware.verifyToken,
  CSRFProtection.protect(),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Authentication required',
            code: 'NO_AUTH',
          },
        });
      }

      // Sanitize inputs
      const updates: any = {};
      
      if (req.body.firstName) {
        updates.firstName = Sanitizer.sanitizeString(req.body.firstName);
      }
      
      if (req.body.lastName) {
        updates.lastName = Sanitizer.sanitizeString(req.body.lastName);
      }
      
      if (req.body.phone) {
        updates.phone = Sanitizer.sanitizePhone(req.body.phone);
      }
      
      if (req.body.bio) {
        updates.bio = Sanitizer.stripHTML(req.body.bio);
      }
      
      if (req.body.birthDate) {
        updates.birthDate = Sanitizer.sanitizeDate(req.body.birthDate);
        if (!updates.birthDate) {
          return res.status(400).json({
            success: false,
            error: {
              message: 'Invalid birth date',
              code: 'INVALID_DATE',
            },
          });
        }
      }

      // TODO: Update user in database
      // const updatedUser = await userService.update(userId, updates);

      res.status(200).json({
        success: true,
        data: {
          message: 'Profile updated successfully (TODO: implement actual logic)',
          // user: updatedUser
        },
      });
    } catch (error) {
      logger.error('Update user error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update profile',
          code: 'USER_UPDATE_ERROR',
        },
      });
    }
  }
);

/**
 * DELETE /api/users/me
 * Delete current user account
 * Requires: Authentication + CSRF Protection
 */
router.delete(
  '/me',
  AuthMiddleware.verifyToken,
  CSRFProtection.protect(),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Authentication required',
            code: 'NO_AUTH',
          },
        });
      }

      // TODO: Soft delete user account
      // await userService.softDelete(userId);

      // Revoke token and destroy session
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token) {
        await AuthMiddleware.revokeToken(token);
        await AuthMiddleware.destroySession(userId);
      }

      res.status(200).json({
        success: true,
        data: {
          message: 'Account deleted successfully',
        },
      });
    } catch (error) {
      logger.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to delete account',
          code: 'USER_DELETE_ERROR',
        },
      });
    }
  }
);

/**
 * GET /api/users/:userId
 * Get user by ID
 * Requires: Authentication
 */
router.get('/:userId', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'User ID is required',
          code: 'MISSING_USER_ID',
        },
      });
    }

    // TODO: Fetch user from database
    // const user = await userService.findById(userId);
    // if (!user) {
    //   return res.status(404).json({ error: 'User not found' });
    // }

    res.status(200).json({
      success: true,
      data: {
        message: 'User retrieved (TODO: implement actual logic)',
        // user
      },
    });
  } catch (error) {
    logger.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve user',
        code: 'USER_GET_ERROR',
      },
    });
  }
});

/**
 * POST /api/users/search
 * Search users
 * Requires: Authentication
 */
router.post('/search', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    // Sanitize search query
    const query = Sanitizer.sanitizeSearchQuery(req.body.query || '');
    const pagination = Sanitizer.sanitizePagination(req.body.page, req.body.limit);

    // TODO: Search users in database
    // const results = await userService.search(query, pagination);

    res.status(200).json({
      success: true,
      data: {
        message: 'Search completed (TODO: implement actual logic)',
        query,
        pagination,
        // results
      },
    });
  } catch (error) {
    logger.error('User search error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Search failed',
        code: 'SEARCH_ERROR',
      },
    });
  }
});

export default router;
