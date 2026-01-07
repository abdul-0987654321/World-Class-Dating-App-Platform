import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import Redis from 'ioredis';

export interface ImageJobData {
  userId: string;
  imageUrl: string;
  operation: 'resize' | 'compress' | 'blur' | 'watermark' | 'thumbnail';
  options?: Record<string, unknown>;
}

export interface NotificationJobData {
  userId: string;
  type: 'push' | 'email' | 'sms' | 'in-app';
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface AnalyticsJobData {
  eventType: string;
  userId?: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
}

export interface CleanupJobData {
  targetType: 'expired_sessions' | 'old_notifications' | 'temp_files' | 'stale_matches';
  olderThanDays: number;
  dryRun?: boolean;
}

export interface JobResult {
  success: boolean;
  message: string;
  data?: unknown;
  processedAt: Date;
}

@Injectable()
export class WorkerService implements OnModuleInit, OnModuleDestroy {
  private redis: Redis | null = null;
  private imageQueue: Queue | null = null;
  private notificationQueue: Queue | null = null;
  private analyticsQueue: Queue | null = null;
  private cleanupQueue: Queue | null = null;

  private imageWorker: Worker | null = null;
  private notificationWorker: Worker | null = null;
  private analyticsWorker: Worker | null = null;
  private cleanupWorker: Worker | null = null;

  private isInitialized = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.initialize();
  }

  async onModuleDestroy(): Promise<void> {
    await this.shutdown();
  }

  private async initialize(): Promise<void> {
    const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
    const redisPort = this.configService.get<number>('REDIS_PORT', 6379);
    const redisPassword = this.configService.get<string>('REDIS_PASSWORD');

    try {
      // Initialize Redis connection
      this.redis = new Redis({
        host: redisHost,
        port: redisPort,
        password: redisPassword || undefined,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      });

      const connection = { host: redisHost, port: redisPort, password: redisPassword || undefined };

      // Initialize queues
      this.imageQueue = new Queue('image-processing', { connection });
      this.notificationQueue = new Queue('notifications', { connection });
      this.analyticsQueue = new Queue('analytics', { connection });
      this.cleanupQueue = new Queue('cleanup', { connection });

      // Initialize workers
      this.imageWorker = new Worker(
        'image-processing',
        async (job: Job<ImageJobData>) => this.processImageJob(job),
        { connection, concurrency: 5 }
      );

      this.notificationWorker = new Worker(
        'notifications',
        async (job: Job<NotificationJobData>) => this.processNotificationJob(job),
        { connection, concurrency: 10 }
      );

      this.analyticsWorker = new Worker(
        'analytics',
        async (job: Job<AnalyticsJobData>) => this.processAnalyticsJob(job),
        { connection, concurrency: 20 }
      );

      this.cleanupWorker = new Worker(
        'cleanup',
        async (job: Job<CleanupJobData>) => this.processCleanupJob(job),
        { connection, concurrency: 2 }
      );

      // Set up error handlers
      this.setupErrorHandlers();

      this.isInitialized = true;
      console.log('Worker service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize worker service:', error);
      // Don't throw - allow service to start without Redis for health checks
    }
  }

  private setupErrorHandlers(): void {
    const workers = [
      { worker: this.imageWorker, name: 'image' },
      { worker: this.notificationWorker, name: 'notification' },
      { worker: this.analyticsWorker, name: 'analytics' },
      { worker: this.cleanupWorker, name: 'cleanup' },
    ];

    workers.forEach(({ worker, name }) => {
      if (worker) {
        worker.on('failed', (job, err) => {
          console.error(`${name} job ${job?.id} failed:`, err.message);
        });

        worker.on('completed', (job) => {
          console.log(`${name} job ${job.id} completed`);
        });

        worker.on('error', (err) => {
          console.error(`${name} worker error:`, err.message);
        });
      }
    });
  }

