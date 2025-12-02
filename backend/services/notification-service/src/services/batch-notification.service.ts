/**
 * Batch Notification Service
 * Handles sending notifications to multiple users efficiently
 */

import { db } from '../config/database';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import {
  pushNotificationDeliveryService,
  PushNotificationPayload,
  NotificationType,
} from './push-notification-delivery.service';
import { config } from '../config';

export interface BatchJob {
  id: string;
  userIds: string[];
  payload: PushNotificationPayload;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalUsers: number;
  sentCount: number;
  failedCount: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface BatchNotificationRequest {
  userIds: string[];
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;
  deepLink?: string;
  badge?: number;
  sound?: string;
  priority?: 'low' | 'normal' | 'high';
  respectQuietHours?: boolean;
  respectPreferences?: boolean;
}

export interface SegmentedNotificationRequest {
  segment: {
    type: 'all' | 'platform' | 'subscription' | 'active' | 'custom';
    platform?: 'ios' | 'android' | 'web';
    subscriptionTier?: string;
    activeSince?: Date;
    customQuery?: any;
  };
  payload: Omit<BatchNotificationRequest, 'userIds'>;
}

class BatchNotificationService {
  private activeBatches: Map<string, BatchJob> = new Map();

  /**
   * Send notification to multiple users
   */
  async sendBatch(
    request: BatchNotificationRequest
  ): Promise<{
    success: boolean;
    jobId: string;
    totalUsers: number;
    message: string;
  }> {
    try {
      // Validate request
      if (!request.userIds || request.userIds.length === 0) {
        throw new Error('User IDs array is required and cannot be empty');
      }

      if (!request.type || !request.title || !request.body) {
        throw new Error('Type, title, and body are required');
      }

      // Create batch job
      const jobId = uuidv4();
      const batchJob: BatchJob = {
        id: jobId,
        userIds: request.userIds,
        payload: {
          type: request.type,
          title: request.title,
          body: request.body,
          data: request.data,
          imageUrl: request.imageUrl,
          deepLink: request.deepLink,
          badge: request.badge,
          sound: request.sound,
          priority: request.priority || 'normal',
        },
        status: 'pending',
        totalUsers: request.userIds.length,
        sentCount: 0,
        failedCount: 0,
        createdAt: new Date(),
      };

      this.activeBatches.set(jobId, batchJob);

      // Process batch asynchronously
      this.processBatch(
        jobId,
        request.respectQuietHours ?? true,
        request.respectPreferences ?? true
      ).catch((error) => {
        logger.error('Error processing batch', {
          jobId,
          error: error.message,
        });
      });

      logger.info('Batch job created', {
        jobId,
        totalUsers: request.userIds.length,
      });

      return {
        success: true,
        jobId,
        totalUsers: request.userIds.length,
        message: 'Batch job created and processing started',
      };
    } catch (error: any) {
      logger.error('Error creating batch job', { error: error.message });
      throw error;
    }
  }

  /**
   * Process batch job
   */
  private async processBatch(
    jobId: string,
    respectQuietHours: boolean,
    respectPreferences: boolean
  ): Promise<void> {
    const job = this.activeBatches.get(jobId);
    if (!job) {
      logger.error('Batch job not found', { jobId });
      return;
    }

    try {
      job.status = 'processing';
      job.startedAt = new Date();

      const batchSize = config.notification.batchSize;
      const results: Array<{ userId: string; sent: number; failed: number }> = [];

      // Process in batches
      for (let i = 0; i < job.userIds.length; i += batchSize) {
        const batch = job.userIds.slice(i, i + batchSize);

        const batchResults = await Promise.all(
          batch.map(async (userId) => {
            try {
              const result = await pushNotificationDeliveryService.sendToUser(
                userId,
                job.payload,
                {
                  skipQuietHours: !respectQuietHours,
                  skipPreferences: !respectPreferences,
                }
              );

              return {
                userId,
                sent: result.sent,
                failed: result.failed,
              };
            } catch (error: any) {
              logger.error('Error sending to user in batch', {
                userId,
                error: error.message,
              });
              return {
                userId,
                sent: 0,
                failed: 1,
              };
            }
          })
        );

        results.push(...batchResults);

        // Update job progress
        job.sentCount += batchResults.reduce((sum, r) => sum + r.sent, 0);
        job.failedCount += batchResults.reduce((sum, r) => sum + r.failed, 0);

        logger.info('Batch progress', {
          jobId,
          processed: i + batch.length,
          total: job.userIds.length,
          sent: job.sentCount,
          failed: job.failedCount,
        });

        // Small delay between batches to avoid overwhelming the service
        if (i + batchSize < job.userIds.length) {
          await this.sleep(100);
        }
      }

      job.status = 'completed';
      job.completedAt = new Date();

      logger.info('Batch job completed', {
        jobId,
        totalUsers: job.totalUsers,
        sent: job.sentCount,
        failed: job.failedCount,
        duration: job.completedAt.getTime() - job.startedAt!.getTime(),
      });

      // Save batch job to database for history
      await this.saveBatchJobHistory(job);

      // Remove from active batches after some time
      setTimeout(() => {
        this.activeBatches.delete(jobId);
      }, 3600000); // 1 hour
    } catch (error: any) {
      job.status = 'failed';
      job.error = error.message;
      job.completedAt = new Date();

      logger.error('Batch job failed', {
        jobId,
        error: error.message,
      });

      await this.saveBatchJobHistory(job);
    }
  }

