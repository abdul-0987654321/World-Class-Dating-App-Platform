/**
 * Base Worker Infrastructure
 * Provides common patterns for Bull queue workers with DLQ, retry logic, and metrics
 */

import Queue, { Job, JobOptions, Queue as BullQueue } from 'bull';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '@flamoral/backend-shared';

const logger = createLogger('base-worker');

// Redis configuration
export const getRedisConfig = () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null as null,
  enableReadyCheck: false,
});

// Queue names enum
export enum WorkerQueueName {
  DISCOVERY_RANKING = 'discovery-ranking',
  MATCH_CREATION = 'match-creation',
  MESSAGE_DELIVERY = 'message-delivery',
  CALL_SIGNAL = 'call-signal',
  VERIFICATION = 'verification',
  MODERATION_TRIAGE = 'moderation-triage',
  SUBSCRIPTION_SYNC = 'subscription-sync',
  NOTIFICATION = 'notification',
  CLEANUP_RETENTION = 'cleanup-retention',
  // Dead Letter Queues
  DISCOVERY_RANKING_DLQ = 'discovery-ranking-dlq',
  MATCH_CREATION_DLQ = 'match-creation-dlq',
  MESSAGE_DELIVERY_DLQ = 'message-delivery-dlq',
  CALL_SIGNAL_DLQ = 'call-signal-dlq',
  VERIFICATION_DLQ = 'verification-dlq',
  MODERATION_TRIAGE_DLQ = 'moderation-triage-dlq',
  SUBSCRIPTION_SYNC_DLQ = 'subscription-sync-dlq',
  NOTIFICATION_DLQ = 'notification-dlq',
  CLEANUP_RETENTION_DLQ = 'cleanup-retention-dlq',
}

// Job priority levels
export enum JobPriority {
  CRITICAL = 1,
  HIGH = 2,
  NORMAL = 5,
  LOW = 10,
}

// Base job data with correlation tracking
export interface BaseJobData {
  correlationId: string;
  createdAt: string;
  attempt?: number;
  source?: string;
}

// Job result interface
export interface JobResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  processingTimeMs?: number;
}

// Worker metrics
export interface WorkerMetrics {
  jobsProcessed: number;
  jobsSucceeded: number;
  jobsFailed: number;
  jobsRetried: number;
  averageProcessingTimeMs: number;
  lastProcessedAt?: Date;
}

// Default retry options with exponential backoff (1s, 2s, 4s)
export const DEFAULT_JOB_OPTIONS: JobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000, // Base delay of 1 second
  },
  removeOnComplete: 100, // Keep last 100 completed jobs
  removeOnFail: false, // Keep failed jobs for DLQ processing
};

// Default queue options
export const DEFAULT_QUEUE_OPTIONS: Queue.QueueOptions = {
  redis: getRedisConfig(),
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
};

/**
 * Create a new Bull queue with standard configuration
 */
export function createQueue(name: WorkerQueueName): BullQueue {
  const queue = new Queue(name, DEFAULT_QUEUE_OPTIONS);

  // Set up event logging
  queue.on('error', (error) => {
    logger.error(`Queue ${name} error:`, { error: error.message });
  });

  queue.on('waiting', (jobId) => {
    logger.debug(`Job ${jobId} is waiting in queue ${name}`);
  });

  queue.on('active', (job) => {
    logger.info(`Job ${job.id} started processing`, {
      queue: name,
      correlationId: (job.data as BaseJobData)?.correlationId,
    });
  });

  queue.on('stalled', (job) => {
    logger.warn(`Job ${job.id} has stalled`, {
      queue: name,
      correlationId: (job.data as BaseJobData)?.correlationId,
    });
  });

  return queue;
}

/**
 * Create a Dead Letter Queue for failed jobs
 */
export function createDLQ(name: WorkerQueueName): BullQueue {
  const dlqName = `${name}-dlq` as WorkerQueueName;
  const dlq = new Queue(dlqName, {
    redis: getRedisConfig(),
    defaultJobOptions: {
      removeOnComplete: false, // Keep all DLQ jobs for investigation
      removeOnFail: false,
    },
  });

  dlq.on('error', (error) => {
    logger.error(`DLQ ${dlqName} error:`, { error: error.message });
  });

  return dlq;
}

/**
 * Abstract base class for workers
 */
export abstract class BaseWorker<TJobData extends BaseJobData, TResult = any> {
  protected queue: BullQueue;
  protected dlq: BullQueue;
  protected metrics: WorkerMetrics;
  protected processingTimes: number[] = [];
  protected readonly maxProcessingTimeSamples = 1000;

  constructor(
    protected readonly queueName: WorkerQueueName,
    protected readonly concurrency: number = 3
  ) {
    this.queue = createQueue(queueName);
    this.dlq = createDLQ(queueName);
    this.metrics = {
      jobsProcessed: 0,
      jobsSucceeded: 0,
      jobsFailed: 0,
      jobsRetried: 0,
      averageProcessingTimeMs: 0,
    };
  }

  /**
   * Abstract method to be implemented by concrete workers
   */
  protected abstract processJob(job: Job<TJobData>): Promise<JobResult<TResult>>;

