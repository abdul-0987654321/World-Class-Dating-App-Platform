import { Response } from 'express';
import { createLogger } from '@flamoral/shared';
import { AuthRequest } from '../middleware/auth.middleware';
import { messageRepository } from '../../domain/repositories/message.repository';
import { conversationRepository } from '../../domain/repositories/conversation.repository';
import { messageEventsService } from '../../domain/services/message-events.service';
import { realtimeHttpClient } from '../../infrastructure/clients/realtime-http.client';
import { MessageStatus } from '../../types';

const logger = createLogger('read-receipt-controller');

export class ReadReceiptController {
  /**
   * POST /api/conversations/:conversationId/read
   * Mark messages in a conversation as read
   */
  async markConversationAsRead(req: AuthRequest, res: Response): Promise<Response> {
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

      // Get other participant ID (the sender)
      const otherParticipantId =
        conversation.participant1Id === userId
          ? conversation.participant2Id
          : conversation.participant1Id;

      // Get all unread messages in the conversation sent by the other user
      const unreadMessages = await messageRepository.getUnreadMessages(
        conversationId,
        userId
      );

      if (unreadMessages.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'No unread messages',
          data: {
            conversationId,
            markedAsRead: 0,
          },
        });
      }

      // Mark messages as read
      const messageIds = unreadMessages.map((msg) => msg.id);
      const readAt = new Date();

      await Promise.all(
        unreadMessages.map((msg) =>
          messageRepository.update(msg.id, conversationId, {
            status: MessageStatus.READ,
            readAt,
          })
        )
      );

      // Reset unread count for this user
      await conversationRepository.resetUnreadCount(conversationId, userId);

      // Publish read receipts to realtime service
      await Promise.all([
        // HTTP call for immediate WebSocket delivery
        realtimeHttpClient.publishReadReceipt({
          conversationId,
          messageIds,
          readBy: userId,
          senderId: otherParticipantId,
        }),
        // Redis pub/sub for event propagation
        messageEventsService.publishMessageRead(
          conversationId,
          messageIds,
          userId,
          [otherParticipantId]
        ),
      ]);

      logger.info(
        `Marked ${messageIds.length} messages as read in conversation ${conversationId}`
      );

      return res.status(200).json({
        success: true,
        message: 'Messages marked as read',
        data: {
          conversationId,
          markedAsRead: messageIds.length,
          messageIds,
        },
      });
    } catch (error: any) {
      logger.error('Failed to mark conversation as read:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to mark messages as read',
      });
    }
  }

  /**
   * POST /api/messages/:messageId/read
   * Mark a specific message as read
   */
  async markMessageAsRead(req: AuthRequest, res: Response): Promise<Response> {
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

      const message = await messageRepository.findById(messageId, conversationId);

      if (!message) {
        return res.status(404).json({
          success: false,
          error: 'Message not found',
        });
      }

      // Only receiver can mark message as read
      if (message.receiverId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Only the receiver can mark this message as read',
        });
      }

      // Update message status
      const readAt = new Date();
      const updatedMessage = await messageRepository.update(messageId, conversationId, {
        status: MessageStatus.READ,
        readAt,
      });

      // Decrement unread count
      await conversationRepository.decrementUnreadCount(conversationId, userId);

      // Publish read receipt to realtime service
      await Promise.all([
        // HTTP call for immediate WebSocket delivery
        realtimeHttpClient.publishReadReceipt({
          conversationId,
          messageIds: [messageId],
          readBy: userId,
          senderId: message.senderId,
        }),
        // Redis pub/sub for event propagation
        messageEventsService.publishMessageRead(
          conversationId,
          [messageId],
          userId,
          [message.senderId]
        ),
      ]);

      logger.info(`Message ${messageId} marked as read`);

      return res.status(200).json({
        success: true,
        data: updatedMessage,
        message: 'Message marked as read',
      });
    } catch (error: any) {
      logger.error('Failed to mark message as read:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to mark message as read',
      });
    }
  }
}

export const readReceiptController = new ReadReceiptController();
export default readReceiptController;
