import { Router } from 'express';
import { DiscoveryController } from '../controllers/discovery.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const discoveryController = new DiscoveryController();

/**
 * @swagger
 * /api/discovery:
 *   get:
 *     summary: Get discovery profiles based on preferences
 *     tags: [Discovery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of profiles to return
 *       - in: query
 *         name: age_min
 *         schema:
 *           type: integer
 *         description: Minimum age filter
 *       - in: query
 *         name: age_max
 *         schema:
 *           type: integer
 *         description: Maximum age filter
 *       - in: query
 *         name: distance_max
 *         schema:
 *           type: integer
 *         description: Maximum distance in kilometers
 *       - in: query
 *         name: gender
 *         schema:
 *           type: string
 *           enum: [male, female, other]
 *         description: Gender filter
 *     responses:
 *       200:
 *         description: Discovery profiles retrieved successfully
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
router.get('/', authenticate, discoveryController.getDiscoveryProfiles.bind(discoveryController));

/**
 * @swagger
 * /api/discovery/{profileId}:
 *   get:
 *     summary: Get a specific profile by ID
 *     tags: [Discovery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: profileId
 *         required: true
 *         schema:
 *           type: string
 *         description: Profile ID to retrieve
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Profile not found
 */
router.get('/:profileId', authenticate, discoveryController.getProfileById.bind(discoveryController));

export default router;
