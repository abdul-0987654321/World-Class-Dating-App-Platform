import Queue from 'bull';
import queueManager from '../infrastructure/queue/queue-manager';
import { QueueName } from '../infrastructure/queue/queue-config';
import { ImageProcessingJobData, JobResult } from '../infrastructure/queue/job-types';
import imageProcessingService from '../domain/services/image-processing.service';
import azureStorageService from '../infrastructure/storage/azure-storage.service';
import mediaRepository from '../domain/repositories/media.repository';
import { MediaMetadata, ModerationStatus } from '../types';
import { createLogger } from '@flamoral/shared';

const logger = createLogger('image-processing-worker');

/**
 * Process image upload job
 * - Validate image
 * - Process and resize
 * - Upload to Azure Storage
 * - Save metadata to database
 * - Trigger content moderation
 */
export const processImageJob = async (
  job: Queue.Job<ImageProcessingJobData>
): Promise<JobResult> => {
  const { mediaId, userId, fileBuffer, fileName, mimeType, isProfilePhoto } = job.data;

  try {
    logger.info(`Processing image for media ${mediaId}`);

    // Update job progress
    await job.progress(10);

    // Step 1: Validate the image
    const validation = imageProcessingService.validateImage(
      fileBuffer,
      mimeType,
      fileBuffer.length
    );

    if (!validation.valid) {
      throw new Error(validation.error);
    }

    await job.progress(20);

    // Step 2: Get image metadata
    const metadata = await imageProcessingService.getMetadata(fileBuffer);

    await job.progress(30);

    // Step 3: Process image (create all versions)
    const processedImages = await imageProcessingService.processImage(fileBuffer);

    await job.progress(50);

    // Step 4: Upload all versions to Azure Storage
    const urls = await azureStorageService.uploadImageVersions(
      processedImages,
      fileName,
      mimeType,
      userId
    );

    await job.progress(70);

    // Step 5: Create media metadata
    const media: MediaMetadata = {
      id: mediaId,
      userId,
      fileName: `${mediaId}-${fileName}`,
      originalName: fileName,
      mimeType,
      size: fileBuffer.length,
      urls,
      dimensions: {
        width: metadata.width,
        height: metadata.height,
      },
      isProfilePhoto,
      isVerified: false,
      moderationStatus: ModerationStatus.PENDING,
      uploadedAt: new Date(),
      updatedAt: new Date(),
    };

    await job.progress(80);

    // Step 6: Save to database
    const savedMedia = await mediaRepository.create(media);

    await job.progress(90);

    // Step 7: Trigger content moderation job
    await queueManager.addContentModerationJob({
      mediaId: savedMedia.id,
      userId: savedMedia.userId,
      imageUrl: savedMedia.urls.standard,
    });

    await job.progress(100);

    logger.info(`Image processing completed for media ${mediaId}`);

    return {
      success: true,
      data: savedMedia,
    };
  } catch (error) {
    logger.error(`Image processing failed for media ${mediaId}:`, error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Start the image processing worker
 */
export const startImageProcessingWorker = (): void => {
  const queue = queueManager.getQueue(QueueName.IMAGE_PROCESSING);

  if (!queue) {
    throw new Error('Image processing queue not initialized');
  }

  // Process jobs with concurrency
  queue.process(5, processImageJob);

  logger.info('Image processing worker started with concurrency 5');

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
