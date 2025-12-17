import { Router } from 'express';
import { PrivacyController } from '../controllers/privacy.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  updatePrivacySettingsSchema,
  toggleIncognitoSchema,
  applyPresetSchema,
} from '../validators/privacy.validator';

const router = Router();
const privacyController = new PrivacyController();

/**
 * @swagger
 * /api/privacy/settings:
 *   get:
 *     summary: Get privacy settings
 *     description: Returns the user's current privacy settings
 *     tags: [Privacy]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Privacy settings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/PrivacySettings'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/settings', authenticate, privacyController.getPrivacySettings.bind(privacyController));

/**
 * @swagger
 * /api/privacy/settings:
 *   put:
 *     summary: Update privacy settings
 *     description: Update one or more privacy settings for the user
 *     tags: [Privacy]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               profileVisibility:
 *                 type: string
 *                 enum: [everyone, matches_only, private]
 *                 description: Who can see the user's profile
 *               showDistance:
 *                 type: boolean
 *                 description: Show distance on profile
 *               showAge:
 *                 type: boolean
 *                 description: Show age on profile
 *               showOnlineStatus:
 *                 type: boolean
 *                 description: Show when user is online
 *               incognitoMode:
 *                 type: boolean
 *                 description: Enable incognito browsing mode
 *               showActivityStatus:
 *                 type: boolean
 *                 description: Show activity status
 *               readReceipts:
 *                 type: boolean
 *                 description: Send read receipts for messages
 *               allowSearchByPhone:
 *                 type: boolean
 *                 description: Allow others to find by phone number
 *               allowSearchByEmail:
 *                 type: boolean
 *                 description: Allow others to find by email
 *     responses:
 *       200:
 *         description: Privacy settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/PrivacySettings'
 *       400:
 *         description: Invalid settings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/settings', authenticate, validate(updatePrivacySettingsSchema), privacyController.updatePrivacySettings.bind(privacyController));

/**
 * @swagger
 * /api/privacy/incognito/toggle:
 *   post:
 *     summary: Toggle incognito mode
 *     description: Enable or disable incognito mode for browsing profiles anonymously
 *     tags: [Privacy]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - enabled
 *             properties:
 *               enabled:
 *                 type: boolean
 *                 description: Enable or disable incognito mode
 *                 example: true
 *     responses:
 *       200:
 *         description: Incognito mode toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/PrivacySettings'
 *       403:
 *         description: Feature not available for current subscription tier
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/incognito/toggle', authenticate, validate(toggleIncognitoSchema), privacyController.toggleIncognito.bind(privacyController));

/**
 * @swagger
 * /api/privacy/preset:
 *   post:
 *     summary: Apply privacy preset
 *     description: Apply a predefined set of privacy settings (public, private, or discreet)
 *     tags: [Privacy]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - preset
 *             properties:
 *               preset:
 *                 type: string
 *                 enum: [public, private, discreet]
 *                 description: |
 *                   Preset privacy configurations:
 *                   - public: Maximum visibility
 *                   - private: Minimal visibility, matches only
 *                   - discreet: Balanced privacy settings
 *                 example: private
 *     responses:
 *       200:
 *         description: Privacy preset applied successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/PrivacySettings'
 *       400:
 *         description: Invalid preset
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/preset', authenticate, validate(applyPresetSchema), privacyController.applyPreset.bind(privacyController));

export default router;
