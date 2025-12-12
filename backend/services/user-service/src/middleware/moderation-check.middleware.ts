import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import logger from '../utils/logger';

// Moderation Service URL
const MODERATION_SERVICE_URL = process.env.MODERATION_SERVICE_URL || 'http://localhost:3005';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    userId: string;
    email: string;
    [key: string]: any;
  };
}

/**
 * Middleware to check if user is restricted (banned/suspended)
 * Apply this to routes that require active user status
 */
export const checkUserRestriction = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get userId from authenticated request
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    // Check with moderation service
    const response = await axios.get(
      `${MODERATION_SERVICE_URL}/api/moderation/user/${userId}/restricted`,
      {
        timeout: 5000,
      }
    );

    const { restricted, reason, endsAt } = response.data;

    if (restricted) {
      logger.warn(`Restricted user attempted action: ${userId}`, { reason, endsAt });

      if (endsAt) {
        // Temporary suspension
        res.status(403).json({
          error: 'Account Suspended',
          message: reason || 'Your account is temporarily suspended.',
          suspensionEndsAt: endsAt,
          statusCode: 'ACCOUNT_SUSPENDED',
        });
      } else {
        // Permanent ban
        res.status(403).json({
          error: 'Account Banned',
          message: reason || 'Your account has been permanently banned.',
          statusCode: 'ACCOUNT_BANNED',
        });
      }
      return;
    }

    // User is not restricted, proceed
    next();
  } catch (error: any) {
    // If moderation service is down, log error but allow request
    // (fail open for availability, but log for investigation)
    logger.error('Failed to check user restriction - allowing request:', error.message);
    next();
  }
};

/**
 * Get user's moderation status
 */
export const getUserModerationStatus = async (userId: string): Promise<any> => {
  try {
    const response = await axios.get(
      `${MODERATION_SERVICE_URL}/api/moderation/user/${userId}/status`,
      {
        timeout: 5000,
      }
    );

    return response.data;
  } catch (error: any) {
    logger.error('Failed to get user moderation status:', error.message);
    return null;
  }
};

/**
 * Check if user can perform sensitive actions (requires clean record)
 */
export const requireCleanRecord = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const moderationStatus = await getUserModerationStatus(userId);

    if (!moderationStatus) {
      // If we can't get status, allow but log
      logger.warn(`Could not retrieve moderation status for user ${userId}`);
      next();
      return;
    }

    // Check if user has recent violations
    if (moderationStatus.severeViolations > 0) {
      res.status(403).json({
        error: 'Action Restricted',
        message: 'Your account has violations. This action is temporarily restricted.',
        violations: moderationStatus.totalViolations,
        statusCode: 'VIOLATIONS_EXIST',
      });
      return;
    }

    // Check if user is warned
    if (moderationStatus.status === 'warned' && moderationStatus.totalViolations >= 2) {
      res.status(403).json({
        error: 'Action Restricted',
        message: 'Multiple warnings on your account. Please review our community guidelines.',
        violations: moderationStatus.totalViolations,
        statusCode: 'MULTIPLE_WARNINGS',
      });
      return;
    }

    next();
  } catch (error: any) {
    logger.error('Failed to check user record:', error.message);
    next(); // Fail open
  }
};
