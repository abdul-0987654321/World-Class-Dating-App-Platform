/**
 * Batch Notification Controller
 * Handles batch and segmented notification endpoints
 */

import { Request, Response } from 'express';

import { batchNotificationService } from '../../services/batch-notification.service';
import { NotificationType } from '../../types';
import logger from '../../utils/logger';

export class BatchController {
  /**
   * POST /api/batch/send
   * Send notification to multiple users
   */
  async sendBatch(req: Request, res: Response): Promise<void> {
    try {
      const {
        userIds,
        type,
        title,
        body,
        data,
        imageUrl,
        deepLink,
        badge,
        sound,
        priority,
        respectQuietHours,
        respectPreferences,
      } = req.body;

      // Validate required fields
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'userIds array is required and cannot be empty',
        });
        return;
      }

      if (!type || !title || !body) {
        res.status(400).json({
          success: false,
          error: 'type, title, and body are required',
        });
        return;
      }

      // Validate notification type
      if (!Object.values(NotificationType).includes(type)) {
        res.status(400).json({
          success: false,
          error: 'Invalid notification type',
        });
        return;
      }

      // Limit batch size
      if (userIds.length > 10000) {
        res.status(400).json({
          success: false,
          error: 'Batch size cannot exceed 10,000 users',
        });
        return;
      }

      const result = await batchNotificationService.sendBatch({
        userIds,
        type,
        title,
        body,
        data,
        imageUrl,
        deepLink,
        badge,
        sound,
        priority,
        respectQuietHours,
        respectPreferences,
      });

      res.status(200).json({
        success: true,
        jobId: result.jobId,
        totalUsers: result.totalUsers,
        message: result.message,
      });
    } catch (error: any) {
      logger.error('Error in sendBatch controller', {
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error',
      });
    }
  }

  /**
   * POST /api/batch/segment
   * Send notification to segmented users
   */
  async sendToSegment(req: Request, res: Response): Promise<void> {
    try {
      const { segment, payload } = req.body;

      // Validate required fields
      if (!segment || !segment.type) {
        res.status(400).json({
          success: false,
          error: 'segment.type is required',
        });
        return;
      }

      if (!payload || !payload.type || !payload.title || !payload.body) {
        res.status(400).json({
          success: false,
          error: 'payload.type, payload.title, and payload.body are required',
        });
        return;
      }

      // Validate segment type
      const validSegmentTypes = ['all', 'platform', 'subscription', 'active', 'custom'];
      if (!validSegmentTypes.includes(segment.type)) {
        res.status(400).json({
          success: false,
          error: 'Invalid segment type',
        });
        return;
      }

      // Validate notification type
      if (!Object.values(NotificationType).includes(payload.type)) {
        res.status(400).json({
          success: false,
          error: 'Invalid notification type',
        });
        return;
      }

      const result = await batchNotificationService.sendToSegment({
        segment,
        payload,
      });

      res.status(200).json({
        success: true,
        jobId: result.jobId,
        totalUsers: result.totalUsers,
        message: result.message,
      });
    } catch (error: any) {
      logger.error('Error in sendToSegment controller', {
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error',
      });
    }
  }

  /**
   * GET /api/batch/job/:jobId
   * Get batch job status
   */
  async getJobStatus(req: Request, res: Response): Promise<void> {
    try {
      const jobId = req.params.jobId;

      const result = await batchNotificationService.getJobStatus(jobId);

      if (result.success) {
        res.status(200).json({
          success: true,
          job: result.job,
        });
      } else {
        res.status(404).json({
          success: false,
          error: result.error || 'Job not found',
        });
      }
    } catch (error: any) {
      logger.error('Error in getJobStatus controller', {
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * DELETE /api/batch/job/:jobId
   * Cancel a pending batch job
   */
  async cancelJob(req: Request, res: Response): Promise<void> {
    try {
      const jobId = req.params.jobId;

      const result = await batchNotificationService.cancelJob(jobId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Job cancelled successfully',
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error || 'Failed to cancel job',
        });
      }
    } catch (error: any) {
      logger.error('Error in cancelJob controller', {
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /api/batch/jobs
   * Get batch job history
   */
  async getJobHistory(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await batchNotificationService.getJobHistory(limit, offset);

      if (result.success) {
        res.status(200).json({
          success: true,
          jobs: result.jobs,
          total: result.total,
          limit,
          offset,
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to fetch job history',
        });
      }
    } catch (error: any) {
      logger.error('Error in getJobHistory controller', {
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /api/batch/stats
   * Get batch notification statistics
   */
  async getBatchStats(req: Request, res: Response): Promise<void> {
    try {
      const result = await batchNotificationService.getBatchStats();

      if (result.success) {
        res.status(200).json({
          success: true,
          stats: result.stats,
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to fetch stats',
        });
      }
    } catch (error: any) {
      logger.error('Error in getBatchStats controller', {
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * POST /api/batch/cleanup
   * Clean up old batch job records
   */
  async cleanupOldJobs(req: Request, res: Response): Promise<void> {
    try {
      const daysOld = parseInt(req.body.daysOld) || 30;

      if (daysOld < 1 || daysOld > 365) {
        res.status(400).json({
          success: false,
          error: 'daysOld must be between 1 and 365',
        });
        return;
      }

      const result = await batchNotificationService.cleanupOldJobs(daysOld);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Old jobs cleaned up successfully',
          deleted: result.deleted,
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to cleanup old jobs',
        });
      }
    } catch (error: any) {
      logger.error('Error in cleanupOldJobs controller', {
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
}

export const batchController = new BatchController();
