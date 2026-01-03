/**
 * Deepfake Detection Worker
 *
 * Processes deepfake detection jobs for uploaded media.
 * Integrates with the ML-based deepfake detection service.
 */

import Queue from 'bull';
import queueManager from '../infrastructure/queue/queue-manager';
import { QueueName } from '../infrastructure/queue/queue-config';
import {
  DeepfakeDetectionJobData,
  DeepfakeDetectionResult,
  JobResult,
} from '../infrastructure/queue/job-types';
import {
  deepfakeDetectionClient,
  DeepfakeAnalysisError,
} from '../infrastructure/clients/deepfake-detection.client';
import mediaRepository from '../domain/repositories/media.repository';
import azureStorageService from '../infrastructure/storage/azure-storage.service';
import { ModerationStatus } from '../types';
import { createLogger } from '@flamoral/backend-shared';

const logger = createLogger('deepfake-detection-worker');

// Detection thresholds
const DEEPFAKE_REJECT_THRESHOLD = 0.8; // Auto-reject above this score
const DEEPFAKE_FLAG_THRESHOLD = 0.5; // Flag for review above this score

/**
 * Process deepfake detection job
 *
 * - Analyze media for deepfake indicators
 * - Update media status based on results
 * - Flag or reject suspicious content
 */
export const processDeepfakeDetectionJob = async (
  job: Queue.Job<DeepfakeDetectionJobData>
): Promise<JobResult> => {
  const { mediaId, userId, imageUrl, mediaType, isProfilePhoto } = job.data;

  try {
    logger.info(`Processing deepfake detection for media ${mediaId}`);

    await job.progress(10);

    // Step 1: Check service health
    const isHealthy = await deepfakeDetectionClient.getHealthStatus();
    if (!isHealthy) {
      logger.warn('Deepfake detection service unavailable, flagging for manual review');
      await flagForManualReview(mediaId, 'service_unavailable');
      return {
        success: true,
        data: { mediaId, status: 'flagged', reason: 'service_unavailable' },
      };
    }

    await job.progress(20);

    // Step 2: Analyze media
    let result: DeepfakeDetectionResult;

    if (mediaType === 'video') {
      result = await deepfakeDetectionClient.analyzeVideo({
        videoUrl: imageUrl,
        userId,
        maxFrames: 100, // Limit frames for faster processing
      });
    } else {
      result = await deepfakeDetectionClient.analyzeImage({
        imageUrl,
        userId,
      });
    }

    await job.progress(70);

    logger.info(
      `Deepfake analysis complete for ${mediaId}: ` +
      `score=${result.score}, isDeepfake=${result.isDeepfake}, confidence=${result.confidence}`
    );

    // Step 3: Determine action based on results
    let moderationStatus: ModerationStatus;
    let action: 'approved' | 'flagged' | 'rejected';

    if (result.isDeepfake && result.score >= DEEPFAKE_REJECT_THRESHOLD) {
      // High confidence deepfake - auto-reject
      moderationStatus = ModerationStatus.REJECTED;
      action = 'rejected';
      logger.warn(`Media ${mediaId} rejected as deepfake (score: ${result.score})`);
    } else if (result.score >= DEEPFAKE_FLAG_THRESHOLD || result.requiresReview) {
      // Borderline - flag for review
      moderationStatus = ModerationStatus.FLAGGED;
      action = 'flagged';
      logger.info(`Media ${mediaId} flagged for deepfake review (score: ${result.score})`);
    } else {
      // Low risk - approve
      moderationStatus = ModerationStatus.APPROVED;
      action = 'approved';
      logger.info(`Media ${mediaId} approved (deepfake score: ${result.score})`);
    }

    await job.progress(80);

    // Step 4: Update media record
    await mediaRepository.update(mediaId, {
      moderationStatus,
      deepfakeResult: {
        isDeepfake: result.isDeepfake,
        confidence: result.confidence,
        score: result.score,
        indicators: result.indicators,
        analyzedAt: new Date().toISOString(),
      },
    });

    await job.progress(90);

    // Step 5: If rejected, delete the media
    if (action === 'rejected') {
      const media = await mediaRepository.findById(mediaId);
      if (media) {
        await azureStorageService.deleteImageVersions(media.urls);
        await mediaRepository.delete(mediaId);
        logger.info(`Rejected deepfake media deleted: ${mediaId}`);
      }
    }

    // Step 6: If profile photo is flagged/rejected, notify user service
    if (isProfilePhoto && action !== 'approved') {
      await notifyProfilePhotoIssue(userId, mediaId, action, result);
    }

    await job.progress(100);

    logger.info(`Deepfake detection completed for media ${mediaId}: ${action}`);

    return {
      success: true,
      data: {
        mediaId,
        status: action,
        score: result.score,
        indicators: result.indicators,
      },
    };
  } catch (error) {
    logger.error(`Deepfake detection failed for media ${mediaId}:`, error);

    // On error, flag for manual review rather than failing silently
    try {
      await flagForManualReview(mediaId, 'analysis_error');
    } catch (updateError) {
      logger.error('Failed to flag media for review:', updateError);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Flag media for manual review
 */
async function flagForManualReview(mediaId: string, reason: string): Promise<void> {
  await mediaRepository.update(mediaId, {
    moderationStatus: ModerationStatus.FLAGGED,
    deepfakeResult: {
      flagReason: reason,
      requiresManualReview: true,
      flaggedAt: new Date().toISOString(),
    },
  });
}

/**
 * Notify user service about profile photo issues
 */
async function notifyProfilePhotoIssue(
  userId: string,
  mediaId: string,
  action: string,
  result: DeepfakeDetectionResult
): Promise<void> {
  // This would typically call the user service to notify about the issue
  // For now, just log the notification
  logger.info(`Profile photo issue notification: user=${userId}, media=${mediaId}, action=${action}`);

  // TODO: Implement actual notification to user service
  // await userServiceClient.notifyProfilePhotoIssue({
  //   userId,
  //   mediaId,
  //   reason: action === 'rejected' ? 'deepfake_detected' : 'requires_review',
  //   details: result,
  // });
}

/**
 * Start the deepfake detection worker
 */
export const startDeepfakeDetectionWorker = (): void => {
  const queue = queueManager.getQueue(QueueName.DEEPFAKE_DETECTION);

  if (!queue) {
    logger.warn('Deepfake detection queue not initialized, worker not started');
    return;
  }

  // Process jobs with limited concurrency (ML inference is resource-intensive)
  queue.process(2, processDeepfakeDetectionJob);

  logger.info('Deepfake detection worker started with concurrency 2');

  // Worker event handlers
  queue.on('completed', (job) => {
    logger.info(`Deepfake detection job ${job.id} completed successfully`);
  });

  queue.on('failed', (job, err) => {
    logger.error(`Deepfake detection job ${job.id} failed:`, err);
  });

  queue.on('stalled', (job) => {
    logger.warn(`Deepfake detection job ${job.id} has stalled`);
  });

  queue.on('error', (err) => {
    logger.error('Deepfake detection queue error:', err);
  });
};

/**
 * Add a deepfake detection job to the queue
 */
export const queueDeepfakeDetection = async (
  data: DeepfakeDetectionJobData,
  options?: Queue.JobOptions
): Promise<Queue.Job<DeepfakeDetectionJobData>> => {
  const queue = queueManager.getQueue(QueueName.DEEPFAKE_DETECTION);

  if (!queue) {
    throw new Error('Deepfake detection queue not initialized');
  }

  const job = await queue.add(data, {
    priority: data.isProfilePhoto ? 1 : 5, // Higher priority for profile photos
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    ...options,
  });

  logger.info(`Queued deepfake detection job ${job.id} for media ${data.mediaId}`);
  return job;
};

export default {
  processDeepfakeDetectionJob,
  startDeepfakeDetectionWorker,
  queueDeepfakeDetection,
};
