import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '@flamoral/shared';
import { AuthRequest } from '../middleware/auth.middleware';
import { messageRepository } from '../../domain/repositories/message.repository';
import { conversationRepository } from '../../domain/repositories/conversation.repository';
import { messageEventsService } from '../../domain/services/message-events.service';
import { realtimeHttpClient } from '../../infrastructure/clients/realtime-http.client';
import { matchingServiceClient } from '../../infrastructure/clients/matching-service.client';
import { Message, MessageType, MessageStatus } from '../../types';

const logger = createLogger('message-controller');

export class MessageController {
  /**
   * GET /api/conversations/:conversationId/messages
   * Get messages for a conversation with pagination
   */
  async getMessages(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { conversationId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

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
          error: 'Not authorized to view this conversation',
        });
      }

      const messages = await messageRepository.getMessagesByConversation(
        conversationId,
        limit,
        offset
      );

      // Filter out messages deleted for this user
      const filteredMessages = messages.filter(
        (msg) => !msg.deletedFor?.includes(userId)
      );

      return res.status(200).json({
        success: true,
        data: {
          messages: filteredMessages,
          pagination: {
            limit,
            offset,
            hasMore: messages.length === limit,
          },
        },
      });
    } catch (error: any) {
      logger.error('Failed to get messages:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve messages',
      });
    }
  }

  /**
   * POST /api/messages
   * Send a new message
   */
  async sendMessage(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { conversationId, receiverId, content, type, metadata, replyTo } = req.body;

      // Validate required fields
      if (!receiverId || !content) {
        return res.status(400).json({
          success: false,
          error: 'receiverId and content are required',
        });
      }

      // Get or create conversation
      let conversation;
      let matchInfo = null;

      if (conversationId) {
        conversation = await conversationRepository.findById(conversationId);
        if (!conversation) {
          return res.status(404).json({
            success: false,
            error: 'Conversation not found',
          });
        }
      } else {
        // Find existing or create new conversation
        conversation = await conversationRepository.findByParticipants(userId, receiverId);

        if (!conversation) {
          // Get match information to check women-first rule
          matchInfo = await matchingServiceClient.findMatchByUsers(userId, receiverId);

          conversation = await conversationRepository.create({
            id: uuidv4(),
            participant1Id: userId,
            participant2Id: receiverId,
            createdAt: new Date(),
            unreadCount: {
              [userId]: 0,
              [receiverId]: 0,
            },
            requiresWomenFirst: matchInfo?.requiresWomenFirst || false,
            womanUserId: matchInfo?.womanUserId,
            conversationInitiated: false,
          });
        }
      }

      // Verify user is a participant
      if (
        conversation.participant1Id !== userId &&
        conversation.participant2Id !== userId
      ) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to send messages in this conversation',
        });
      }

      // WOMEN-FIRST MESSAGING VALIDATION
      // Check if this is the first message and women-first rule applies
      if (!conversation.conversationInitiated && conversation.requiresWomenFirst) {
        // Only the woman can send the first message
        if (userId !== conversation.womanUserId) {
          return res.status(403).json({
            success: false,
            error: 'In heterosexual matches, only women can send the first message. Please wait for her to message you first.',
            code: 'WOMEN_FIRST_MESSAGING_REQUIRED',
            data: {
              requiresWomenFirst: true,
              waitingFor: conversation.womanUserId,
            },
          });
        }
      }

      // Create message
      const message: Message = {
        id: uuidv4(),
        conversationId: conversation.id,
        senderId: userId,
        receiverId,
        content,
        type: type || MessageType.TEXT,
        status: MessageStatus.SENT,
        sentAt: new Date(),
        metadata,
        replyTo,
      };

      const createdMessage = await messageRepository.create(message);

      // Update conversation with last message info
      const preview = content.length > 50 ? content.substring(0, 47) + '...' : content;
      await conversationRepository.updateLastMessage(
        conversation.id,
        new Date(),
        preview
      );

      // If this is the first message, mark conversation as initiated
      if (!conversation.conversationInitiated) {
        await conversationRepository.update(conversation.id, {
          conversationInitiated: true,
          firstMessageSentBy: userId,
        });

        // Update the match status in matching service
        if (matchInfo) {
          await matchingServiceClient.updateMatchConversationStatus(
            matchInfo.id,
            true,
            userId
          );
        }
      }

      // Increment unread count for receiver
      await conversationRepository.incrementUnreadCount(conversation.id, receiverId);

      // Publish to realtime service via HTTP (synchronous) and Redis (async)
      await Promise.all([
        // HTTP call for immediate WebSocket delivery
        realtimeHttpClient.publishMessage({
          conversationId: conversation.id,
          messageId: createdMessage.id,
          senderId: userId,
          receiverId,
          content,
          type: type || MessageType.TEXT,
          metadata,
        }),
        // Redis pub/sub for event propagation
        messageEventsService.publishNewMessage(createdMessage),
      ]);

      logger.info(`Message sent: ${createdMessage.id} in conversation ${conversation.id}`);

      return res.status(201).json({
        success: true,
        data: createdMessage,
        message: 'Message sent successfully',
      });
    } catch (error: any) {
      logger.error('Failed to send message:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to send message',
      });
    }
  }

  /**
   * GET /api/messages/:messageId
   * Get a specific message by ID
   */
  async getMessage(req: AuthRequest, res: Response): Promise<Response> {
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

      // Verify conversation access
      const conversation = await conversationRepository.findById(conversationId as string);

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
          error: 'Not authorized to view this message',
        });
      }

      const message = await messageRepository.findById(messageId, conversationId as string);

      if (!message) {
        return res.status(404).json({
          success: false,
          error: 'Message not found',
        });
      }

      // Check if message was deleted for this user
      if (message.deletedFor?.includes(userId)) {
        return res.status(404).json({
          success: false,
          error: 'Message not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: message,
      });
    } catch (error: any) {
      logger.error('Failed to get message:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve message',
      });
    }
  }

  /**
   * PUT /api/messages/:messageId
   * Update a message (edit content)
   */
  async updateMessage(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { messageId } = req.params;
      const { conversationId, content } = req.body;

      if (!conversationId) {
        return res.status(400).json({
          success: false,
          error: 'conversationId is required',
        });
      }

      const message = await messageRepository.findById(messageId, conversationId);

      if (!message) {
        return res.status(404).json({
          success: false,
          error: 'Message not found',
        });
      }

      // Only sender can edit their message
      if (message.senderId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Only the sender can edit this message',
        });
      }

      // Update message
      const updates: Partial<Message> = {};
      if (content) {
        updates.content = content;
      }

      const updatedMessage = await messageRepository.update(messageId, conversationId, updates);

      logger.info(`Message updated: ${messageId}`);

      return res.status(200).json({
        success: true,
        data: updatedMessage,
        message: 'Message updated successfully',
      });
    } catch (error: any) {
      logger.error('Failed to update message:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to update message',
      });
    }
  }

  /**
   * DELETE /api/messages/:messageId
   * Delete a message (soft delete for user or hard delete if sender deletes for all)
   */
  async deleteMessage(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { messageId } = req.params;
      const { conversationId, deleteForAll } = req.body;

      if (!conversationId) {
        return res.status(400).json({
          success: false,
          error: 'conversationId is required',
        });
      }

      const message = await messageRepository.findById(messageId, conversationId);

      if (!message) {
        return res.status(404).json({
          success: false,
          error: 'Message not found',
        });
      }

      // Verify user is sender or receiver
      if (message.senderId !== userId && message.receiverId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to delete this message',
        });
      }

      if (deleteForAll && message.senderId === userId) {
        // Hard delete - only sender can delete for all
        await messageRepository.delete(messageId, conversationId);
        logger.info(`Message ${messageId} hard deleted by sender ${userId}`);
      } else {
        // Soft delete - mark as deleted for this user only
        await messageRepository.markAsDeleted(messageId, conversationId, userId);
        logger.info(`Message ${messageId} soft deleted for user ${userId}`);
      }

      return res.status(200).json({
        success: true,
        message: 'Message deleted successfully',
      });
    } catch (error: any) {
      logger.error('Failed to delete message:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete message',
      });
    }
  }

  /**
   * PUT /api/messages/:messageId/status
   * Update message status (delivered, read)
   */
  async updateMessageStatus(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { messageId } = req.params;
      const { conversationId, status } = req.body;

      if (!conversationId || !status) {
        return res.status(400).json({
          success: false,
          error: 'conversationId and status are required',
        });
      }

      const validStatuses = [MessageStatus.DELIVERED, MessageStatus.READ];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status. Must be "delivered" or "read"',
        });
      }

      const message = await messageRepository.findById(messageId, conversationId);

      if (!message) {
        return res.status(404).json({
          success: false,
          error: 'Message not found',
        });
      }

      // Only receiver can update status
      if (message.receiverId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Only the receiver can update message status',
        });
      }

      const updates: Partial<Message> = { status };
      if (status === MessageStatus.DELIVERED) {
        updates.deliveredAt = new Date();
      } else if (status === MessageStatus.READ) {
        updates.readAt = new Date();
      }

      const updatedMessage = await messageRepository.update(messageId, conversationId, updates);

      logger.info(`Message ${messageId} status updated to ${status}`);

      return res.status(200).json({
        success: true,
        data: updatedMessage,
        message: 'Message status updated',
      });
    } catch (error: any) {
      logger.error('Failed to update message status:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to update message status',
      });
    }
  }

  /**
   * GET /api/messages/unread-count
   * Get total unread message count for user
   */
  async getUnreadCount(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;

      // Get all conversations for user
      const conversations = await conversationRepository.findByUserId(userId);

      // Sum up unread counts
      let totalUnread = 0;
      for (const conv of conversations) {
        const unreadCount = await messageRepository.getUnreadCount(conv.id, userId);
        totalUnread += unreadCount;
      }

      return res.status(200).json({
        success: true,
        data: {
          unreadCount: totalUnread,
        },
      });
    } catch (error: any) {
      logger.error('Failed to get unread count:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get unread count',
      });
    }
  }
}

export const messageController = new MessageController();
export default messageController;
