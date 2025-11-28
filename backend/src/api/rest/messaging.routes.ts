/**
 * Messaging Routes
 * Endpoints for conversations and messages
 */

import { Router, Request, Response, NextFunction } from 'express';
import { AuthMiddleware } from '../../middleware/auth.middleware.enhanced';
import { logger } from '../../utils/logger';
import { db } from '../../config/database.config';

const router = Router();

// Helper to get user ID from request
const getUserId = (req: Request): string => {
  return (req as any).user?.userId || req.headers['x-user-id'] as string || 'demo_user';
};

/**
 * @swagger
 * /api/messages/conversations:
 *   get:
 *     summary: Get user's conversations
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 */
router.get('/conversations', AuthMiddleware.verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    // Get matches to find conversation partners - use correct column names: user_id_1, user_id_2
    const matches = await db('matches')
      .where('user_id_1', userId)
      .orWhere('user_id_2', userId)
      .where('is_active', true)
      .orderBy('matched_at', 'desc')
      .limit(limit)
      .offset(offset);

    // Build conversations from matches
    const conversations = await Promise.all(
      matches.map(async (match: any) => {
        const participantId = match.user_id_1 === userId ? match.user_id_2 : match.user_id_1;

        // Get participant info from users table
        const participant = await db('users')
          .where('id', participantId)
          .select('id', 'first_name', 'last_active_at')
          .first();

        // Get primary photo from profile_photos table
        const photo = await db('profile_photos')
          .where('user_id', participantId)
          .orderBy('order_index', 'asc')
          .first();

        // Get last message
        const lastMessage = await db('messages')
          .where(function() {
            this.where('sender_id', userId).andWhere('receiver_id', participantId);
          })
          .orWhere(function() {
            this.where('sender_id', participantId).andWhere('receiver_id', userId);
          })
          .orderBy('created_at', 'desc')
          .first();

        // Count unread messages
        const unreadCount = await db('messages')
          .where('sender_id', participantId)
          .where('receiver_id', userId)
          .where('is_read', false)
          .count('id as count')
          .first();

        // Check if participant is online (active within last 5 minutes)
        const isOnline = participant?.last_active_at &&
          new Date(participant.last_active_at) > new Date(Date.now() - 5 * 60 * 1000);

        return {
          id: match.id,
          participant: {
            id: participant?.id,
            name: participant?.first_name || 'User',
            photoUrl: photo?.url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
            isOnline: !!isOnline,
          },
          lastMessage: lastMessage ? {
            id: lastMessage.id,
            content: lastMessage.content,
            senderId: lastMessage.sender_id,
            sentAt: lastMessage.created_at,
            status: lastMessage.is_read ? 'read' : 'delivered',
          } : null,
          unreadCount: Number(unreadCount?.count || 0),
          isTyping: false, // Would be updated via WebSocket
        };
      })
    );

    // Sort by last message time
    conversations.sort((a, b) => {
      const aTime = a.lastMessage?.sentAt ? new Date(a.lastMessage.sentAt).getTime() : 0;
      const bTime = b.lastMessage?.sentAt ? new Date(b.lastMessage.sentAt).getTime() : 0;
      return bTime - aTime;
    });

    res.json({
      success: true,
      data: {
        conversations,
        page,
        limit,
        hasMore: conversations.length === limit,
      },
    });
  } catch (error) {
    logger.error('Get conversations error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/messages/conversations/{conversationId}:
 *   get:
 *     summary: Get messages in a conversation
 *     tags: [Messaging]
 */
router.get('/conversations/:conversationId', AuthMiddleware.verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { conversationId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    // Get the match to find the other participant - use correct column names
    const match = await db('matches')
      .where('id', conversationId)
      .where(function() {
        this.where('user_id_1', userId).orWhere('user_id_2', userId);
      })
      .first();

    if (!match) {
      return res.status(404).json({
        success: false,
        error: { message: 'Conversation not found', code: 'NOT_FOUND' },
      });
    }

    const participantId = match.user_id_1 === userId ? match.user_id_2 : match.user_id_1;

    // Get messages between these two users
    const messages = await db('messages')
      .where(function() {
        this.where('sender_id', userId).andWhere('receiver_id', participantId);
      })
      .orWhere(function() {
        this.where('sender_id', participantId).andWhere('receiver_id', userId);
      })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    // Mark messages as read
    await db('messages')
      .where('sender_id', participantId)
      .where('receiver_id', userId)
      .where('is_read', false)
      .update({ is_read: true, read_at: new Date() });

    // Reverse to get chronological order
    const formattedMessages = messages.reverse().map((msg: any) => ({
      id: msg.id,
      senderId: msg.sender_id,
      content: msg.content,
      sentAt: msg.created_at,
      status: msg.is_read ? 'read' : 'delivered',
      type: msg.message_type || 'text',
      attachments: msg.attachments || [],
    }));

    res.json({
      success: true,
      data: {
        messages: formattedMessages,
        page,
        limit,
        hasMore: messages.length === limit,
      },
    });
  } catch (error) {
    logger.error('Get messages error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/messages/conversations/{conversationId}/send:
 *   post:
 *     summary: Send a message
 *     tags: [Messaging]
 */
router.post('/conversations/:conversationId/send', AuthMiddleware.verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { conversationId } = req.params;
    const { content, type = 'text', attachments } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Message content is required', code: 'INVALID_CONTENT' },
      });
    }

    // Get the match to find the recipient - use correct column names
    const match = await db('matches')
      .where('id', conversationId)
      .where(function() {
        this.where('user_id_1', userId).orWhere('user_id_2', userId);
      })
      .first();

    if (!match) {
      return res.status(404).json({
        success: false,
        error: { message: 'Conversation not found', code: 'NOT_FOUND' },
      });
    }

    const receiverId = match.user_id_1 === userId ? match.user_id_2 : match.user_id_1;

    // Check if blocked using the blocks table
    const isBlocked = await db('blocks')
      .where(function() {
        this.where('user_id', userId).andWhere('blocked_user_id', receiverId);
      })
      .orWhere(function() {
        this.where('user_id', receiverId).andWhere('blocked_user_id', userId);
      })
      .first();

    if (isBlocked) {
      return res.status(403).json({
        success: false,
        error: { message: 'Cannot send message to this user', code: 'BLOCKED' },
      });
    }

    // Create the message
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const messageData = {
      id: messageId,
      sender_id: userId,
      receiver_id: receiverId,
      content: content.trim(),
      message_type: type,
      attachments: JSON.stringify(attachments || []),
      is_read: false,
      created_at: new Date(),
    };

    await db('messages').insert(messageData);

    res.json({
      success: true,
      data: {
        id: messageId,
        senderId: userId,
        content: content.trim(),
        sentAt: messageData.created_at.toISOString(),
        status: 'sent',
        type,
      },
    });
  } catch (error) {
    logger.error('Send message error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/messages/conversations/{conversationId}/read:
 *   post:
 *     summary: Mark messages as read
 *     tags: [Messaging]
 */
router.post('/conversations/:conversationId/read', AuthMiddleware.verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { conversationId } = req.params;

    // Get the match to find the sender - use correct column names
    const match = await db('matches')
      .where('id', conversationId)
      .where(function() {
        this.where('user_id_1', userId).orWhere('user_id_2', userId);
      })
      .first();

    if (!match) {
      return res.status(404).json({
        success: false,
        error: { message: 'Conversation not found', code: 'NOT_FOUND' },
      });
    }

    const senderId = match.user_id_1 === userId ? match.user_id_2 : match.user_id_1;

    // Mark all messages from sender as read
    const updated = await db('messages')
      .where('sender_id', senderId)
      .where('receiver_id', userId)
      .where('is_read', false)
      .update({ is_read: true, read_at: new Date() });

    res.json({
      success: true,
      data: { messagesMarkedRead: updated },
    });
  } catch (error) {
    logger.error('Mark read error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /api/messages/unread-count:
 *   get:
 *     summary: Get total unread message count
 *     tags: [Messaging]
 */
router.get('/unread-count', AuthMiddleware.verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);

    const unreadCount = await db('messages')
      .where('receiver_id', userId)
      .where('is_read', false)
      .count('id as count')
      .first();

    res.json({
      success: true,
      data: { unreadCount: Number(unreadCount?.count || 0) },
    });
  } catch (error) {
    logger.error('Get unread count error:', error);
    next(error);
  }
});

export default router;
