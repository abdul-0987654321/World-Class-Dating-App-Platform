/**
 * Date Safety Guardian Routes
 * API endpoints for the "Guardian Angel" safety feature
 *
 * All endpoints require authentication.
 * Rate limiting is applied, especially on sensitive operations.
 */

import { Router } from 'express';

import { requireAuth } from '../../middleware/auth';
import { createRateLimiter, apiRateLimiter, strictRateLimiter } from '../../middleware/rate-limit';
import { safetyController } from '../controllers/safety.controller';

const router = Router();

// ============================================
// CUSTOM RATE LIMITERS FOR SAFETY ENDPOINTS
// ============================================

/**
 * Panic rate limiter - very strict but allows emergency usage
 * 3 requests per minute to prevent abuse but allow real emergencies
 */
const panicRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 3, // 3 panic alerts per minute max
  keyPrefix: 'panic-rate',
  skipFailedRequests: false, // Count ALL attempts including failures
});

/**
 * Check-in rate limiter - moderate limit
 * 20 check-ins per minute (allows rapid check-ins if needed)
 */
const checkInRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20, // 20 check-ins per minute
  keyPrefix: 'checkin-rate',
  skipFailedRequests: true,
});

/**
 * Session management rate limiter
 * 10 session operations per minute
 */
const sessionRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 session operations per minute
  keyPrefix: 'safety-session-rate',
  skipFailedRequests: true,
});

/**
 * Contact management rate limiter
 * 30 contact operations per minute
 */
const contactRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 contact operations per minute
  keyPrefix: 'safety-contact-rate',
  skipFailedRequests: true,
});

// ============================================
// SAFETY STATUS ENDPOINT
// ============================================

/**
 * @swagger
 * /api/v1/safety/status:
 *   get:
 *     summary: Get safety feature status
 *     tags: [Safety]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Safety status retrieved successfully
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
 *                     featureEnabled:
 *                       type: boolean
 *                     trustedContactsCount:
 *                       type: number
 *                     verifiedContactsCount:
 *                       type: number
 *                     hasActiveSession:
 *                       type: boolean
 */
router.get(
  '/status',
  requireAuth,
  apiRateLimiter,
  safetyController.getStatus.bind(safetyController)
);

// ============================================
// TRUSTED CONTACTS ENDPOINTS
// ============================================

/**
 * @swagger
 * /api/v1/safety/trusted-contacts:
 *   post:
 *     summary: Add a trusted contact
 *     tags: [Safety - Trusted Contacts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - phone
 *               - relationship
 *             properties:
 *               name:
 *                 type: string
 *                 description: Contact's name
 *               phone:
 *                 type: string
 *                 description: Contact's phone number (E.164 format recommended)
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Contact's email address (optional)
 *               relationship:
 *                 type: string
 *                 enum: [friend, family, other]
 *               priority:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Priority (1 = primary, 2-5 = backup)
 *     responses:
 *       201:
 *         description: Trusted contact added successfully
 *       400:
 *         description: Validation error or maximum contacts reached
 *       403:
 *         description: Feature not enabled for user
 */
router.post(
  '/trusted-contacts',
  requireAuth,
  contactRateLimiter,
  safetyController.addTrustedContact.bind(safetyController)
);

/**
 * @swagger
 * /api/v1/safety/trusted-contacts:
 *   get:
 *     summary: Get all trusted contacts
 *     tags: [Safety - Trusted Contacts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trusted contacts retrieved successfully
 *       403:
 *         description: Feature not enabled for user
 */
router.get(
  '/trusted-contacts',
  requireAuth,
  apiRateLimiter,
  safetyController.getTrustedContacts.bind(safetyController)
);

/**
 * @swagger
 * /api/v1/safety/trusted-contacts/{id}:
 *   delete:
 *     summary: Remove a trusted contact
 *     tags: [Safety - Trusted Contacts]
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
 *         description: Trusted contact removed successfully
 *       404:
 *         description: Contact not found
 */
router.delete(
  '/trusted-contacts/:id',
  requireAuth,
  contactRateLimiter,
  safetyController.removeTrustedContact.bind(safetyController)
);

/**
 * @swagger
 * /api/v1/safety/trusted-contacts/{id}/verify:
 *   post:
 *     summary: Verify a trusted contact
 *     tags: [Safety - Trusted Contacts]
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
 *               - verificationCode
 *             properties:
 *               verificationCode:
 *                 type: string
 *                 description: Verification code sent to the contact
 *     responses:
 *       200:
 *         description: Contact verified successfully
 *       400:
 *         description: Invalid verification code
 */
router.post(
  '/trusted-contacts/:id/verify',
  requireAuth,
  strictRateLimiter, // Strict rate limit for verification attempts
  safetyController.verifyTrustedContact.bind(safetyController)
);

