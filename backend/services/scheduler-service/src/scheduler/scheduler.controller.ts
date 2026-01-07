import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import { SchedulerService, ScheduledJob } from './scheduler.service';

interface ScheduleJobDto {
  name: string;
  cronExpression: string;
}

interface ScheduleJobResponse {
  success: boolean;
  jobId: string;
  message: string;
}

interface JobListResponse {
  success: boolean;
  jobs: ScheduledJob[];
  count: number;
}

interface JobResponse {
  success: boolean;
  job: ScheduledJob | null;
}

interface ActionResponse {
  success: boolean;
  message: string;
}

@Controller('api/v1/scheduler')
export class SchedulerController {
  private readonly logger = new Logger(SchedulerController.name);

  constructor(private readonly schedulerService: SchedulerService) {}

  /**
   * Get all scheduled jobs
   */
  @Get('jobs')
  getJobs(): JobListResponse {
    const jobs = this.schedulerService.getScheduledJobs();

    return {
      success: true,
      jobs,
      count: jobs.length,
    };
  }

  /**
   * Get a specific job by ID
   */
  @Get('jobs/:id')
  getJob(@Param('id') id: string): JobResponse {
    const job = this.schedulerService.getJob(id);

    if (!job) {
      throw new NotFoundException(`Job not found: ${id}`);
    }

    return {
      success: true,
      job,
    };
  }

  /**
   * Schedule a new job
   */
  @Post('jobs')
  @HttpCode(HttpStatus.CREATED)
  scheduleJob(@Body() dto: ScheduleJobDto): ScheduleJobResponse {
    if (!dto.name || !dto.cronExpression) {
      throw new BadRequestException('name and cronExpression are required');
    }

    // Validate cron expression format
    if (!this.isValidCronExpression(dto.cronExpression)) {
      throw new BadRequestException('Invalid cron expression format');
    }

    try {
      // Schedule a placeholder job that logs execution
      // In production, this would integrate with specific task handlers
      const jobId = this.schedulerService.scheduleJob(
        dto.name,
        dto.cronExpression,
        async () => {
          this.logger.log(`Custom job executed: ${dto.name}`);
        }
      );

      return {
        success: true,
        jobId,
        message: `Job "${dto.name}" scheduled successfully`,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to schedule job: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Cancel a scheduled job
   */
  @Delete('jobs/:id')
  @HttpCode(HttpStatus.OK)
  cancelJob(@Param('id') id: string): ActionResponse {
    const success = this.schedulerService.cancelJob(id);

    if (!success) {
      throw new NotFoundException(`Job not found: ${id}`);
    }

    return {
      success: true,
      message: `Job ${id} cancelled successfully`,
    };
  }

  /**
   * Trigger a job to run immediately
   */
  @Post('jobs/:id/trigger')
  @HttpCode(HttpStatus.OK)
  async triggerJob(@Param('id') id: string): Promise<ActionResponse> {
    const success = await this.schedulerService.triggerJob(id);

    if (!success) {
      throw new NotFoundException(`Job not found or execution failed: ${id}`);
    }

    return {
      success: true,
      message: `Job ${id} triggered successfully`,
    };
  }

  /**
   * Manually trigger cleanup tasks
   */
  @Post('tasks/cleanup')
  @HttpCode(HttpStatus.OK)
  async runCleanup(): Promise<ActionResponse> {
    await this.schedulerService.runCleanupTasks();

    return {
      success: true,
      message: 'Cleanup tasks executed successfully',
    };
  }

  /**
   * Manually trigger analytics aggregation
   */
  @Post('tasks/analytics')
  @HttpCode(HttpStatus.OK)
  async runAnalytics(): Promise<ActionResponse> {
    await this.schedulerService.runAnalyticsAggregation();

    return {
      success: true,
      message: 'Analytics aggregation executed successfully',
    };
  }

  /**
   * Validate cron expression format
   */
  private isValidCronExpression(expression: string): boolean {
    // Basic validation for standard cron format (5 or 6 fields)
    const parts = expression.trim().split(/\s+/);
    if (parts.length < 5 || parts.length > 6) {
      return false;
    }

    // More detailed validation could be added here
    // For now, we'll let the cron library handle detailed validation
    return true;
  }
}
