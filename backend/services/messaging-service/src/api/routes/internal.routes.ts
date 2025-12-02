import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticateService } from '../middleware/service-auth.middleware';
import { messageRepository } from '../../domain/repositories/message.repository';
import { conversationRepository } from '../../domain/repositories/conversation.repository';
import { messageEventsService } from '../../domain/services/message-events.service';
import { redisClient } from '../../infrastructure/cache/redis';
import { Message, MessageType, MessageStatus } from '../../types';

const router = Router();

// All internal routes require service authentication
router.use(authenticateService);

/**
 * Internal endpoint: Send a system message
 * POST /api/internal/messages/send-system
 *
 * Request body:
 * {
 *   conversationId: string;
 *   userId: string;
 *   content: string;
 *   type: 'system' | 'notification';
 * }
 */
router.post('/send-system', async (req: Request, res: Response) => {
  try {
    const { conversationId, userId, content, type = 'system' } = req.body;

    // Validate required fields
    if (!conversationId || !userId || !content) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        code: 'MISSING_REQUIRED_FIELDS',
        message: 'conversationId, userId, and content are required',
      });
    }

    // Verify conversation exists
    const conversation = await conversationRepository.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found',
        code: 'CONVERSATION_NOT_FOUND',
        message: `Conversation ${conversationId} does not exist`,
      });
    }

    // Verify user is a participant
    if (
      conversation.participant1Id !== userId &&
      conversation.participant2Id !== userId
    ) {
      return res.status(403).json({
        success: false,
        error: 'User not authorized',
        code: 'NOT_PARTICIPANT',
        message: 'User is not a participant in this conversation',
      });
    }

    // Determine receiver
    const receiverId =
      conversation.participant1Id === userId
        ? conversation.participant2Id
        : conversation.participant1Id;

    // Create system message
    const message: Message = {
      id: uuidv4(),
      conversationId,
      senderId: userId,
      receiverId,
      content,
      type: type === 'notification' ? MessageType.TEXT : MessageType.TEXT,
      status: MessageStatus.SENT,
      sentAt: new Date(),
      metadata: {
        isSystemMessage: true,
        systemMessageType: type,
      } as any,
    };

    // Save message to database
    const createdMessage = await messageRepository.create(message);

    // Update conversation last message
    const preview = content.length > 50 ? content.substring(0, 47) + '...' : content;
    await conversationRepository.updateLastMessage(
      conversationId,
      new Date(),
      preview
    );

    // Don't increment unread count for system messages to avoid spam

    // Publish real-time event to receiver
    await messageEventsService.publishNewMessage(createdMessage);

    return res.status(200).json({
      success: true,
      message: 'System message sent successfully',
      data: createdMessage,
    });
  } catch (error: any) {
    console.error('[InternalAPI] Send system message error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send system message',
      code: 'SEND_MESSAGE_FAILED',
      message: error.message || 'An error occurred while sending system message',
    });
  }
});

/**
 * Internal endpoint: Get conversation between two users
 * GET /api/internal/messages/conversation
 *
 * Query params:
 * - userId1: string
 * - userId2: string
 */
router.get('/conversation', async (req: Request, res: Response) => {
  try {
    const { userId1, userId2 } = req.query;

    if (!userId1 || !userId2) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters',
        code: 'MISSING_REQUIRED_PARAMS',
        message: 'userId1 and userId2 are required',
      });
    }

    // Find conversation between the two users
    const conversation = await conversationRepository.findByParticipants(
      userId1 as string,
      userId2 as string
    );

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found',
        code: 'CONVERSATION_NOT_FOUND',
        message: `No conversation exists between ${userId1} and ${userId2}`,
      });
    }

    // Get recent messages from the conversation (last 50)
    const messages = await messageRepository.getMessagesByConversation(
      conversation.id,
      50,
      0
    );

    // Get unread counts for both users
    const unreadCountUser1 = await messageRepository.getUnreadCount(
      conversation.id,
      userId1 as string
    );
    const unreadCountUser2 = await messageRepository.getUnreadCount(
      conversation.id,
      userId2 as string
    );

    return res.status(200).json({
      success: true,
      data: {
        conversation: {
          id: conversation.id,
          participant1Id: conversation.participant1Id,
          participant2Id: conversation.participant2Id,
          createdAt: conversation.createdAt,
          lastMessageAt: conversation.lastMessageAt,
          lastMessagePreview: conversation.lastMessagePreview,
          unreadCount: {
            [userId1 as string]: unreadCountUser1,
            [userId2 as string]: unreadCountUser2,
          },
        },
        messages,
        pagination: {
          total: messages.length,
          limit: 50,
          offset: 0,
          hasMore: messages.length === 50,
        },
      },
    });
  } catch (error: any) {
    console.error('[InternalAPI] Get conversation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get conversation',
      code: 'GET_CONVERSATION_FAILED',
      message: error.message || 'An error occurred while getting conversation',
    });
  }
});

