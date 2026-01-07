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

  // Cleanup task implementations (stubs - integrate with actual services)
  private async cleanupExpiredSessions(): Promise<void> {
    // TODO: Integrate with auth-service to clean expired sessions
    this.logger.debug('Cleaning up expired sessions...');
  }

  private async cleanupInactiveUsers(): Promise<void> {
    // TODO: Mark or process inactive user accounts
    this.logger.debug('Processing inactive users...');
  }

  private async cleanupOrphanedMedia(): Promise<void> {
    // TODO: Integrate with media-service to remove orphaned files
    this.logger.debug('Cleaning up orphaned media...');
  }

  private async cleanupOldNotifications(): Promise<void> {
    // TODO: Integrate with notification-service to purge old notifications
    this.logger.debug('Cleaning up old notifications...');
  }

  private async cleanupExpiredTokens(): Promise<void> {
    // TODO: Clean up expired verification tokens, password reset tokens, etc.
    this.logger.debug('Cleaning up expired tokens...');
  }

  // Analytics aggregation implementations (stubs - integrate with actual services)
  private async aggregateUserActivity(): Promise<void> {
    // TODO: Integrate with analytics-service for user activity aggregation
    this.logger.debug('Aggregating user activity metrics...');
  }

  private async aggregateMatchStatistics(): Promise<void> {
    // TODO: Compute match statistics (match rate, conversion, etc.)
    this.logger.debug('Aggregating match statistics...');
  }

  private async aggregateMessageMetrics(): Promise<void> {
    // TODO: Integrate with messaging-service for message metrics
    this.logger.debug('Aggregating message metrics...');
  }

  private async aggregateRevenueMetrics(): Promise<void> {
    // TODO: Integrate with payment-service for revenue aggregation
    this.logger.debug('Aggregating revenue metrics...');
  }

  private async aggregateEngagementScores(): Promise<void> {
    // TODO: Calculate user engagement scores
    this.logger.debug('Aggregating engagement scores...');
  }
}
