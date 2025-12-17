import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { messageSearchController } from '../controllers/message-search.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Message Search
 *   description: Message search and media retrieval endpoints
 */

/**
 * @swagger
 * /api/search/messages:
 *   post:
 *     summary: Search messages across conversations
 *     tags: [Message Search]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               query:
 *                 type: string
 *                 description: Search query string
 *               conversationId:
 *                 type: string
 *                 description: Optional - limit search to specific conversation
 *               type:
 *                 type: string
 *                 enum: [text, image, video, audio, voice, file, gif, gift]
 *                 description: Filter by message type
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 description: Search messages sent after this date
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: Search messages sent before this date
 *               limit:
 *                 type: integer
 *                 default: 50
 *               offset:
 *                 type: integer
 *                 default: 0
 *     responses:
 *       200:
 *         description: Search results
 *       400:
 *         description: Bad request - at least one search parameter required
 *       403:
 *         description: Not authorized
 */
router.post(
  '/messages',
  authenticate,
  messageSearchController.searchMessages.bind(messageSearchController)
);

/**
 * @swagger
 * /api/search/conversations/{conversationId}/messages:
 *   get:
 *     summary: Search messages within a specific conversation
 *     tags: [Message Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the conversation
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query string
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
 *         description: Search results within conversation
 *       400:
 *         description: Bad request - query parameter required
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Conversation not found
 */
router.get(
  '/conversations/:conversationId/messages',
  authenticate,
  messageSearchController.searchInConversation.bind(messageSearchController)
);

/**
 * @swagger
 * /api/search/conversations/{conversationId}/media:
 *   get:
 *     summary: Get shared media in a conversation
 *     tags: [Message Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the conversation
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [image, video, gif, voice, file]
 *         description: Type of media to retrieve
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
 *         description: List of shared media
 *       400:
 *         description: Bad request - type parameter required
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Conversation not found
 */
router.get(
  '/conversations/:conversationId/media',
  authenticate,
  messageSearchController.getSharedMedia.bind(messageSearchController)
);

/**
 * @swagger
 * /api/search/messages/by-type:
 *   get:
 *     summary: Search messages by type across all conversations
 *     tags: [Message Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [text, image, video, audio, voice, file, gif, gift]
 *         description: Message type to search for
 *       - in: query
 *         name: conversationId
 *         schema:
 *           type: string
 *         description: Optional - limit to specific conversation
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
 *         description: List of messages matching the type
 *       400:
 *         description: Bad request - type parameter required
 *       403:
 *         description: Not authorized
 */
router.get(
  '/messages/by-type',
  authenticate,
  messageSearchController.searchByType.bind(messageSearchController)
);

export default router;
