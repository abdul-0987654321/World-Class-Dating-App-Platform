import Queue from 'bull';
import queueManager from '../infrastructure/queue/queue-manager';
import { QueueName } from '../infrastructure/queue/queue-config';
import { PhotoVerificationJobData, JobResult } from '../infrastructure/queue/job-types';
import photoVerificationService from '../domain/services/photo-verification.service';
import { createLogger } from '@flamoral/backend-shared';

const logger = createLogger('photo-verification-worker');

/**
 * Process photo verification job
 * - Verify face presence
 * - Optionally match with reference photo
 * - Update verification status
 */
export const processPhotoVerificationJob = async (
  job: Queue.Job<PhotoVerificationJobData>
): Promise<JobResult> => {
  const { mediaId, imageUrl, referencePhotoUrl } = job.data;

  try {
    logger.info(`Processing photo verification for media ${mediaId}`);

    await job.progress(20);

    // Verify the photo using the photo verification service
    const result = await photoVerificationService.verifyProfilePhoto(
      mediaId,
      imageUrl,
      referencePhotoUrl
    );

    await job.progress(100);

    logger.info(`Photo verification completed for media ${mediaId}: ${result.verified ? 'verified' : 'not verified'}`);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    logger.error(`Photo verification failed for media ${mediaId}:`, error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Start the photo verification worker
 */
export const startPhotoVerificationWorker = (): void => {
  const queue = queueManager.getQueue(QueueName.PHOTO_VERIFICATION);

  if (!queue) {
    throw new Error('Photo verification queue not initialized');
  }

  // Process jobs with concurrency
  queue.process(2, processPhotoVerificationJob);

  logger.info('Photo verification worker started with concurrency 2');

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
