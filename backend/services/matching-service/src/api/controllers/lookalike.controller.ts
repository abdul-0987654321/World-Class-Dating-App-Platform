/**
 * Lookalike Matching Controller
 *
 * Handles HTTP requests for lookalike matching functionality.
 * Provides endpoints for:
 * - Finding similar profiles based on a reference photo
 * - Managing face embeddings for the user's own photos
 * - Checking rate limit status
 * - Viewing search history
 */

import { createLogger } from '@flamoral/backend-shared';
import { Request, Response } from 'express';

import lookalikeMatchingService from '../../domain/services/lookalike-matching.service';
import { LOOKALIKE_CONFIG } from '../../types/lookalike.types';

const logger = createLogger('lookalike-controller');

/**
 * Lookalike Controller
 *
 * All endpoints require authentication. Rate limiting is enforced
 * at the service level based on subscription tier.
 */
export class LookalikeController {
  /**
   * Find similar profiles based on a reference photo
   *
   * POST /api/v1/lookalike/search
   *
   * Accepts a reference image (multipart form-data or base64)
   * and returns profiles with similar facial features.
   *
   * Request body:
   * - image: Base64 encoded image or file upload
   * - limit?: Number of results (default: 20, max: 100)
   * - minSimilarity?: Minimum similarity threshold (default: 0.7, range: 0.5-1.0)
   *
   * Response:
   * - success: boolean
   * - data: {
   *     searchId: string
   *     profiles: SimilarProfile[]
   *     processingTimeMs: number
   *     totalCandidates: number
   *   }
   */
  async search(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const { userId } = (req as any).user;
    const correlationId = (req as any).correlationId || 'unknown';

    try {
      // Get image from request
      let imageBuffer: Buffer;

      if (req.file) {
        // Handle multipart file upload
        imageBuffer = req.file.buffer;
      } else if (req.body.image) {
        // Handle base64 encoded image
        const base64Data = req.body.image.replace(/^data:image\/\w+;base64,/, '');
        imageBuffer = Buffer.from(base64Data, 'base64');
      } else {
        res.status(400).json({
          success: false,
          error: 'No image provided. Please upload an image or provide base64 data.',
          code: 'MISSING_IMAGE',
          correlation_id: correlationId,
        });
        return;
      }

      // Validate image size
      if (imageBuffer.length > LOOKALIKE_CONFIG.MAX_IMAGE_SIZE) {
        res.status(400).json({
          success: false,
          error: `Image size exceeds maximum allowed (${LOOKALIKE_CONFIG.MAX_IMAGE_SIZE / 1024 / 1024}MB)`,
          code: 'IMAGE_TOO_LARGE',
          correlation_id: correlationId,
        });
        return;
      }

      // Parse request parameters
      const limit = Math.min(
        parseInt(req.body.limit, 10) || LOOKALIKE_CONFIG.DEFAULT_LIMIT,
        LOOKALIKE_CONFIG.MAX_LIMIT
      );
      const minSimilarity = Math.max(
        0.5,
        Math.min(1.0, parseFloat(req.body.minSimilarity) || LOOKALIKE_CONFIG.DEFAULT_MIN_SIMILARITY)
      );

      logger.info(`Lookalike search request`, {
        userId,
        imageSize: imageBuffer.length,
        limit,
        minSimilarity,
      });

      // Perform the search
      const result = await lookalikeMatchingService.findSimilarProfiles({
        userId,
        referenceImage: imageBuffer,
        limit,
        minSimilarity,
      });

      if (!result.success) {
        const statusCode = this.getStatusCodeForError(result.errorCode);
        res.status(statusCode).json({
          success: false,
          error: result.error,
          code: result.errorCode,
          correlation_id: correlationId,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          searchId: result.searchId,
          profiles: result.profiles,
          processingTimeMs: result.processingTimeMs,
          totalCandidates: result.totalCandidates,
          count: result.profiles.length,
        },
      });
    } catch (error: any) {
      logger.error('Lookalike search failed', {
        userId,
        error: error.message,
        stack: error.stack,
        processingTimeMs: Date.now() - startTime,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to search for similar profiles. Please try again.',
        code: 'INTERNAL_ERROR',
        correlation_id: correlationId,
      });
    }
  }

