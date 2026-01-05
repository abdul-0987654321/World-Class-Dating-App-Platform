import { createLogger } from '@flamoral/backend-shared';
import { Request, Response } from 'express';

import superLikeService from '../../domain/services/super-like.service';

const logger = createLogger('super-like-controller');

export class SuperLikeController {
  /**
   * Send Super Like with optional message
   * POST /api/super-likes
   */
  async sendSuperLike(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const { targetUserId, message } = req.body;

      if (!targetUserId) {
        res.status(400).json({
          success: false,
          error: 'Target user ID is required',
        });
        return;
      }

      const result = await superLikeService.sendSuperLike({
        userId,
        targetUserId,
        message,
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      logger.error('Failed to send Super Like', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send Super Like',
      });
    }
  }

  /**
   * Get Super Like quota
   * GET /api/super-likes/quota
   */
  async getQuota(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;

      const quota = await superLikeService.getSuperLikeQuota(userId);

      res.status(200).json({
        success: true,
        data: quota,
      });
    } catch (error) {
      logger.error('Failed to get quota', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve quota',
      });
    }
  }

  /**
   * Get received Super Likes
   * GET /api/super-likes/received
   */
  async getReceived(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const unreadOnly = req.query.unreadOnly === 'true';

      const superLikes = await superLikeService.getReceivedSuperLikes(userId, {
        limit,
        offset,
        unreadOnly,
      });

      res.status(200).json({
        success: true,
        data: superLikes,
      });
    } catch (error) {
      logger.error('Failed to get received Super Likes', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve Super Likes',
      });
    }
  }

  /**
   * Get sent Super Likes
   * GET /api/super-likes/sent
   */
  async getSent(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const superLikes = await superLikeService.getSentSuperLikes(userId, {
        limit,
        offset,
      });

      res.status(200).json({
        success: true,
        data: superLikes,
      });
    } catch (error) {
      logger.error('Failed to get sent Super Likes', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve Super Likes',
      });
    }
  }

  /**
   * Get Super Like message
   * GET /api/super-likes/messages/:messageId
   */
  async getMessage(req: Request, res: Response): Promise<void> {
    try {
      const { messageId } = req.params;

      const message = await superLikeService.getSuperLikeMessage(messageId);

      if (message) {
        res.status(200).json({
          success: true,
          data: message,
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Message not found',
        });
      }
    } catch (error) {
      logger.error('Failed to get message', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve message',
      });
    }
  }

  /**
   * Mark message as read
   * POST /api/super-likes/messages/:messageId/read
   */
  async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const { messageId } = req.params;

      const success = await superLikeService.markMessageAsRead(messageId, userId);

      if (success) {
        res.status(200).json({
          success: true,
          message: 'Message marked as read',
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Failed to mark as read',
        });
      }
    } catch (error) {
      logger.error('Failed to mark as read', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark as read',
      });
    }
  }

  /**
   * Get unread count
   * GET /api/super-likes/unread-count
   */
  async getUnreadCount(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;

      const count = await superLikeService.getUnreadCount(userId);

      res.status(200).json({
        success: true,
        data: { count },
      });
    } catch (error) {
      logger.error('Failed to get unread count', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve count',
      });
    }
  }

  /**
   * Get Super Like stats
   * GET /api/super-likes/stats
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;

      const stats = await superLikeService.getSuperLikeStats(userId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Failed to get stats', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve stats',
      });
    }
  }

  /**
   * Delete Super Like message (within 5 minutes)
   * DELETE /api/super-likes/messages/:messageId
   */
  async deleteMessage(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const { messageId } = req.params;

      const deleted = await superLikeService.deleteSuperLikeMessage(messageId, userId);

      if (deleted) {
        res.status(200).json({
          success: true,
          message: 'Message deleted',
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Failed to delete message',
        });
      }
    } catch (error: any) {
      logger.error('Failed to delete message', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to delete message',
      });
    }
  }
}

export default new SuperLikeController();
