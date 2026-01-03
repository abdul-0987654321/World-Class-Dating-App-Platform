import Queue from 'bull';
import { QueueName, defaultQueueOptions, JobPriority } from './queue-config';
import {
  ImageProcessingJobData,
  ContentModerationJobData,
  PhotoVerificationJobData,
  DeepfakeDetectionJobData,
} from './job-types';
import { createLogger } from '@flamoral/backend-shared';

const logger = createLogger('queue-manager');

export class QueueManager {
  private queues: Map<QueueName, Queue.Queue> = new Map();

  constructor() {
    this.initializeQueues();
  }

  /**
   * Initialize all queues
   */
  private initializeQueues(): void {
    // Image processing queue
    this.queues.set(
      QueueName.IMAGE_PROCESSING,
      new Queue(QueueName.IMAGE_PROCESSING, defaultQueueOptions)
    );

    // Content moderation queue
    this.queues.set(
      QueueName.CONTENT_MODERATION,
      new Queue(QueueName.CONTENT_MODERATION, defaultQueueOptions)
    );

    // Photo verification queue
    this.queues.set(
      QueueName.PHOTO_VERIFICATION,
      new Queue(QueueName.PHOTO_VERIFICATION, defaultQueueOptions)
    );

    // Deepfake detection queue
    this.queues.set(
      QueueName.DEEPFAKE_DETECTION,
      new Queue(QueueName.DEEPFAKE_DETECTION, defaultQueueOptions)
    );

    logger.info('All queues initialized');

    // Setup error handlers
    this.queues.forEach((queue, name) => {
      queue.on('error', (error) => {
        logger.error(`Queue ${name} error:`, error);
      });

      queue.on('failed', (job, err) => {
        logger.error(`Job ${job.id} in queue ${name} failed:`, err);
      });

      queue.on('completed', (job) => {
        logger.info(`Job ${job.id} in queue ${name} completed`);
      });
    });
  }

  /**
   * Get a specific queue
   */
  getQueue(name: QueueName): Queue.Queue | undefined {
    return this.queues.get(name);
  }

  /**
   * Add image processing job
   */
  async addImageProcessingJob(
    data: ImageProcessingJobData,
    priority: JobPriority = JobPriority.NORMAL
  ): Promise<Queue.Job<ImageProcessingJobData>> {
    const queue = this.queues.get(QueueName.IMAGE_PROCESSING);
    if (!queue) {
      throw new Error('Image processing queue not initialized');
    }

    logger.info(`Adding image processing job for media ${data.mediaId}`);

    return await queue.add(data, {
      priority,
      jobId: `img-${data.mediaId}`,
    });
  }

  /**
   * Add content moderation job
   */
  async addContentModerationJob(
    data: ContentModerationJobData,
    priority: JobPriority = JobPriority.HIGH
  ): Promise<Queue.Job<ContentModerationJobData>> {
    const queue = this.queues.get(QueueName.CONTENT_MODERATION);
    if (!queue) {
      throw new Error('Content moderation queue not initialized');
    }

    logger.info(`Adding content moderation job for media ${data.mediaId}`);

    return await queue.add(data, {
      priority,
      jobId: `mod-${data.mediaId}`,
    });
  }

  /**
   * Add photo verification job
   */
  async addPhotoVerificationJob(
    data: PhotoVerificationJobData,
    priority: JobPriority = JobPriority.HIGH
  ): Promise<Queue.Job<PhotoVerificationJobData>> {
    const queue = this.queues.get(QueueName.PHOTO_VERIFICATION);
    if (!queue) {
      throw new Error('Photo verification queue not initialized');
    }

    logger.info(`Adding photo verification job for media ${data.mediaId}`);

    return await queue.add(data, {
      priority,
      jobId: `verify-${data.mediaId}`,
    });
  }

  /**
   * Add deepfake detection job
   */
  async addDeepfakeDetectionJob(
    data: DeepfakeDetectionJobData,
    priority: JobPriority = JobPriority.NORMAL
  ): Promise<Queue.Job<DeepfakeDetectionJobData>> {
    const queue = this.queues.get(QueueName.DEEPFAKE_DETECTION);
    if (!queue) {
      throw new Error('Deepfake detection queue not initialized');
    }

    logger.info(`Adding deepfake detection job for media ${data.mediaId}`);

    return await queue.add(data, {
      priority,
      jobId: `deepfake-${data.mediaId}`,
    });
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(name: QueueName): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const queue = this.queues.get(name);
    if (!queue) {
      throw new Error(`Queue ${name} not found`);
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  /**
   * Pause a queue
   */
  async pauseQueue(name: QueueName): Promise<void> {
    const queue = this.queues.get(name);
    if (!queue) {
      throw new Error(`Queue ${name} not found`);
    }

    await queue.pause();
    logger.info(`Queue ${name} paused`);
  }

  /**
   * Resume a queue
   */
  async resumeQueue(name: QueueName): Promise<void> {
    const queue = this.queues.get(name);
    if (!queue) {
      throw new Error(`Queue ${name} not found`);
    }

    await queue.resume();
    logger.info(`Queue ${name} resumed`);
  }

  /**
   * Clean old jobs from queue
   */
  async cleanQueue(
    name: QueueName,
    grace: number = 3600000, // 1 hour default
    status: 'completed' | 'failed' = 'completed'
  ): Promise<void> {
    const queue = this.queues.get(name);
    if (!queue) {
      throw new Error(`Queue ${name} not found`);
    }

    await queue.clean(grace, status);
    logger.info(`Cleaned ${status} jobs from queue ${name}`);
  }

  /**
   * Close all queues
   */
  async closeAll(): Promise<void> {
    logger.info('Closing all queues...');

    const closePromises = Array.from(this.queues.values()).map((queue) =>
      queue.close()
    );

    await Promise.all(closePromises);
    logger.info('All queues closed');
  }
}

// Export singleton instance
export default new QueueManager();
