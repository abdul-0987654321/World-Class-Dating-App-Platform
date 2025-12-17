import { Response } from 'express';
import { createLogger } from '../../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';
import { messageSearchService } from '../../services/message-search.service';
import { conversationRepository } from '../../domain/repositories/conversation.repository';
import { MessageType } from '../../types';

const logger = createLogger('message-search-controller');

export class MessageSearchController {
  /**
   * POST /api/search/messages
   * Search messages across all conversations or within a specific conversation
   */
  async searchMessages(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const {
        query,
        conversationId,
        type,
        startDate,
        endDate,
        limit,
        offset,
      } = req.body;

      if (!query && !type && !startDate && !endDate) {
        return res.status(400).json({
          success: false,
          error: 'At least one search parameter is required (query, type, startDate, or endDate)',
        });
      }

      // If conversationId is provided, verify user has access
      if (conversationId) {
        const conversation = await conversationRepository.findById(conversationId);

        if (!conversation) {
          return res.status(404).json({
            success: false,
            error: 'Conversation not found',
          });
        }

        if (
          conversation.participant1Id !== userId &&
          conversation.participant2Id !== userId
        ) {
          return res.status(403).json({
            success: false,
            error: 'Not authorized to search this conversation',
          });
        }
      }

      const results = await messageSearchService.searchMessages({
        userId,
        conversationId,
        query,
        type,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        limit: limit || 50,
        offset: offset || 0,
      });

      logger.info(`Message search completed for user ${userId}: ${results.length} results`);

      return res.status(200).json({
        success: true,
        data: {
          results,
          count: results.length,
          query,
          conversationId,
        },
      });
    } catch (error: any) {
      logger.error('Failed to search messages:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to search messages',
      });
    }
  }

  /**
   * GET /api/search/conversations/:conversationId/messages
   * Search within a specific conversation
   */
  async searchInConversation(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { conversationId } = req.params;
      const query = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      if (!query || !query.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Search query (q) is required',
        });
      }

      // Verify conversation access
      const conversation = await conversationRepository.findById(conversationId);

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found',
        });
      }

      if (
        conversation.participant1Id !== userId &&
        conversation.participant2Id !== userId
      ) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to search this conversation',
        });
      }

      const results = await messageSearchService.searchInConversation(
        conversationId,
        userId,
        query,
        limit,
        offset
      );

      logger.info(
        `Conversation search completed: ${results.length} results for conversation ${conversationId}`
      );

      return res.status(200).json({
        success: true,
        data: {
          results,
          count: results.length,
          conversationId,
          query,
        },
      });
    } catch (error: any) {
      logger.error('Failed to search in conversation:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to search in conversation',
      });
    }
  }

  /**
   * GET /api/search/conversations/:conversationId/media
   * Get shared media in a conversation
   */
  async getSharedMedia(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { conversationId } = req.params;
      const mediaType = req.query.type as 'image' | 'video' | 'gif' | 'voice' | 'file';
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      if (!mediaType) {
        return res.status(400).json({
          success: false,
          error: 'Media type is required (image, video, gif, voice, file)',
        });
      }

      // Verify conversation access
      const conversation = await conversationRepository.findById(conversationId);

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found',
        });
      }

      if (
        conversation.participant1Id !== userId &&
        conversation.participant2Id !== userId
      ) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to access this conversation',
        });
      }

      const media = await messageSearchService.getSharedMedia(
        conversationId,
        userId,
        mediaType,
        limit,
        offset
      );

      logger.info(
        `Shared media retrieved: ${media.length} ${mediaType} items for conversation ${conversationId}`
      );

      return res.status(200).json({
        success: true,
        data: {
          media,
          count: media.length,
          conversationId,
          mediaType,
          pagination: {
            limit,
            offset,
            hasMore: media.length === limit,
          },
        },
      });
    } catch (error: any) {
      logger.error('Failed to get shared media:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get shared media',
      });
    }
  }

  /**
   * GET /api/search/messages/by-type
   * Search messages by type across all conversations
   */
  async searchByType(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const type = req.query.type as MessageType;
      const conversationId = req.query.conversationId as string | undefined;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      if (!type) {
        return res.status(400).json({
          success: false,
          error: 'Message type is required',
        });
      }

      // Verify conversationId if provided
      if (conversationId) {
        const conversation = await conversationRepository.findById(conversationId);

        if (!conversation) {
          return res.status(404).json({
            success: false,
            error: 'Conversation not found',
          });
        }

        if (
          conversation.participant1Id !== userId &&
          conversation.participant2Id !== userId
        ) {
          return res.status(403).json({
            success: false,
            error: 'Not authorized to access this conversation',
          });
        }
      }

      const results = await messageSearchService.searchByType(
        userId,
        type,
        conversationId,
        limit,
        offset
      );

      logger.info(`Type search completed: ${results.length} ${type} messages found`);

      return res.status(200).json({
        success: true,
        data: {
          results,
          count: results.length,
          type,
          conversationId,
          pagination: {
            limit,
            offset,
            hasMore: results.length === limit,
          },
        },
      });
    } catch (error: any) {
      logger.error('Failed to search by type:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to search by type',
      });
    }
  }
}

export const messageSearchController = new MessageSearchController();
export default messageSearchController;
