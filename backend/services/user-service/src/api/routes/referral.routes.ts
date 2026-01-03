import { Router } from 'express';
import { ReferralController } from '../controllers/referral.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  applyReferralCodeSchema,
  validateReferralCodeSchema,
} from '../validators/referral.validator';

const router = Router();
const referralController = new ReferralController();

/**
 * @swagger
 * tags:
 *   name: Referrals
 *   description: Referral system endpoints
 */

/**
 * @swagger
 * /api/v1/referrals/generate:
 *   post:
 *     summary: Generate a referral code
 *     description: Generates a unique referral code for the authenticated user. Returns existing active code if one exists.
 *     tags: [Referrals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Referral code generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "ABC12DEF"
 *                     maxUses:
 *                       type: integer
 *                       example: 10
 *                     currentUses:
 *                       type: integer
 *                       example: 0
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                     shareUrl:
 *                       type: string
 *                       example: "https://flamoral.com/signup?ref=ABC12DEF"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post(
  '/generate',
  authenticate,
  referralController.generateCode.bind(referralController)
);

/**
 * @swagger
 * /api/v1/referrals/apply:
 *   post:
 *     summary: Apply a referral code
 *     description: Apply a referral code during or after signup. Awards welcome bonus to the new user.
 *     tags: [Referrals]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 description: 8-character referral code
 *                 example: "ABC12DEF"
 *     responses:
 *       200:
 *         description: Referral code applied successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     referralId:
 *                       type: string
 *                     rewards:
 *                       type: object
 *                       properties:
 *                         coins:
 *                           type: integer
 *                           example: 25
 *                         premiumDays:
 *                           type: integer
 *                           example: 3
 *       400:
 *         description: Invalid or expired code, or user already referred
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post(
  '/apply',
  authenticate,
  validate(applyReferralCodeSchema),
  referralController.applyCode.bind(referralController)
);

/**
 * @swagger
 * /api/v1/referrals/stats:
 *   get:
 *     summary: Get referral statistics
 *     description: Get the authenticated user's referral statistics including total referrals, rewards earned, and active referral code.
 *     tags: [Referrals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalReferrals:
 *                       type: integer
 *                     pendingReferrals:
 *                       type: integer
 *                     completedReferrals:
 *                       type: integer
 *                     rewardedReferrals:
 *                       type: integer
 *                     totalCoinsEarned:
 *                       type: integer
 *                     totalPremiumDaysEarned:
 *                       type: integer
 *                     activeCode:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         code:
 *                           type: string
 *                         maxUses:
 *                           type: integer
 *                         currentUses:
 *                           type: integer
 *                         expiresAt:
 *                           type: string
 *                           format: date-time
 *                     shareUrl:
 *                       type: string
 *                       nullable: true
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
  '/stats',
  authenticate,
  referralController.getStats.bind(referralController)
);

/**
 * @swagger
 * /api/v1/referrals/validate:
 *   post:
 *     summary: Validate a referral code
 *     description: Check if a referral code is valid without applying it. Useful for real-time validation during signup.
 *     tags: [Referrals]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 example: "ABC12DEF"
 *     responses:
 *       200:
 *         description: Validation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     valid:
 *                       type: boolean
 *                     message:
 *                       type: string
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post(
  '/validate',
  validate(validateReferralCodeSchema),
  referralController.validateCode.bind(referralController)
);

/**
 * @swagger
 * /api/v1/referrals:
 *   get:
 *     summary: Get all referrals
 *     description: Get all referrals made by the authenticated user.
 *     tags: [Referrals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Referrals retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       referredId:
 *                         type: string
 *                       code:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [pending, completed, rewarded, expired, cancelled]
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       completedAt:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
  '/',
  authenticate,
  referralController.getReferrals.bind(referralController)
);

/**
 * @swagger
 * /api/v1/referrals/my-referral:
 *   get:
 *     summary: Get my referral information
 *     description: Check if the authenticated user was referred by someone and get the referral details.
 *     tags: [Referrals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Referral information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     wasReferred:
 *                       type: boolean
 *                     referral:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         id:
 *                           type: string
 *                         referrerId:
 *                           type: string
 *                         code:
 *                           type: string
 *                         status:
 *                           type: string
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         completedAt:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
  '/my-referral',
  authenticate,
  referralController.getMyReferral.bind(referralController)
);

export default router;
