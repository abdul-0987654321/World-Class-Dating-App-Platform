import { Router } from 'express';
import Joi from 'joi';

import { MessagingController } from '../controllers/messaging.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';

// Validation schemas for messaging endpoints
const sendMessageSchema = Joi.object({
  receiver_id: Joi.string().uuid().required(),
  content: Joi.string().min(1).max(5000).required(),
});

const paginationSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0),
});

const router = Router();
const messagingController = new MessagingController();

/**
 * @swagger
 * /api/messages/conversations:
 *   get:
 *     summary: Get all conversations for current user
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Conversations retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/conversations',
  authenticate,
  validate(paginationSchema, 'query'),
  messagingController.getConversations.bind(messagingController)
);

/**
 * @swagger
 * /api/messages/conversations/{otherUserId}:
 *   get:
 *     summary: Get or create conversation with another user
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: otherUserId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation retrieved/created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/conversations/:otherUserId',
  authenticate,
  messagingController.getOrCreateConversation.bind(messagingController)
);

/**
 * @swagger
 * /api/messages/conversations/{conversationId}/messages:
 *   get:
 *     summary: Get messages for a conversation
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/conversations/:conversationId/messages',
  authenticate,
  validate(paginationSchema, 'query'),
  messagingController.getMessages.bind(messagingController)
);

/**
 * @swagger
 * /api/messages/send:
 *   post:
 *     summary: Send a message
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - receiver_id
 *               - content
 *             properties:
 *               receiver_id:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/send', authenticate, validate(sendMessageSchema), messagingController.sendMessage.bind(messagingController));

/**
 * @swagger
 * /api/messages/conversations/{conversationId}/read:
 *   put:
 *     summary: Mark conversation as read
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation marked as read
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.put(
  '/conversations/:conversationId/read',
  authenticate,
  messagingController.markAsRead.bind(messagingController)
);

/**
 * @swagger
 * /api/messages/unread-count:
 *   get:
 *     summary: Get total unread message count
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/unread-count',
  authenticate,
  messagingController.getUnreadCount.bind(messagingController)
);

/**
 * @swagger
 * /api/messages/conversations/{conversationId}:
 *   delete:
 *     summary: Delete a conversation
 *     tags: [Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation deleted successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.delete(
  '/conversations/:conversationId',
  authenticate,
  messagingController.deleteConversation.bind(messagingController)
);

export default router;
