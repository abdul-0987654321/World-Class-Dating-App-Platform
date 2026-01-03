import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { conversationController } from '../controllers/conversation.controller';
import { conversationTypingController } from '../controllers/conversation-typing.controller';
import {
  validateBody,
  validateQuery,
  CreateConversationDto,
  ConversationPaginationDto,
  TypingIndicatorDto,
} from '../../dto';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Conversations
 *   description: Conversation management endpoints
 */

/**
 * @swagger
 * /api/conversations:
 *   get:
 *     summary: Get all conversations for the authenticated user
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of conversations to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of conversations to skip
 *     responses:
 *       200:
 *         description: List of conversations
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/',
  authenticate,
  validateQuery(ConversationPaginationDto),
  conversationController.getConversations.bind(conversationController)
);

/**
 * @swagger
 * /api/conversations:
 *   post:
 *     summary: Create a new conversation
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - participantId
 *             properties:
 *               participantId:
 *                 type: string
 *                 description: ID of the other user to start conversation with
 *     responses:
 *       201:
 *         description: Conversation created successfully
 *       200:
 *         description: Conversation already exists
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/',
  authenticate,
  validateBody(CreateConversationDto),
  conversationController.createConversation.bind(conversationController)
);

/**
 * @swagger
 * /api/conversations/with/{otherUserId}:
 *   get:
 *     summary: Get or create a conversation with another user
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: otherUserId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the other user
 *     responses:
 *       200:
 *         description: Conversation retrieved or created
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/with/:otherUserId',
  authenticate,
  conversationController.getOrCreateConversation.bind(conversationController)
);

/**
 * @swagger
 * /api/conversations/{conversationId}:
 *   get:
 *     summary: Get a specific conversation
 *     tags: [Conversations]
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
 *         description: Conversation details
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Conversation not found
 */
router.get(
  '/:conversationId',
  authenticate,
  conversationController.getConversation.bind(conversationController)
);

/**
 * @swagger
 * /api/conversations/{conversationId}:
 *   delete:
 *     summary: Delete a conversation
 *     tags: [Conversations]
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
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Conversation not found
 */
router.delete(
  '/:conversationId',
  authenticate,
  conversationController.deleteConversation.bind(conversationController)
);

/**
 * @swagger
 * /api/conversations/{conversationId}/read:
 *   put:
 *     summary: Mark all messages in conversation as read
 *     tags: [Conversations]
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
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Conversation not found
 */
router.put(
  '/:conversationId/read',
  authenticate,
  conversationController.markAsRead.bind(conversationController)
);

// ============================================================================
// TYPING INDICATORS
// ============================================================================

/**
 * @swagger
 * /api/conversations/{conversationId}/typing:
 *   post:
 *     summary: Send typing indicator (start or stop)
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isTyping
 *             properties:
 *               isTyping:
 *                 type: boolean
 *                 description: true to start typing, false to stop
 *     responses:
 *       200:
 *         description: Typing indicator sent
 *       400:
 *         description: Invalid request - isTyping must be boolean
 *       403:
 *         description: Not authorized for this conversation
 *       404:
 *         description: Conversation not found
 */
router.post(
  '/:conversationId/typing',
  authenticate,
  validateBody(TypingIndicatorDto),
  conversationTypingController.sendTypingIndicator.bind(conversationTypingController)
);

/**
 * @swagger
 * /api/conversations/{conversationId}/typing:
 *   get:
 *     summary: Get users currently typing in a conversation
 *     tags: [Conversations]
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
 *         description: List of typing users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     typingUsers:
 *                       type: array
 *                       items:
 *                         type: string
 *                     count:
 *                       type: number
 *       403:
 *         description: Not authorized for this conversation
 *       404:
 *         description: Conversation not found
 */
router.get(
  '/:conversationId/typing',
  authenticate,
  conversationTypingController.getTypingUsers.bind(conversationTypingController)
);

export default router;