  /**
   * Send notification to segmented users
   */
  async sendToSegment(
    request: SegmentedNotificationRequest
  ): Promise<{
    success: boolean;
    jobId: string;
    totalUsers: number;
    message: string;
  }> {
    try {
      // Get user IDs based on segment
      const userIds = await this.getUserIdsForSegment(request.segment);

      if (userIds.length === 0) {
        throw new Error('No users found matching the segment criteria');
      }

      // Send as batch
      return await this.sendBatch({
        userIds,
        type: request.payload.type,
        title: request.payload.title,
        body: request.payload.body,
        data: request.payload.data,
        imageUrl: request.payload.imageUrl,
        deepLink: request.payload.deepLink,
        badge: request.payload.badge,
        sound: request.payload.sound,
        priority: request.payload.priority,
        respectQuietHours: request.payload.respectQuietHours,
        respectPreferences: request.payload.respectPreferences,
      });
    } catch (error: any) {
      logger.error('Error sending to segment', { error: error.message });
      throw error;
    }
  }

  /**
   * Get user IDs based on segment criteria
   */
  private async getUserIdsForSegment(segment: SegmentedNotificationRequest['segment']): Promise<string[]> {
    try {
      let query = db('user_devices')
        .distinct('user_id')
        .where({ is_active: true });

      switch (segment.type) {
        case 'all':
          // All active users
          break;

        case 'platform':
          if (segment.platform) {
            query = query.where({ platform: segment.platform });
          }
          break;

        case 'active':
          if (segment.activeSince) {
            query = query.where('last_active_at', '>=', segment.activeSince);
          }
          break;

        case 'custom':
          if (segment.customQuery) {
            // Apply custom query filters
            Object.keys(segment.customQuery).forEach((key) => {
              query = query.where(key, segment.customQuery[key]);
            });
          }
          break;

        default:
          throw new Error(`Unknown segment type: ${segment.type}`);
      }

      const results = await query;
      return results.map((r: any) => r.user_id);
    } catch (error: any) {
      logger.error('Error getting segment user IDs', { error: error.message });
      throw error;
    }
  }

  /**
   * Get batch job status
   */
  async getJobStatus(jobId: string): Promise<{
    success: boolean;
    job?: BatchJob;
    error?: string;
  }> {
    try {
      // Check active batches first
      const activeJob = this.activeBatches.get(jobId);
      if (activeJob) {
        return { success: true, job: activeJob };
      }

      // Check database for completed jobs
      const dbJob = await db('batch_notification_jobs')
        .where({ id: jobId })
        .first();

      if (!dbJob) {
        return { success: false, error: 'Job not found' };
      }

      const job: BatchJob = {
        id: dbJob.id,
        userIds: JSON.parse(dbJob.user_ids),
        payload: JSON.parse(dbJob.payload),
        status: dbJob.status,
        totalUsers: dbJob.total_users,
        sentCount: dbJob.sent_count,
        failedCount: dbJob.failed_count,
        createdAt: dbJob.created_at,
        startedAt: dbJob.started_at,
        completedAt: dbJob.completed_at,
        error: dbJob.error,
      };

      return { success: true, job };
    } catch (error: any) {
      logger.error('Error getting job status', {
        error: error.message,
        jobId,
      });
      return { success: false, error: 'Failed to get job status' };
    }
  }

