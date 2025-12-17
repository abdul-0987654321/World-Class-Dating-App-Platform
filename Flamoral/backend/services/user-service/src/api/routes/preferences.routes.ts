import { Router } from 'express';
import { PreferencesController } from '../controllers/preferences.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { updatePreferencesSchema } from '../validators/preferences.validator';

const router = Router();
const preferencesController = new PreferencesController();

/**
 * @swagger
 * /api/preferences:
 *   get:
 *     summary: Get current user's dating preferences
 *     tags: [Preferences]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preferences retrieved successfully
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
 *                     id:
 *                       type: string
 *                     user_id:
 *                       type: string
 *                     age_min:
 *                       type: integer
 *                     age_max:
 *                       type: integer
 *                     distance_max:
 *                       type: integer
 *                     genders:
 *                       type: array
 *                       items:
 *                         type: string
 *                     show_me:
 *                       type: string
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       404:
 *         description: Preferences not found
 */
router.get('/', authenticate, preferencesController.getPreferences.bind(preferencesController));

/**
 * @swagger
 * /api/preferences:
 *   put:
 *     summary: Update current user's dating preferences
 *     tags: [Preferences]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               age_min:
 *                 type: integer
 *                 minimum: 18
 *                 maximum: 100
 *                 example: 25
 *               age_max:
 *                 type: integer
 *                 minimum: 18
 *                 maximum: 100
 *                 example: 35
 *               distance_max:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 500
 *                 example: 50
 *                 description: Maximum distance in kilometers
 *               genders:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [male, female, non-binary, other]
 *                 example: ["male", "female"]
 *               show_me:
 *                 type: string
 *                 enum: [men, women, everyone]
 *                 example: everyone
 *     responses:
 *       200:
 *         description: Preferences updated successfully
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
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Preferences not found
 */
router.put(
  '/',
  authenticate,
  validate(updatePreferencesSchema),
  preferencesController.updatePreferences.bind(preferencesController)
);

export default router;