/**
 * Internal endpoint: Delete messages in a conversation
 * DELETE /api/internal/messages/conversation/:conversationId
 *
 * Query params:
 * - deleteFor: 'all' | 'user' (default: 'all')
 * - userId: string (required if deleteFor is 'user')
 */
router.delete('/conversation/:conversationId', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { deleteFor = 'all', userId } = req.query;

    if (deleteFor === 'user' && !userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter',
        code: 'MISSING_REQUIRED_PARAM',
        message: 'userId is required when deleteFor is "user"',
      });
    }

    // Verify conversation exists
    const conversation = await conversationRepository.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found',
        code: 'CONVERSATION_NOT_FOUND',
        message: `Conversation ${conversationId} does not exist`,
      });
    }

    // Get all messages in the conversation
    const messages = await messageRepository.getMessagesByConversation(
      conversationId,
      1000, // Get all messages (use large limit)
      0
    );

    let deletedCount = 0;

    if (deleteFor === 'all') {
      // Hard delete all messages for everyone
      const deletePromises = messages.map((message) =>
        messageRepository.delete(message.id, conversationId)
      );
      await Promise.all(deletePromises);
      deletedCount = messages.length;

      // Optionally delete the conversation itself
      // await conversationRepository.delete(conversationId);

      // Publish delete events to all participants
      for (const message of messages) {
        await messageEventsService.publishMessageDeleted(
          message.id,
          conversationId,
          'system',
          message.receiverId
        );
        await messageEventsService.publishMessageDeleted(
          message.id,
          conversationId,
          'system',
          message.senderId
        );
      }
    } else if (deleteFor === 'user' && userId) {
      // Soft delete - mark messages as deleted for specific user only
      const markDeletedPromises = messages.map((message) =>
        messageRepository.markAsDeleted(message.id, conversationId, userId as string)
      );
      await Promise.all(markDeletedPromises);
      deletedCount = messages.length;

      // Publish delete event only to the specific user
      for (const message of messages) {
        await messageEventsService.publishMessageDeleted(
          message.id,
          conversationId,
          userId as string,
          userId as string
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: `Messages deleted successfully for ${deleteFor}`,
      data: {
        conversationId,
        deleteFor,
        userId: deleteFor === 'user' ? userId : undefined,
        deletedCount,
        deletedAt: new Date(),
      },
    });
  } catch (error: any) {
    console.error('[InternalAPI] Delete conversation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete conversation',
      code: 'DELETE_CONVERSATION_FAILED',
      message: error.message || 'An error occurred while deleting conversation',
    });
  }
});

/**
 * Internal endpoint: Get user's conversations
 * GET /api/internal/messages/users/:userId/conversations
 *
 * Query params:
 * - limit: number (default: 50)
 * - offset: number (default: 0)
 */
router.get('/users/:userId/conversations', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    // Get all conversations for the user
    const allConversations = await conversationRepository.findByUserId(userId);

    // Apply pagination
    const total = allConversations.length;
    const paginatedConversations = allConversations.slice(offset, offset + limit);

    // Enrich conversations with unread counts and other participant info
    const enrichedConversations = await Promise.all(
      paginatedConversations.map(async (conv) => {
        // Get other participant ID
        const otherParticipantId =
          conv.participant1Id === userId
            ? conv.participant2Id
            : conv.participant1Id;

        // Get unread count for this user
        const unreadCount = await messageRepository.getUnreadCount(conv.id, userId);

        // Get last message if exists
        let lastMessage = null;
        if (conv.lastMessageAt) {
          const messages = await messageRepository.getMessagesByConversation(
            conv.id,
            1,
            0
          );
          lastMessage = messages.length > 0 ? messages[0] : null;
        }

        return {
          id: conv.id,
          participant1Id: conv.participant1Id,
          participant2Id: conv.participant2Id,
          otherParticipantId,
          createdAt: conv.createdAt,
          lastMessageAt: conv.lastMessageAt,
          lastMessagePreview: conv.lastMessagePreview,
          lastMessage,
          unreadCount,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: {
        conversations: enrichedConversations,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
    });
  } catch (error: any) {
    console.error('[InternalAPI] Get user conversations error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get user conversations',
      code: 'GET_CONVERSATIONS_FAILED',
      message: error.message || 'An error occurred while getting user conversations',
    });
  }
});