  /**
   * Cancel a pending batch job
   */
  async cancelJob(jobId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const job = this.activeBatches.get(jobId);

      if (!job) {
        return { success: false, error: 'Job not found or already completed' };
      }

      if (job.status === 'processing') {
        return {
          success: false,
          error: 'Cannot cancel job that is already processing',
        };
      }

      job.status = 'failed';
      job.error = 'Cancelled by user';
      job.completedAt = new Date();

      await this.saveBatchJobHistory(job);
      this.activeBatches.delete(jobId);

      logger.info('Batch job cancelled', { jobId });

      return { success: true };
    } catch (error: any) {
      logger.error('Error cancelling job', {
        error: error.message,
        jobId,
      });
      return { success: false, error: 'Failed to cancel job' };
    }
  }

  /**
   * Save batch job to database for history
   */
  private async saveBatchJobHistory(job: BatchJob): Promise<void> {
    try {
      await db('batch_notification_jobs').insert({
        id: job.id,
        user_ids: JSON.stringify(job.userIds),
        payload: JSON.stringify(job.payload),
        status: job.status,
        total_users: job.totalUsers,
        sent_count: job.sentCount,
        failed_count: job.failedCount,
        error: job.error,
        created_at: job.createdAt,
        started_at: job.startedAt,
        completed_at: job.completedAt,
      });
    } catch (error: any) {
      logger.error('Error saving batch job history', {
        error: error.message,
        jobId: job.id,
      });
    }
  }

  /**
   * Get batch job history
   */
  async getJobHistory(
    limit: number = 50,
    offset: number = 0
  ): Promise<{
    success: boolean;
    jobs?: BatchJob[];
    total?: number;
    error?: string;
  }> {
    try {
      const jobs = await db('batch_notification_jobs')
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);

      const [{ count }] = await db('batch_notification_jobs').count('* as count');

      const mappedJobs: BatchJob[] = jobs.map((job) => ({
        id: job.id,
        userIds: JSON.parse(job.user_ids),
        payload: JSON.parse(job.payload),
        status: job.status,
        totalUsers: job.total_users,
        sentCount: job.sent_count,
        failedCount: job.failed_count,
        createdAt: job.created_at,
        startedAt: job.started_at,
        completedAt: job.completed_at,
        error: job.error,
      }));

      return {
        success: true,
        jobs: mappedJobs,
        total: parseInt(count as string),
      };
    } catch (error: any) {
      logger.error('Error getting job history', { error: error.message });
      return { success: false, error: 'Failed to get job history' };
    }
  }

  /**
   * Clean up old batch job records
   */
  async cleanupOldJobs(daysOld: number = 30): Promise<{
    success: boolean;
    deleted?: number;
    error?: string;
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const deleted = await db('batch_notification_jobs')
        .where('completed_at', '<', cutoffDate)
        .delete();

      logger.info('Old batch jobs cleaned up', { deleted, daysOld });

      return { success: true, deleted };
    } catch (error: any) {
      logger.error('Error cleaning up old jobs', { error: error.message });
      return { success: false, error: 'Failed to cleanup old jobs' };
    }
  }

  /**
   * Get batch statistics
   */
  async getBatchStats(): Promise<{
    success: boolean;
    stats?: {
      active: number;
      pending: number;
      processing: number;
      completed24h: number;
      totalSent24h: number;
      averageSuccessRate: number;
    };
    error?: string;
  }> {
    try {
      const activeBatchCount = this.activeBatches.size;
      const pendingCount = Array.from(this.activeBatches.values()).filter(
        (j) => j.status === 'pending'
      ).length;
      const processingCount = Array.from(this.activeBatches.values()).filter(
        (j) => j.status === 'processing'
      ).length;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const completed24h = await db('batch_notification_jobs')
        .where('completed_at', '>=', yesterday)
        .where({ status: 'completed' })
        .count('* as count')
        .first();

      const sent24h = await db('batch_notification_jobs')
        .where('completed_at', '>=', yesterday)
        .sum('sent_count as total')
        .first();

      const avgSuccessRate = await db('batch_notification_jobs')
        .where('completed_at', '>=', yesterday)
        .whereRaw('total_users > 0')
        .avg(db.raw('sent_count::float / total_users * 100 as rate'))
        .first();

      return {
        success: true,
        stats: {
          active: activeBatchCount,
          pending: pendingCount,
          processing: processingCount,
          completed24h: parseInt((completed24h as any)?.count || '0'),
          totalSent24h: parseInt((sent24h as any)?.total || '0'),
          averageSuccessRate: parseFloat((avgSuccessRate as any)?.rate || '0'),
        },
      };
    } catch (error: any) {
      logger.error('Error getting batch stats', { error: error.message });
      return { success: false, error: 'Failed to get batch stats' };
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const batchNotificationService = new BatchNotificationService();
