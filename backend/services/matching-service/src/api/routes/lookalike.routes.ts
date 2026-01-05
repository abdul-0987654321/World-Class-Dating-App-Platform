/**
 * Lookalike Matching Routes
 *
 * API routes for lookalike matching functionality.
 * All routes require authentication and are rate-limited
 * based on subscription tier.
 *
 * Routes:
 * - POST /api/v1/lookalike/search - Find similar profiles
 * - POST /api/v1/lookalike/analyze - Analyze image for face detection
 * - POST /api/v1/lookalike/embeddings - Store face embedding
 * - GET /api/v1/lookalike/embeddings - Get user's embeddings
 * - DELETE /api/v1/lookalike/embeddings/:embeddingId - Delete embedding
 * - GET /api/v1/lookalike/rate-limit - Get rate limit status
 * - GET /api/v1/lookalike/history - Get search history
 */

import { Router } from 'express';
import multer from 'multer';

import {
  LookalikeSearchDto,
  StoreEmbeddingDto,
  EmbeddingIdParamDto,
  SearchHistoryQueryDto,
  AnalyzeImageDto,
} from '../../dto/lookalike.dto';
import { LOOKALIKE_CONFIG } from '../../types/lookalike.types';
import lookalikeController from '../controllers/lookalike.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.middleware';

