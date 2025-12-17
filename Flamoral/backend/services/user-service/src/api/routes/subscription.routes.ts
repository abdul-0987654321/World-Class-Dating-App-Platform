import { Router } from 'express';
import { SubscriptionController } from '../controllers/subscription.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  updateTierSchema,
  cancelSubscriptionSchema,
  checkFeatureAccessSchema,
} from '../validators/subscription.validator';

const router = Router();
const subscriptionController = new SubscriptionController();

/**
 * @swagger
 * /api/subscriptions/current:
 *   get:
 *     summary: Get current user's subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
  '/current',
  authenticate,
  subscriptionController.getCurrentSubscription.bind(subscriptionController)
);

/**
 * @swagger
 * /api/subscriptions/features:
 *   get:
 *     summary: Get subscription features for current user
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Features retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/features',
  authenticate,
  subscriptionController.getSubscriptionFeatures.bind(subscriptionController)
);

/**
 * @swagger
 * /api/subscriptions/status:
 *   get:
 *     summary: Get detailed subscription status for current user
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription status retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/status',
  authenticate,
  subscriptionController.getSubscriptionStatus.bind(subscriptionController)
);

/**
 * @swagger
 * /api/subscriptions/features/{featureKey}/access:
 *   get:
 *     summary: Check access to a specific feature
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: featureKey
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Feature access checked successfully
 */
router.get(
  '/features/:featureKey/access',
  authenticate,
  validate(checkFeatureAccessSchema, 'params'),
  subscriptionController.checkFeatureAccess.bind(subscriptionController)
);

/**
 * @swagger
 * /api/subscriptions/tier:
 *   put:
 *     summary: Update subscription tier
 *     tags: [Subscriptions]
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
 *             properties:
 *               tier:
 *                 type: string
 *                 enum: [free, basic, plus, premium, premium_plus, elite]
 *     responses:
 *       200:
 *         description: Tier updated successfully
 *       400:
 *         description: Invalid tier
 */
router.put(
  '/tier',
  authenticate,
  validate(updateTierSchema),
  subscriptionController.updateTier.bind(subscriptionController)
);

/**
 * @swagger
 * /api/subscriptions/cancel:
 *   post:
 *     summary: Cancel subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               immediately:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: Subscription canceled
 *       400:
 *         description: Cancel failed
 */
router.post(
  '/cancel',
  authenticate,
  validate(cancelSubscriptionSchema),
  subscriptionController.cancelSubscription.bind(subscriptionController)
);

/**
 * @swagger
 * /api/subscriptions/reactivate:
 *   post:
 *     summary: Reactivate a canceled subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription reactivated
 *       400:
 *         description: Reactivation failed
 */
router.post(
  '/reactivate',
  authenticate,
  subscriptionController.reactivateSubscription.bind(subscriptionController)
);

export default router;
