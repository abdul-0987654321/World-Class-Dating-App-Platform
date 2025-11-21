import { Request, Response, NextFunction } from 'express';
import db from '../../infrastructure/database/connection';
import { calculateAge, MINIMUM_AGE } from '../../utils/age-verification';
import { createLogger } from '@connectsphere/shared';

const logger = createLogger('age-verification-middleware');

/**
 * Middleware to verify user meets minimum age requirement
 *
 * This middleware checks if the authenticated user has a valid date of birth
 * and is at least 18 years old. If not, it returns a 403 Forbidden response.
 *
 * Usage: Add this middleware to routes that require age verification
 */
export async function requireAgeVerification(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    // Get user's date of birth from database
    const user = await db('users')
      .where({ id: userId })
      .select('date_of_birth', 'is_age_verified')
      .first();

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    // Check if user has provided date of birth
    if (!user.date_of_birth) {
      logger.warn(`User ${userId} attempted to access age-restricted content without DOB`);
      res.status(403).json({
        success: false,
        error: 'Date of birth required',
        message: 'You must provide your date of birth to access this feature',
        action: 'update_profile',
      });
      return;
    }

    // Calculate and verify age
    const age = calculateAge(user.date_of_birth);

    if (age < MINIMUM_AGE) {
      logger.warn(`Underage user ${userId} (age ${age}) attempted to access restricted content`);
      res.status(403).json({
        success: false,
        error: 'Age requirement not met',
        message: `You must be at least ${MINIMUM_AGE} years old to use this service`,
        action: 'account_restricted',
      });
      return;
    }

    // Mark user as age verified if not already
    if (!user.is_age_verified) {
      await db('users')
        .where({ id: userId })
        .update({
          is_age_verified: true,
          updated_at: new Date(),
        });
      logger.info(`User ${userId} age verified (age ${age})`);
    }

    // Age verification passed, continue to route
    next();
  } catch (error: any) {
    logger.error('Error in age verification middleware:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during age verification',
    });
  }
}

/**
 * Middleware to check if user is age eligible (soft check)
 *
 * This middleware adds age information to the request object but doesn't
 * block access. Useful for analytics and feature flagging.
 */
export async function checkAgeEligibility(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;

    if (!userId) {
      next();
      return;
    }

    const user = await db('users')
      .where({ id: userId })
      .select('date_of_birth', 'is_age_verified')
      .first();

    if (user && user.date_of_birth) {
      const age = calculateAge(user.date_of_birth);
      req.userAge = age;
      req.isAgeVerified = user.is_age_verified || age >= MINIMUM_AGE;
    }

    next();
  } catch (error: any) {
    logger.error('Error in age eligibility check:', error);
    // Don't block request on error, just continue
    next();
  }
}

// Extend Express Request type to include age information
declare global {
  namespace Express {
    interface Request {
      userAge?: number;
      isAgeVerified?: boolean;
    }
  }
}

export default {
  requireAgeVerification,
  checkAgeEligibility,
};
