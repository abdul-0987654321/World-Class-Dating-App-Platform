import { Router } from 'express';

import { validateQuery, GetMessagesQueryDto } from '../../dto';
import { messageController } from '../controllers/message.controller';
import { authenticate } from '../middleware/auth.middleware';

import conversationRoutes from './conversation.routes';
import encryptionKeysRoutes from './encryption-keys.routes';
import enhancedMessagingRoutes from './enhanced-messaging.routes';
import giftsRoutes from './gifts.routes';
import mediaMessagingRoutes from './media-messaging.routes';
import messageRoutes from './message.routes';
import moderationRoutes from './moderation.routes';

const router = Router();

// Mount conversation routes (includes typing indicators)
router.use('/conversations', conversationRoutes);

// Mount message routes
router.use('/messages', messageRoutes);

// Mount encryption keys routes
router.use('/keys', encryptionKeysRoutes);

// Mount virtual gifts routes (WeChat-style monetization)
router.use('/gifts', giftsRoutes);

// Mount moderation routes (safety features)
router.use('/moderation', moderationRoutes);

// Mount media messaging routes (photo sharing, voice messages)
router.use('/', mediaMessagingRoutes);

// Mount enhanced messaging routes (GIFs, reactions, pinning, search, icebreakers)
router.use('/', enhancedMessagingRoutes);

// Add conversation messages route (REST convention: /conversations/:id/messages)
router.get(
  '/conversations/:conversationId/messages',
  authenticate,
  validateQuery(GetMessagesQueryDto),
  messageController.getMessages.bind(messageController)
);

export default router;
