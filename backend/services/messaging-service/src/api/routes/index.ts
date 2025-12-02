import { Router } from 'express';
import conversationRoutes from './conversation.routes';
import messageRoutes from './message.routes';
import encryptionKeysRoutes from './encryption-keys.routes';
import { messageController } from '../controllers/message.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Mount conversation routes
router.use('/conversations', conversationRoutes);

// Mount message routes
router.use('/messages', messageRoutes);

// Mount encryption keys routes
router.use('/keys', encryptionKeysRoutes);

// Add conversation messages route (REST convention: /conversations/:id/messages)
router.get(
  '/conversations/:conversationId/messages',
  authenticate,
  messageController.getMessages.bind(messageController)
);

export default router;
