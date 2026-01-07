import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  WorkerService,
  ImageJobData,
  NotificationJobData,
  AnalyticsJobData,
  CleanupJobData,
} from './worker.service';

interface AddImageJobDto {
  userId: string;
  imageUrl: string;
  operation: 'resize' | 'compress' | 'blur' | 'watermark' | 'thumbnail';
  options?: Record<string, unknown>;
}

interface AddNotificationJobDto {
  userId: string;
  type: 'push' | 'email' | 'sms' | 'in-app';
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface AddAnalyticsJobDto {
  eventType: string;
  userId?: string;
  metadata: Record<string, unknown>;
}

interface AddCleanupJobDto {
  targetType: 'expired_sessions' | 'old_notifications' | 'temp_files' | 'stale_matches';
  olderThanDays: number;
  dryRun?: boolean;
}

@Controller()
export class WorkerController {
  constructor(private readonly workerService: WorkerService) {}

  /**
   * Health check endpoint
   */
  @Get('/health')
  async healthCheck() {
    const isHealthy = await this.workerService.isHealthy();
    const stats = await this.workerService.getQueueStats();

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      service: 'worker-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      queues: stats,
    };
  }

  /**
   * Get queue statistics
   */
  @Get('api/v1/workers/stats')
  async getStats() {
    const stats = await this.workerService.getQueueStats();

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Add an image processing job
   */
  @Post('api/v1/workers/jobs/image')
  @HttpCode(HttpStatus.ACCEPTED)
  async addImageJob(@Body() dto: AddImageJobDto) {
    if (!dto.userId || !dto.imageUrl || !dto.operation) {
      throw new BadRequestException('userId, imageUrl, and operation are required');
    }

    const validOperations = ['resize', 'compress', 'blur', 'watermark', 'thumbnail'];
    if (!validOperations.includes(dto.operation)) {
      throw new BadRequestException(`Invalid operation. Must be one of: ${validOperations.join(', ')}`);
    }

    const jobData: ImageJobData = {
      userId: dto.userId,
      imageUrl: dto.imageUrl,
      operation: dto.operation,
      options: dto.options,
    };

    const job = await this.workerService.addImageJob(jobData);

    if (!job) {
      throw new BadRequestException('Failed to add job - queue not initialized');
    }

    return {
      success: true,
      message: 'Image processing job added to queue',
      data: {
        jobId: job.id,
        queue: 'image-processing',
        operation: dto.operation,
      },
    };
  }

  /**
   * Add a notification job
   */
  @Post('api/v1/workers/jobs/notification')
  @HttpCode(HttpStatus.ACCEPTED)
  async addNotificationJob(@Body() dto: AddNotificationJobDto) {
    if (!dto.userId || !dto.type || !dto.title || !dto.body) {
      throw new BadRequestException('userId, type, title, and body are required');
    }

    const validTypes = ['push', 'email', 'sms', 'in-app'];
    if (!validTypes.includes(dto.type)) {
      throw new BadRequestException(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
    }

    const jobData: NotificationJobData = {
      userId: dto.userId,
      type: dto.type,
      title: dto.title,
      body: dto.body,
      data: dto.data,
    };

    const job = await this.workerService.addNotificationJob(jobData);

    if (!job) {
      throw new BadRequestException('Failed to add job - queue not initialized');
    }

    return {
      success: true,
      message: 'Notification job added to queue',
      data: {
        jobId: job.id,
        queue: 'notifications',
        type: dto.type,
      },
    };
  }

  /**
   * Add an analytics job
   */
  @Post('api/v1/workers/jobs/analytics')
  @HttpCode(HttpStatus.ACCEPTED)
  async addAnalyticsJob(@Body() dto: AddAnalyticsJobDto) {
    if (!dto.eventType || !dto.metadata) {
      throw new BadRequestException('eventType and metadata are required');
    }

    const jobData: AnalyticsJobData = {
      eventType: dto.eventType,
      userId: dto.userId,
      timestamp: new Date(),
      metadata: dto.metadata,
    };

    const job = await this.workerService.addAnalyticsJob(jobData);

    if (!job) {
      throw new BadRequestException('Failed to add job - queue not initialized');
    }

    return {
      success: true,
      message: 'Analytics job added to queue',
      data: {
        jobId: job.id,
        queue: 'analytics',
        eventType: dto.eventType,
      },
    };
  }

  /**
   * Add a cleanup job
   */
  @Post('api/v1/workers/jobs/cleanup')
  @HttpCode(HttpStatus.ACCEPTED)
  async addCleanupJob(@Body() dto: AddCleanupJobDto) {
    if (!dto.targetType || dto.olderThanDays === undefined) {
      throw new BadRequestException('targetType and olderThanDays are required');
    }

    const validTargets = ['expired_sessions', 'old_notifications', 'temp_files', 'stale_matches'];
    if (!validTargets.includes(dto.targetType)) {
      throw new BadRequestException(`Invalid targetType. Must be one of: ${validTargets.join(', ')}`);
    }

    if (dto.olderThanDays < 1 || dto.olderThanDays > 365) {
      throw new BadRequestException('olderThanDays must be between 1 and 365');
    }

    const jobData: CleanupJobData = {
      targetType: dto.targetType,
      olderThanDays: dto.olderThanDays,
      dryRun: dto.dryRun,
    };

    const job = await this.workerService.addCleanupJob(jobData);

    if (!job) {
      throw new BadRequestException('Failed to add job - queue not initialized');
    }

    return {
      success: true,
      message: 'Cleanup job added to queue',
      data: {
        jobId: job.id,
        queue: 'cleanup',
        targetType: dto.targetType,
        dryRun: dto.dryRun || false,
      },
    };
  }

  /**
   * Root endpoint - service information
   */
  @Get()
  getServiceInfo() {
    return {
      service: 'Flamoral Worker Service',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        health: '/health',
        stats: '/api/v1/workers/stats',
        addImageJob: 'POST /api/v1/workers/jobs/image',
        addNotificationJob: 'POST /api/v1/workers/jobs/notification',
        addAnalyticsJob: 'POST /api/v1/workers/jobs/analytics',
        addCleanupJob: 'POST /api/v1/workers/jobs/cleanup',
      },
      queues: ['image-processing', 'notifications', 'analytics', 'cleanup'],
    };
  }
}
