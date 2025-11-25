/**
 * Referral API Routes
 * Referral codes, tracking, and rewards
 */

import { Router, Request, Response, NextFunction } from 'express';
import { referralService } from '../../services/core/Referral.service';
import { logger } from '../../utils/logger';

const router = Router();

// Middleware to extract user ID
const getUserId = (req: Request): string => {
  return (req as any).user?.id || req.headers['x-user-id'] as string || 'demo_user';
};

/**
 * @swagger
 * /api/referrals/code:
 *   get:
 *     summary: Get user's referral code
 *     tags: [Referrals]
 */
router.get('/code', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const code = await referralService.getReferralCode(userId);

    res.json({
      success: true,
      data: code
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/referrals/code/custom:
 *   post:
 *     summary: Set custom referral code (premium)
 *     tags: [Referrals]
 */
router.post('/code/custom', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: { message: 'Code is required', code: 'MISSING_CODE' }
      });
    }

    const result = await referralService.setCustomCode(userId, code);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: { message: result.error, code: 'CUSTOM_CODE_FAILED' }
      });
    }

    res.json({
      success: true,
      data: result.code
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/referrals/apply:
 *   post:
 *     summary: Apply a referral code
 *     tags: [Referrals]
 */
router.post('/apply', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: { message: 'Referral code is required', code: 'MISSING_CODE' }
      });
    }

    const result = await referralService.applyReferralCode(userId, code);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: { message: result.error, code: 'APPLY_FAILED' }
      });
    }

    res.json({
      success: true,
      data: result.referral
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/referrals/stats:
 *   get:
 *     summary: Get user's referral statistics
 *     tags: [Referrals]
 */
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const stats = await referralService.getReferralStats(userId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/referrals/history:
 *   get:
 *     summary: Get user's referral history
 *     tags: [Referrals]
 */
router.get('/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const history = await referralService.getReferralHistory(userId);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/referrals/link:
 *   get:
 *     summary: Get shareable referral link
 *     tags: [Referrals]
 */
router.get('/link', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const link = await referralService.getReferralLink(userId);

    res.json({
      success: true,
      data: { link }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/referrals/leaderboard:
 *   get:
 *     summary: Get referral leaderboard
 *     tags: [Referrals]
 */
router.get('/leaderboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const leaderboard = await referralService.getLeaderboard(limit);

    res.json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/referrals/validate:
 *   post:
 *     summary: Check and validate referral based on user activity
 *     tags: [Referrals]
 */
router.post('/validate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { photoCount, hasBio, activeDays, phoneVerified } = req.body;

    await referralService.checkReferralValidation(userId, {
      photoCount: photoCount || 0,
      hasBio: hasBio || false,
      activeDays: activeDays || 0,
      phoneVerified: phoneVerified || false,
    });

    res.json({
      success: true,
      data: { message: 'Validation check completed' }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
