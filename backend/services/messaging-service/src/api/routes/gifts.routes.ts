/**
 * Virtual Gifts Routes
 * API endpoints for WeChat-style virtual gifts
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { virtualGiftsService } from '../../services/virtual-gifts.service';
import messageRepository from '../../domain/repositories/message.repository';
import conversationRepository from '../../domain/repositories/conversation.repository';
import { createLogger } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { MessageType, MessageStatus } from '../../types';

const router = Router();
const logger = createLogger('gifts-routes');

/**
 * GET /api/gifts
 * Get all available virtual gifts
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const gifts = virtualGiftsService.getGiftCatalog();
    res.json({
      success: true,
      gifts,
      categories: {
        basic: gifts.filter(g => g.category === 'basic'),
        premium: gifts.filter(g => g.category === 'premium'),
        luxury: gifts.filter(g => g.category === 'luxury'),
      },
    });
  } catch (error: any) {
    logger.error('Failed to get gift catalog:', error);
    res.status(500).json({ success: false, error: 'Failed to load gifts' });
  }
});

/**
 * GET /api/gifts/:giftId
 * Get a specific gift by ID
 */
router.get('/:giftId', async (req: Request, res: Response) => {
  try {
    const { giftId } = req.params;
    const gift = virtualGiftsService.getGiftById(giftId);

    if (!gift) {
      return res.status(404).json({ success: false, error: 'Gift not found' });
    }

    res.json({ success: true, gift });
  } catch (error: any) {
    logger.error('Failed to get gift:', error);
    res.status(500).json({ success: false, error: 'Failed to get gift' });
  }
});

/**
 * POST /api/gifts/send
 * Send a virtual gift to another user in a conversation
 */
router.post('/send', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { conversationId, giftId, message: giftMessage } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!conversationId || !giftId) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Verify user is participant in conversation
    const conversation = await conversationRepository.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    // Check if user is a participant
    const isParticipant = conversation.participant1Id === userId || conversation.participant2Id === userId;
    if (!isParticipant) {
      return res.status(403).json({ success: false, error: 'Not a participant in this conversation' });
    }

    // Get receiver ID (the other participant)
    const receiverId = conversationRepository.getOtherParticipant(conversation, userId);
    if (!receiverId) {
      return res.status(400).json({ success: false, error: 'Cannot determine recipient' });
    }

    // Send the gift
    const result = await virtualGiftsService.sendGift(userId, receiverId, conversationId, giftId);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    // Create message record in the database
    const gift = virtualGiftsService.getGiftById(giftId);
    const messageId = uuidv4();

    const messageData = {
      id: messageId,
      conversationId,
      senderId: userId,
      receiverId,
      content: giftMessage || `Sent a ${gift?.name || 'gift'}`,
      type: MessageType.GIFT,
      status: MessageStatus.SENT,
      sentAt: new Date(),
      metadata: {
        gift: gift,
        transactionId: result.message?.transactionId,
      },
    };

    await messageRepository.create(messageData as any);

    // Update conversation last message
    await conversationRepository.updateLastMessage(
      conversationId,
      messageData.sentAt,
      `🎁 Sent a ${gift?.name || 'gift'}`
    );

    logger.info(`Gift sent successfully: ${giftId} from ${userId} to ${receiverId}`);

    res.json({
      success: true,
      message: {
        ...messageData,
        gift,
      },
    });
  } catch (error: any) {
    logger.error('Failed to send gift:', error);
    res.status(500).json({ success: false, error: 'Failed to send gift' });
  }
});

/**
 * GET /api/gifts/history
 * Get gift transaction history for current user
 * Supports pagination with limit and offset query parameters
 */
router.get('/history', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const type = (req.query.type as 'sent' | 'received' | 'all') || 'all';
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100); // Cap at 100
    const offset = parseInt(req.query.offset as string) || 0;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const transactions = await virtualGiftsService.getUserGiftHistory(userId, type, limit, offset);

    // Enrich transactions with gift details
    const enrichedTransactions = transactions.map(txn => ({
      ...txn,
      gift: virtualGiftsService.getGiftById(txn.giftId),
    }));

    res.json({
      success: true,
      transactions: enrichedTransactions,
      pagination: {
        limit,
        offset,
        hasMore: transactions.length === limit,
      },
    });
  } catch (error: any) {
    logger.error('Failed to get gift history:', error);
    res.status(500).json({ success: false, error: 'Failed to get gift history' });
  }
});

/**
 * GET /api/gifts/stats
 * Get gift statistics for current user
 */
router.get('/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const stats = await virtualGiftsService.getUserGiftStats(userId);

    res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    logger.error('Failed to get gift stats:', error);
    res.status(500).json({ success: false, error: 'Failed to get gift statistics' });
  }
});

/**
 * GET /api/gifts/conversation/:conversationId
 * Get gifts exchanged in a specific conversation
 */
router.get('/conversation/:conversationId', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { conversationId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Verify user is participant in conversation
    const conversation = await conversationRepository.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    const isParticipant = conversation.participant1Id === userId || conversation.participant2Id === userId;
    if (!isParticipant) {
      return res.status(403).json({ success: false, error: 'Not a participant in this conversation' });
    }

    const gifts = await virtualGiftsService.getConversationGifts(conversationId, limit);

    // Enrich with gift details
    const enrichedGifts = gifts.map(txn => ({
      ...txn,
      gift: virtualGiftsService.getGiftById(txn.giftId),
    }));

    res.json({
      success: true,
      gifts: enrichedGifts,
    });
  } catch (error: any) {
    logger.error('Failed to get conversation gifts:', error);
    res.status(500).json({ success: false, error: 'Failed to get conversation gifts' });
  }
});

export default router;
