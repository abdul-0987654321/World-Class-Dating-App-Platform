/**
 * CSAM Detection Middleware
 *
 * CRITICAL: This middleware must run BEFORE any image is stored or served.
 * It performs CSAM detection on all uploaded images and blocks content if detected.
 *
 * Integration Point: Upload Pipeline
 * - Called immediately after image validation
 * - Blocks upload if CSAM is detected
 * - Quarantines suspicious content
 * - Triggers all required legal compliance actions
 */

import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { createLogger } from '@flamoral/shared';
import config from '../config';

const logger = createLogger('csam-detection-middleware');

const MODERATION_SERVICE_URL = process.env.MODERATION_SERVICE_URL || 'http://localhost:3005';
const CSAM_DETECTION_ENABLED = process.env.CSAM_DETECTION_ENABLED !== 'false';

export interface CSAMDetectionResult {
  isCSAM: boolean;
  confidenceScore: number;
  severity: string;
  status: string;
  detectionId: string;
  blocked: boolean;
  quarantined: boolean;
}

/**
 * CSAM Detection Middleware
 * Detects CSAM in uploaded images before storage
 */
export async function csamDetectionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Skip if CSAM detection is disabled (ONLY for development/testing)
    if (!CSAM_DETECTION_ENABLED) {
      logger.warn('CSAM detection is DISABLED - this should NEVER happen in production');
      return next();
    }

    // Check if file exists in request
    if (!req.file && !req.files) {
      return next();
    }

    const file = req.file as Express.Multer.File;
    if (!file) {
      return next();
    }

    const userId = (req as any).user?.id || 'unknown';
    const contentId = `upload-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    logger.info('Running CSAM detection on upload', {
      contentId,
      userId,
      fileSize: file.size,
      mimeType: file.mimetype,
    });

    try {
      // Call CSAM detection service
      const detectionResult = await performCSAMDetection(
        file.buffer,
        contentId,
        userId,
        file.originalname
      );

      // If CSAM is detected, block the upload immediately
      if (detectionResult.isCSAM || detectionResult.blocked) {
        logger.error('CSAM DETECTED - BLOCKING UPLOAD', {
          detectionId: detectionResult.detectionId,
          contentId,
          userId,
          confidenceScore: detectionResult.confidenceScore,
          severity: detectionResult.severity,
        });

        // Return 451 Unavailable For Legal Reasons
        res.status(451).json({
          success: false,
          error: 'Content blocked due to policy violation',
          code: 'CONTENT_BLOCKED',
          message: 'This content cannot be uploaded. If you believe this is an error, please contact support.',
          detectionId: detectionResult.detectionId,
        });

        return;
      }

      // If flagged for review, allow upload but mark for review
      if (detectionResult.status === 'flagged') {
        logger.warn('Content flagged for manual review', {
          detectionId: detectionResult.detectionId,
          contentId,
          userId,
        });

        // Add detection result to request for later processing
        (req as any).csamDetectionResult = detectionResult;
      }

      // Continue to next middleware
      next();

    } catch (detectionError: any) {
      logger.error('CSAM detection failed - FAIL SECURE', {
        contentId,
        userId,
        error: detectionError.message,
      });

      // FAIL SECURE: If detection fails, quarantine for manual review
      try {
        await quarantineForReview(file.buffer, contentId, userId, detectionError.message);
      } catch (quarantineError: any) {
        logger.error('CRITICAL: Failed to quarantine after detection failure', {
          contentId,
          userId,
          error: quarantineError.message,
        });
      }

      // Block upload on detection failure
      res.status(503).json({
        success: false,
        error: 'Content screening temporarily unavailable',
        code: 'SCREENING_UNAVAILABLE',
        message: 'Unable to process upload at this time. Please try again later.',
      });

      return;
    }

  } catch (error: any) {
    logger.error('CSAM middleware error', error);

    // FAIL SECURE: On any error, block the upload
    res.status(500).json({
      success: false,
      error: 'Upload processing failed',
      code: 'UPLOAD_ERROR',
      message: 'Unable to process upload. Please try again.',
    });
  }
}

/**
 * Perform CSAM detection via moderation service
 */
async function performCSAMDetection(
  imageBuffer: Buffer,
  contentId: string,
  userId: string,
  fileName: string
): Promise<CSAMDetectionResult> {
  try {
    // Convert buffer to base64 for API transmission
    const imageBase64 = imageBuffer.toString('base64');

    // Call moderation service CSAM detection endpoint
    const response = await axios.post(
      `${MODERATION_SERVICE_URL}/api/csam/detect`,
      {
        contentId,
        userId,
        imageData: imageBase64,
        fileName,
        contentType: 'user_upload',
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 second timeout
      }
    );

    const result = response.data;

    return {
      isCSAM: result.isCSAM || false,
      confidenceScore: result.confidenceScore || 0,
      severity: result.severity || 'unknown',
      status: result.status || 'clean',
      detectionId: result.detectionId,
      blocked: result.isCSAM || false,
      quarantined: result.quarantined || false,
    };

  } catch (error: any) {
    logger.error('CSAM detection API call failed', {
      contentId,
      userId,
      error: error.message,
      status: error.response?.status,
    });

    throw new Error(`CSAM detection failed: ${error.message}`);
  }
}

/**
 * Quarantine content for manual review (fallback for detection failures)
 */
async function quarantineForReview(
  imageBuffer: Buffer,
  contentId: string,
  userId: string,
  errorMessage: string
): Promise<void> {
  try {
    const imageBase64 = imageBuffer.toString('base64');

    await axios.post(
      `${MODERATION_SERVICE_URL}/api/csam/quarantine-for-review`,
      {
        contentId,
        userId,
        imageData: imageBase64,
        reason: 'detection_failure',
        error: errorMessage,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    logger.warn('Content quarantined for manual review', {
      contentId,
      userId,
      reason: 'detection_failure',
    });

  } catch (error: any) {
    logger.error('Failed to quarantine content for review', {
      contentId,
      userId,
      error: error.message,
    });

    throw error;
  }
}

/**
 * Check if CSAM detection is enabled
 */
export function isCSAMDetectionEnabled(): boolean {
  return CSAM_DETECTION_ENABLED;
}

/**
 * Health check for CSAM detection service
 */
export async function checkCSAMDetectionHealth(): Promise<{
  available: boolean;
  enabled: boolean;
  responseTime?: number;
  error?: string;
}> {
  const enabled = CSAM_DETECTION_ENABLED;

  if (!enabled) {
    return {
      available: false,
      enabled: false,
    };
  }

  try {
    const startTime = Date.now();

    const response = await axios.get(
      `${MODERATION_SERVICE_URL}/api/csam/health`,
      {
        timeout: 5000,
      }
    );

    const responseTime = Date.now() - startTime;

    return {
      available: response.status === 200,
      enabled: true,
      responseTime,
    };

  } catch (error: any) {
    logger.error('CSAM detection service health check failed', error);

    return {
      available: false,
      enabled: true,
      error: error.message,
    };
  }
}

export default csamDetectionMiddleware;
