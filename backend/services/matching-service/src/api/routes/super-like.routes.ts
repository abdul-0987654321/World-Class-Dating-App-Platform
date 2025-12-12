import { Router } from 'express';
import superLikeController from '../controllers/super-like.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All super-like routes require authentication
router.use(authMiddleware);

// Send Super Like
router.post('/', superLikeController.sendSuperLike.bind(superLikeController));

// Get quota
router.get('/quota', superLikeController.getQuota.bind(superLikeController));

// Get received Super Likes
router.get('/received', superLikeController.getReceived.bind(superLikeController));

// Get sent Super Likes
router.get('/sent', superLikeController.getSent.bind(superLikeController));

// Get unread count
router.get('/unread-count', superLikeController.getUnreadCount.bind(superLikeController));

// Get stats
router.get('/stats', superLikeController.getStats.bind(superLikeController));

// Message routes
router.get('/messages/:messageId', superLikeController.getMessage.bind(superLikeController));
router.post('/messages/:messageId/read', superLikeController.markAsRead.bind(superLikeController));
router.delete('/messages/:messageId', superLikeController.deleteMessage.bind(superLikeController));

export default router;
