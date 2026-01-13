import { createLogger } from '@flamoral/backend-shared';
import Queue from 'bull';

import mediaRepository from '../domain/repositories/media.repository';
import contentModerationService from '../domain/services/content-moderation.service';
import { ContentModerationJobData, JobResult } from '../infrastructure/queue/job-types';
import { QueueName } from '../infrastructure/queue/queue-config';
import queueManager from '../infrastructure/queue/queue-manager';
import { storageService } from '../infrastructure/storage/s3-storage.service';
import { ModerationStatus } from '../types';

const logger = createLogger('content-moderation-worker');

/**
 * Process content moderation job
 * - Analyze image content
 * - Update moderation status
 * - Delete if rejected
 */
export const processContentModerationJob = async (
  job: Queue.Job<ContentModerationJobData>
): Promise<JobResult> => {
  const { mediaId, userId, imageUrl } = job.data;

  try {
    logger.info(`Processing content moderation for media ${mediaId}`);

    await job.progress(20);

    // Step 1: Moderate the image
    const { status, result } = await contentModerationService.moderateImage(
      imageUrl,
      mediaId,
      userId
    );

    await job.progress(60);

    // Step 2: Update media metadata with moderation results
    await mediaRepository.update(mediaId, {
      moderationStatus: status,
      moderationResult: result,
    });

    await job.progress(80);

    // Step 3: If rejected, delete the files from storage
    if (status === ModerationStatus.REJECTED) {
      const media = await mediaRepository.findById(mediaId);

      if (media) {
        await storageService.deleteImageVersions(media.urls);
        await mediaRepository.delete(mediaId);
        logger.info(`Rejected media deleted: ${mediaId}`);
      }
    }

    await job.progress(100);

    logger.info(`Content moderation completed for media ${mediaId}: ${status}`);

    return {
      success: true,
      data: { mediaId, status, result },
    };
  } catch (error) {
    logger.error(`Content moderation failed for media ${mediaId}:`, error);

    // Mark as flagged for manual review on error
    try {
      await mediaRepository.update(mediaId, {
        moderationStatus: ModerationStatus.FLAGGED,
      });
    } catch (updateError) {
      logger.error('Failed to update moderation status to FLAGGED:', updateError);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Start the content moderation worker
 */
export const startContentModerationWorker = (): void => {
  const queue = queueManager.getQueue(QueueName.CONTENT_MODERATION);

  if (!queue) {
    throw new Error('Content moderation queue not initialized');
  }

  // Process jobs with concurrency
  queue.process(3, processContentModerationJob);

  logger.info('Content moderation worker started with concurrency 3');

  // Worker event handlers
  queue.on('completed', (job) => {
    logger.info(`Job ${job.id} completed successfully`);
  });

  queue.on('failed', (job, err) => {
    logger.error(`Job ${job.id} failed:`, err);
  });

  queue.on('stalled', (job) => {
    logger.warn(`Job ${job.id} has stalled`);
  });
};