  async shutdown(): Promise<void> {
    const closables = [
      this.imageWorker,
      this.notificationWorker,
      this.analyticsWorker,
      this.cleanupWorker,
      this.imageQueue,
      this.notificationQueue,
      this.analyticsQueue,
      this.cleanupQueue,
    ];

    await Promise.all(
      closables.map(async (closable) => {
        if (closable) {
          await closable.close();
        }
      })
    );

    if (this.redis) {
      await this.redis.quit();
    }

    console.log('Worker service shut down gracefully');
  }

  /**
   * Process image-related jobs (resize, compress, blur, watermark, thumbnail)
   */
  async processImageJob(job: Job<ImageJobData>): Promise<JobResult> {
    const { userId, imageUrl, operation, options } = job.data;

    console.log(`Processing image job ${job.id}: ${operation} for user ${userId}`);

    try {
      // Simulate image processing based on operation type
      await this.simulateProcessing(500, 2000);

      let resultData: Record<string, unknown> = {};

      switch (operation) {
        case 'resize':
          resultData = {
            originalUrl: imageUrl,
            resizedUrl: `${imageUrl}?resized=true`,
            dimensions: options?.dimensions || { width: 800, height: 600 },
          };
          break;
        case 'compress':
          resultData = {
            originalUrl: imageUrl,
            compressedUrl: `${imageUrl}?compressed=true`,
            compressionRatio: 0.7,
          };
          break;
        case 'blur':
          resultData = {
            originalUrl: imageUrl,
            blurredUrl: `${imageUrl}?blurred=true`,
            blurRadius: options?.radius || 10,
          };
          break;
        case 'watermark':
          resultData = {
            originalUrl: imageUrl,
            watermarkedUrl: `${imageUrl}?watermarked=true`,
            watermarkPosition: options?.position || 'bottom-right',
          };
          break;
        case 'thumbnail':
          resultData = {
            originalUrl: imageUrl,
            thumbnailUrl: `${imageUrl}?thumbnail=true`,
            size: options?.size || '150x150',
          };
          break;
        default:
          throw new Error(`Unknown image operation: ${operation}`);
      }

      return {
        success: true,
        message: `Image ${operation} completed successfully`,
        data: resultData,
        processedAt: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Image job ${job.id} failed:`, errorMessage);
      throw error;
    }
  }

  /**
   * Process notification jobs (push, email, SMS, in-app)
   */
  async processNotificationJob(job: Job<NotificationJobData>): Promise<JobResult> {
    const { userId, type, title, body, data } = job.data;

    console.log(`Processing notification job ${job.id}: ${type} for user ${userId}`);

    try {
      // Simulate notification sending based on type
      await this.simulateProcessing(100, 500);

      let deliveryInfo: Record<string, unknown> = {};

      switch (type) {
        case 'push':
          deliveryInfo = {
            platform: 'fcm',
            delivered: true,
            deviceTokens: 1,
          };
          break;
        case 'email':
          deliveryInfo = {
            provider: 'sendgrid',
            messageId: `msg_${Date.now()}`,
            status: 'sent',
          };
          break;
        case 'sms':
          deliveryInfo = {
            provider: 'twilio',
            sid: `SM${Date.now()}`,
            status: 'queued',
          };
          break;
        case 'in-app':
          deliveryInfo = {
            stored: true,
            notificationId: `notif_${Date.now()}`,
            read: false,
          };
          break;
        default:
          throw new Error(`Unknown notification type: ${type}`);
      }

      return {
        success: true,
        message: `${type} notification sent successfully`,
        data: {
          userId,
          title,
          body,
          type,
          ...deliveryInfo,
          metadata: data,
        },
        processedAt: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Notification job ${job.id} failed:`, errorMessage);
      throw error;
    }
  }

