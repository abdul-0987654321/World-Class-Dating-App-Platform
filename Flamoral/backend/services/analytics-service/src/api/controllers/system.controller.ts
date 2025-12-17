/**
 * System Controller
 * Handles system operations, monitoring, and admin tasks
 */

import { Request, Response } from 'express';
import eventQueueService from '../../infrastructure/queue/event-queue.service';
import eventStreamService from '../../infrastructure/streaming/event-stream.service';
import aggregationScheduler from '../../infrastructure/scheduler/aggregation-scheduler';
import { dbClient } from '../../infrastructure/database/db-client';

/**
 * Get system health status
 * GET /api/system/health
 */
export async function getSystemHealth(req: Request, res: Response) {
  try {
    const dbHealthy = await dbClient.healthCheck();
    const queueHealthy = await eventQueueService.healthCheck();
    const streamHealthy = await eventStreamService.healthCheck();
    const schedulerStatus = aggregationScheduler.getStatus();

    res.status(200).json({
      success: true,
      data: {
        database: dbHealthy,
        queue: queueHealthy,
        stream: streamHealthy,
        scheduler: schedulerStatus,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get system health',
    });
  }
}

/**
 * Get queue statistics
 * GET /api/system/queue-stats
 */
export async function getQueueStats(req: Request, res: Response) {
  try {
    const stats = await eventQueueService.getQueueStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get queue stats',
    });
  }
}

/**
 * Get stream info
 * GET /api/system/stream-info
 */
export async function getStreamInfo(req: Request, res: Response) {
  try {
    const streamInfo = await eventStreamService.getStreamInfo();
    const pendingCount = await eventStreamService.getPendingCount();

    res.status(200).json({
      success: true,
      data: {
        ...streamInfo,
        pendingCount,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get stream info',
    });
  }
}

/**
 * Trigger hourly aggregation
 * POST /api/system/aggregate/hourly
 */
export async function triggerHourlyAggregation(req: Request, res: Response) {
  try {
    const { hour } = req.body;
    const targetHour = hour ? new Date(hour) : undefined;

    await aggregationScheduler.scheduleHourlyAggregation(targetHour);

    res.status(200).json({
      success: true,
      message: 'Hourly aggregation scheduled',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to trigger hourly aggregation',
    });
  }
}

/**
 * Trigger daily aggregation
 * POST /api/system/aggregate/daily
 */
export async function triggerDailyAggregation(req: Request, res: Response) {
  try {
    const { date } = req.body;
    const targetDate = date ? new Date(date) : undefined;

    await aggregationScheduler.scheduleDailyAggregation(targetDate);

    res.status(200).json({
      success: true,
      message: 'Daily aggregation scheduled',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to trigger daily aggregation',
    });
  }
}

/**
 * Backfill historical data
 * POST /api/system/backfill
 */
export async function backfillData(req: Request, res: Response) {
  try {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate are required',
      });
    }

    // Run backfill asynchronously
    aggregationScheduler.backfillData(new Date(startDate), new Date(endDate))
      .catch((error) => {
        console.error('Backfill error:', error);
      });

    res.status(202).json({
      success: true,
      message: 'Backfill started',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start backfill',
    });
  }
}

/**
 * Clean completed queue jobs
 * POST /api/system/queue/clean
 */
export async function cleanQueueJobs(req: Request, res: Response) {
  try {
    const { grace } = req.body;
    const graceMs = grace ? parseInt(grace, 10) : 3600000; // Default 1 hour

    await eventQueueService.cleanCompletedJobs(graceMs);

    res.status(200).json({
      success: true,
      message: 'Queue jobs cleaned',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to clean queue jobs',
    });
  }
}

/**
 * Get database pool stats
 * GET /api/system/database/pool
 */
export async function getDatabasePoolStats(req: Request, res: Response) {
  try {
    const poolStats = dbClient.getPoolStats();

    res.status(200).json({
      success: true,
      data: poolStats,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get pool stats',
    });
  }
}
