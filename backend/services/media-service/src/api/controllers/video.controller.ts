import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import videoUploadService from '../../domain/services/video-upload.service';
import { UploadedFile } from '../../types';
import { createLogger } from '@flamoral/backend-shared';

const logger = createLogger('video-controller');

export class VideoController {
  /**
   * Upload a video
   * POST /api/media/videos/upload
   */
  async uploadVideo(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No video file uploaded',
        });
      }

      const userId = req.user.userId;
      const videoType = (req.body.videoType || 'profile') as 'profile' | 'prompt';

      const file: UploadedFile = {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        encoding: req.file.encoding,
        mimetype: req.file.mimetype,
        buffer: req.file.buffer,
        size: req.file.size,
      };

      const video = await videoUploadService.uploadVideo(file, userId, videoType);

      logger.info(`Video uploaded successfully by user ${userId}`);

      return res.status(201).json({
        success: true,
        message: 'Video uploaded successfully',
        data: video,
      });
    } catch (error: any) {
      logger.error('Video upload failed', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Video upload failed',
      });
    }
  }

  /**
   * Get user's videos
   * GET /api/media/videos
   */
  async getUserVideos(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const userId = req.user.userId;
      const videos = await videoUploadService.getUserVideos(userId);

      return res.status(200).json({
        success: true,
        data: videos,
      });
    } catch (error: any) {
      logger.error('Failed to retrieve videos', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve videos',
      });
    }
  }

  /**
   * Get a specific video
   * GET /api/media/videos/:id
   */
  async getVideo(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const video = await videoUploadService.getVideo(id);

      if (!video) {
        return res.status(404).json({
          success: false,
          error: 'Video not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: video,
      });
    } catch (error: any) {
      logger.error('Failed to retrieve video', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve video',
      });
    }
  }

  /**
   * Get user's profile video
   * GET /api/media/videos/profile/:userId
   */
  async getUserProfileVideo(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { userId } = req.params;
      const video = await videoUploadService.getUserProfileVideo(userId);

      if (!video) {
        return res.status(404).json({
          success: false,
          error: 'Profile video not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: video,
      });
    } catch (error: any) {
      logger.error('Failed to retrieve profile video', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve profile video',
      });
    }
  }

  /**
   * Delete a video
   * DELETE /api/media/videos/:id
   */
  async deleteVideo(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const { id } = req.params;
      const video = await videoUploadService.getVideo(id);

      if (!video) {
        return res.status(404).json({
          success: false,
          error: 'Video not found',
        });
      }

      // Verify user owns the video
      if (video.userId !== req.user.userId) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
        });
      }

      const deleted = await videoUploadService.deleteVideo(id, video.urls);

      if (deleted) {
        return res.status(200).json({
          success: true,
          message: 'Video deleted successfully',
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to delete video',
      });
    } catch (error: any) {
      logger.error('Failed to delete video', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete video',
      });
    }
  }
}

export default new VideoController();
