import { Router } from 'express';
import { EliteController } from '../controllers/elite.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireEliteTier } from '../middleware/elite-tier.middleware';

const router = Router();
const eliteController = new EliteController();

// All elite routes require authentication and Elite tier subscription
router.use(authenticate);
router.use(requireEliteTier);

// ============ VIP Events Routes ============

/**
 * @swagger
 * /api/v1/elite/events:
 *   get:
 *     summary: List upcoming VIP events
 *     tags: [Elite - VIP Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [virtual, in-person]
 *         description: Filter by event type
 *       - in: query
 *         name: has_availability
 *         schema:
 *           type: boolean
 *         description: Only show events with available spots
 *     responses:
 *       200:
 *         description: List of upcoming VIP events
 *       403:
 *         description: Elite subscription required
 */
router.get('/events', eliteController.listEvents.bind(eliteController));

/**
 * @swagger
 * /api/v1/elite/events/my:
 *   get:
 *     summary: Get user's registered events
 *     tags: [Elite - VIP Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: include_historical
 *         schema:
 *           type: boolean
 *         description: Include past events
 *     responses:
 *       200:
 *         description: User's registered events
 */
router.get('/events/my', eliteController.getMyEvents.bind(eliteController));

/**
 * @swagger
 * /api/v1/elite/events/{id}:
 *   get:
 *     summary: Get a specific VIP event
 *     tags: [Elite - VIP Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: VIP event details
 *       404:
 *         description: Event not found
 */
router.get('/events/:id', eliteController.getEvent.bind(eliteController));

/**
 * @swagger
 * /api/v1/elite/events/{id}/register:
 *   post:
 *     summary: Register for a VIP event
 *     tags: [Elite - VIP Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Successfully registered
 *       400:
 *         description: Registration failed
 */
router.post('/events/:id/register', eliteController.registerForEvent.bind(eliteController));

/**
 * @swagger
 * /api/v1/elite/events/{id}/register:
 *   delete:
 *     summary: Cancel event registration
 *     tags: [Elite - VIP Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Registration cancelled
 *       400:
 *         description: Cancellation failed
 */
router.delete('/events/:id/register', eliteController.cancelRegistration.bind(eliteController));

// ============ Dating Coach Routes ============

/**
 * @swagger
 * /api/v1/elite/coach:
 *   get:
 *     summary: Get assigned dating coach
 *     tags: [Elite - Dating Coach]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Assigned coach details
 *       404:
 *         description: No coach available
 */
router.get('/coach', eliteController.getAssignedCoach.bind(eliteController));

/**
 * @swagger
 * /api/v1/elite/coach/session-types:
 *   get:
 *     summary: Get available session types
 *     tags: [Elite - Dating Coach]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Available session types
 */
router.get('/coach/session-types', eliteController.getSessionTypes.bind(eliteController));

/**
 * @swagger
 * /api/v1/elite/coach/sessions:
 *   get:
 *     summary: Get coaching session history
 *     tags: [Elite - Dating Coach]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: include_upcoming
 *         schema:
 *           type: boolean
 *           default: true
 *     responses:
 *       200:
 *         description: Session history
 */
router.get('/coach/sessions', eliteController.getSessionHistory.bind(eliteController));

/**
 * @swagger
 * /api/v1/elite/coach/sessions:
 *   post:
 *     summary: Schedule a coaching session
 *     tags: [Elite - Dating Coach]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - date
 *             properties:
 *               date:
 *                 type: string
 *                 format: date-time
 *               topic:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [initial_consultation, follow_up, profile_review, date_prep, post_date_debrief]
 *               duration:
 *                 type: integer
 *                 description: Duration in minutes
 *     responses:
 *       201:
 *         description: Session scheduled
 *       400:
 *         description: Scheduling failed
 */
router.post('/coach/sessions', eliteController.scheduleSession.bind(eliteController));

/**
 * @swagger
 * /api/v1/elite/coach/sessions/{id}:
 *   delete:
 *     summary: Cancel a scheduled session
 *     tags: [Elite - Dating Coach]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session cancelled
 *       400:
 *         description: Cancellation failed
 */
router.delete('/coach/sessions/:id', eliteController.cancelSession.bind(eliteController));

/**
 * @swagger
 * /api/v1/elite/coach/sessions/{id}/reschedule:
 *   put:
 *     summary: Reschedule a session
 *     tags: [Elite - Dating Coach]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - date
 *             properties:
 *               date:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Session rescheduled
 *       400:
 *         description: Rescheduling failed
 */
router.put('/coach/sessions/:id/reschedule', eliteController.rescheduleSession.bind(eliteController));

/**
 * @swagger
 * /api/v1/elite/coach/sessions/{id}/feedback:
 *   post:
 *     summary: Submit feedback for a completed session
 *     tags: [Elite - Dating Coach]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
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
 *               feedback:
 *                 type: string
 *     responses:
 *       200:
 *         description: Feedback submitted
 *       400:
 *         description: Submission failed
 */
router.post('/coach/sessions/:id/feedback', eliteController.submitSessionFeedback.bind(eliteController));

// ============ Concierge Service Routes ============

/**
 * @swagger
 * /api/v1/elite/concierge/types:
 *   get:
 *     summary: Get available concierge request types and priorities
 *     tags: [Elite - Concierge]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Request types and priority options
 */
router.get('/concierge/types', eliteController.getConciergeRequestTypes.bind(eliteController));

/**
 * @swagger
 * /api/v1/elite/concierge:
 *   get:
 *     summary: Get user's concierge requests
 *     tags: [Elite - Concierge]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in_progress, awaiting_info, completed, cancelled]
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
 *         description: User's concierge requests
 */
router.get('/concierge', eliteController.getMyConciergeRequests.bind(eliteController));

/**
 * @swagger
 * /api/v1/elite/concierge:
 *   post:
 *     summary: Submit a concierge request
 *     tags: [Elite - Concierge]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - description
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [date-planning, reservation, advice, gift-recommendation, travel, other]
 *               description:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [low, normal, high, urgent]
 *               budget_range:
 *                 type: string
 *               preferred_date:
 *                 type: string
 *                 format: date-time
 *               location_preference:
 *                 type: string
 *     responses:
 *       201:
 *         description: Request submitted
 *       400:
 *         description: Submission failed
 */
router.post('/concierge', eliteController.submitConciergeRequest.bind(eliteController));

/**
 * @swagger
 * /api/v1/elite/concierge/{id}:
 *   get:
 *     summary: Get a specific concierge request with messages
 *     tags: [Elite - Concierge]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Request details with messages
 *       404:
 *         description: Request not found
 */
router.get('/concierge/:id', eliteController.getConciergeRequestStatus.bind(eliteController));

/**
 * @swagger
 * /api/v1/elite/concierge/{id}/messages:
 *   post:
 *     summary: Add a message to a concierge request
 *     tags: [Elite - Concierge]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Message added
 *       400:
 *         description: Failed to add message
 */
router.post('/concierge/:id/messages', eliteController.addConciergeMessage.bind(eliteController));

/**
 * @swagger
 * /api/v1/elite/concierge/{id}:
 *   delete:
 *     summary: Cancel a concierge request
 *     tags: [Elite - Concierge]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Request cancelled
 *       400:
 *         description: Cancellation failed
 */
router.delete('/concierge/:id', eliteController.cancelConciergeRequest.bind(eliteController));

export default router;
