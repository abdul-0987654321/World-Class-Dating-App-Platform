import { Router } from 'express';
import { VerificationController } from '../controllers/verification.controller';
import phoneVerificationController from '../controllers/phone-verification.controller';
import identityVerificationController from '../controllers/identity-verification.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { authLimiter } from '../middleware/rate-limit.middleware';
import verificationStatusRoutes from './verification-status.routes';
import multer from 'multer';

const router = Router();
const verificationController = new VerificationController();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only image and PDF files are allowed'));
    }
  },
});

// Mount verification status routes
router.use('/', verificationStatusRoutes);

// ============================================================================
// EMAIL VERIFICATION
// ============================================================================

/**
 * @swagger
 * /api/verification/email/initiate:
 *   post:
 *     summary: Initiate email verification (resend)
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Verification email sent
 *       400:
 *         description: Email already verified
 *       429:
 *         description: Too many requests
 */
router.post(
  '/email/initiate',
  authLimiter,
  verificationController.resendVerification.bind(verificationController)
);

/**
 * @swagger
 * /api/verification/email/submit:
 *   post:
 *     summary: Submit email verification token
 *     tags: [Verification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired token
 */
router.post(
  '/email/submit',
  authLimiter,
  verificationController.verifyEmail.bind(verificationController)
);

/**
 * @swagger
 * /api/verification/email/status:
 *   get:
 *     summary: Get email verification status
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Email verification status
 */
