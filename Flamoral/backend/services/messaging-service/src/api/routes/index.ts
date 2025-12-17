import { Router } from 'express';
import conversationRoutes from './conversation.routes';
import messageRoutes from './message.routes';
import encryptionKeysRoutes from './encryption-keys.routes';
import giftsRoutes from './gifts.routes';
import moderationRoutes from './moderation.routes';
import readReceiptRoutes from './read-receipt.routes';
import messageSearchRoutes from './message-search.routes';
import { messageController } from '../controllers/message.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Mount conversation routes
router.use('/conversations', conversationRoutes);

// Mount message routes
router.use('/messages', messageRoutes);

// Mount encryption keys routes
router.use('/keys', encryptionKeysRoutes);

// Mount virtual gifts routes (WeChat-style monetization)
router.use('/gifts', giftsRoutes);

// Mount moderation routes (safety features)
router.use('/moderation', moderationRoutes);

// Mount read receipt routes
router.use('/read-receipts', readReceiptRoutes);

// Mount message search routes
router.use('/search', messageSearchRoutes);

// Add conversation messages route (REST convention: /conversations/:id/messages)
router.get(
  '/conversations/:conversationId/messages',
  authenticate,
  messageController.getMessages.bind(messageController)
);

export default router;
