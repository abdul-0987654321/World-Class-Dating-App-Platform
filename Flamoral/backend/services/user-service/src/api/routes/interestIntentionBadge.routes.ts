import { Router } from 'express';
import { InterestIntentionBadgeController } from '../controllers/interestIntentionBadge.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  updateUserInterestBadgesSchema,
  updateUserIntentionBadgesSchema,
  addInterestBadgeSchema,
  addIntentionBadgeSchema,
  uuidParamSchema,
  categoryParamSchema,
} from '../validators/interestIntentionBadge.validator';

const router = Router();
const badgeController = new InterestIntentionBadgeController();

// ============================================
// GET ALL AVAILABLE BADGES (Public or Authenticated)
// ============================================

/**
 * @swagger
 * /api/badges/interests:
 *   get:
 *     summary: Get all available interest badges
 *     tags: [Badges]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all interest badges
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
 *                     $ref: '#/components/schemas/InterestBadge'
 */
router.get(
  '/interests',
  authenticate,
  badgeController.getAllInterestBadges.bind(badgeController)
);

/**
 * @swagger
 * /api/badges/interests/category/{category}:
 *   get:
 *     summary: Get interest badges by category
 *     tags: [Badges]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *           enum: [lifestyle, sports_fitness, arts_culture, food_drink, entertainment, outdoor, social, tech, other]
 *     responses:
 *       200:
 *         description: List of interest badges in the category
 */
router.get(
  '/interests/category/:category',
  authenticate,
  validate(categoryParamSchema, 'params'),
  badgeController.getInterestBadgesByCategory.bind(badgeController)
);

/**
 * @swagger
 * /api/badges/intentions:
 *   get:
 *     summary: Get all available intention badges
 *     tags: [Badges]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all intention badges
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
 *                     $ref: '#/components/schemas/IntentionBadge'
 */
router.get(
  '/intentions',
  authenticate,
  badgeController.getAllIntentionBadges.bind(badgeController)
);

// ============================================
// GET USER'S SELECTED BADGES
// ============================================

/**
 * @swagger
 * /api/badges/users/me:
 *   get:
 *     summary: Get current user's badges profile (both interest and intention)
 *     tags: [Badges]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's complete badge profile
 */
router.get(
  '/users/me',
  authenticate,
  badgeController.getUserBadgesProfile.bind(badgeController)
);

/**
 * @swagger
 * /api/badges/users/{userId}:
 *   get:
 *     summary: Get a user's badges profile
 *     tags: [Badges]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User's complete badge profile
 */
router.get(
  '/users/:userId',
  authenticate,
  validate(uuidParamSchema, 'params'),
  badgeController.getUserBadgesProfile.bind(badgeController)
);

/**
 * @swagger
 * /api/badges/users/me/interests:
 *   get:
 *     summary: Get current user's interest badges
 *     tags: [Badges]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's interest badges
 */
router.get(
  '/users/me/interests',
  authenticate,
  badgeController.getUserInterestBadges.bind(badgeController)
);

/**
 * @swagger
 * /api/badges/users/me/intentions:
 *   get:
 *     summary: Get current user's intention badges
 *     tags: [Badges]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's intention badges
 */
router.get(
  '/users/me/intentions',
  authenticate,
  badgeController.getUserIntentionBadges.bind(badgeController)
);

// ============================================
// UPDATE USER'S SELECTED BADGES
// ============================================

/**
 * @swagger
 * /api/badges/users/me/interests:
 *   put:
 *     summary: Update current user's interest badges
 *     tags: [Badges]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               badge_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 maxItems: 20
 *                 example: ["uuid1", "uuid2", "uuid3"]
 *     responses:
 *       200:
 *         description: Interest badges updated successfully
 *       400:
 *         description: Validation error
 */
router.put(
  '/users/me/interests',
  authenticate,
  validate(updateUserInterestBadgesSchema),
  badgeController.updateUserInterestBadges.bind(badgeController)
);

/**
 * @swagger
 * /api/badges/users/me/intentions:
 *   put:
 *     summary: Update current user's intention badges (max 2)
 *     tags: [Badges]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               badges:
 *                 type: array
 *                 maxItems: 2
 *                 items:
 *                   type: object
 *                   properties:
 *                     badge_id:
 *                       type: string
 *                       format: uuid
 *                     priority:
 *                       type: integer
 *                       enum: [1, 2]
 *                       description: 1 = primary, 2 = secondary
 *                 example: [{"badge_id": "uuid1", "priority": 1}, {"badge_id": "uuid2", "priority": 2}]
 *     responses:
 *       200:
 *         description: Intention badges updated successfully
 *       400:
 *         description: Validation error
 */
router.put(
  '/users/me/intentions',
  authenticate,
  validate(updateUserIntentionBadgesSchema),
  badgeController.updateUserIntentionBadges.bind(badgeController)
);

// ============================================
// ADD/REMOVE INDIVIDUAL BADGES
// ============================================

/**
 * @swagger
 * /api/badges/users/me/interests/add:
 *   post:
 *     summary: Add a single interest badge
 *     tags: [Badges]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               badge_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Interest badge added successfully
 */
router.post(
  '/users/me/interests/add',
  authenticate,
  validate(addInterestBadgeSchema),
  badgeController.addInterestBadge.bind(badgeController)
);

/**
 * @swagger
 * /api/badges/users/me/interests/{badgeId}:
 *   delete:
 *     summary: Remove an interest badge
 *     tags: [Badges]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: badgeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Interest badge removed successfully
 */
router.delete(
  '/users/me/interests/:badgeId',
  authenticate,
  validate(uuidParamSchema, 'params'),
  badgeController.removeInterestBadge.bind(badgeController)
);

/**
 * @swagger
 * /api/badges/users/me/intentions/add:
 *   post:
 *     summary: Add a single intention badge
 *     tags: [Badges]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               badge_id:
 *                 type: string
 *                 format: uuid
 *               priority:
 *                 type: integer
 *                 enum: [1, 2]
 *     responses:
 *       201:
 *         description: Intention badge added successfully
 */
router.post(
  '/users/me/intentions/add',
  authenticate,
  validate(addIntentionBadgeSchema),
  badgeController.addIntentionBadge.bind(badgeController)
);

/**
 * @swagger
 * /api/badges/users/me/intentions/{badgeId}:
 *   delete:
 *     summary: Remove an intention badge
 *     tags: [Badges]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: badgeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Intention badge removed successfully
 */
router.delete(
  '/users/me/intentions/:badgeId',
  authenticate,
  validate(uuidParamSchema, 'params'),
  badgeController.removeIntentionBadge.bind(badgeController)
);

// ============================================
// ANALYTICS (Admin or Stats endpoints)
// ============================================

/**
 * @swagger
 * /api/badges/analytics/interests/popularity:
 *   get:
 *     summary: Get interest badge popularity statistics
 *     tags: [Badges, Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Interest badge popularity data
 */
router.get(
  '/analytics/interests/popularity',
  authenticate,
  badgeController.getInterestBadgePopularity.bind(badgeController)
);

/**
 * @swagger
 * /api/badges/analytics/intentions/distribution:
 *   get:
 *     summary: Get intention badge distribution statistics
 *     tags: [Badges, Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Intention badge distribution data
 */
router.get(
  '/analytics/intentions/distribution',
  authenticate,
  badgeController.getIntentionBadgeDistribution.bind(badgeController)
);

export default router;