  /**
   * Start the worker
   */
  start(): void {
    this.queue.process(this.concurrency, async (job: Job<TJobData>) => {
      const startTime = Date.now();
      const correlationId = job.data.correlationId || uuidv4();

      logger.info(`Processing job ${job.id}`, {
        queue: this.queueName,
        correlationId,
        attempt: job.attemptsMade + 1,
      });

      try {
        const result = await this.processJob(job);
        const processingTime = Date.now() - startTime;

        this.updateMetrics(true, processingTime);

        logger.info(`Job ${job.id} completed successfully`, {
          queue: this.queueName,
          correlationId,
          processingTimeMs: processingTime,
        });

        return { ...result, processingTimeMs: processingTime };
      } catch (error: any) {
        const processingTime = Date.now() - startTime;
        this.updateMetrics(false, processingTime);

        logger.error(`Job ${job.id} failed`, {
          queue: this.queueName,
          correlationId,
          error: error.message,
          attempt: job.attemptsMade + 1,
          maxAttempts: job.opts.attempts,
        });

        throw error;
      }
    });

    // Handle completed jobs
    this.queue.on('completed', (job: Job<TJobData>, result: JobResult<TResult>) => {
      logger.info(`Job ${job.id} completed`, {
        queue: this.queueName,
        correlationId: job.data.correlationId,
        success: result.success,
      });
    });

    // Handle failed jobs - send to DLQ after all retries exhausted
    this.queue.on('failed', async (job: Job<TJobData>, err: Error) => {
      const isLastAttempt = job.attemptsMade >= (job.opts.attempts || 3);

      logger.error(`Job ${job.id} failed`, {
        queue: this.queueName,
        correlationId: job.data.correlationId,
        error: err.message,
        attempt: job.attemptsMade,
        isLastAttempt,
      });

      // Move to DLQ if all retries exhausted
      if (isLastAttempt) {
        await this.moveToDeadLetterQueue(job, err);
      } else {
        this.metrics.jobsRetried++;
      }
    });

    logger.info(`${this.queueName} worker started with concurrency ${this.concurrency}`);
  }

  /**
   * Move failed job to Dead Letter Queue
   */
  protected async moveToDeadLetterQueue(job: Job<TJobData>, error: Error): Promise<void> {
    try {
      await this.dlq.add({
        originalJob: job.data,
        originalJobId: job.id,
        failedAt: new Date().toISOString(),
        error: {
          message: error.message,
          stack: error.stack,
        },
        attemptsMade: job.attemptsMade,
      });

      logger.warn(`Job ${job.id} moved to DLQ`, {
        queue: this.queueName,
        correlationId: job.data.correlationId,
        error: error.message,
      });
    } catch (dlqError: any) {
      logger.error(`Failed to move job ${job.id} to DLQ`, {
        queue: this.queueName,
        error: dlqError.message,
      });
    }
  }

  /**
   * Update worker metrics
   */
  protected updateMetrics(success: boolean, processingTimeMs: number): void {
    this.metrics.jobsProcessed++;
    if (success) {
      this.metrics.jobsSucceeded++;
    } else {
      this.metrics.jobsFailed++;
    }
    this.metrics.lastProcessedAt = new Date();

    // Update average processing time
    this.processingTimes.push(processingTimeMs);
    if (this.processingTimes.length > this.maxProcessingTimeSamples) {
      this.processingTimes.shift();
    }
    this.metrics.averageProcessingTimeMs =
      this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
  }

  /**
   * Get current worker metrics
   */
  getMetrics(): WorkerMetrics {
    return { ...this.metrics };
  }

  /**
   * Add a job to the queue
   */
  async addJob(data: Omit<TJobData, 'correlationId' | 'createdAt'>, options?: JobOptions): Promise<Job<TJobData>> {
    const jobData = {
      ...data,
      correlationId: uuidv4(),
      createdAt: new Date().toISOString(),
    } as TJobData;

    return this.queue.add(jobData, options);
  }

  /**
   * Add a job with a specific correlation ID (for tracing)
   */
  async addJobWithCorrelationId(
    correlationId: string,
    data: Omit<TJobData, 'correlationId' | 'createdAt'>,
    options?: JobOptions
  ): Promise<Job<TJobData>> {
    const jobData = {
      ...data,
      correlationId,
      createdAt: new Date().toISOString(),
    } as TJobData;

    return this.queue.add(jobData, options);
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    dlqSize: number;
  }> {
    const [waiting, active, completed, failed, delayed, dlqWaiting] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
      this.dlq.getWaitingCount(),
    ]);

    return { waiting, active, completed, failed, delayed, dlqSize: dlqWaiting };
  }

  /**
   * Pause the worker
   */
  async pause(): Promise<void> {
    await this.queue.pause();
    logger.info(`${this.queueName} worker paused`);
  }

  /**
   * Resume the worker
   */
  async resume(): Promise<void> {
    await this.queue.resume();
    logger.info(`${this.queueName} worker resumed`);
  }

  /**
   * Close the worker and queues
   */
  async close(): Promise<void> {
    await Promise.all([this.queue.close(), this.dlq.close()]);
    logger.info(`${this.queueName} worker closed`);
  }

  /**
   * Clean old completed/failed jobs
   */
  async clean(grace: number = 24 * 60 * 60 * 1000): Promise<void> {
    await this.queue.clean(grace, 'completed');
    await this.queue.clean(grace * 7, 'failed'); // Keep failed jobs longer
    logger.info(`Cleaned old jobs from ${this.queueName}`);
  }
}

/**
 * Helper to create job data with correlation ID
 */
export function createJobData<T extends object>(
  data: T,
  source?: string
): T & BaseJobData {
  return {
    ...data,
    correlationId: uuidv4(),
    createdAt: new Date().toISOString(),
    source,
  };
}