const router = Router();

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: LOOKALIKE_CONFIG.MAX_IMAGE_SIZE,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    // Check file type
    const allowedMimeTypes = LOOKALIKE_CONFIG.SUPPORTED_FORMATS;
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`));
    }
  },
});

// Multer error handler middleware
const handleMulterError = (err: any, req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: `File size exceeds maximum allowed (${LOOKALIKE_CONFIG.MAX_IMAGE_SIZE / 1024 / 1024}MB)`,
        code: 'IMAGE_TOO_LARGE',
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Only one file can be uploaded at a time',
        code: 'TOO_MANY_FILES',
      });
    }
    return res.status(400).json({
      success: false,
      error: err.message,
      code: 'UPLOAD_ERROR',
    });
  }
  if (err) {
    return res.status(400).json({
      success: false,
      error: err.message,
      code: 'UPLOAD_ERROR',
    });
  }
  next();
};

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/lookalike/search:
 *   post:
 *     summary: Find profiles with similar facial features
 *     tags: [Lookalike]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Upload a reference photo to find profiles with similar facial features.
 *
 *       **Subscription Requirements:**
 *       - Free: Not available
 *       - Plus: 5 searches/day, 50/month
 *       - Premium: 20 searches/day, 200/month
 *       - Elite: 100 searches/day, 1000/month
 *
 *       **Image Requirements:**
 *       - Formats: JPEG, PNG, WebP
 *       - Max size: 10MB
 *       - Must contain exactly one face
 *       - Face must be clearly visible
 *     consumes:
 *       - multipart/form-data
 *       - application/json
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Reference image file
 *               limit:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *                 default: 20
 *               minSimilarity:
 *                 type: number
 *                 minimum: 0.5
 *                 maximum: 1.0
 *                 default: 0.7
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 description: Base64 encoded image
 *               limit:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *                 default: 20
 *               minSimilarity:
 *                 type: number
 *                 minimum: 0.5
 *                 maximum: 1.0
 *                 default: 0.7
 *     responses:
 *       200:
 *         description: Search completed successfully
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
 *                     searchId:
 *                       type: string
 *                     profiles:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           userId:
 *                             type: string
 *                           similarityScore:
 *                             type: number
 *                           matchedPhotoUrl:
 *                             type: string
 *                           profile:
 *                             type: object
 *                     processingTimeMs:
 *                       type: integer
 *                     totalCandidates:
 *                       type: integer
 *       400:
 *         description: Invalid image or request
 *       402:
 *         description: Feature requires subscription upgrade
 *       429:
 *         description: Rate limit exceeded
 */
router.post(
  '/search',
  upload.single('image'),
  handleMulterError,
  lookalikeController.search.bind(lookalikeController)
);

/**
 * @swagger
 * /api/v1/lookalike/analyze:
 *   post:
 *     summary: Analyze image for face detection (preview)
 *     tags: [Lookalike]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Analyze an image for face detection without performing a search.
 *       Useful for validating images before submitting a search request.
 *       Does not count against rate limits.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 description: Base64 encoded image
 *     responses:
 *       200:
 *         description: Image analyzed successfully
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
 *                     faceDetected:
 *                       type: boolean
 *                     faceConfidence:
 *                       type: number
 *                     qualityScore:
 *                       type: object
 *                     faceAttributes:
 *                       type: object
 *                     recommendation:
 *                       type: string
 *       400:
 *         description: Invalid image or no face detected
 */
router.post(
  '/analyze',
  upload.single('image'),
  handleMulterError,
  lookalikeController.analyzeImage.bind(lookalikeController)
);

/**
 * @swagger
 * /api/v1/lookalike/embeddings:
 *   post:
 *     summary: Store face embedding from profile photo
 *     tags: [Lookalike]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Process a photo from your profile and store its face embedding.
 *       This allows other users to find you through lookalike matching.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - photoUrl
 *             properties:
 *               photoUrl:
 *                 type: string
 *                 format: uri
 *                 description: URL of the photo to process
 *               isPrimary:
 *                 type: boolean
 *                 default: false
 *                 description: Whether this is the primary profile photo
 *     responses:
 *       201:
 *         description: Embedding stored successfully
 *       400:
 *         description: Invalid photo or no face detected
 */
router.post(
  '/embeddings',
  validateBody(StoreEmbeddingDto),
  lookalikeController.storeEmbedding.bind(lookalikeController)
);

/**
 * @swagger
 * /api/v1/lookalike/embeddings:
 *   get:
 *     summary: Get user's stored face embeddings
 *     tags: [Lookalike]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Embeddings retrieved successfully
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
 *                     embeddings:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           photoUrl:
 *                             type: string
 *                           faceConfidence:
 *                             type: number
 *                           isPrimary:
 *                             type: boolean
 *                     count:
 *                       type: integer
 */
router.get('/embeddings', lookalikeController.getEmbeddings.bind(lookalikeController));

/**
 * @swagger
 * /api/v1/lookalike/embeddings/{embeddingId}:
 *   delete:
 *     summary: Delete a face embedding
 *     tags: [Lookalike]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: embeddingId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Embedding deleted successfully
 *       404:
 *         description: Embedding not found
 */
router.delete(
  '/embeddings/:embeddingId',
  validateParams(EmbeddingIdParamDto),
  lookalikeController.deleteEmbedding.bind(lookalikeController)
);

/**
 * @swagger
 * /api/v1/lookalike/rate-limit:
 *   get:
 *     summary: Get rate limit status
 *     tags: [Lookalike]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Returns the user's current rate limit status including
 *       remaining searches and reset times.
 *     responses:
 *       200:
 *         description: Rate limit status retrieved
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
 *                     tier:
 *                       type: string
 *                     limits:
 *                       type: object
 *                       properties:
 *                         daily:
 *                           type: integer
 *                         monthly:
 *                           type: integer
 *                     usage:
 *                       type: object
 *                       properties:
 *                         daily:
 *                           type: integer
 *                         monthly:
 *                           type: integer
 *                     remaining:
 *                       type: object
 *                       properties:
 *                         daily:
 *                           type: integer
 *                         monthly:
 *                           type: integer
 *                     resetTimes:
 *                       type: object
 *                       properties:
 *                         daily:
 *                           type: string
 *                           format: date-time
 *                         monthly:
 *                           type: string
 *                           format: date-time
 *                     featureAvailable:
 *                       type: boolean
 */
router.get('/rate-limit', lookalikeController.getRateLimitStatus.bind(lookalikeController));

/**
 * @swagger
 * /api/v1/lookalike/history:
 *   get:
 *     summary: Get search history
 *     tags: [Lookalike]
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
 *         description: Search history retrieved
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
 *                     searches:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           resultsReturned:
 *                             type: integer
 *                           minSimilarityThreshold:
 *                             type: number
 *                           topMatches:
 *                             type: array
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                     count:
 *                       type: integer
 */
router.get(
  '/history',
  validateQuery(SearchHistoryQueryDto),
  lookalikeController.getSearchHistory.bind(lookalikeController)
);

export default router;
