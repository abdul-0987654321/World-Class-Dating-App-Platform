import { Router } from 'express';
import multer from 'multer';

import {
  identityVerificationController,
  identityVerificationAdminController,
} from '../controllers/identity-verification.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { authLimiter, generalLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'video/mp4',
      'video/webm',
      'application/pdf',
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: JPEG, PNG, WebP, MP4, WebM, PDF'));
    }
  },
});

// ==================== User Verification Endpoints ====================

/**
 * @swagger
 * /api/v1/identity-verification/start:
 *   post:
 *     summary: Start a new identity verification flow
 *     tags: [Identity Verification]
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
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [email, phone, id, selfie, liveness, video, biometric]
 *                 description: Type of verification to start
 *               region_policy_key:
 *                 type: string
 *                 description: Region policy key (e.g., US-IL, US-TX, US-WA)
 *               biometric_consent:
 *                 type: boolean
 *                 description: User consent for biometric data collection
 *               metadata:
 *                 type: object
 *                 description: Additional metadata
 *     responses:
 *       201:
 *         description: Verification started successfully
 *       400:
 *         description: Invalid request or biometric consent required
 *       401:
 *         description: Authentication required
 */
router.post(
  '/start',
  authLimiter,
  authMiddleware,
  identityVerificationController.startVerification.bind(identityVerificationController)
);

/**
 * @swagger
 * /api/v1/identity-verification/upload:
 *   post:
 *     summary: Upload a verification artifact (document, selfie, etc.)
 *     tags: [Identity Verification]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - request_id
 *               - type
 *               - file
 *             properties:
 *               request_id:
 *                 type: string
 *                 format: uuid
 *                 description: Verification request ID
 *               type:
 *                 type: string
 *                 description: Artifact type (document_front, document_back, selfie, etc.)
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The file to upload
 *     responses:
 *       201:
 *         description: Artifact uploaded successfully
 *       400:
 *         description: Invalid request or verification expired
 *       401:
 *         description: Authentication required
 */
router.post(
  '/upload',
  generalLimiter,
  authMiddleware,
  upload.single('file'),
  identityVerificationController.uploadArtifact.bind(identityVerificationController)
);

/**
 * @swagger
 * /api/v1/identity-verification/submit:
 *   post:
 *     summary: Submit verification for review (after uploading all required artifacts)
 *     tags: [Identity Verification]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - request_id
 *             properties:
 *               request_id:
 *                 type: string
 *                 format: uuid
 *                 description: Verification request ID
 *     responses:
 *       200:
 *         description: Verification submitted for review
 *       400:
 *         description: Missing required artifacts
 *       401:
 *         description: Authentication required
 */
router.post(
  '/submit',
  authLimiter,
  authMiddleware,
  identityVerificationController.submitForReview.bind(identityVerificationController)
);

/**
 * @swagger
 * /api/v1/identity-verification/status:
 *   get:
 *     summary: Get verification status for the current user
 *     tags: [Identity Verification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [email, phone, id, selfie, liveness, video, biometric]
 *         description: Filter by verification type
 *     responses:
 *       200:
 *         description: Verification status retrieved
 *       401:
 *         description: Authentication required
 */
router.get(
  '/status',
  generalLimiter,
  authMiddleware,
  identityVerificationController.getStatus.bind(identityVerificationController)
);

/**
 * @swagger
 * /api/v1/identity-verification/retry:
 *   post:
 *     summary: Retry a denied or expired verification
 *     tags: [Identity Verification]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - request_id
 *             properties:
 *               request_id:
 *                 type: string
 *                 format: uuid
 *                 description: Original verification request ID
 *     responses:
 *       201:
 *         description: Retry verification started
 *       400:
 *         description: Cannot retry or max retries exceeded
 *       401:
 *         description: Authentication required
 */
router.post(
  '/retry',
  authLimiter,
  authMiddleware,
  identityVerificationController.retryVerification.bind(identityVerificationController)
);

// ==================== Admin Verification Endpoints ====================

/**
 * @swagger
 * /api/v1/identity-verification/admin/pending:
 *   get:
 *     summary: Get pending verifications for admin review
 *     tags: [Identity Verification Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of results to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Pagination offset
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [email, phone, id, selfie, liveness, video, biometric]
 *         description: Filter by verification type
 *     responses:
 *       200:
 *         description: Pending verifications retrieved
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */
router.get(
  '/admin/pending',
  generalLimiter,
  authMiddleware,
  // In production, add admin role check middleware here
  identityVerificationAdminController.getPendingVerifications.bind(
    identityVerificationAdminController
  )
);

/**
 * @swagger
 * /api/v1/identity-verification/admin/{requestId}/approve:
 *   post:
 *     summary: Approve a verification request
 *     tags: [Identity Verification Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Verification request ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 description: Admin notes
 *     responses:
 *       200:
 *         description: Verification approved
 *       400:
 *         description: Invalid request status
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */
router.post(
  '/admin/:requestId/approve',
  authLimiter,
  authMiddleware,
  // In production, add admin role check middleware here
  identityVerificationAdminController.approveVerification.bind(identityVerificationAdminController)
);

/**
 * @swagger
 * /api/v1/identity-verification/admin/{requestId}/deny:
 *   post:
 *     summary: Deny a verification request
 *     tags: [Identity Verification Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Verification request ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason_code
 *             properties:
 *               reason_code:
 *                 type: string
 *                 description: Denial reason code
 *               notes:
 *                 type: string
 *                 description: Admin notes
 *     responses:
 *       200:
 *         description: Verification denied
 *       400:
 *         description: Invalid request status or missing reason
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */
router.post(
  '/admin/:requestId/deny',
  authLimiter,
  authMiddleware,
  // In production, add admin role check middleware here
  identityVerificationAdminController.denyVerification.bind(identityVerificationAdminController)
);

export default router;