  /**
   * Store face embedding from user's profile photo
   *
   * POST /api/v1/lookalike/embeddings
   *
   * Processes a photo from the user's profile and stores its
   * face embedding for use in lookalike matching by other users.
   *
   * Request body:
   * - photoUrl: URL of the photo to process
   * - isPrimary?: Whether this is the primary profile photo
   *
   * Response:
   * - success: boolean
   * - data: { embeddingId, faceConfidence, qualityScore }
   */
  async storeEmbedding(req: Request, res: Response): Promise<void> {
    const { userId } = (req as any).user;
    const correlationId = (req as any).correlationId || 'unknown';

    try {
      const { photoUrl, isPrimary } = req.body;

      if (!photoUrl) {
        res.status(400).json({
          success: false,
          error: 'Photo URL is required',
          code: 'MISSING_PHOTO_URL',
          correlation_id: correlationId,
        });
        return;
      }

      // Fetch the image from URL
      let imageBuffer: Buffer;
      try {
        const response = await fetch(photoUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        imageBuffer = Buffer.from(arrayBuffer);
      } catch (fetchError: any) {
        logger.error('Failed to fetch image', { photoUrl, error: fetchError.message });
        res.status(400).json({
          success: false,
          error: 'Failed to fetch image from URL',
          code: 'IMAGE_FETCH_FAILED',
          correlation_id: correlationId,
        });
        return;
      }

      // Extract face embedding
      const embeddingResult = await lookalikeMatchingService.extractFaceEmbedding(imageBuffer);

      if (!embeddingResult.success || !embeddingResult.embedding) {
        const statusCode = this.getStatusCodeForError(embeddingResult.errorCode);
        res.status(statusCode).json({
          success: false,
          error: embeddingResult.error,
          code: embeddingResult.errorCode,
          correlation_id: correlationId,
        });
        return;
      }

      // Store the embedding
      const storedEmbedding = await lookalikeMatchingService.storeFaceEmbedding(
        userId,
        photoUrl,
        embeddingResult.embedding,
        {
          faceConfidence: embeddingResult.faceConfidence,
          boundingBox: embeddingResult.boundingBox,
          faceAttributes: embeddingResult.faceAttributes,
          qualityBrightness: embeddingResult.qualityBrightness,
          qualitySharpness: embeddingResult.qualitySharpness,
          isPrimary: isPrimary || false,
        }
      );

      logger.info('Face embedding stored', {
        userId,
        embeddingId: storedEmbedding.id,
        isPrimary,
      });

      res.status(201).json({
        success: true,
        data: {
          embeddingId: storedEmbedding.id,
          faceConfidence: storedEmbedding.faceConfidence,
          qualityScore: {
            brightness: storedEmbedding.qualityBrightness,
            sharpness: storedEmbedding.qualitySharpness,
          },
          isPrimary: storedEmbedding.isPrimary,
        },
      });
    } catch (error: any) {
      logger.error('Failed to store face embedding', {
        userId,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to process and store face embedding',
        code: 'INTERNAL_ERROR',
        correlation_id: correlationId,
      });
    }
  }

  /**
   * Get user's stored face embeddings
   *
   * GET /api/v1/lookalike/embeddings
   *
   * Returns all active face embeddings for the authenticated user.
   */
  async getEmbeddings(req: Request, res: Response): Promise<void> {
    const { userId } = (req as any).user;
    const correlationId = (req as any).correlationId || 'unknown';

    try {
      const embeddings = await lookalikeMatchingService.getUserEmbeddings(userId);

      res.status(200).json({
        success: true,
        data: {
          embeddings: embeddings.map((e) => ({
            id: e.id,
            photoUrl: e.photoUrl,
            faceConfidence: e.faceConfidence,
            qualityScore: {
              brightness: e.qualityBrightness,
              sharpness: e.qualitySharpness,
            },
            isPrimary: e.isPrimary,
            createdAt: e.createdAt.toISOString(),
          })),
          count: embeddings.length,
        },
      });
    } catch (error: any) {
      logger.error('Failed to get embeddings', {
        userId,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve face embeddings',
        code: 'INTERNAL_ERROR',
        correlation_id: correlationId,
      });
    }
  }

  /**
   * Delete a face embedding
   *
   * DELETE /api/v1/lookalike/embeddings/:embeddingId
   *
   * Removes a face embedding from the user's profile.
   */
  async deleteEmbedding(req: Request, res: Response): Promise<void> {
    const { userId } = (req as any).user;
    const { embeddingId } = req.params;
    const correlationId = (req as any).correlationId || 'unknown';

    try {
      if (!embeddingId) {
        res.status(400).json({
          success: false,
          error: 'Embedding ID is required',
          code: 'MISSING_EMBEDDING_ID',
          correlation_id: correlationId,
        });
        return;
      }

      const deleted = await lookalikeMatchingService.deleteEmbedding(userId, embeddingId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Face embedding not found or already deleted',
          code: 'EMBEDDING_NOT_FOUND',
          correlation_id: correlationId,
        });
        return;
      }

      logger.info('Face embedding deleted', { userId, embeddingId });

      res.status(200).json({
        success: true,
        data: {
          deleted: true,
          embeddingId,
        },
      });
    } catch (error: any) {
      logger.error('Failed to delete embedding', {
        userId,
        embeddingId,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to delete face embedding',
        code: 'INTERNAL_ERROR',
        correlation_id: correlationId,
      });
    }
  }

  /**
   * Get rate limit status
   *
   * GET /api/v1/lookalike/rate-limit
   *
   * Returns the user's current rate limit status including
   * remaining searches and reset times.
   */
  async getRateLimitStatus(req: Request, res: Response): Promise<void> {
    const { userId } = (req as any).user;
    const correlationId = (req as any).correlationId || 'unknown';

    try {
      const status = await lookalikeMatchingService.getRateLimitStatus(userId);

      res.status(200).json({
        success: true,
        data: {
          tier: status.tier,
          limits: {
            daily: status.dailyLimit,
            monthly: status.monthlyLimit,
          },
          usage: {
            daily: status.dailyUsed,
            monthly: status.monthlyUsed,
          },
          remaining: {
            daily: status.dailyRemaining,
            monthly: status.monthlyRemaining,
          },
          resetTimes: {
            daily: status.resetTimes.daily.toISOString(),
            monthly: status.resetTimes.monthly.toISOString(),
          },
          featureAvailable: status.dailyLimit > 0,
        },
      });
    } catch (error: any) {
      logger.error('Failed to get rate limit status', {
        userId,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve rate limit status',
        code: 'INTERNAL_ERROR',
        correlation_id: correlationId,
      });
    }
  }

  /**
   * Get search history
   *
   * GET /api/v1/lookalike/history
   *
   * Returns the user's recent lookalike search history.
   */
  async getSearchHistory(req: Request, res: Response): Promise<void> {
    const { userId } = (req as any).user;
    const correlationId = (req as any).correlationId || 'unknown';

    try {
      const limit = Math.min(parseInt(req.query.limit as string, 10) || 10, 50);
      const history = await lookalikeMatchingService.getSearchHistory(userId, limit);

      res.status(200).json({
        success: true,
        data: {
          searches: history.map((s) => ({
            id: s.id,
            resultsReturned: s.resultsReturned,
            minSimilarityThreshold: s.minSimilarityThreshold,
            topMatches: s.topMatches?.slice(0, 5), // Only show top 5 in history
            createdAt: s.createdAt.toISOString(),
          })),
          count: history.length,
        },
      });
    } catch (error: any) {
      logger.error('Failed to get search history', {
        userId,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve search history',
        code: 'INTERNAL_ERROR',
        correlation_id: correlationId,
      });
    }
  }

  /**
   * Analyze an image for face detection (preview)
   *
   * POST /api/v1/lookalike/analyze
   *
   * Analyzes an image and returns face detection results
   * without performing a search. Useful for previewing
   * before submitting a search request.
   */
  async analyzeImage(req: Request, res: Response): Promise<void> {
    const { userId } = (req as any).user;
    const correlationId = (req as any).correlationId || 'unknown';

    try {
      // Get image from request
      let imageBuffer: Buffer;

      if (req.file) {
        imageBuffer = req.file.buffer;
      } else if (req.body.image) {
        const base64Data = req.body.image.replace(/^data:image\/\w+;base64,/, '');
        imageBuffer = Buffer.from(base64Data, 'base64');
      } else {
        res.status(400).json({
          success: false,
          error: 'No image provided',
          code: 'MISSING_IMAGE',
          correlation_id: correlationId,
        });
        return;
      }

      // Validate image size
      if (imageBuffer.length > LOOKALIKE_CONFIG.MAX_IMAGE_SIZE) {
        res.status(400).json({
          success: false,
          error: `Image size exceeds maximum allowed (${LOOKALIKE_CONFIG.MAX_IMAGE_SIZE / 1024 / 1024}MB)`,
          code: 'IMAGE_TOO_LARGE',
          correlation_id: correlationId,
        });
        return;
      }

      // Extract face embedding (this validates the image)
      const result = await lookalikeMatchingService.extractFaceEmbedding(imageBuffer);

      if (!result.success) {
        const statusCode = this.getStatusCodeForError(result.errorCode);
        res.status(statusCode).json({
          success: false,
          error: result.error,
          code: result.errorCode,
          correlation_id: correlationId,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          faceDetected: true,
          faceConfidence: result.faceConfidence,
          boundingBox: result.boundingBox,
          qualityScore: {
            brightness: result.qualityBrightness,
            sharpness: result.qualitySharpness,
          },
          faceAttributes: result.faceAttributes
            ? {
                ageRange: result.faceAttributes.ageRange,
                gender: result.faceAttributes.gender,
                smile: result.faceAttributes.smile,
                eyeglasses: result.faceAttributes.eyeglasses,
                sunglasses: result.faceAttributes.sunglasses,
              }
            : undefined,
          recommendation: this.getImageRecommendation(result),
        },
      });
    } catch (error: any) {
      logger.error('Failed to analyze image', {
        userId,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to analyze image',
        code: 'INTERNAL_ERROR',
        correlation_id: correlationId,
      });
    }
  }

  /**
   * Get status code for error
   */
  private getStatusCodeForError(errorCode?: string): number {
    switch (errorCode) {
      case 'NO_FACE_DETECTED':
      case 'MULTIPLE_FACES_DETECTED':
      case 'LOW_QUALITY_IMAGE':
      case 'INVALID_IMAGE_FORMAT':
      case 'IMAGE_TOO_LARGE':
        return 400;
      case 'RATE_LIMIT_EXCEEDED':
        return 429;
      case 'INSUFFICIENT_TIER':
        return 402;
      case 'USER_NOT_FOUND':
        return 404;
      default:
        return 500;
    }
  }

  /**
   * Generate recommendation based on image analysis
   */
  private getImageRecommendation(result: any): string {
    if (result.faceConfidence && result.faceConfidence >= 99) {
      return 'Excellent photo quality. This image is ideal for lookalike matching.';
    }

    const issues: string[] = [];

    if (result.qualityBrightness && result.qualityBrightness < 0.5) {
      issues.push('improve lighting');
    }

    if (result.qualitySharpness && result.qualitySharpness < 0.5) {
      issues.push('use a sharper image');
    }

    if (result.faceAttributes?.sunglasses?.value) {
      issues.push('remove sunglasses for better matching');
    }

    if (issues.length > 0) {
      return `Good photo, but you might get better results if you ${issues.join(' and ')}.`;
    }

    return 'Good photo quality. Ready for lookalike matching.';
  }
}

export default new LookalikeController();
