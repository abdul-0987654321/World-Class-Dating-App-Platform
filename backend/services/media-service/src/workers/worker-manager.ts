import { startImageProcessingWorker } from './image-processing.worker';
import { startContentModerationWorker } from './content-moderation.worker';
import { startPhotoVerificationWorker } from './photo-verification.worker';
import queueManager from '../infrastructure/queue/queue-manager';
import { createLogger } from '@flamoral/shared';

const logger = createLogger('worker-manager');

export class WorkerManager {
  private workersStarted = false;

  /**
   * Start all workers
   */
  startAll(): void {
    if (this.workersStarted) {
      logger.warn('Workers already started');
      return;
    }

    try {
      logger.info('Starting all workers...');

      // Start image processing worker
      startImageProcessingWorker();

      // Start content moderation worker
      startContentModerationWorker();

      // Start photo verification worker
      startPhotoVerificationWorker();

      this.workersStarted = true;

      logger.info('All workers started successfully');
    } catch (error) {
      logger.error('Failed to start workers:', error);
      throw error;
    }
  }

  /**
   * Gracefully shutdown all workers
   */
  async shutdown(): Promise<void> {
    if (!this.workersStarted) {
      logger.warn('Workers not started, nothing to shutdown');
      return;
    }

    try {
      logger.info('Shutting down all workers...');

      // Close all queues
      await queueManager.closeAll();

      this.workersStarted = false;

      logger.info('All workers shutdown successfully');
    } catch (error) {
      logger.error('Failed to shutdown workers:', error);
      throw error;
    }
  }

  /**
   * Check if workers are running
   */
  isRunning(): boolean {
    return this.workersStarted;
  }
}

// Export singleton instance
export default new WorkerManager();