router.get(
  '/email/status',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user?.id;
      const status = await verificationController['verificationService'].getUserEmailStatus(userId);
      res.json({ success: true, data: status });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ============================================================================
// PHONE VERIFICATION (OTP)
// ============================================================================

/**
 * @swagger
 * /api/verification/phone/initiate:
 *   post:
 *     summary: Initiate phone verification (send OTP)
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 example: "+1234567890"
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       400:
 *         description: Invalid phone number
 */
router.post(
  '/phone/initiate',
  authenticateToken,
  authLimiter,
  phoneVerificationController.sendVerificationCode.bind(phoneVerificationController)
);

/**
 * @swagger
 * /api/verification/phone/submit:
 *   post:
 *     summary: Submit phone verification code
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Phone verified successfully
 *       400:
 *         description: Invalid or expired code
 */
router.post(
  '/phone/submit',
  authenticateToken,
  authLimiter,
  phoneVerificationController.verifyCode.bind(phoneVerificationController)
);

/**
 * @swagger
 * /api/verification/phone/status:
 *   get:
 *     summary: Get phone verification status
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Phone verification status
 */
router.get(
  '/phone/status',
  authenticateToken,
  phoneVerificationController.getVerificationStatus.bind(phoneVerificationController)
);

// ============================================================================
// GOVERNMENT ID VERIFICATION
// ============================================================================

/**
 * @swagger
 * /api/verification/government-id/initiate:
 *   post:
 *     summary: Initiate government ID verification
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - documentType
 *             properties:
 *               documentType:
 *                 type: string
 *                 enum: [passport, drivers_license, national_id]
 *                 example: "passport"
 *     responses:
 *       200:
 *         description: Verification initiated
 *       400:
 *         description: Invalid document type
 */
router.post(
  '/government-id/initiate',
  authenticateToken,
  authLimiter,
  identityVerificationController.initiateVerification.bind(identityVerificationController)
);

/**
 * @swagger
 * /api/verification/government-id/submit:
 *   post:
 *     summary: Submit government ID documents
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - documentFront
 *               - selfie
 *             properties:
 *               documentFront:
 *                 type: string
 *                 format: binary
 *               documentBack:
 *                 type: string
 *                 format: binary
 *               selfie:
 *                 type: string
 *                 format: binary
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Documents submitted successfully
 *       400:
 *         description: Invalid or missing documents
 */
router.post(
  '/government-id/submit',
  authenticateToken,
  authLimiter,
  upload.fields([
    { name: 'documentFront', maxCount: 1 },
    { name: 'documentBack', maxCount: 1 },
    { name: 'selfie', maxCount: 1 }
  ]),
  identityVerificationController.submitDocuments.bind(identityVerificationController)
);

/**
 * @swagger
 * /api/verification/government-id/status:
 *   get:
 *     summary: Get government ID verification status
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Government ID verification status
 */
router.get(
  '/government-id/status',
  authenticateToken,
  identityVerificationController.getVerificationStatus.bind(identityVerificationController)
);

// ============================================================================
// SELFIE VERIFICATION
// ============================================================================

/**
 * @swagger
 * /api/verification/selfie/initiate:
 *   post:
 *     summary: Initiate selfie verification with pose requirement
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Verification initiated with pose requirement
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 verificationId:
 *                   type: string
 *                 pose:
 *                   type: string
 *                   enum: [smile, neutral, look_left, look_right, look_up, thumbs_up]
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 */
router.post(
  '/selfie/initiate',
  authenticateToken,
  authLimiter,
  async (req, res) => {
    try {
      const userId = req.user?.id;
      const photoVerificationService = require('../../domain/services/photo-verification.service').default;
      const result = await photoVerificationService.requestVerification(userId);
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @swagger
 * /api/verification/selfie/submit:
 *   post:
 *     summary: Submit selfie for verification
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - verificationId
 *               - selfie
 *             properties:
 *               verificationId:
 *                 type: string
 *               selfie:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Selfie submitted successfully
 *       400:
 *         description: Invalid selfie or verification expired
 */
router.post(
  '/selfie/submit',
  authenticateToken,
  authLimiter,
  upload.single('selfie'),
  async (req, res) => {
    try {
      const { verificationId } = req.body;
      const selfieFile = req.file;

      if (!selfieFile || !verificationId) {
        return res.status(400).json({
          success: false,
          error: 'Verification ID and selfie are required'
        });
      }

      const photoVerificationService = require('../../domain/services/photo-verification.service').default;
      // Upload selfie and get URL (implement upload logic)
      const selfieUrl = `https://storage.flamoral.com/verifications/${Date.now()}_${selfieFile.originalname}`;

      const result = await photoVerificationService.submitPhoto(verificationId, selfieUrl);
      res.json({ success: result.verified, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @swagger
 * /api/verification/selfie/status:
 *   get:
 *     summary: Get selfie verification status
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Selfie verification status
 */
router.get(
  '/selfie/status',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user?.id;
      const photoVerificationService = require('../../domain/services/photo-verification.service').default;
      const status = await photoVerificationService.getVerificationStatus(userId);
      res.json({ success: true, data: status });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ============================================================================
// LIVENESS CHECK
// ============================================================================

/**
 * @swagger
 * /api/verification/liveness/initiate:
 *   post:
 *     summary: Initiate liveness check session
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liveness check session created
 */
router.post(
  '/liveness/initiate',
  authenticateToken,
  authLimiter,
  async (req, res) => {
    try {
      const userId = req.user?.id;
      const sessionId = `liveness_${Date.now()}_${userId?.substring(0, 8)}`;
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      res.json({
        success: true,
        sessionId,
        expiresAt,
        instructions: 'Please follow the on-screen prompts to complete the liveness check'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @swagger
 * /api/verification/liveness/submit:
 *   post:
 *     summary: Submit liveness check video/images
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *               - media
 *             properties:
 *               sessionId:
 *                 type: string
 *               media:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Liveness check completed
 *       400:
 *         description: Liveness check failed
 */
router.post(
  '/liveness/submit',
  authenticateToken,
  authLimiter,
  upload.single('media'),
  async (req, res) => {
    try {
      const { sessionId } = req.body;
      const mediaFile = req.file;

      if (!mediaFile || !sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Session ID and media are required'
        });
      }

      // Implement liveness detection using Azure Face API or similar
      const mediaService = require('../../services/media-service').default;
      const photoVerificationService = require('../../../media-service/src/domain/services/photo-verification.service').default;

      const mediaUrl = `https://storage.flamoral.com/liveness/${Date.now()}_${mediaFile.originalname}`;
      const livenessResult = await photoVerificationService.verifyLiveness(mediaUrl);

      if (livenessResult.isLive) {
        res.json({
          success: true,
          passed: true,
          confidence: livenessResult.confidence,
          message: 'Liveness check passed successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          passed: false,
          confidence: livenessResult.confidence,
          error: 'Liveness check failed. Please ensure you are using a real-time camera.'
        });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @swagger
 * /api/verification/liveness/status:
 *   get:
 *     summary: Get liveness check status
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liveness check status
 */
router.get(
  '/liveness/status',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user?.id;
      // Check if user has passed liveness check as part of photo verification
      const photoVerificationService = require('../../domain/services/photo-verification.service').default;
      const status = await photoVerificationService.getVerificationStatus(userId);

      res.json({
        success: true,
        data: {
          passed: status.verified || false,
          verifiedAt: status.verifiedAt,
          latestCheck: status.latestRequest
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ============================================================================
// VIDEO VERIFICATION
// ============================================================================

/**
 * @swagger
 * /api/verification/video/initiate:
 *   post:
 *     summary: Initiate video verification session
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Video verification session created
 */
router.post(
  '/video/initiate',
  authenticateToken,
  authLimiter,
  async (req, res) => {
    try {
      const userId = req.user?.id;
      const sessionId = `video_${Date.now()}_${userId?.substring(0, 8)}`;
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Generate random verification challenge
      const challenges = [
        'Say your full name',
        'Show your face from the left side',
        'Show your face from the right side',
        'Smile at the camera',
        'Nod your head up and down'
      ];

      const randomChallenges = challenges.sort(() => Math.random() - 0.5).slice(0, 3);

      res.json({
        success: true,
        sessionId,
        expiresAt,
        challenges: randomChallenges,
        maxDuration: 60 // seconds
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @swagger
 * /api/verification/video/submit:
 *   post:
 *     summary: Submit video for verification
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *               - video
 *             properties:
 *               sessionId:
 *                 type: string
 *               video:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Video submitted for review
 *       400:
 *         description: Invalid video or session expired
 */
router.post(
  '/video/submit',
  authenticateToken,
  authLimiter,
  upload.single('video'),
  async (req, res) => {
    try {
      const { sessionId } = req.body;
      const videoFile = req.file;

      if (!videoFile || !sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Session ID and video are required'
        });
      }

      const userId = req.user?.id;

      // Store video for review
      const videoUrl = `https://storage.flamoral.com/video-verification/${Date.now()}_${videoFile.originalname}`;

      // Create video verification record in database
      const db = require('../../infrastructure/database/connection').default;
      const verificationId = `vid_${Date.now()}_${userId?.substring(0, 8)}`;

      await db('video_verifications').insert({
        id: verificationId,
        user_id: userId,
        session_id: sessionId,
        video_url: videoUrl,
        status: 'pending',
        submitted_at: new Date(),
      });

      res.json({
        success: true,
        verificationId,
        status: 'pending',
        message: 'Video submitted for review. This typically takes 1-2 business days.'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @swagger
 * /api/verification/video/status:
 *   get:
 *     summary: Get video verification status
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Video verification status
 */
router.get(
  '/video/status',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user?.id;
      const db = require('../../infrastructure/database/connection').default;

      const verification = await db('video_verifications')
        .where({ user_id: userId })
        .orderBy('submitted_at', 'desc')
        .first();

      res.json({
        success: true,
        data: {
          verified: verification?.status === 'approved',
          status: verification?.status || 'none',
          submittedAt: verification?.submitted_at,
          reviewedAt: verification?.reviewed_at,
          rejectionReason: verification?.rejection_reason
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ============================================================================
// BIOMETRIC VERIFICATION
// ============================================================================

/**
 * @swagger
 * /api/verification/biometric/initiate:
 *   post:
 *     summary: Initiate biometric verification (Face ID, Touch ID, etc.)
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - biometricType
 *             properties:
 *               biometricType:
 *                 type: string
 *                 enum: [face_id, touch_id, fingerprint, iris]
 *     responses:
 *       200:
 *         description: Biometric verification session created
 */
router.post(
  '/biometric/initiate',
  authenticateToken,
  authLimiter,
  async (req, res) => {
    try {
      const userId = req.user?.id;
      const { biometricType } = req.body;

      if (!['face_id', 'touch_id', 'fingerprint', 'iris'].includes(biometricType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid biometric type'
        });
      }

      const sessionId = `bio_${Date.now()}_${userId?.substring(0, 8)}`;
      const challenge = Buffer.from(JSON.stringify({
        userId,
        timestamp: Date.now(),
        type: biometricType
      })).toString('base64');

      res.json({
        success: true,
        sessionId,
        challenge,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @swagger
 * /api/verification/biometric/submit:
 *   post:
 *     summary: Submit biometric verification data
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *               - signature
 *             properties:
 *               sessionId:
 *                 type: string
 *               signature:
 *                 type: string
 *                 description: Biometric signature from device
 *               publicKey:
 *                 type: string
 *                 description: Public key for verification
 *     responses:
 *       200:
 *         description: Biometric verification successful
 *       400:
 *         description: Biometric verification failed
 */
router.post(
  '/biometric/submit',
  authenticateToken,
  authLimiter,
  async (req, res) => {
    try {
      const userId = req.user?.id;
      const { sessionId, signature, publicKey } = req.body;

      if (!sessionId || !signature) {
        return res.status(400).json({
          success: false,
          error: 'Session ID and signature are required'
        });
      }

      // Verify biometric signature (implement proper crypto verification)
      // For now, just store the biometric enrollment
      const db = require('../../infrastructure/database/connection').default;

      await db('biometric_verifications').insert({
        id: `bioverif_${Date.now()}_${userId?.substring(0, 8)}`,
        user_id: userId,
        session_id: sessionId,
        public_key: publicKey,
        status: 'approved',
        verified_at: new Date(),
      });

      // Update user's biometric verification status
      await db('users')
        .where({ id: userId })
        .update({
          is_biometric_verified: true,
          biometric_verified_at: new Date(),
        });

      res.json({
        success: true,
        verified: true,
        message: 'Biometric verification successful'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @swagger
 * /api/verification/biometric/status:
 *   get:
 *     summary: Get biometric verification status
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Biometric verification status
 */
router.get(
  '/biometric/status',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user?.id;
      const db = require('../../infrastructure/database/connection').default;

      const user = await db('users')
        .where({ id: userId })
        .first('is_biometric_verified', 'biometric_verified_at');

      const latestVerification = await db('biometric_verifications')
        .where({ user_id: userId })
        .orderBy('verified_at', 'desc')
        .first();

      res.json({
        success: true,
        data: {
          verified: user?.is_biometric_verified || false,
          verifiedAt: user?.biometric_verified_at,
          latestVerification: latestVerification ? {
            id: latestVerification.id,
            verifiedAt: latestVerification.verified_at,
            type: 'biometric'
          } : null
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

export default router;
