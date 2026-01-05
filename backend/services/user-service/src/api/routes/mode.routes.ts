import { Router } from 'express';

import { ModeController } from '../controllers/mode.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const modeController = new ModeController();

/**
 * @swagger
 * /api/users/me/modes:
 *   get:
 *     summary: Get all modes for current user
 *     tags: [Modes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Modes retrieved successfully
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
 *                     date:
 *                       $ref: '#/components/schemas/UserMode'
 *                     friends:
 *                       $ref: '#/components/schemas/UserMode'
 *                     network:
 *                       $ref: '#/components/schemas/UserMode'
 *                     current_mode:
 *                       type: string
 *                       enum: [date, friends, network]
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, modeController.getUserModes.bind(modeController));

/**
 * @swagger
 * /api/users/me/modes/{mode}:
 *   get:
 *     summary: Get a specific mode for current user
 *     tags: [Modes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mode
 *         required: true
 *         schema:
 *           type: string
 *           enum: [date, friends, network]
 *     responses:
 *       200:
 *         description: Mode retrieved successfully
 *       400:
 *         description: Invalid mode
 *       401:
 *         description: Unauthorized
 */
router.get('/:mode', authenticate, modeController.getUserMode.bind(modeController));

/**
 * @swagger
 * /api/users/me/modes/{mode}:
 *   put:
 *     summary: Update a specific mode
 *     tags: [Modes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mode
 *         required: true
 *         schema:
 *           type: string
 *           enum: [date, friends, network]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 *               preferences:
 *                 type: object
 *     responses:
 *       200:
 *         description: Mode updated successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
router.put('/:mode', authenticate, modeController.updateUserMode.bind(modeController));

/**
 * @swagger
 * /api/users/me/modes/{mode}/enable:
 *   post:
 *     summary: Enable a specific mode
 *     tags: [Modes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mode
 *         required: true
 *         schema:
 *           type: string
 *           enum: [date, friends, network]
 *     responses:
 *       200:
 *         description: Mode enabled successfully
 *       400:
 *         description: Invalid mode
 *       401:
 *         description: Unauthorized
 */
router.post('/:mode/enable', authenticate, modeController.enableMode.bind(modeController));

/**
 * @swagger
 * /api/users/me/modes/{mode}/disable:
 *   post:
 *     summary: Disable a specific mode
 *     tags: [Modes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mode
 *         required: true
 *         schema:
 *           type: string
 *           enum: [date, friends, network]
 *     responses:
 *       200:
 *         description: Mode disabled successfully
 *       400:
 *         description: Cannot disable primary mode or invalid request
 *       401:
 *         description: Unauthorized
 */
router.post('/:mode/disable', authenticate, modeController.disableMode.bind(modeController));

/**
 * @swagger
 * /api/users/me/modes/switch:
 *   post:
 *     summary: Switch to a different mode
 *     tags: [Modes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mode
 *             properties:
 *               mode:
 *                 type: string
 *                 enum: [date, friends, network]
 *     responses:
 *       200:
 *         description: Mode switched successfully
 *       400:
 *         description: Mode not enabled or invalid
 *       401:
 *         description: Unauthorized
 */
router.post('/switch', authenticate, modeController.switchMode.bind(modeController));

/**
 * @swagger
 * /api/users/me/modes/{mode}/preferences:
 *   put:
 *     summary: Update preferences for a specific mode
 *     tags: [Modes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mode
 *         required: true
 *         schema:
 *           type: string
 *           enum: [date, friends, network]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Mode-specific preferences
 *     responses:
 *       200:
 *         description: Preferences updated successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
router.put(
  '/:mode/preferences',
  authenticate,
  modeController.updateModePreferences.bind(modeController)
);

export default router;
