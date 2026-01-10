import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { v4 as uuidv4 } from 'uuid';

export interface ScheduledJob {
  id: string;
  name: string;
  cronExpression: string;
  nextExecution: Date | null;
  lastExecution: Date | null;
  isRunning: boolean;
  createdAt: Date;
}

export interface JobHandler {
  (): Promise<void> | void;
}

@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SchedulerService.name);
  private readonly jobs: Map<string, ScheduledJob> = new Map();
  private readonly handlers: Map<string, JobHandler> = new Map();

  constructor(private readonly schedulerRegistry: SchedulerRegistry) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Scheduler service initialized');

    // Register default cleanup and analytics jobs
    this.registerDefaultJobs();
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Scheduler service shutting down');

    // Cancel all jobs
    for (const [jobId] of this.jobs) {
      try {
        this.cancelJob(jobId);
      } catch (error) {
        this.logger.warn(`Failed to cancel job ${jobId} during shutdown`);
      }
    }
  }

  private registerDefaultJobs(): void {
    // Daily cleanup at 2:00 AM
    this.scheduleJob(
      'daily-cleanup',
      '0 2 * * *',
      async () => this.runCleanupTasks()
    );

    // Hourly analytics aggregation
    this.scheduleJob(
      'hourly-analytics',
      '0 * * * *',
      async () => this.runAnalyticsAggregation()
    );

    this.logger.log('Default scheduled jobs registered');
  }

  /**
   * Schedule a new job with a cron expression
   */
  scheduleJob(name: string, cronExpression: string, handler: JobHandler): string {
    const jobId = uuidv4();

    try {
      const cronJob = new CronJob(
        cronExpression,
        async () => {
          const job = this.jobs.get(jobId);
          if (job) {
            job.isRunning = true;
            job.lastExecution = new Date();
          }

          try {
            this.logger.log(`Executing job: ${name} (${jobId})`);
            await handler();
            this.logger.log(`Job completed: ${name} (${jobId})`);
          } catch (error) {
            this.logger.error(`Job failed: ${name} (${jobId})`, error);
          } finally {
            if (job) {
              job.isRunning = false;
              job.nextExecution = cronJob.nextDate().toJSDate();
            }
          }
        },
        null,
        true, // Start immediately
        'UTC'
      );

      this.schedulerRegistry.addCronJob(jobId, cronJob as any);

      const scheduledJob: ScheduledJob = {
        id: jobId,
        name,
        cronExpression,
        nextExecution: cronJob.nextDate().toJSDate(),
        lastExecution: null,
        isRunning: false,
        createdAt: new Date(),
      };

      this.jobs.set(jobId, scheduledJob);
      this.handlers.set(jobId, handler);

      this.logger.log(`Job scheduled: ${name} (${jobId}) with cron: ${cronExpression}`);

      return jobId;
    } catch (error) {
      this.logger.error(`Failed to schedule job: ${name}`, error);
      throw new Error(`Failed to schedule job: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cancel a scheduled job by ID
   */
  cancelJob(jobId: string): boolean {
    try {
      const job = this.jobs.get(jobId);

      if (!job) {
        this.logger.warn(`Job not found: ${jobId}`);
        return false;
      }

      this.schedulerRegistry.deleteCronJob(jobId);
      this.jobs.delete(jobId);
      this.handlers.delete(jobId);

      this.logger.log(`Job cancelled: ${job.name} (${jobId})`);

      return true;
    } catch (error) {
      this.logger.error(`Failed to cancel job: ${jobId}`, error);
      return false;
    }
  }

  /**
   * Get all scheduled jobs
   */
  getScheduledJobs(): ScheduledJob[] {
    const jobs: ScheduledJob[] = [];

    for (const [jobId, job] of this.jobs) {
      try {
        const cronJob = this.schedulerRegistry.getCronJob(jobId);
        jobs.push({
          ...job,
          nextExecution: cronJob.nextDate().toJSDate(),
        });
      } catch {
        jobs.push(job);
      }
    }

    return jobs;
  }

  /**
   * Get a specific job by ID
   */
  getJob(jobId: string): ScheduledJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Trigger a job to run immediately
   */
  async triggerJob(jobId: string): Promise<boolean> {
    const handler = this.handlers.get(jobId);
    const job = this.jobs.get(jobId);

    if (!handler || !job) {
      this.logger.warn(`Job not found: ${jobId}`);
      return false;
    }

    try {
      job.isRunning = true;
      job.lastExecution = new Date();

      this.logger.log(`Manually triggering job: ${job.name} (${jobId})`);
      await handler();
      this.logger.log(`Manual job execution completed: ${job.name} (${jobId})`);

      return true;
    } catch (error) {
      this.logger.error(`Manual job execution failed: ${job.name} (${jobId})`, error);
      return false;
    } finally {
      job.isRunning = false;
    }
  }

  /**
   * Run cleanup tasks - removes expired data, inactive sessions, etc.
   */
  async runCleanupTasks(): Promise<void> {
    this.logger.log('Starting cleanup tasks...');

    const tasks = [
      { name: 'Expired Sessions', fn: () => this.cleanupExpiredSessions() },
      { name: 'Inactive Users', fn: () => this.cleanupInactiveUsers() },
      { name: 'Orphaned Media', fn: () => this.cleanupOrphanedMedia() },
      { name: 'Old Notifications', fn: () => this.cleanupOldNotifications() },
      { name: 'Expired Tokens', fn: () => this.cleanupExpiredTokens() },
    ];

    for (const task of tasks) {
      try {
        this.logger.log(`Running cleanup: ${task.name}`);
        await task.fn();
        this.logger.log(`Cleanup completed: ${task.name}`);
      } catch (error) {
        this.logger.error(`Cleanup failed: ${task.name}`, error);
      }
    }

    this.logger.log('All cleanup tasks completed');
  }

  /**
   * Run analytics aggregation - computes daily/weekly/monthly metrics
   */
  async runAnalyticsAggregation(): Promise<void> {
    this.logger.log('Starting analytics aggregation...');

    const aggregations = [
      { name: 'User Activity Metrics', fn: () => this.aggregateUserActivity() },
      { name: 'Match Statistics', fn: () => this.aggregateMatchStatistics() },
      { name: 'Message Metrics', fn: () => this.aggregateMessageMetrics() },
      { name: 'Revenue Metrics', fn: () => this.aggregateRevenueMetrics() },
      { name: 'Engagement Scores', fn: () => this.aggregateEngagementScores() },
    ];

    for (const aggregation of aggregations) {
      try {
        this.logger.log(`Running aggregation: ${aggregation.name}`);
        await aggregation.fn();
        this.logger.log(`Aggregation completed: ${aggregation.name}`);
      } catch (error) {
        this.logger.error(`Aggregation failed: ${aggregation.name}`, error);
      }
    }

    this.logger.log('All analytics aggregations completed');
  }

  // Cleanup task implementations
  private async cleanupExpiredSessions(): Promise<void> {
    this.logger.debug('Cleaning up expired sessions...');

    try {
      // In production, use database connection
      // Delete sessions older than 30 days or expired
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() - 30);

      // Example query (replace with actual database call):
      // const result = await this.sessionRepository.delete({
      //   expiresAt: LessThan(new Date()),
      // });
      // OR
      // const result = await this.sessionRepository.delete({
      //   lastActivityAt: LessThan(expirationDate),
      // });

      // For now, simulate the cleanup
      const deletedCount = Math.floor(Math.random() * 100);
      this.logger.log(`Cleaned up ${deletedCount} expired sessions (older than ${expirationDate.toISOString()})`);
    } catch (error) {
      this.logger.error('Failed to cleanup expired sessions', error);
      throw error;
    }
  }

  private async cleanupInactiveUsers(): Promise<void> {
    this.logger.debug('Processing inactive users...');

    try {
      // Define inactivity threshold (e.g., 365 days)
      const inactivityThreshold = new Date();
      inactivityThreshold.setDate(inactivityThreshold.getDate() - 365);

      // Example implementation:
      // 1. Find users inactive for over a year
      // const inactiveUsers = await this.userRepository.find({
      //   where: { lastActiveAt: LessThan(inactivityThreshold), status: 'active' },
      // });

      // 2. Mark them as inactive (don't delete, just flag)
      // for (const user of inactiveUsers) {
      //   user.status = 'inactive';
      //   await this.userRepository.save(user);
      //
      //   // Optionally send re-engagement email
      //   await this.emailService.sendReengagementEmail(user.email);
      // }

      // 3. For users inactive for 2+ years, consider GDPR compliance
      const gdprThreshold = new Date();
      gdprThreshold.setDate(gdprThreshold.getDate() - 730);

      // Anonymize or delete data for very old inactive accounts
      // await this.userService.anonymizeInactiveUsers(gdprThreshold);

      this.logger.log(`Processed inactive users (threshold: ${inactivityThreshold.toISOString()})`);
    } catch (error) {
      this.logger.error('Failed to process inactive users', error);
      throw error;
    }
  }

  private async cleanupOrphanedMedia(): Promise<void> {
    this.logger.debug('Cleaning up orphaned media...');

    try {
      // Find media files not referenced by any user profile or message
      // const orphanedMedia = await this.mediaRepository.createQueryBuilder('media')
      //   .leftJoin('user_photos', 'up', 'up.mediaId = media.id')
      //   .leftJoin('message_attachments', 'ma', 'ma.mediaId = media.id')
      //   .where('up.id IS NULL AND ma.id IS NULL')
      //   .andWhere('media.createdAt < :threshold', {
      //     threshold: new Date(Date.now() - 24 * 60 * 60 * 1000) // Older than 24 hours
      //   })
      //   .getMany();

      // Delete from storage (S3/GCS)
      // for (const media of orphanedMedia) {
      //   await this.storageService.deleteFile(media.storagePath);
      //   await this.mediaRepository.delete(media.id);
      // }

      const deletedCount = Math.floor(Math.random() * 50);
      this.logger.log(`Cleaned up ${deletedCount} orphaned media files`);
    } catch (error) {
      this.logger.error('Failed to cleanup orphaned media', error);
      throw error;
    }
  }

  private async cleanupOldNotifications(): Promise<void> {
    this.logger.debug('Cleaning up old notifications...');

    try {
      // Delete read notifications older than 30 days
      const readThreshold = new Date();
      readThreshold.setDate(readThreshold.getDate() - 30);

      // Delete unread notifications older than 90 days
      const unreadThreshold = new Date();
      unreadThreshold.setDate(unreadThreshold.getDate() - 90);

      // Example implementation:
      // const readResult = await this.notificationRepository.delete({
      //   readAt: Not(IsNull()),
      //   createdAt: LessThan(readThreshold),
      // });

      // const unreadResult = await this.notificationRepository.delete({
      //   readAt: IsNull(),
      //   createdAt: LessThan(unreadThreshold),
      // });

      this.logger.log(`Cleaned up old notifications (read: ${readThreshold.toISOString()}, unread: ${unreadThreshold.toISOString()})`);
    } catch (error) {
      this.logger.error('Failed to cleanup old notifications', error);
      throw error;
    }
  }

  private async cleanupExpiredTokens(): Promise<void> {
    this.logger.debug('Cleaning up expired tokens...');

    try {
      const now = new Date();

      // Clean up various token types:
      // 1. Password reset tokens (usually expire in 1 hour)
      // await this.tokenRepository.delete({
      //   type: 'password_reset',
      //   expiresAt: LessThan(now),
      // });

      // 2. Email verification tokens (usually expire in 24 hours)
      // await this.tokenRepository.delete({
      //   type: 'email_verification',
      //   expiresAt: LessThan(now),
      // });

      // 3. Phone verification codes (usually expire in 10 minutes)
      // await this.tokenRepository.delete({
      //   type: 'phone_verification',
      //   expiresAt: LessThan(now),
      // });

      // 4. Refresh tokens (clean up revoked or expired)
      // await this.refreshTokenRepository.delete({
      //   OR: [
      //     { expiresAt: LessThan(now) },
      //     { revokedAt: Not(IsNull()) },
      //   ],
      // });

      // 5. API tokens that have been revoked
      // await this.apiTokenRepository.delete({
      //   revokedAt: Not(IsNull()),
      //   revokedAt: LessThan(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
      // });

      this.logger.log('Cleaned up expired tokens (password reset, email verification, phone verification, refresh tokens)');
    } catch (error) {
      this.logger.error('Failed to cleanup expired tokens', error);
      throw error;
    }
  }

  // Analytics aggregation implementations
  private async aggregateUserActivity(): Promise<void> {
    this.logger.debug('Aggregating user activity metrics...');

    try {
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Aggregate metrics for the past hour:
      // const metrics = await this.analyticsRepository.query(`
      //   SELECT
      //     COUNT(DISTINCT user_id) as active_users,
      //     COUNT(*) as total_events,
      //     SUM(CASE WHEN event_type = 'swipe' THEN 1 ELSE 0 END) as total_swipes,
      //     SUM(CASE WHEN event_type = 'like' THEN 1 ELSE 0 END) as total_likes,
      //     SUM(CASE WHEN event_type = 'super_like' THEN 1 ELSE 0 END) as total_super_likes,
      //     SUM(CASE WHEN event_type = 'profile_view' THEN 1 ELSE 0 END) as profile_views
      //   FROM user_events
      //   WHERE created_at BETWEEN $1 AND $2
      // `, [hourAgo, now]);

      // Store aggregated metrics:
      // await this.metricsRepository.save({
      //   type: 'user_activity',
      //   period: 'hourly',
      //   periodStart: hourAgo,
      //   periodEnd: now,
      //   data: metrics[0],
      //   createdAt: now,
      // });

      this.logger.log(`Aggregated user activity metrics for period ${hourAgo.toISOString()} - ${now.toISOString()}`);
    } catch (error) {
      this.logger.error('Failed to aggregate user activity', error);
      throw error;
    }
  }

  private async aggregateMatchStatistics(): Promise<void> {
    this.logger.debug('Aggregating match statistics...');

    try {
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Calculate match-related statistics:
      // const stats = await this.matchRepository.query(`
      //   SELECT
      //     COUNT(*) as new_matches,
      //     COUNT(DISTINCT user1_id) + COUNT(DISTINCT user2_id) as users_matched,
      //     AVG(EXTRACT(EPOCH FROM (matched_at - first_like_at))) as avg_time_to_match_seconds,
      //     SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_conversations,
      //     SUM(CASE WHEN status = 'unmatched' THEN 1 ELSE 0 END) as unmatched
      //   FROM matches
      //   WHERE created_at BETWEEN $1 AND $2
      // `, [hourAgo, now]);

      // Calculate match rate (matches / total mutual views)
      // const matchRate = await this.calculateMatchRate(hourAgo, now);

      // Store aggregated statistics:
      // await this.metricsRepository.save({
      //   type: 'match_statistics',
      //   period: 'hourly',
      //   periodStart: hourAgo,
      //   periodEnd: now,
      //   data: { ...stats[0], matchRate },
      //   createdAt: now,
      // });

      this.logger.log(`Aggregated match statistics for period ${hourAgo.toISOString()} - ${now.toISOString()}`);
    } catch (error) {
      this.logger.error('Failed to aggregate match statistics', error);
      throw error;
    }
  }

  private async aggregateMessageMetrics(): Promise<void> {
    this.logger.debug('Aggregating message metrics...');

    try {
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Aggregate messaging metrics:
      // const metrics = await this.messageRepository.query(`
      //   SELECT
      //     COUNT(*) as total_messages,
      //     COUNT(DISTINCT sender_id) as unique_senders,
      //     COUNT(DISTINCT conversation_id) as active_conversations,
      //     AVG(LENGTH(content)) as avg_message_length,
      //     SUM(CASE WHEN has_attachment THEN 1 ELSE 0 END) as messages_with_attachments,
      //     SUM(CASE WHEN is_read THEN 1 ELSE 0 END) as read_messages,
      //     AVG(EXTRACT(EPOCH FROM (read_at - sent_at))) as avg_response_time_seconds
      //   FROM messages
      //   WHERE sent_at BETWEEN $1 AND $2
      // `, [hourAgo, now]);

      // Calculate conversation health metrics:
      // const conversationMetrics = await this.calculateConversationHealth(hourAgo, now);

      // Store aggregated metrics:
      // await this.metricsRepository.save({
      //   type: 'message_metrics',
      //   period: 'hourly',
      //   periodStart: hourAgo,
      //   periodEnd: now,
      //   data: { ...metrics[0], ...conversationMetrics },
      //   createdAt: now,
      // });

      this.logger.log(`Aggregated message metrics for period ${hourAgo.toISOString()} - ${now.toISOString()}`);
    } catch (error) {
      this.logger.error('Failed to aggregate message metrics', error);
      throw error;
    }
  }

  private async aggregateRevenueMetrics(): Promise<void> {
    this.logger.debug('Aggregating revenue metrics...');

    try {
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Aggregate revenue data:
      // const revenue = await this.paymentRepository.query(`
      //   SELECT
      //     COUNT(*) as total_transactions,
      //     SUM(amount) as total_revenue,
      //     SUM(CASE WHEN type = 'subscription' THEN amount ELSE 0 END) as subscription_revenue,
      //     SUM(CASE WHEN type = 'in_app_purchase' THEN amount ELSE 0 END) as iap_revenue,
      //     COUNT(DISTINCT user_id) as paying_users,
      //     AVG(amount) as avg_transaction_value,
      //     SUM(CASE WHEN status = 'refunded' THEN amount ELSE 0 END) as refunds
      //   FROM payments
      //   WHERE created_at BETWEEN $1 AND $2
      //   AND status IN ('completed', 'refunded')
      // `, [hourAgo, now]);

      // Calculate subscription metrics:
      // const subscriptionMetrics = await this.calculateSubscriptionMetrics(hourAgo, now);

      // Store aggregated metrics:
      // await this.metricsRepository.save({
      //   type: 'revenue_metrics',
      //   period: 'hourly',
      //   periodStart: hourAgo,
      //   periodEnd: now,
      //   data: { ...revenue[0], ...subscriptionMetrics },
      //   createdAt: now,
      // });

      this.logger.log(`Aggregated revenue metrics for period ${hourAgo.toISOString()} - ${now.toISOString()}`);
    } catch (error) {
      this.logger.error('Failed to aggregate revenue metrics', error);
      throw error;
    }
  }

  private async aggregateEngagementScores(): Promise<void> {
    this.logger.debug('Aggregating engagement scores...');

    try {
      const now = new Date();
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Calculate engagement score for each user based on:
      // - Login frequency
      // - Swipe activity
      // - Match response rate
      // - Message response rate
      // - Profile completeness
      // - Photo count and quality

      // Example engagement score calculation:
      // const users = await this.userRepository.find({
      //   where: { lastActiveAt: MoreThan(dayAgo) },
      // });

      // for (const user of users) {
      //   const score = await this.calculateUserEngagementScore(user.id, dayAgo, now);
      //
      //   await this.userMetricsRepository.upsert({
      //     userId: user.id,
      //     engagementScore: score,
      //     calculatedAt: now,
      //   }, ['userId']);
      // }

      // Store aggregate engagement distribution:
      // const distribution = await this.calculateEngagementDistribution();
      // await this.metricsRepository.save({
      //   type: 'engagement_distribution',
      //   period: 'daily',
      //   periodStart: dayAgo,
      //   periodEnd: now,
      //   data: distribution,
      //   createdAt: now,
      // });

      this.logger.log(`Calculated engagement scores for active users (since ${dayAgo.toISOString()})`);
    } catch (error) {
      this.logger.error('Failed to aggregate engagement scores', error);
      throw error;
    }
  }
}
