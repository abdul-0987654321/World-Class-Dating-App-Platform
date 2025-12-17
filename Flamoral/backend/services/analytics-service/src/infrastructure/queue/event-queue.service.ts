/**
 * Event Queue Service
 * Handles asynchronous event processing using Bull queues
 */

import Queue, { Job, Queue as BullQueue } from 'bull';
import config from '../../config';
import { logger } from '../monitoring/logger';
import eventsRepository from '../../domain/repositories/events.repository';
import trackingEventRepository from '../../domain/repositories/tracking-event.repository';
import revenueRepository from '../../domain/repositories/revenue.repository';

export interface QueueEvent {
  type: 'swipe' | 'match' | 'message' | 'session' | 'tracking' | 'revenue';
  data: Record<string, any>;
  userId?: string;
  sessionId?: string;
  priority?: number;
}

export class EventQueueService {
  private eventQueue: BullQueue<QueueEvent> | null = null;
  private aggregationQueue: BullQueue<{ date: Date; type: string }> | null = null;
  private initialized = false;

  /**
   * Initialize queue service
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      logger.info('Initializing Event Queue Service...');

      const redisConfig = {
        redis: {
          host: config.redis.host,
          port: config.redis.port,
          password: config.redis.password,
          db: config.redis.db,
        },
      };

      // Create event processing queue
      this.eventQueue = new Queue('analytics-events', redisConfig);

      // Create aggregation queue
      this.aggregationQueue = new Queue('analytics-aggregation', redisConfig);

      // Set up event processing handlers
      this.setupEventProcessor();
      this.setupAggregationProcessor();

      // Error handlers
      this.eventQueue.on('error', (error) => {
        logger.error('Event queue error:', error);
      });

      this.eventQueue.on('failed', (job, error) => {
        logger.error(`Event job ${job.id} failed:`, error);
      });

      this.aggregationQueue.on('error', (error) => {
        logger.error('Aggregation queue error:', error);
      });

      this.aggregationQueue.on('failed', (job, error) => {
        logger.error(`Aggregation job ${job.id} failed:`, error);
      });

      this.initialized = true;
      logger.info('Event Queue Service initialized successfully');
    } catch (error: any) {
      logger.error('Failed to initialize Event Queue Service:', error);
      throw error;
    }
  }

  /**
   * Setup event processor
   */
  private setupEventProcessor(): void {
    if (!this.eventQueue) return;

    this.eventQueue.process(10, async (job: Job<QueueEvent>) => {
      const { type, data } = job.data;

      try {
        logger.debug(`Processing ${type} event:`, job.id);

        switch (type) {
          case 'swipe':
            await eventsRepository.trackSwipe(data);
            break;

          case 'match':
            await eventsRepository.trackMatch(data);
            break;

          case 'message':
            await eventsRepository.trackMessage(data);
            break;

          case 'session':
            await eventsRepository.trackSession(data);
            break;

          case 'tracking':
            await trackingEventRepository.create(data);
            break;

          case 'revenue':
            await revenueRepository.trackTransaction(data);
            break;

          default:
            logger.warn(`Unknown event type: ${type}`);
        }

        logger.debug(`Successfully processed ${type} event:`, job.id);
      } catch (error: any) {
        logger.error(`Error processing ${type} event:`, error);
        throw error; // Re-throw to mark job as failed
      }
    });

    logger.info('Event processor setup complete');
  }

  /**
   * Setup aggregation processor
   */
  private setupAggregationProcessor(): void {
    if (!this.aggregationQueue) return;

    this.aggregationQueue.process(async (job: Job<{ date: Date; type: string }>) => {
      const { date, type } = job.data;

      try {
        logger.info(`Processing aggregation for ${type} on ${date.toISOString()}`);

        // Import time series repository dynamically to avoid circular deps
        const { timeSeriesRepository } = await import('../../domain/repositories/time-series.repository');

        if (type === 'daily') {
          await timeSeriesRepository.aggregateDailyMetrics(date);
        } else if (type === 'hourly') {
          await timeSeriesRepository.aggregateHourlyMetrics(date);
        }

        logger.info(`Successfully aggregated ${type} metrics for ${date.toISOString()}`);
      } catch (error: any) {
        logger.error(`Error aggregating ${type} metrics:`, error);
        throw error;
      }
    });

    logger.info('Aggregation processor setup complete');
  }

  /**
   * Add event to queue
   */
  async queueEvent(event: QueueEvent): Promise<string> {
    if (!this.eventQueue) {
      throw new Error('Event Queue Service not initialized');
    }

    try {
      const job = await this.eventQueue.add(event, {
        priority: event.priority || 5,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 500, // Keep last 500 failed jobs
      });

      logger.debug(`Event queued: ${job.id}`);
      return job.id.toString();
    } catch (error: any) {
      logger.error('Failed to queue event:', error);
      throw error;
    }
  }

