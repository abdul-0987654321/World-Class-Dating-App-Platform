/**
 * Background Check Routes
 * Flamoral Dating Platform
 *
 * API endpoints for Elite tier background checks via Jumio/Onfido.
 */

import { Router, json } from 'express';
import { backgroundCheckController } from '../controllers/background-check.controller';
import { authLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

/**
 * @swagger
 * /api/v1/verification/background:
 *   post:
 *     summary: Initiate background check
 *     description: Start a background check for Elite tier users. Includes identity verification and watchlist screening.
 *     tags: [Background Check]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tier
 *               - consent_given
 *             properties:
 *               tier:
 *                 type: string
 *                 enum: [basic, standard, comprehensive]
 *                 description: Background check tier level
 *               country_code:
 *                 type: string
 *                 pattern: ^[A-Z]{3}$
 *                 description: ISO 3166-1 alpha-3 country code
 *                 example: USA
 *               consent_given:
 *                 type: boolean
 *                 description: User consent for background check (must be true)
 *     responses:
 *       200:
 *         description: Background check initiated successfully
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
 *                     background_check_id:
 *                       type: string
 *                       format: uuid
 *                     provider:
 *                       type: string
 *                       enum: [jumio, onfido]
 *                     status:
 *                       type: string
 *                       enum: [initiated, pending, processing, clear, consider, flagged, error, expired]
 *                     tier:
 *                       type: string
 *                     checks_included:
 *                       type: array
 *                       items:
 *                         type: string
 *                     estimated_completion:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid request or consent not given
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Elite subscription required
 *       429:
 *         description: Too many requests
 */
router.post(
  '/',
  authLimiter,
  backgroundCheckController.initiateBackgroundCheck.bind(backgroundCheckController)
);

/**
 * @swagger
 * /api/v1/verification/background/status:
 *   get:
 *     summary: Get background check status
 *     description: Get the current status of a background check for the authenticated user
 *     tags: [Background Check]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: check_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Specific background check ID (optional, defaults to latest)
 *     responses:
 *       200:
 *         description: Background check status retrieved
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
 *                     background_check_id:
 *                       type: string
 *                     user_id:
 *                       type: string
 *                     provider:
 *                       type: string
 *                     status:
 *                       type: string
 *                     tier:
 *                       type: string
 *                     checks_included:
 *                       type: array
 *                       items:
 *                         type: string
 *                     initiated_at:
 *                       type: string
 *                       format: date-time
 *                     completed_at:
 *                       type: string
 *                       format: date-time
 *                     expires_at:
 *                       type: string
 *                       format: date-time
 *                     result:
 *                       type: object
 *                       description: Detailed result (if completed)
 *                     badge_awarded:
 *                       type: boolean
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Background check not found
 */
router.get(
  '/status',
  backgroundCheckController.getStatus.bind(backgroundCheckController)
);

/**
 * @swagger
 * /api/v1/verification/background/webhook/{provider}:
 *   post:
 *     summary: Webhook endpoint for background check providers
 *     description: Receives background check result callbacks from Jumio/Onfido
 *     tags: [Background Check]
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [jumio, onfido]
 *         description: The verification provider sending the webhook
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Provider-specific webhook payload
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Invalid webhook payload or signature
 *       500:
 *         description: Internal server error
 */
router.post(
  '/webhook/:provider',
  json({ verify: (req, res, buf) => { (req as any).rawBody = buf.toString(); } }),
  backgroundCheckController.handleWebhook.bind(backgroundCheckController)
);

/**
 * @swagger
 * /api/v1/verification/background/tiers:
 *   get:
 *     summary: Get available background check tiers
 *     description: Get list of available background check tiers and their details
 *     tags: [Background Check]
 *     responses:
 *       200:
 *         description: Tiers list retrieved
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
 *                     tiers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           checks:
 *                             type: array
 *                             items:
 *                               type: string
 *                           validity_days:
 *                             type: integer
 *                           price_coins:
 *                             type: integer
 *                           description:
 *                             type: string
 *                     available_providers:
 *                       type: array
 *                       items:
 *                         type: string
 */
router.get(
  '/tiers',
  backgroundCheckController.getTiers.bind(backgroundCheckController)
);

/**
 * @swagger
 * /api/v1/verification/background/eligibility:
 *   get:
 *     summary: Check background check eligibility
 *     description: Check if the authenticated user is eligible for a background check
 *     tags: [Background Check]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Eligibility check result
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
 *                     eligible:
 *                       type: boolean
 *                     has_elite_subscription:
 *                       type: boolean
 *                     providers_available:
 *                       type: boolean
 *                     existing_check:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         status:
 *                           type: string
 *                         tier:
 *                           type: string
 *                         expires_at:
 *                           type: string
 *                           format: date-time
 *                         badge_awarded:
 *                           type: boolean
 *                     reason:
 *                       type: string
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/eligibility',
  backgroundCheckController.checkEligibility.bind(backgroundCheckController)
);

export default router;
