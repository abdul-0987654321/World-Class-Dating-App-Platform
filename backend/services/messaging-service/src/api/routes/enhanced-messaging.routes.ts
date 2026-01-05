import { Router } from 'express';

import {
  validateBody,
  validateQuery,
  AddReactionDto,
  RemoveReactionDto,
  SearchMessagesDto,
  GetSharedMediaQueryDto,
  ExportChatDto,
} from '../../dto';
import { enhancedMessagingController } from '../controllers/enhanced-messaging.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Enhanced Messaging
 *   description: Enhanced messaging features (reactions, pinning, search, GIFs, etc.)
 */

// ============================================================================
// MESSAGE REACTIONS
// ============================================================================

/**
 * @swagger
 * /api/messages/{messageId}/reactions:
 *   post:
 *     summary: Add or update reaction to a message
 *     tags: [Enhanced Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
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
 *               - conversationId
 *               - emoji
 *             properties:
 *               conversationId:
 *                 type: string
 *               emoji:
 *                 type: string
 *                 description: Emoji reaction
 *     responses:
 *       200:
 *         description: Reaction added successfully
 */
router.post(
  '/messages/:messageId/reactions',
  authenticate,
  validateBody(AddReactionDto),
  enhancedMessagingController.addReaction.bind(enhancedMessagingController)
);

/**
 * @swagger
 * /api/messages/{messageId}/reactions:
 *   delete:
 *     summary: Remove reaction from a message
 *     tags: [Enhanced Messaging]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  '/messages/:messageId/reactions',
  authenticate,
  validateBody(RemoveReactionDto),
  enhancedMessagingController.removeReaction.bind(enhancedMessagingController)
);

/**
 * @swagger
 * /api/messages/{messageId}/reactions:
 *   get:
 *     summary: Get reaction summary for a message
 *     tags: [Enhanced Messaging]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/messages/:messageId/reactions',
  authenticate,
  enhancedMessagingController.getReactions.bind(enhancedMessagingController)
);

// ============================================================================
// MESSAGE PINNING
// ============================================================================

/**
 * @swagger
 * /api/conversations/{conversationId}/messages/{messageId}/pin:
 *   post:
 *     summary: Pin a message in conversation
 *     tags: [Enhanced Messaging]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/conversations/:conversationId/messages/:messageId/pin',
  authenticate,
  enhancedMessagingController.pinMessage.bind(enhancedMessagingController)
);

/**
 * @swagger
 * /api/conversations/{conversationId}/messages/{messageId}/pin:
 *   delete:
 *     summary: Unpin a message
 *     tags: [Enhanced Messaging]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  '/conversations/:conversationId/messages/:messageId/pin',
  authenticate,
  enhancedMessagingController.unpinMessage.bind(enhancedMessagingController)
);

/**
 * @swagger
 * /api/conversations/{conversationId}/pinned:
 *   get:
 *     summary: Get all pinned messages in conversation
 *     tags: [Enhanced Messaging]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/conversations/:conversationId/pinned',
  authenticate,
  enhancedMessagingController.getPinnedMessages.bind(enhancedMessagingController)
);

// ============================================================================
// MESSAGE SEARCH
// ============================================================================

/**
 * @swagger
 * /api/messages/search:
 *   post:
 *     summary: Search messages
 *     tags: [Enhanced Messaging]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               conversationId:
 *                 type: string
 *                 description: Optional - search within specific conversation
 *               query:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [text, image, video, voice, gif, file]
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               limit:
 *                 type: integer
 *                 default: 50
 *               offset:
 *                 type: integer
 *                 default: 0
 *     responses:
 *       200:
 *         description: Search results
 */
router.post(
  '/messages/search',
  authenticate,
  validateBody(SearchMessagesDto),
  enhancedMessagingController.searchMessages.bind(enhancedMessagingController)
);

/**
 * @swagger
 * /api/conversations/{conversationId}/media:
 *   get:
 *     summary: Get shared media in conversation
 *     tags: [Enhanced Messaging]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/conversations/:conversationId/media',
  authenticate,
  validateQuery(GetSharedMediaQueryDto),
  enhancedMessagingController.getSharedMedia.bind(enhancedMessagingController)
);

// ============================================================================
// GIF INTEGRATION
// ============================================================================

/**
 * @swagger
 * /api/gifs/search:
 *   get:
 *     summary: Search GIFs from Tenor/Giphy
 *     tags: [Enhanced Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: GIF search results
 */
router.get(
  '/gifs/search',
  authenticate,
  enhancedMessagingController.searchGifs.bind(enhancedMessagingController)
);

/**
 * @swagger
 * /api/gifs/trending:
 *   get:
 *     summary: Get trending GIFs
 *     tags: [Enhanced Messaging]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/gifs/trending',
  authenticate,
  enhancedMessagingController.getTrendingGifs.bind(enhancedMessagingController)
);

/**
 * @swagger
 * /api/gifs/categories:
 *   get:
 *     summary: Get GIF categories
 *     tags: [Enhanced Messaging]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/gifs/categories',
  authenticate,
  enhancedMessagingController.getGifCategories.bind(enhancedMessagingController)
);

// ============================================================================
// CHAT EXPORT
// ============================================================================

/**
 * @swagger
 * /api/conversations/{conversationId}/export:
 *   post:
 *     summary: Export chat conversation
 *     tags: [Enhanced Messaging]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               format:
 *                 type: string
 *                 enum: [json, txt, pdf]
 *                 default: json
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               includeMedia:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: Export created successfully
 */
router.post(
  '/conversations/:conversationId/export',
  authenticate,
  validateBody(ExportChatDto),
  enhancedMessagingController.exportChat.bind(enhancedMessagingController)
);

// ============================================================================
// ICEBREAKERS
// ============================================================================

/**
 * @swagger
 * /api/icebreakers/suggestions:
 *   get:
 *     summary: Get personalized icebreaker suggestions
 *     tags: [Enhanced Messaging]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: otherUserId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: count
 *         schema:
 *           type: integer
 *           default: 5
 *     responses:
 *       200:
 *         description: Icebreaker suggestions
 */
router.get(
  '/icebreakers/suggestions',
  authenticate,
  enhancedMessagingController.getIcebreakerSuggestions.bind(enhancedMessagingController)
);

/**
 * @swagger
 * /api/icebreakers/categories:
 *   get:
 *     summary: Get icebreaker categories
 *     tags: [Enhanced Messaging]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/icebreakers/categories',
  authenticate,
  enhancedMessagingController.getIcebreakerCategories.bind(enhancedMessagingController)
);

/**
 * @swagger
 * /api/icebreakers/random:
 *   get:
 *     summary: Get random icebreaker
 *     tags: [Enhanced Messaging]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/icebreakers/random',
  authenticate,
  enhancedMessagingController.getRandomIcebreaker.bind(enhancedMessagingController)
);

/**
 * @swagger
 * /api/icebreakers/{icebreakerId}/track:
 *   post:
 *     summary: Track icebreaker usage
 *     tags: [Enhanced Messaging]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/icebreakers/:icebreakerId/track',
  authenticate,
  enhancedMessagingController.trackIcebreakerUsage.bind(enhancedMessagingController)
);

export default router;
