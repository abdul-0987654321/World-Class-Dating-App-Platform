import { Response } from 'express';

import { BlockService } from '../../domain/services/block.service';
import logger from '../../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';

export class BlockController {
  private blockService: BlockService;

  constructor(blockService?: BlockService) {
    this.blockService = blockService || new BlockService();
  }

  async blockUser(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const blockerId = req.user?.userId;
      const { blockedId } = req.params;
      const { reason } = req.body;

      if (!blockerId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const block = await this.blockService.blockUser(blockerId, blockedId, reason);

      return res.status(201).json({
        success: true,
        message: 'User blocked successfully',
        data: block,
      });
    } catch (error: any) {
      logger.error('Block user error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to block user',
      });
    }
  }

  async unblockUser(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const blockerId = req.user?.userId;
      const { blockedId } = req.params;

      if (!blockerId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      await this.blockService.unblockUser(blockerId, blockedId);

      return res.status(200).json({
        success: true,
        message: 'User unblocked successfully',
      });
    } catch (error: any) {
      logger.error('Unblock user error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to unblock user',
      });
    }
  }

  async getBlockedUsers(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const blockedUsers = await this.blockService.getBlockedUsers(userId);

      return res.status(200).json({
        success: true,
        data: blockedUsers,
      });
    } catch (error: any) {
      logger.error('Get blocked users error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get blocked users',
      });
    }
  }

  async checkBlocked(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      const { targetUserId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const result = await this.blockService.canInteract(userId, targetUserId);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Check blocked error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to check block status',
      });
    }
  }
}

export default new BlockController();
