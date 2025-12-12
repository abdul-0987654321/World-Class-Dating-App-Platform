import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';
import { messageRepository } from '../../domain/repositories/message.repository';
import { conversationRepository } from '../../domain/repositories/conversation.repository';
import { enhancedReactionsService } from '../../services/enhanced-reactions.service';
import { pinnedMessagesService } from '../../services/pinned-messages.service';
import { messageSearchService } from '../../services/message-search.service';
import { gifIntegrationService } from '../../services/gif-integration.service';
import { voiceMessageService } from '../../services/voice-message.service';
import { photoSharingService } from '../../services/photo-sharing.service';
import { chatExportService } from '../../services/chat-export.service';
import { icebreakerService } from '../../services/icebreaker.service';
import { realtimeHttpClient } from '../../infrastructure/clients/realtime-http.client';
import { Message, MessageType, MessageStatus } from '../../types';

const logger = createLogger('enhanced-messaging-controller');

export class EnhancedMessagingController {
  /**
   * POST /api/messages/:messageId/reactions
   * Add or update reaction to a message
   */
  async addReaction(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { messageId } = req.params;
      const { conversationId, emoji } = req.body;

      if (!conversationId || !emoji) {
        return res.status(400).json({
          success: false,
          error: 'conversationId and emoji are required',
        });
      }

      const reaction = await enhancedReactionsService.addReaction(
        messageId,
        conversationId,
        userId,
        emoji
      );

      return res.status(200).json({
        success: true,
        data: reaction,
        message: 'Reaction added successfully',
      });
    } catch (error: any) {
      logger.error('Failed to add reaction:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to add reaction',
      });
    }
  }

  /**
   * DELETE /api/messages/:messageId/reactions
   * Remove reaction from a message
   */
  async removeReaction(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { messageId } = req.params;
      const { conversationId } = req.body;

      if (!conversationId) {
        return res.status(400).json({
          success: false,
          error: 'conversationId is required',
        });
      }

      await enhancedReactionsService.removeReaction(messageId, conversationId, userId);

      return res.status(200).json({
        success: true,
        message: 'Reaction removed successfully',
      });
    } catch (error: any) {
      logger.error('Failed to remove reaction:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to remove reaction',
      });
    }
  }

  /**
   * GET /api/messages/:messageId/reactions
   * Get reaction summary for a message
   */
  async getReactions(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { messageId } = req.params;
      const { conversationId } = req.query;

      if (!conversationId) {
        return res.status(400).json({
          success: false,
          error: 'conversationId query parameter is required',
        });
      }

      const summary = await enhancedReactionsService.getReactionSummary(
        messageId,
        conversationId as string,
        userId
      );

      return res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error: any) {
      logger.error('Failed to get reactions:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get reactions',
      });
    }
  }

  /**
   * POST /api/conversations/:conversationId/messages/:messageId/pin
   * Pin a message in conversation
   */
  async pinMessage(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { conversationId, messageId } = req.params;

      const pinnedMessage = await pinnedMessagesService.pinMessage(
        messageId,
        conversationId,
        userId
      );

      return res.status(200).json({
        success: true,
        data: pinnedMessage,
        message: 'Message pinned successfully',
      });
    } catch (error: any) {
      logger.error('Failed to pin message:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to pin message',
      });
    }
  }

  /**
   * DELETE /api/conversations/:conversationId/messages/:messageId/pin
   * Unpin a message
   */
  async unpinMessage(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { conversationId, messageId } = req.params;

      await pinnedMessagesService.unpinMessage(messageId, conversationId, userId);

      return res.status(200).json({
        success: true,
        message: 'Message unpinned successfully',
      });
    } catch (error: any) {
      logger.error('Failed to unpin message:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to unpin message',
      });
    }
  }

  /**
   * GET /api/conversations/:conversationId/pinned
   * Get all pinned messages in a conversation
   */
  async getPinnedMessages(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { conversationId } = req.params;

      const pinnedMessages = await pinnedMessagesService.getPinnedMessages(conversationId);

      return res.status(200).json({
        success: true,
        data: pinnedMessages,
      });
    } catch (error: any) {
      logger.error('Failed to get pinned messages:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get pinned messages',
      });
    }
  }

  /**
   * POST /api/messages/search
   * Search messages
   */
  async searchMessages(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const {
        conversationId,
        query,
        type,
        startDate,
        endDate,
        limit,
        offset,
      } = req.body;

      const results = await messageSearchService.searchMessages({
        conversationId,
        userId,
        query,
        type,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        limit,
        offset,
      });

      return res.status(200).json({
        success: true,
        data: {
          results,
          count: results.length,
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
   * GET /api/conversations/:conversationId/media
   * Get shared media in conversation
   */
  async getSharedMedia(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { conversationId } = req.params;
      const { type = 'image', limit = 50, offset = 0 } = req.query;

      const media = await messageSearchService.getSharedMedia(
        conversationId,
        userId,
        type as any,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      return res.status(200).json({
        success: true,
        data: {
          media,
          count: media.length,
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
   * GET /api/gifs/search
   * Search GIFs
   */
  async searchGifs(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { query, limit = 20 } = req.query;

      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'query parameter is required',
        });
      }

      const gifs = await gifIntegrationService.searchGifs(
        query as string,
        parseInt(limit as string)
      );

      return res.status(200).json({
        success: true,
        data: gifs,
      });
    } catch (error: any) {
      logger.error('Failed to search GIFs:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to search GIFs',
      });
    }
  }

  /**
   * GET /api/gifs/trending
   * Get trending GIFs
   */
  async getTrendingGifs(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { limit = 20 } = req.query;

      const gifs = await gifIntegrationService.getTrendingGifs(
        parseInt(limit as string)
      );

      return res.status(200).json({
        success: true,
        data: gifs,
      });
    } catch (error: any) {
      logger.error('Failed to get trending GIFs:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get trending GIFs',
      });
    }
  }

  /**
   * GET /api/gifs/categories
   * Get GIF categories
   */
  async getGifCategories(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const categories = gifIntegrationService.getGifCategories();

      return res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (error: any) {
      logger.error('Failed to get GIF categories:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get GIF categories',
      });
    }
  }

  /**
   * POST /api/conversations/:conversationId/export
   * Export chat conversation
   */
  async exportChat(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { conversationId } = req.params;
      const { format = 'json', startDate, endDate, includeMedia = false } = req.body;

      const result = await chatExportService.exportChat({
        conversationId,
        userId,
        format,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        includeMedia,
      });

      return res.status(200).json({
        success: true,
        data: result,
        message: 'Chat export created successfully',
      });
    } catch (error: any) {
      logger.error('Failed to export chat:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to export chat',
      });
    }
  }

  /**
   * GET /api/icebreakers/suggestions
   * Get icebreaker suggestions
   */
  async getIcebreakerSuggestions(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { otherUserId, count = 5 } = req.query;

      if (!otherUserId) {
        return res.status(400).json({
          success: false,
          error: 'otherUserId query parameter is required',
        });
      }

      const suggestions = await icebreakerService.getSuggestions(
        userId,
        otherUserId as string,
        parseInt(count as string)
      );

      return res.status(200).json({
        success: true,
        data: suggestions,
      });
    } catch (error: any) {
      logger.error('Failed to get icebreaker suggestions:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get icebreaker suggestions',
      });
    }
  }

  /**
   * GET /api/icebreakers/categories
   * Get icebreaker categories
   */
  async getIcebreakerCategories(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const categories = icebreakerService.getCategories();

      return res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (error: any) {
      logger.error('Failed to get icebreaker categories:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get icebreaker categories',
      });
    }
  }

  /**
   * GET /api/icebreakers/random
   * Get random icebreaker
   */
  async getRandomIcebreaker(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const icebreaker = await icebreakerService.getRandom();

      return res.status(200).json({
        success: true,
        data: icebreaker,
      });
    } catch (error: any) {
      logger.error('Failed to get random icebreaker:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get random icebreaker',
      });
    }
  }

  /**
   * POST /api/icebreakers/:icebreakerId/track
   * Track icebreaker usage
   */
  async trackIcebreakerUsage(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { icebreakerId } = req.params;

      await icebreakerService.trackUsage(icebreakerId, userId);

      return res.status(200).json({
        success: true,
        message: 'Icebreaker usage tracked',
      });
    } catch (error: any) {
      logger.error('Failed to track icebreaker usage:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to track icebreaker usage',
      });
    }
  }
}

export const enhancedMessagingController = new EnhancedMessagingController();
export default enhancedMessagingController;