  /**
   * Add batch of events to queue
   */
  async queueBatch(events: QueueEvent[]): Promise<string[]> {
    if (!this.eventQueue) {
      throw new Error('Event Queue Service not initialized');
    }

    try {
      const jobs = await this.eventQueue.addBulk(
        events.map((event) => ({
          data: event,
          opts: {
            priority: event.priority || 5,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          },
        }))
      );

      const jobIds = jobs.map((job) => job.id.toString());
      logger.debug(`Batch of ${events.length} events queued`);
      return jobIds;
    } catch (error: any) {
      logger.error('Failed to queue batch:', error);
      throw error;
    }
  }

  /**
   * Schedule aggregation job
   */
  async scheduleAggregation(
    date: Date,
    type: 'hourly' | 'daily',
    delay: number = 0
  ): Promise<string> {
    if (!this.aggregationQueue) {
      throw new Error('Event Queue Service not initialized');
    }

    try {
      const job = await this.aggregationQueue.add(
        { date, type },
        {
          delay,
          attempts: 2,
          backoff: {
            type: 'fixed',
            delay: 60000, // 1 minute
          },
        }
      );

      logger.info(`Aggregation job scheduled: ${job.id} (${type} for ${date.toISOString()})`);
      return job.id.toString();
    } catch (error: any) {
      logger.error('Failed to schedule aggregation:', error);
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    events: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
    };
    aggregation: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
    };
  }> {
    if (!this.eventQueue || !this.aggregationQueue) {
      throw new Error('Event Queue Service not initialized');
    }

    const [
      eventWaiting,
      eventActive,
      eventCompleted,
      eventFailed,
      eventDelayed,
      aggWaiting,
      aggActive,
      aggCompleted,
      aggFailed,
      aggDelayed,
    ] = await Promise.all([
      this.eventQueue.getWaitingCount(),
      this.eventQueue.getActiveCount(),
      this.eventQueue.getCompletedCount(),
      this.eventQueue.getFailedCount(),
      this.eventQueue.getDelayedCount(),
      this.aggregationQueue.getWaitingCount(),
      this.aggregationQueue.getActiveCount(),
      this.aggregationQueue.getCompletedCount(),
      this.aggregationQueue.getFailedCount(),
      this.aggregationQueue.getDelayedCount(),
    ]);

    return {
      events: {
        waiting: eventWaiting,
        active: eventActive,
        completed: eventCompleted,
        failed: eventFailed,
        delayed: eventDelayed,
      },
      aggregation: {
        waiting: aggWaiting,
        active: aggActive,
        completed: aggCompleted,
        failed: aggFailed,
        delayed: aggDelayed,
      },
    };
  }

  /**
   * Clean old completed jobs
   */
  async cleanCompletedJobs(grace: number = 3600000): Promise<void> {
    if (!this.eventQueue || !this.aggregationQueue) {
      throw new Error('Event Queue Service not initialized');
    }

    try {
      await Promise.all([
        this.eventQueue.clean(grace, 'completed'),
        this.aggregationQueue.clean(grace, 'completed'),
      ]);

      logger.info('Cleaned completed jobs from queues');
    } catch (error: any) {
      logger.error('Failed to clean completed jobs:', error);
    }
  }

  /**
   * Pause queues
   */
  async pause(): Promise<void> {
    if (this.eventQueue) {
      await this.eventQueue.pause();
    }
    if (this.aggregationQueue) {
      await this.aggregationQueue.pause();
    }
    logger.info('Queues paused');
  }

  /**
   * Resume queues
   */
  async resume(): Promise<void> {
    if (this.eventQueue) {
      await this.eventQueue.resume();
    }
    if (this.aggregationQueue) {
      await this.aggregationQueue.resume();
    }
    logger.info('Queues resumed');
  }

  /**
   * Close queues
   */
  async close(): Promise<void> {
    if (this.eventQueue) {
      await this.eventQueue.close();
      this.eventQueue = null;
    }

    if (this.aggregationQueue) {
      await this.aggregationQueue.close();
      this.aggregationQueue = null;
    }

    this.initialized = false;
    logger.info('Event Queue Service closed');
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.eventQueue || !this.aggregationQueue) {
        return false;
      }

      // Check if queues are responsive
      await Promise.all([
        this.eventQueue.getWaitingCount(),
        this.aggregationQueue.getWaitingCount(),
      ]);

      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const eventQueueService = new EventQueueService();
export default eventQueueService;
