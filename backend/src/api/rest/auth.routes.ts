/**
 * Authentication Routes
 * Login, Register, Logout, Token Refresh
 */

import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthMiddleware } from '../../middleware/auth.middleware.enhanced';
import { Sanitizer } from '../../utils/sanitizer';
import { logger } from '../../utils/logger';
import { AuthService } from '../../services/core';
import { UserRepository, ProfileRepository } from '../../repositories';
import { db, mongodb } from '../../config/database.config';

const router = Router();

// Initialize services
const userRepo = new UserRepository(db);
const profileRepo = new ProfileRepository(db);
const authService = new AuthService(userRepo, profileRepo);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts, please try again later',
      code: 'AUTH_RATE_LIMIT',
    },
  },
});

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', authLimiter, async (req: Request, res: Response) => {
  try {
    // Sanitize inputs
    const email = Sanitizer.sanitizeEmail(req.body.email);
    const phone = req.body.phone ? Sanitizer.sanitizePhone(req.body.phone) : undefined;
    const firstName = Sanitizer.sanitizeString(req.body.firstName);
    const lastName = req.body.lastName ? Sanitizer.sanitizeString(req.body.lastName) : undefined;
    const { password, dateOfBirth, gender } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !dateOfBirth || !gender) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Missing required fields',
          code: 'MISSING_FIELDS',
        },
      });
    }

    // Validate password
    const passwordValidation = Sanitizer.validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Password does not meet requirements',
          code: 'INVALID_PASSWORD',
          details: passwordValidation.errors,
        },
      });
    }

    // Validate date of birth
    const dobValidation = Sanitizer.validateDate(dateOfBirth);
    if (!dobValidation.valid) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid date of birth',
          code: 'INVALID_DOB',
        },
      });
    }

    // Register user
    const result = await authService.register({
      email,
      phone,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      password,
    });

    // Create session
    await AuthMiddleware.createSession(result.user.id, { email: result.user.email });

    logger.info(`User registered: ${result.user.id}`);

    res.status(201).json({
      success: true,
      data: {
        message: 'Registration successful',
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  } catch (error: any) {
    logger.error('Registration error:', error);
    res.status(400).json({
      success: false,
      error: {
        message: error.message || 'Registration failed',
        code: 'REGISTRATION_ERROR',
      },
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
router.post(
  '/login',
  authLimiter,
  AuthMiddleware.checkAuthRateLimit,
  async (req: Request, res: Response) => {
    try {
      const email = Sanitizer.sanitizeEmail(req.body.email);
      const password = req.body.password;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Email and password are required',
            code: 'MISSING_CREDENTIALS',
          },
        });
      }

      // Authenticate user
      const result = await authService.login(email, password);

      // Clear failed attempts
      AuthMiddleware.clearFailedAttempts(email);

      // Create session
      await AuthMiddleware.createSession(result.user.id, { email: result.user.email });

      logger.info(`User logged in: ${result.user.id}`);

      res.status(200).json({
        success: true,
        data: {
          message: 'Login successful',
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      });
    } catch (error: any) {
      logger.error('Login error:', error);
      AuthMiddleware.recordFailedAttempt(req.body.email);

      res.status(401).json({
        success: false,
        error: {
          message: error.message || 'Invalid credentials',
          code: 'LOGIN_ERROR',
        },
      });
    }
  }
);

/**
 * POST /api/auth/logout
 * Logout user and revoke token
 * Requires: Authentication
 */
router.post('/logout', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      // Revoke token
      await AuthMiddleware.revokeToken(token);

      // Destroy session
      if (req.user) {
        await AuthMiddleware.destroySession(req.user.userId);
      }
    }

    logger.info(`User logged out: ${req.user?.userId}`);

    res.status(200).json({
      success: true,
      data: {
        message: 'Logout successful',
      },
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Logout failed',
        code: 'LOGOUT_ERROR',
      },
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh JWT token
 * Requires: Valid refresh token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.body.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Refresh token is required',
          code: 'MISSING_REFRESH_TOKEN',
        },
      });
    }

    // Refresh token
    const result = await authService.refreshAccessToken(refreshToken);

    res.status(200).json({
      success: true,
      data: {
        message: 'Token refreshed',
        accessToken: result.accessToken,
      },
    });
  } catch (error: any) {
    logger.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      error: {
        message: error.message || 'Token refresh failed',
        code: 'REFRESH_ERROR',
      },
    });
  }
});

/**
 * POST /api/auth/request-password-reset
 * Request password reset email
 */
router.post('/request-password-reset', authLimiter, async (req: Request, res: Response) => {
  try {
    const email = Sanitizer.sanitizeEmail(req.body.email);

    if (!email) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Email is required',
          code: 'MISSING_EMAIL',
        },
      });
    }

    await authService.requestPasswordReset(email);

    // Always return success to prevent email enumeration
    res.status(200).json({
      success: true,
      data: {
        message: 'If an account exists with this email, a password reset link has been sent',
      },
    });
  } catch (error) {
    logger.error('Password reset request error:', error);

    // Still return success to prevent email enumeration
    res.status(200).json({
      success: true,
      data: {
        message: 'If an account exists with this email, a password reset link has been sent',
      },
    });
  }
});

/**
 * POST /api/auth/change-password
 * Change user password (requires authentication)
 */
router.post('/change-password', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Current password and new password are required',
          code: 'MISSING_PASSWORDS',
        },
      });
    }

    // Validate new password
    const passwordValidation = Sanitizer.validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'New password does not meet requirements',
          code: 'INVALID_PASSWORD',
          details: passwordValidation.errors,
        },
      });
    }

    await authService.changePassword(req.user!.userId, currentPassword, newPassword);

    logger.info(`Password changed: ${req.user!.userId}`);

    res.status(200).json({
      success: true,
      data: {
        message: 'Password changed successfully',
      },
    });
  } catch (error: any) {
    logger.error('Change password error:', error);
    res.status(400).json({
      success: false,
      error: {
        message: error.message || 'Password change failed',
        code: 'CHANGE_PASSWORD_ERROR',
      },
    });
  }
});

export default router;
