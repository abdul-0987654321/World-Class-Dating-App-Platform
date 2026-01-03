/**
 * Document Verification Routes
 * Flamoral Dating Platform
 *
 * API endpoints for OCR-based document verification using AWS Textract.
 * Supports passport, driver's license, and national ID verification.
 */

import { Router } from 'express';
import multer from 'multer';
import { documentVerificationController } from '../controllers/document-verification.controller';
import { authLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

// Configure multer for file uploads (memory storage for OCR processing)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max per file
    files: 3, // Max 3 files (front, back, selfie)
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
    }
  },
});

/**
 * @swagger
 * /api/v1/verification/document/verify:
 *   post:
 *     summary: Submit document for OCR-based verification
 *     description: |
 *       Submit ID documents (passport, driver's license, or national ID) for
 *       OCR-based verification. The system will extract text data, validate
 *       document authenticity, and match against the user's profile.
 *     tags: [Document Verification]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - document_type
 *               - country_code
 *               - consent_given
 *               - document_front
 *             properties:
 *               document_type:
 *                 type: string
 *                 enum: [passport, drivers_license, national_id]
 *                 description: Type of ID document
 *               country_code:
 *                 type: string
 *                 pattern: ^[A-Z]{3}$
 *                 description: ISO 3166-1 alpha-3 country code
 *                 example: USA
 *               consent_given:
 *                 type: boolean
 *                 description: User consent for document processing and data storage
 *               document_front:
 *                 type: string
 *                 format: binary
 *                 description: Front side of the document (JPEG, PNG, or WebP)
 *               document_back:
 *                 type: string
 *                 format: binary
 *                 description: Back side of the document (required for driver's license and national ID)
 *               selfie:
 *                 type: string
 *                 format: binary
 *                 description: Optional selfie for face matching
 *     responses:
 *       200:
 *         description: Document verification submitted successfully
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
 *                     verification_id:
 *                       type: string
 *                       format: uuid
 *                     status:
 *                       type: string
 *                       enum: [pending, processing, completed, failed]
 *                     message:
 *                       type: string
 *       400:
 *         description: Invalid request (missing fields, invalid format, etc.)
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Too many requests
 */
router.post(
  '/verify',
  authLimiter,
  upload.fields([
    { name: 'document_front', maxCount: 1 },
    { name: 'document_back', maxCount: 1 },
    { name: 'selfie', maxCount: 1 },
  ]),
  documentVerificationController.verifyDocument.bind(documentVerificationController)
);

/**
 * @swagger
 * /api/v1/verification/document/status:
 *   get:
 *     summary: Get document verification status
 *     description: Get the current status of document verification for the authenticated user
 *     tags: [Document Verification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: verification_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Specific verification ID (optional, defaults to latest)
 *     responses:
 *       200:
 *         description: Verification status retrieved
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
 *                     verification_id:
 *                       type: string
 *                     user_id:
 *                       type: string
 *                     document_type:
 *                       type: string
 *                     status:
 *                       type: string
 *                     is_verified:
 *                       type: boolean
 *                     verification_decision:
 *                       type: string
 *                     decision_reasons:
 *                       type: array
 *                       items:
 *                         type: string
 *                     overall_score:
 *                       type: number
 *                     processed_at:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Verification not found
 */
router.get(
  '/status',
  documentVerificationController.getStatus.bind(documentVerificationController)
);

/**
 * @swagger
 * /api/v1/verification/document/score/{verification_id}:
 *   get:
 *     summary: Get verification score
 *     description: Get the verification confidence score for a specific verification
 *     tags: [Document Verification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: verification_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The verification ID
 *     responses:
 *       200:
 *         description: Verification score retrieved
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
 *                     verification_id:
 *                       type: string
 *                     score:
 *                       type: number
 *                       description: Score from 0 to 1
 *                     score_percentage:
 *                       type: integer
 *                       description: Score as percentage (0-100)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Verification not found
 */
router.get(
  '/score/:verification_id',
  documentVerificationController.getScore.bind(documentVerificationController)
);

/**
 * @swagger
 * /api/v1/verification/document/supported-types:
 *   get:
 *     summary: Get supported document types
 *     description: Get list of supported document types, countries, and file requirements
 *     tags: [Document Verification]
 *     responses:
 *       200:
 *         description: Supported types retrieved
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
 *                     document_types:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                           name:
 *                             type: string
 *                           description:
 *                             type: string
 *                           requires_back:
 *                             type: boolean
 *                     supported_countries:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           code:
 *                             type: string
 *                           name:
 *                             type: string
 *                     file_requirements:
 *                       type: object
 */
router.get(
  '/supported-types',
  documentVerificationController.getSupportedTypes.bind(documentVerificationController)
);

/**
 * @swagger
 * /api/v1/verification/document/gdpr/export:
 *   post:
 *     summary: Request GDPR data export
 *     description: Export all document verification data for the authenticated user (GDPR compliance)
 *     tags: [Document Verification, GDPR]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Data export generated
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
 *                     exportedAt:
 *                       type: string
 *                       format: date-time
 *                     userId:
 *                       type: string
 *                     verifications:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/gdpr/export',
  documentVerificationController.requestGDPRExport.bind(documentVerificationController)
);

/**
 * @swagger
 * /api/v1/verification/document/gdpr/delete:
 *   delete:
 *     summary: Request GDPR data deletion
 *     description: Delete all document verification data for the authenticated user (GDPR compliance)
 *     tags: [Document Verification, GDPR]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - confirm_deletion
 *             properties:
 *               confirm_deletion:
 *                 type: boolean
 *                 description: Must be true to confirm deletion
 *     responses:
 *       200:
 *         description: Data deleted successfully
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
 *                   properties:
 *                     records_deleted:
 *                       type: integer
 *       400:
 *         description: Deletion not confirmed
 *       401:
 *         description: Unauthorized
 */
router.delete(
  '/gdpr/delete',
  documentVerificationController.requestGDPRDeletion.bind(documentVerificationController)
);

export default router;