/**
 * Internal endpoint: Block/Unblock messaging between users
 * POST /api/internal/messages/block
 *
 * Request body:
 * {
 *   blockerId: string;
 *   blockedId: string;
 *   action: 'block' | 'unblock';
 * }
 */
router.post('/block', async (req: Request, res: Response) => {
  try {
    const { blockerId, blockedId, action } = req.body;

    if (!blockerId || !blockedId || !action) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        code: 'MISSING_REQUIRED_FIELDS',
        message: 'blockerId, blockedId, and action are required',
      });
    }

    if (!['block', 'unblock'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action',
        code: 'INVALID_ACTION',
        message: 'action must be either "block" or "unblock"',
      });
    }

    const timestamp = new Date();

    if (action === 'block') {
      // Store block relationship in Redis
      // Key format: block:{blockerId}:{blockedId}
      const blockKey = `block:${blockerId}:${blockedId}`;
      const reverseBlockKey = `blocked_by:${blockedId}:${blockerId}`;

      try {
        const client = redisClient.getClient();

        // Set block with no expiration (permanent until unblocked)
        await client.set(blockKey, timestamp.toISOString());
        await client.set(reverseBlockKey, timestamp.toISOString());

        // Add to blocked users set for quick lookups
        await client.sAdd(`blocker:${blockerId}:list`, blockedId);
        await client.sAdd(`blocked:${blockedId}:list`, blockerId);

        // Find conversation between these users and update status (optional)
        const conversation = await conversationRepository.findByParticipants(
          blockerId,
          blockedId
        );

        if (conversation) {
          // Optionally mark conversation as blocked
          // This prevents new messages from being sent
          await conversationRepository.update(conversation.id, {
            // You might want to add a 'blockedBy' field to the conversation schema
            lastMessageAt: timestamp,
            lastMessagePreview: 'User blocked',
          } as any);
        }

        return res.status(200).json({
          success: true,
          message: 'User blocked successfully',
          data: {
            blockerId,
            blockedId,
            action,
            timestamp,
          },
        });
      } catch (error: any) {
        console.error('[InternalAPI] Block user error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to block user',
          code: 'BLOCK_FAILED',
          message: error.message || 'An error occurred while blocking user',
        });
      }
    } else if (action === 'unblock') {
      // Remove block relationship from Redis
      const blockKey = `block:${blockerId}:${blockedId}`;
      const reverseBlockKey = `blocked_by:${blockedId}:${blockerId}`;

      try {
        const client = redisClient.getClient();

        // Remove block keys
        await client.del(blockKey);
        await client.del(reverseBlockKey);

        // Remove from blocked users sets
        await client.sRem(`blocker:${blockerId}:list`, blockedId);
        await client.sRem(`blocked:${blockedId}:list`, blockerId);

        return res.status(200).json({
          success: true,
          message: 'User unblocked successfully',
          data: {
            blockerId,
            blockedId,
            action,
            timestamp,
          },
        });
      } catch (error: any) {
        console.error('[InternalAPI] Unblock user error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to unblock user',
          code: 'UNBLOCK_FAILED',
          message: error.message || 'An error occurred while unblocking user',
        });
      }
    }

    // This shouldn't be reached due to validation above, but just in case
    return res.status(400).json({
      success: false,
      error: 'Invalid action',
      code: 'INVALID_ACTION',
      message: 'action must be either "block" or "unblock"',
    });
  } catch (error: any) {
    console.error('[InternalAPI] Block/Unblock error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to block/unblock user',
      code: 'BLOCK_UNBLOCK_FAILED',
      message: error.message || 'An error occurred while blocking/unblocking user',
    });
  }
});

export default router;