// ============================================
// DATE SESSION ENDPOINTS
// ============================================

/**
 * @swagger
 * /api/v1/safety/date-sessions:
 *   post:
 *     summary: Create a new date session
 *     tags: [Safety - Date Sessions]
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
 *               - matchName
 *               - scheduledAt
 *             properties:
 *               matchId:
 *                 type: string
 *               matchName:
 *                 type: string
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *               venue:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   address:
 *                     type: string
 *                   coordinates:
 *                     type: object
 *                     properties:
 *                       latitude:
 *                         type: number
 *                       longitude:
 *                         type: number
 *                   type:
 *                     type: string
 *                     enum: [restaurant, bar, cafe, public_space, other]
 *               checkInIntervalMinutes:
 *                 type: number
 *                 minimum: 5
 *                 maximum: 120
 *                 default: 30
 *     responses:
 *       201:
 *         description: Date session created successfully
 *       400:
 *         description: Validation error or active session exists
 *       403:
 *         description: Feature not enabled or no verified contacts
 */
router.post(
  '/date-sessions',
  requireAuth,
  sessionRateLimiter,
  safetyController.createDateSession.bind(safetyController)
);

/**
 * @swagger
 * /api/v1/safety/date-sessions/active:
 *   get:
 *     summary: Get the active date session
 *     tags: [Safety - Date Sessions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active session retrieved (or null if none)
 *       403:
 *         description: Feature not enabled for user
 */
router.get(
  '/date-sessions/active',
  requireAuth,
  apiRateLimiter,
  safetyController.getActiveSession.bind(safetyController)
);

/**
 * @swagger
 * /api/v1/safety/date-sessions/history:
 *   get:
 *     summary: Get date session history
 *     tags: [Safety - Date Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *     responses:
 *       200:
 *         description: Session history retrieved
 *       403:
 *         description: Feature not enabled for user
 */
router.get(
  '/date-sessions/history',
  requireAuth,
  apiRateLimiter,
  safetyController.getSessionHistory.bind(safetyController)
);

/**
 * @swagger
 * /api/v1/safety/date-sessions/{id}/start:
 *   post:
 *     summary: Start a date session
 *     tags: [Safety - Date Sessions]
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
 *         description: Session started successfully
 *       404:
 *         description: Session not found
 */
router.post(
  '/date-sessions/:id/start',
  requireAuth,
  sessionRateLimiter,
  safetyController.startDateSession.bind(safetyController)
);

/**
 * @swagger
 * /api/v1/safety/date-sessions/{id}/check-in:
 *   post:
 *     summary: Perform a safety check-in
 *     tags: [Safety - Date Sessions]
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
 *               safetyRating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *               location:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *     responses:
 *       200:
 *         description: Check-in successful
 *       404:
 *         description: Session not found
 */
router.post(
  '/date-sessions/:id/check-in',
  requireAuth,
  checkInRateLimiter,
  safetyController.checkIn.bind(safetyController)
);

/**
 * @swagger
 * /api/v1/safety/date-sessions/{id}/end:
 *   post:
 *     summary: End a date session safely
 *     tags: [Safety - Date Sessions]
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
 *               safetyRating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Final safety rating for the date
 *     responses:
 *       200:
 *         description: Session ended safely
 *       404:
 *         description: Session not found
 */
router.post(
  '/date-sessions/:id/end',
  requireAuth,
  sessionRateLimiter,
  safetyController.endDateSession.bind(safetyController)
);

/**
 * @swagger
 * /api/v1/safety/date-sessions/{id}/panic:
 *   post:
 *     summary: Trigger panic alert (EMERGENCY)
 *     description: |
 *       CRITICAL EMERGENCY ENDPOINT
 *       Immediately alerts all verified trusted contacts with current location.
 *       Use only in genuine emergency situations.
 *     tags: [Safety - Date Sessions]
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
 *               currentLocation:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *               silentMode:
 *                 type: boolean
 *                 description: If true, no visual/audio feedback on device
 *               message:
 *                 type: string
 *                 maxLength: 200
 *                 description: Optional custom message to trusted contacts
 *     responses:
 *       200:
 *         description: Panic alert sent successfully
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
 *                     message:
 *                       type: string
 *                     alertsSent:
 *                       type: number
 *                     emergencyServicesNotified:
 *                       type: boolean
 *       404:
 *         description: Session not found - contact emergency services directly
 *       429:
 *         description: Too many panic requests - contact emergency services directly
 *       500:
 *         description: Error - contact emergency services directly (911)
 */
router.post(
  '/date-sessions/:id/panic',
  requireAuth,
  panicRateLimiter, // Special rate limiter for panic - allows emergency but prevents abuse
  safetyController.triggerPanicAlert.bind(safetyController)
);

export default router;
