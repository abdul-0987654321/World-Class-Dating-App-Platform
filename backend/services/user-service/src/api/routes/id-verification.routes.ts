/**
 * ID Verification Routes
 * Flamoral Dating Platform
 *
 * API endpoints for ID verification via Jumio/Onfido providers.
 */

import { Router, Request, Response, NextFunction, json } from 'express';
import { idVerificationController } from '../controllers/id-verification.controller';
import { authLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

// Middleware to capture raw body for webhook signature verification
const rawBodyMiddleware = (req: Request, res: Response, next: NextFunction) => {
  let rawBody = '';
  req.on('data', (chunk) => {
    rawBody += chunk.toString();
  });
  req.on('end', () => {
    (req as any).rawBody = rawBody;
    next();
  });
};

/**
 * @swagger
 * /api/v1/verification/id/initiate:
 *   post:
 *     summary: Initiate ID verification
 *     description: Start the ID verification process using Jumio or Onfido
 *     tags: [ID Verification]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - document_type
 *               - country_code
 *             properties:
 *               document_type:
 *                 type: string
 *                 enum: [passport, drivers_license, national_id]
 *                 description: Type of ID document to verify
 *               country_code:
 *                 type: string
 *                 pattern: ^[A-Z]{3}$
 *                 description: ISO 3166-1 alpha-3 country code
 *                 example: USA
 *               redirect_url:
 *                 type: string
 *                 format: uri
 *                 description: URL to redirect after verification completion
 *               locale:
 *                 type: string
 *                 description: Preferred language locale (e.g., 'en', 'es', 'fr')
 *                 default: en
 *               biometric_consent:
 *                 type: boolean
 *                 description: User consent for biometric processing (required in some regions)
 *               region_policy_key:
 *                 type: string
 *                 description: Region policy key for compliance (e.g., 'US-IL', 'US-TX')
 *     responses:
 *       200:
 *         description: Verification initiated successfully
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
 *                     verification_id:
 *                       type: string
 *                       format: uuid
 *                     provider:
 *                       type: string
 *                       enum: [jumio, onfido, mock]
 *                     web_url:
 *                       type: string
 *                       format: uri
 *                       description: URL for web-based verification flow
 *                     sdk_token:
 *                       type: string
 *                       description: Token for mobile SDK integration
 *                     expires_at:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Too many requests
 */
router.post(
  '/initiate',
  authLimiter,
  idVerificationController.initiateVerification.bind(idVerificationController)
);

/**
 * @swagger
 * /api/v1/verification/id/webhook/{provider}:
 *   post:
 *     summary: Webhook endpoint for verification providers
 *     description: Receives verification result callbacks from Jumio/Onfido
 *     tags: [ID Verification]
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [jumio, onfido, mock]
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
  idVerificationController.handleWebhook.bind(idVerificationController)
);

/**
 * @swagger
 * /api/v1/verification/id/status:
 *   get:
 *     summary: Get ID verification status
 *     description: Get the current status of ID verification for the authenticated user
 *     tags: [ID Verification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: verification_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Specific verification ID (optional, defaults to latest)
 *     responses:
 *       200:
 *         description: Verification status retrieved
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
 *                     verification_id:
 *                       type: string
 *                     user_id:
 *                       type: string
 *                     provider:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [initiated, pending, processing, approved, declined, expired, error]
 *                     document_type:
 *                       type: string
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
 *                       description: Detailed verification result (if completed)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Verification not found
 */
router.get(
  '/status',
  idVerificationController.getStatus.bind(idVerificationController)
);

/**
 * @swagger
 * /api/v1/verification/id/history:
 *   get:
 *     summary: Get ID verification history
 *     description: Get all ID verification attempts for the authenticated user
 *     tags: [ID Verification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Verification history retrieved
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
 *                 count:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/history',
  idVerificationController.getHistory.bind(idVerificationController)
);

/**
 * @swagger
 * /api/v1/verification/id/providers:
 *   get:
 *     summary: Get available verification providers
 *     description: Get list of available ID verification providers and supported document types
 *     tags: [ID Verification]
 *     responses:
 *       200:
 *         description: Providers list retrieved
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
 *                     providers:
 *                       type: array
 *                       items:
 *                         type: string
 *                         enum: [jumio, onfido, mock]
 *                     supported_document_types:
 *                       type: array
 *                       items:
 *                         type: string
 */
router.get(
  '/providers',
  idVerificationController.getProviders.bind(idVerificationController)
);

export default router;
