import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '@flamoral/shared';
import { AuthRequest } from '../middleware/auth.middleware';
import { conversationRepository, Conversation } from '../../domain/repositories/conversation.repository';
import { messageRepository } from '../../domain/repositories/message.repository';

const logger = createLogger('conversation-controller');

export class ConversationController {
  /**
   * GET /api/conversations
   * Get all conversations for the authenticated user
   */
  async getConversations(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      logger.info(`Getting conversations for user ${userId}`);

      const conversations = await conversationRepository.findByUserId(userId);

      // Apply pagination
      const paginatedConversations = conversations.slice(offset, offset + limit);

      // Enrich conversations with unread counts and other user info
      const enrichedConversations = await Promise.all(
        paginatedConversations.map(async (conv) => {
          const otherUserId = conversationRepository.getOtherParticipant(conv, userId);
          const unreadCount = await messageRepository.getUnreadCount(conv.id, userId);

          return {
            ...conv,
            otherUserId,
            unreadCount,
          };
        })
      );

      return res.status(200).json({
        success: true,
        data: {
          conversations: enrichedConversations,
          pagination: {
            total: conversations.length,
            limit,
            offset,
            hasMore: offset + limit < conversations.length,
          },
        },
      });
    } catch (error: any) {
      logger.error('Failed to get conversations:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve conversations',
      });
    }
  }

  /**
   * GET /api/conversations/:conversationId
   * Get a specific conversation by ID
   */
  async getConversation(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { conversationId } = req.params;

      const conversation = await conversationRepository.findById(conversationId);

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found',
        });
      }

      // Verify user is a participant
      if (
        conversation.participant1Id !== userId &&
        conversation.participant2Id !== userId
      ) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to view this conversation',
        });
      }

      const otherUserId = conversationRepository.getOtherParticipant(conversation, userId);
      const unreadCount = await messageRepository.getUnreadCount(conversationId, userId);

      return res.status(200).json({
        success: true,
        data: {
          ...conversation,
          otherUserId,
          unreadCount,
        },
      });
    } catch (error: any) {
      logger.error('Failed to get conversation:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve conversation',
      });
    }
  }

  /**
   * POST /api/conversations
   * Create a new conversation between two users
   */
  async createConversation(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { participantId } = req.body;

      if (!participantId) {
        return res.status(400).json({
          success: false,
          error: 'participantId is required',
        });
      }

      if (participantId === userId) {
        return res.status(400).json({
          success: false,
          error: 'Cannot create conversation with yourself',
        });
      }

      // Check if conversation already exists
      const existingConversation = await conversationRepository.findByParticipants(
        userId,
        participantId
      );

      if (existingConversation) {
        return res.status(200).json({
          success: true,
          data: existingConversation,
          message: 'Conversation already exists',
        });
      }

      // Create new conversation
      const newConversation: Conversation = {
        id: uuidv4(),
        participant1Id: userId,
        participant2Id: participantId,
        createdAt: new Date(),
        unreadCount: {
          [userId]: 0,
          [participantId]: 0,
        },
      };

      const created = await conversationRepository.create(newConversation);

      logger.info(`Conversation created: ${created.id}`);

      return res.status(201).json({
        success: true,
        data: created,
        message: 'Conversation created successfully',
      });
    } catch (error: any) {
      logger.error('Failed to create conversation:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to create conversation',
      });
    }
  }

  /**
   * GET /api/conversations/with/:otherUserId
   * Get or create a conversation with another user
   */
  async getOrCreateConversation(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { otherUserId } = req.params;

      if (!otherUserId) {
        return res.status(400).json({
          success: false,
          error: 'otherUserId is required',
        });
      }

      if (otherUserId === userId) {
        return res.status(400).json({
          success: false,
          error: 'Cannot create conversation with yourself',
        });
      }

      // Check if conversation already exists
      let conversation = await conversationRepository.findByParticipants(userId, otherUserId);

      if (!conversation) {
        // Create new conversation
        conversation = {
          id: uuidv4(),
          participant1Id: userId,
          participant2Id: otherUserId,
          createdAt: new Date(),
          unreadCount: {
            [userId]: 0,
            [otherUserId]: 0,
          },
        };
        conversation = await conversationRepository.create(conversation);
        logger.info(`New conversation created: ${conversation.id}`);
      }

      return res.status(200).json({
        success: true,
        data: conversation,
      });
    } catch (error: any) {
      logger.error('Failed to get/create conversation:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get or create conversation',
      });
    }
  }

  /**
   * DELETE /api/conversations/:conversationId
   * Delete a conversation (soft delete for user)
   */
  async deleteConversation(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { conversationId } = req.params;

      const conversation = await conversationRepository.findById(conversationId);

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found',
        });
      }

      // Verify user is a participant
      if (
        conversation.participant1Id !== userId &&
        conversation.participant2Id !== userId
      ) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to delete this conversation',
        });
      }

      // For now, we do a hard delete
      // In production, you might want soft delete per user
      await conversationRepository.delete(conversationId);

      logger.info(`Conversation ${conversationId} deleted by user ${userId}`);

      return res.status(200).json({
        success: true,
        message: 'Conversation deleted successfully',
      });
    } catch (error: any) {
      logger.error('Failed to delete conversation:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete conversation',
      });
    }
  }

  /**
   * PUT /api/conversations/:conversationId/read
   * Mark all messages in conversation as read
   */
  async markAsRead(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { conversationId } = req.params;

      const conversation = await conversationRepository.findById(conversationId);

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found',
        });
      }

      // Verify user is a participant
      if (
        conversation.participant1Id !== userId &&
        conversation.participant2Id !== userId
      ) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to access this conversation',
        });
      }

      // Mark messages as read
      await messageRepository.markConversationAsRead(conversationId, userId, new Date());

      // Reset unread count
      await conversationRepository.resetUnreadCount(conversationId, userId);

      logger.info(`Conversation ${conversationId} marked as read by user ${userId}`);

      return res.status(200).json({
        success: true,
        message: 'Conversation marked as read',
      });
    } catch (error: any) {
      logger.error('Failed to mark conversation as read:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to mark conversation as read',
      });
    }
  }
}

export const conversationController = new ConversationController();
export default conversationController;
