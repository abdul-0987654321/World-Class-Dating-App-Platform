/**
 * Workers Index
 * Exports all background workers and provides a unified worker manager
 */

export * from './base-worker';

// Export individual workers
export { discoveryRankingWorker, DiscoveryRankingWorker } from './discovery-ranking.worker';
export { matchCreationWorker, MatchCreationWorker } from './match-creation.worker';
export { messageDeliveryWorker, MessageDeliveryWorker } from './message-delivery.worker';
export { callSignalWorker, CallSignalWorker } from './call-signal.worker';
export { verificationWorker, VerificationWorker } from './verification.worker';
export { moderationTriageWorker, ModerationTriageWorker } from './moderation-triage.worker';
export { subscriptionSyncWorker, SubscriptionSyncWorker } from './subscription-sync.worker';
export { notificationWorker, NotificationWorker } from './notification.worker';
export { cleanupRetentionWorker, CleanupRetentionWorker } from './cleanup-retention.worker';

import { createLogger } from '@flamoral/shared';
import { discoveryRankingWorker } from './discovery-ranking.worker';
import { matchCreationWorker } from './match-creation.worker';
import { messageDeliveryWorker } from './message-delivery.worker';
import { callSignalWorker } from './call-signal.worker';
import { verificationWorker } from './verification.worker';
import { moderationTriageWorker } from './moderation-triage.worker';
import { subscriptionSyncWorker } from './subscription-sync.worker';
import { notificationWorker } from './notification.worker';
import { cleanupRetentionWorker } from './cleanup-retention.worker';

const logger = createLogger('worker-manager');

/**
 * Worker Manager
 * Provides centralized control over all background workers
 */
export class WorkerManager {
  private workers = [
    { name: 'discovery-ranking', worker: discoveryRankingWorker },
    { name: 'match-creation', worker: matchCreationWorker },
    { name: 'message-delivery', worker: messageDeliveryWorker },
    { name: 'call-signal', worker: callSignalWorker },
    { name: 'verification', worker: verificationWorker },
    { name: 'moderation-triage', worker: moderationTriageWorker },
    { name: 'subscription-sync', worker: subscriptionSyncWorker },
    { name: 'notification', worker: notificationWorker },
    { name: 'cleanup-retention', worker: cleanupRetentionWorker },
  ];

  /**
   * Start all workers
   */
  startAll(): void {
    logger.info('Starting all background workers...');

    for (const { name, worker } of this.workers) {
      try {
        worker.start();
        logger.info(`Worker started: ${name}`);
      } catch (error: any) {
        logger.error(`Failed to start worker ${name}:`, error);
      }
    }

    logger.info(`All ${this.workers.length} workers started`);
  }

  /**
   * Stop all workers
   */
  async stopAll(): Promise<void> {
    logger.info('Stopping all background workers...');

    const stopPromises = this.workers.map(async ({ name, worker }) => {
      try {
        await worker.close();
        logger.info(`Worker stopped: ${name}`);
      } catch (error: any) {
        logger.error(`Failed to stop worker ${name}:`, error);
      }
    });

    await Promise.all(stopPromises);
    logger.info('All workers stopped');
  }

  /**
   * Pause all workers
   */
  async pauseAll(): Promise<void> {
    logger.info('Pausing all workers...');

    for (const { name, worker } of this.workers) {
      try {
        await worker.pause();
      } catch (error: any) {
        logger.error(`Failed to pause worker ${name}:`, error);
      }
    }
  }

  /**
   * Resume all workers
   */
  async resumeAll(): Promise<void> {
    logger.info('Resuming all workers...');

    for (const { name, worker } of this.workers) {
      try {
        await worker.resume();
      } catch (error: any) {
        logger.error(`Failed to resume worker ${name}:`, error);
      }
    }
  }

  /**
   * Get health status of all workers
   */
  async getHealthStatus(): Promise<{
    healthy: boolean;
    workers: {
      name: string;
      healthy: boolean;
      metrics: any;
      queueStats: any;
    }[];
  }> {
    const statuses = await Promise.all(
      this.workers.map(async ({ name, worker }) => {
        try {
          const metrics = worker.getMetrics();
          const queueStats = await worker.getQueueStats();

          return {
            name,
            healthy: true,
            metrics,
            queueStats,
          };
        } catch (error: any) {
          return {
            name,
            healthy: false,
            metrics: null,
            queueStats: null,
          };
        }
      })
    );

    return {
      healthy: statuses.every((s) => s.healthy),
      workers: statuses,
    };
  }

  /**
   * Clean old jobs from all workers
   */
  async cleanAll(gracePeriodMs: number = 24 * 60 * 60 * 1000): Promise<void> {
    logger.info('Cleaning old jobs from all workers...');

    for (const { name, worker } of this.workers) {
      try {
        await worker.clean(gracePeriodMs);
      } catch (error: any) {
        logger.error(`Failed to clean worker ${name}:`, error);
      }
    }
  }

  /**
   * Get aggregated metrics from all workers
   */
  getAggregatedMetrics(): {
    totalJobsProcessed: number;
    totalJobsSucceeded: number;
    totalJobsFailed: number;
    totalJobsRetried: number;
    workerMetrics: Record<string, any>;
  } {
    let totalJobsProcessed = 0;
    let totalJobsSucceeded = 0;
    let totalJobsFailed = 0;
    let totalJobsRetried = 0;
    const workerMetrics: Record<string, any> = {};

    for (const { name, worker } of this.workers) {
      const metrics = worker.getMetrics();
      totalJobsProcessed += metrics.jobsProcessed;
      totalJobsSucceeded += metrics.jobsSucceeded;
      totalJobsFailed += metrics.jobsFailed;
      totalJobsRetried += metrics.jobsRetried;
      workerMetrics[name] = metrics;
    }

    return {
      totalJobsProcessed,
      totalJobsSucceeded,
      totalJobsFailed,
      totalJobsRetried,
      workerMetrics,
    };
  }
}

// Export singleton instance
export const workerManager = new WorkerManager();
export default workerManager;
