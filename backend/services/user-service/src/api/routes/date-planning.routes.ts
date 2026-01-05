/**
 * Date Planning Routes
 * Luxury date planning with AI-powered suggestions and venue integration
 */

import { Router } from 'express';

import { DatePlanningController } from '../controllers/date-planning.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const datePlanningController = new DatePlanningController();

/**
 * @swagger
 * /api/v1/dates/suggestions:
 *   get:
 *     summary: Get AI-powered date suggestions
 *     tags: [Date Planning]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: matchId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The match ID to get suggestions for
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               budget:
 *                 type: string
 *                 enum: [budget, moderate, upscale, luxury, any]
 *               mood:
 *                 type: string
 *                 enum: [romantic, adventurous, casual, luxurious, cultural, fun]
 *               location:
 *                 type: string
 *               timeOfDay:
 *                 type: string
 *                 enum: [morning, afternoon, evening, night]
 *               duration:
 *                 type: string
 *                 enum: [short, medium, long]
 *     responses:
 *       200:
 *         description: Date suggestions retrieved successfully
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/suggestions',
  authenticate,
  datePlanningController.getSuggestions.bind(datePlanningController)
);

/**
 * @swagger
 * /api/v1/dates/venues:
 *   get:
 *     summary: Search for venues
 *     tags: [Date Planning]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: location
 *         required: true
 *         schema:
 *           type: string
 *         description: Location to search venues (city, address, or coordinates)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [restaurant, bar, activity, entertainment]
 *         description: Type of venue
 *       - in: query
 *         name: budget
 *         schema:
 *           type: string
 *           enum: [budget, moderate, upscale, luxury]
 *         description: Price range
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: Search keyword
 *     responses:
 *       200:
 *         description: Venues retrieved successfully
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/venues',
  authenticate,
  datePlanningController.searchVenues.bind(datePlanningController)
);

/**
 * @swagger
 * /api/v1/dates/venues/{id}:
 *   get:
 *     summary: Get venue details
 *     tags: [Date Planning]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Venue ID or external place ID
 *     responses:
 *       200:
 *         description: Venue details retrieved successfully
 *       404:
 *         description: Venue not found
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/venues/:id',
  authenticate,
  datePlanningController.getVenueDetails.bind(datePlanningController)
);

/**
 * @swagger
 * /api/v1/dates:
 *   post:
 *     summary: Create a new date plan
 *     tags: [Date Planning]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - matchId
 *               - title
 *               - date
 *             properties:
 *               matchId:
 *                 type: string
 *                 format: uuid
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               date:
 *                 type: string
 *                 format: date-time
 *               venues:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     venueId:
 *                       type: string
 *                     order:
 *                       type: integer
 *                     timeSlot:
 *                       type: string
 *                     notes:
 *                       type: string
 *               estimatedBudget:
 *                 type: number
 *     responses:
 *       201:
 *         description: Date plan created successfully
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Match not found
 */
router.post('/', authenticate, datePlanningController.createDatePlan.bind(datePlanningController));

/**
 * @swagger
 * /api/v1/dates:
 *   get:
 *     summary: List user's date plans
 *     tags: [Date Planning]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, confirmed, completed, cancelled]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: Date plans retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, datePlanningController.getDatePlans.bind(datePlanningController));

/**
 * @swagger
 * /api/v1/dates/{id}:
 *   get:
 *     summary: Get date plan details
 *     tags: [Date Planning]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Date plan retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Date plan not found
 */
router.get(
  '/:id',
  authenticate,
  datePlanningController.getDatePlanById.bind(datePlanningController)
);

/**
 * @swagger
 * /api/v1/dates/{id}:
 *   put:
 *     summary: Update a date plan
 *     tags: [Date Planning]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date-time
 *               venues:
 *                 type: array
 *               estimatedBudget:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [draft, confirmed, cancelled]
 *     responses:
 *       200:
 *         description: Date plan updated successfully
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Date plan not found
 */
router.put(
  '/:id',
  authenticate,
  datePlanningController.updateDatePlan.bind(datePlanningController)
);

/**
 * @swagger
 * /api/v1/dates/{id}:
 *   delete:
 *     summary: Delete a date plan
 *     tags: [Date Planning]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Date plan deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Date plan not found
 */
router.delete(
  '/:id',
  authenticate,
  datePlanningController.deleteDatePlan.bind(datePlanningController)
);

/**
 * @swagger
 * /api/v1/dates/{id}/share:
 *   post:
 *     summary: Share date plan with match
 *     tags: [Date Planning]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Date plan shared successfully
 *       400:
 *         description: Cannot share date plan
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Date plan not found
 */
router.post(
  '/:id/share',
  authenticate,
  datePlanningController.sharePlanWithMatch.bind(datePlanningController)
);

/**
 * @swagger
 * /api/v1/dates/{id}/complete:
 *   post:
 *     summary: Mark date plan as completed with feedback
 *     tags: [Date Planning]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *               wouldRecommend:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Date plan completed successfully
 *       400:
 *         description: Invalid feedback or already completed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Date plan not found
 */
router.post(
  '/:id/complete',
  authenticate,
  datePlanningController.completeDatePlan.bind(datePlanningController)
);

export default router;
