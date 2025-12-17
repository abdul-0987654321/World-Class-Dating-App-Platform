/**
 * Aggregation Scheduler
 * Handles scheduled data aggregation tasks
 */

import cron from 'node-cron';
import { logger } from '../monitoring/logger';
import timeSeriesRepository from '../../domain/repositories/time-series.repository';
import eventQueueService from '../queue/event-queue.service';

export class AggregationScheduler {
  private hourlyTask: cron.ScheduledTask | null = null;
  private dailyTask: cron.ScheduledTask | null = null;
  private cleanupTask: cron.ScheduledTask | null = null;
  private initialized = false;

  /**
   * Initialize scheduler
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      logger.info('Initializing Aggregation Scheduler...');

      // Schedule hourly aggregation (every hour at minute 5)
      this.hourlyTask = cron.schedule('5 * * * *', async () => {
        await this.runHourlyAggregation();
      });

      // Schedule daily aggregation (every day at 1:05 AM)
      this.dailyTask = cron.schedule('5 1 * * *', async () => {
        await this.runDailyAggregation();
      });

      // Schedule cleanup task (every day at 3:00 AM)
      this.cleanupTask = cron.schedule('0 3 * * *', async () => {
        await this.runCleanup();
      });

      this.initialized = true;
      logger.info('Aggregation Scheduler initialized successfully');
    } catch (error: any) {
      logger.error('Failed to initialize Aggregation Scheduler:', error);
      throw error;
    }
  }

  /**
   * Run hourly aggregation
   */
  private async runHourlyAggregation(): Promise<void> {
    try {
      logger.info('Starting hourly aggregation...');

      // Aggregate previous hour
      const previousHour = new Date();
      previousHour.setHours(previousHour.getHours() - 1);
      previousHour.setMinutes(0, 0, 0);

      await timeSeriesRepository.aggregateHourlyMetrics(previousHour);

      logger.info(`Hourly aggregation completed for ${previousHour.toISOString()}`);
    } catch (error: any) {
      logger.error('Hourly aggregation failed:', error);
    }
  }

  /**
   * Run daily aggregation
   */
  private async runDailyAggregation(): Promise<void> {
    try {
      logger.info('Starting daily aggregation...');

      // Aggregate previous day
      const previousDay = new Date();
      previousDay.setDate(previousDay.getDate() - 1);
      previousDay.setHours(0, 0, 0, 0);

      await timeSeriesRepository.aggregateDailyMetrics(previousDay);

      logger.info(`Daily aggregation completed for ${previousDay.toISOString()}`);
    } catch (error: any) {
      logger.error('Daily aggregation failed:', error);
    }
  }

  /**
   * Run cleanup tasks
   */
  private async runCleanup(): Promise<void> {
    try {
      logger.info('Starting cleanup tasks...');

      // Clean completed queue jobs older than 1 hour
      await eventQueueService.cleanCompletedJobs(3600000);

      // Delete old tracking events based on retention policy
      // This would be configured in the database or config
      const retentionDays = parseInt(process.env.DATA_RETENTION_DAYS || '365', 10);
      const { trackingEventRepository } = await import('../../domain/repositories/tracking-event.repository');
      const deletedCount = await trackingEventRepository.deleteOldEvents(retentionDays);

      logger.info(`Cleanup completed. Deleted ${deletedCount} old tracking events.`);
    } catch (error: any) {
      logger.error('Cleanup tasks failed:', error);
    }
  }

  /**
   * Schedule immediate hourly aggregation
   */
  async scheduleHourlyAggregation(hour?: Date): Promise<void> {
    const targetHour = hour || new Date();
    targetHour.setMinutes(0, 0, 0);

    try {
      logger.info(`Scheduling hourly aggregation for ${targetHour.toISOString()}`);
      await eventQueueService.scheduleAggregation(targetHour, 'hourly');
    } catch (error: any) {
      logger.error('Failed to schedule hourly aggregation:', error);
      throw error;
    }
  }

  /**
   * Schedule immediate daily aggregation
   */
  async scheduleDailyAggregation(date?: Date): Promise<void> {
    const targetDate = date || new Date();
    targetDate.setHours(0, 0, 0, 0);

    try {
      logger.info(`Scheduling daily aggregation for ${targetDate.toISOString()}`);
      await eventQueueService.scheduleAggregation(targetDate, 'daily');
    } catch (error: any) {
      logger.error('Failed to schedule daily aggregation:', error);
      throw error;
    }
  }

  /**
   * Backfill historical data
   */
  async backfillData(startDate: Date, endDate: Date): Promise<void> {
    try {
      logger.info(`Backfilling data from ${startDate.toISOString()} to ${endDate.toISOString()}`);

      const count = await timeSeriesRepository.backfillDailyMetrics(startDate, endDate);

      logger.info(`Backfill completed. Processed ${count} days.`);
    } catch (error: any) {
      logger.error('Backfill failed:', error);
      throw error;
    }
  }

  /**
   * Start scheduler
   */
  start(): void {
    if (!this.initialized) {
      throw new Error('Scheduler not initialized');
    }

    this.hourlyTask?.start();
    this.dailyTask?.start();
    this.cleanupTask?.start();

    logger.info('Aggregation Scheduler started');
  }

  /**
   * Stop scheduler
   */
  stop(): void {
    this.hourlyTask?.stop();
    this.dailyTask?.stop();
    this.cleanupTask?.stop();

    logger.info('Aggregation Scheduler stopped');
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    initialized: boolean;
    hourlyTaskRunning: boolean;
    dailyTaskRunning: boolean;
    cleanupTaskRunning: boolean;
  } {
    return {
      initialized: this.initialized,
      hourlyTaskRunning: this.hourlyTask ? true : false,
      dailyTaskRunning: this.dailyTask ? true : false,
      cleanupTaskRunning: this.cleanupTask ? true : false,
    };
  }

  /**
   * Destroy scheduler
   */
  destroy(): void {
    this.hourlyTask?.destroy();
    this.dailyTask?.destroy();
    this.cleanupTask?.destroy();

    this.hourlyTask = null;
    this.dailyTask = null;
    this.cleanupTask = null;
    this.initialized = false;

    logger.info('Aggregation Scheduler destroyed');
  }
}

// Export singleton instance
export const aggregationScheduler = new AggregationScheduler();
export default aggregationScheduler;
