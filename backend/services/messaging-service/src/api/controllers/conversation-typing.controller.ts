import { Response } from 'express';
import { createLogger } from '../../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';
import { conversationRepository } from '../../domain/repositories/conversation.repository';
import { messageEventsService } from '../../domain/services/message-events.service';
import { realtimeHttpClient } from '../../infrastructure/clients/realtime-http.client';
import { typingIndicatorService } from '../../services/typing-indicator.service';

const logger = createLogger('conversation-typing-controller');

/**
 * Controller for handling typing indicators in conversations
 */
export class ConversationTypingController {
  /**
   * POST /api/conversations/:conversationId/typing
   * Send typing indicator (start/stop)
   */
  async sendTypingIndicator(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { conversationId } = req.params;
      const { isTyping } = req.body;

      if (typeof isTyping !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'isTyping must be a boolean',
        });
      }

      // Verify conversation exists and user is participant
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

      // Get the other participant
      const targetUserId = conversationRepository.getOtherParticipant(conversation, userId);

      // Update typing state in Redis (for persistence and cross-instance coordination)
      if (isTyping) {
        await typingIndicatorService.startTyping(conversationId, userId);
      } else {
        await typingIndicatorService.stopTyping(conversationId, userId);
      }

      // Publish typing event to both HTTP and Redis for real-time delivery
      await Promise.all([
        // HTTP call for immediate WebSocket delivery
        realtimeHttpClient.publishTypingIndicator({
          conversationId,
          userId,
          targetUserId,
          isTyping,
        }),
        // Redis pub/sub for event propagation
        isTyping
          ? messageEventsService.publishTypingStart(conversationId, userId, targetUserId)
          : messageEventsService.publishTypingStop(conversationId, userId, targetUserId),
      ]);

      logger.debug(
        `Typing ${isTyping ? 'start' : 'stop'} indicator sent for conversation ${conversationId}`
      );

      return res.status(200).json({
        success: true,
        message: 'Typing indicator sent',
      });
    } catch (error: any) {
      logger.error('Failed to send typing indicator:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to send typing indicator',
      });
    }
  }

  /**
   * GET /api/conversations/:conversationId/typing
   * Get current typing users in a conversation
   */
  async getTypingUsers(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { conversationId } = req.params;

      // Verify conversation exists and user is participant
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

      // Get typing users from Redis
      const typingUserIds = await typingIndicatorService.getTypingUsers(conversationId);

      // Filter out the requesting user
      const otherTypingUsers = typingUserIds.filter((id) => id !== userId);

      return res.status(200).json({
        success: true,
        data: {
          typingUsers: otherTypingUsers,
          count: otherTypingUsers.length,
        },
      });
    } catch (error: any) {
      logger.error('Failed to get typing users:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get typing users',
      });
    }
  }
}

export const conversationTypingController = new ConversationTypingController();
export default conversationTypingController;
