import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import uploadService from '../../domain/services/upload.service';
import { UploadedFile } from '../../types';
import { createLogger } from '@connectsphere/shared';

const logger = createLogger('upload-controller');

export class UploadController {
  /**
   * Upload a photo
   * POST /api/media/upload
   */
  async uploadPhoto(req: AuthRequest, res: Response): Promise<Response> {
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
          error: 'No file uploaded',
        });
      }

      const userId = req.user.userId;
      const isProfilePhoto = req.body.isProfilePhoto === 'true' || req.body.isProfilePhoto === true;

      // Convert multer file to UploadedFile type
      const file: UploadedFile = {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        encoding: req.file.encoding,
        mimetype: req.file.mimetype,
        buffer: req.file.buffer,
        size: req.file.size,
      };

      const media = await uploadService.uploadPhoto(file, userId, isProfilePhoto);

      logger.info(`Photo uploaded successfully by user ${userId}`);

      return res.status(201).json({
        success: true,
        message: 'Photo uploaded successfully',
        data: media,
      });
    } catch (error: any) {
      logger.error('Photo upload failed', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Photo upload failed',
      });
    }
  }

  /**
   * Get user's photos
   * GET /api/media/photos
   */
  async getUserPhotos(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const userId = req.user.userId;
      const photos = await uploadService.getUserPhotos(userId);

      return res.status(200).json({
        success: true,
        data: photos,
      });
    } catch (error: any) {
      logger.error('Failed to retrieve photos', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve photos',
      });
    }
  }

  /**
   * Get a specific photo
   * GET /api/media/photos/:id
   */
  async getPhoto(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const photo = await uploadService.getPhoto(id);

      if (!photo) {
        return res.status(404).json({
          success: false,
          error: 'Photo not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: photo,
      });
    } catch (error: any) {
      logger.error('Failed to retrieve photo', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve photo',
      });
    }
  }

  /**
   * Delete a photo
   * DELETE /api/media/photos/:id
   */
  async deletePhoto(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const { id } = req.params;
      const photo = await uploadService.getPhoto(id);

      if (!photo) {
        return res.status(404).json({
          success: false,
          error: 'Photo not found',
        });
      }

      // Verify user owns the photo
      if (photo.userId !== req.user.userId) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
        });
      }

      const deleted = await uploadService.deletePhoto(id, photo.urls);

      if (deleted) {
        return res.status(200).json({
          success: true,
          message: 'Photo deleted successfully',
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to delete photo',
      });
    } catch (error: any) {
      logger.error('Failed to delete photo', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete photo',
      });
    }
  }

  /**
   * Set photo as profile photo
   * PUT /api/media/photos/:id/profile
   */
  async setAsProfilePhoto(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const { id } = req.params;
      const userId = req.user.userId;

      const success = await uploadService.setAsProfilePhoto(id, userId);

      if (success) {
        return res.status(200).json({
          success: true,
          message: 'Profile photo updated successfully',
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to update profile photo',
      });
    } catch (error: any) {
      logger.error('Failed to set profile photo', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to set profile photo',
      });
    }
  }
}

export default new UploadController();
