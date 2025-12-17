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
 *   post:
 *     summary: Create a new profile
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
 *               interests:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Profile created successfully
 *       400:
 *         description: Validation error or profile already exists
 */
router.post(
  '/',
  authenticate,
  validate(updateProfileSchema),
  profileController.createProfile.bind(profileController)
);

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

/**
 * @swagger
 * /api/profile:
 *   delete:
 *     summary: Delete current user's profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile deleted successfully
 *       400:
 *         description: Failed to delete profile
 *       401:
 *         description: Unauthorized
 */
router.delete('/', authenticate, profileController.deleteProfile.bind(profileController));

/**
 * @swagger
 * /api/profile/completion:
 *   get:
 *     summary: Get profile completion status
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile completion status retrieved
 */
router.get('/completion', authenticate, profileController.getProfileCompletion.bind(profileController));

/**
 * @swagger
 * /api/profile/analytics:
 *   get:
 *     summary: Get profile analytics (views, likes, etc.)
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile analytics retrieved
 */
router.get('/analytics', authenticate, profileController.getProfileAnalytics.bind(profileController));

/**
 * @swagger
 * /api/profile/last-active:
 *   post:
 *     summary: Update last active timestamp
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Last active timestamp updated
 */
router.post('/last-active', authenticate, profileController.updateLastActive.bind(profileController));

/**
 * @swagger
 * /api/profile/search:
 *   get:
 *     summary: Search profiles
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *       - in: query
 *         name: interests
 *         schema:
 *           type: string
 *       - in: query
 *         name: relationshipType
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Search results returned
 */
router.get('/search', authenticate, profileController.searchProfiles.bind(profileController));

/**
 * @swagger
 * /api/profile/user/:userId:
 *   get:
 *     summary: Get another user's profile by ID
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *       404:
 *         description: Profile not found
 */
router.get('/user/:userId', authenticate, profileController.getProfileByUserId.bind(profileController));

export default router;
