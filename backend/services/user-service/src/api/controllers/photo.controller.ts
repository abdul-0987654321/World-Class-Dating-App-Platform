import { Response } from 'express';

import { PhotoService } from '../../domain/services/photo.service';
import { uploadService } from '../../infrastructure/storage/upload.service';
import logger from '../../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';

export class PhotoController {
  private photoService: PhotoService;

  constructor(photoService?: PhotoService) {
    this.photoService = photoService || new PhotoService();
  }

  async getUserPhotos(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.userId;
      const photos = await this.photoService.getUserPhotos(userId);

      return res.status(200).json({
        success: true,
        data: photos,
      });
    } catch (error: any) {
      logger.error('Get photos error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve photos',
      });
    }
  }

  async uploadPhoto(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.userId;
      const file = req.file;

      // Check if file was uploaded
      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'No photo file provided',
        });
      }

      // Upload to S3 and process image
      const uploadResult = await uploadService.uploadPhoto(file, userId);

      // Save photo to database
      const photo = await this.photoService.addPhoto(
        userId,
        uploadResult.url,
        uploadResult.thumbnailUrl,
        uploadResult.storageKey
      );

      return res.status(201).json({
        success: true,
        message: 'Photo uploaded successfully',
        data: {
          ...photo,
          mediumUrl: uploadResult.mediumUrl,
          width: uploadResult.width,
          height: uploadResult.height,
        },
      });
    } catch (error: any) {
      logger.error('Upload photo error:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to upload photo',
      });
    }
  }

  async addPhoto(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.userId;
      const { url, thumbnail_url } = req.body;

      if (!url) {
        return res.status(400).json({
          success: false,
          message: 'Photo URL is required',
        });
      }

      const photo = await this.photoService.addPhoto(userId, url, thumbnail_url);

      return res.status(201).json({
        success: true,
        message: 'Photo added successfully',
        data: photo,
      });
    } catch (error: any) {
      logger.error('Add photo error:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to add photo',
      });
    }
  }

  async deletePhoto(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.userId;
      const { photoId } = req.params;

      await this.photoService.deletePhoto(userId, photoId);

      return res.status(200).json({
        success: true,
        message: 'Photo deleted successfully',
      });
    } catch (error: any) {
      logger.error('Delete photo error:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to delete photo',
      });
    }
  }

  async setPrimaryPhoto(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.userId;
      const { photoId } = req.params;

      await this.photoService.setPrimaryPhoto(userId, photoId);

      return res.status(200).json({
        success: true,
        message: 'Primary photo updated successfully',
      });
    } catch (error: any) {
      logger.error('Set primary photo error:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to set primary photo',
      });
    }
  }

  async reorderPhotos(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user.userId;
      const { photoOrders } = req.body;

      if (!Array.isArray(photoOrders)) {
        return res.status(400).json({
          success: false,
          message: 'photoOrders must be an array',
        });
      }

      await this.photoService.reorderPhotos(userId, photoOrders);

      return res.status(200).json({
        success: true,
        message: 'Photos reordered successfully',
      });
    } catch (error: any) {
      logger.error('Reorder photos error:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to reorder photos',
      });
    }
  }
}
