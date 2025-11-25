import { Router } from 'express';
import { ProfileController } from '../controllers/profile.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { updateProfileSchema } from '../validators/profile.validator';

const router = Router();
const profileController = new ProfileController();

/**
 * @swagger
 * /api/profile:
 *   get:
 *     summary: Get current user's profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProfileResponse'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       404:
 *         description: Profile not found
 */
router.get('/', authenticate, profileController.getProfile.bind(profileController));

/**
 * @swagger
 * /api/profile:
 *   put:
 *     summary: Update current user's profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bio:
 *                 type: string
 *                 maxLength: 500
 *                 example: Coffee enthusiast and adventure seeker
 *               occupation:
 *                 type: string
 *                 maxLength: 100
 *                 example: Software Engineer
 *               education:
 *                 type: string
 *                 maxLength: 100
 *                 example: B.S. Computer Science
 *               height:
 *                 type: integer
 *                 minimum: 100
 *                 maximum: 250
 *                 example: 175
 *                 description: Height in centimeters
 *               city:
 *                 type: string
 *                 example: San Francisco
 *               state:
 *                 type: string
 *                 example: California
 *               country:
 *                 type: string
 *                 example: USA
 *               latitude:
 *                 type: number
 *                 minimum: -90
 *                 maximum: 90
 *                 example: 37.7749
 *               longitude:
 *                 type: number
 *                 minimum: -180
 *                 maximum: 180
 *                 example: -122.4194
 *               interests:
 *                 type: array
 *                 items:
 *                   type: string
 *                 maxItems: 10
 *                 example: ["hiking", "photography", "cooking"]
 *               languages:
 *                 type: array
 *                 items:
 *                   type: string
 *                 maxItems: 10
 *                 example: ["English", "Spanish"]
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProfileResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Profile not found
 */
router.put(
  '/',
  authenticate,
  validate(updateProfileSchema),
  profileController.updateProfile.bind(profileController)
);

export default router;