  /**
   * Process analytics jobs (event tracking, aggregation)
   */
  async processAnalyticsJob(job: Job<AnalyticsJobData>): Promise<JobResult> {
    const { eventType, userId, timestamp, metadata } = job.data;

    console.log(`Processing analytics job ${job.id}: ${eventType}`);

    try {
      // Simulate analytics processing
      await this.simulateProcessing(50, 200);

      const analyticsResult = {
        eventType,
        userId,
        timestamp,
        metadata,
        indexed: true,
        aggregated: true,
        batchId: `batch_${Date.now()}`,
      };

      return {
        success: true,
        message: `Analytics event ${eventType} processed`,
        data: analyticsResult,
        processedAt: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Analytics job ${job.id} failed:`, errorMessage);
      throw error;
    }
  }

  /**
   * Process cleanup jobs (expired data removal)
   */
  async processCleanupJob(job: Job<CleanupJobData>): Promise<JobResult> {
    const { targetType, olderThanDays, dryRun } = job.data;

    console.log(`Processing cleanup job ${job.id}: ${targetType} (dryRun: ${dryRun})`);

    try {
      // Simulate cleanup processing
      await this.simulateProcessing(1000, 5000);

      // Simulated cleanup results
      const cleanupResult = {
        targetType,
        olderThanDays,
        dryRun: dryRun || false,
        itemsFound: Math.floor(Math.random() * 1000),
        itemsDeleted: dryRun ? 0 : Math.floor(Math.random() * 1000),
        bytesFreed: dryRun ? 0 : Math.floor(Math.random() * 1024 * 1024 * 100),
        startedAt: new Date(Date.now() - 5000),
        completedAt: new Date(),
      };

      return {
        success: true,
        message: `Cleanup ${targetType} completed${dryRun ? ' (dry run)' : ''}`,
        data: cleanupResult,
        processedAt: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Cleanup job ${job.id} failed:`, errorMessage);
      throw error;
    }
  }

  /**
   * Add a job to the image processing queue
   */
  async addImageJob(data: ImageJobData): Promise<Job<ImageJobData> | null> {
    if (!this.imageQueue) {
      console.warn('Image queue not initialized');
      return null;
    }
    return this.imageQueue.add('process-image', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
  }

  /**
   * Add a job to the notification queue
   */
  async addNotificationJob(data: NotificationJobData): Promise<Job<NotificationJobData> | null> {
    if (!this.notificationQueue) {
      console.warn('Notification queue not initialized');
      return null;
    }
    return this.notificationQueue.add('send-notification', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 500 },
    });
  }

  /**
   * Add a job to the analytics queue
   */
  async addAnalyticsJob(data: AnalyticsJobData): Promise<Job<AnalyticsJobData> | null> {
    if (!this.analyticsQueue) {
      console.warn('Analytics queue not initialized');
      return null;
    }
    return this.analyticsQueue.add('track-event', data, {
      attempts: 2,
      backoff: { type: 'fixed', delay: 1000 },
    });
  }

  /**
   * Add a job to the cleanup queue
   */
  async addCleanupJob(data: CleanupJobData): Promise<Job<CleanupJobData> | null> {
    if (!this.cleanupQueue) {
      console.warn('Cleanup queue not initialized');
      return null;
    }
    return this.cleanupQueue.add('run-cleanup', data, {
      attempts: 1,
    });
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<Record<string, unknown>> {
    const stats: Record<string, unknown> = {
      initialized: this.isInitialized,
    };

    const queues = [
      { queue: this.imageQueue, name: 'image' },
      { queue: this.notificationQueue, name: 'notification' },
      { queue: this.analyticsQueue, name: 'analytics' },
      { queue: this.cleanupQueue, name: 'cleanup' },
    ];

    for (const { queue, name } of queues) {
      if (queue) {
        try {
          const [waiting, active, completed, failed] = await Promise.all([
            queue.getWaitingCount(),
            queue.getActiveCount(),
            queue.getCompletedCount(),
            queue.getFailedCount(),
          ]);

          stats[name] = { waiting, active, completed, failed };
        } catch (error) {
          stats[name] = { error: 'Unable to fetch stats' };
        }
      } else {
        stats[name] = { status: 'not initialized' };
      }
    }

    return stats;
  }

  /**
   * Check if worker service is healthy
   */
  async isHealthy(): Promise<boolean> {
    if (!this.redis) {
      return true; // Allow health checks even without Redis
    }

    try {
      await this.redis.ping();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Simulate processing delay for demonstration
   */
  private async simulateProcessing(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs) + minMs);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}
