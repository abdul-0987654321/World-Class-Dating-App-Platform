import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { readReceiptController } from '../controllers/read-receipt.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Read Receipts
 *   description: Message read receipt management endpoints
 */

/**
 * @swagger
 * /api/read-receipts/conversations/{conversationId}/read:
 *   post:
 *     summary: Mark all messages in a conversation as read
 *     tags: [Read Receipts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the conversation
 *     responses:
 *       200:
 *         description: Messages marked as read successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     conversationId:
 *                       type: string
 *                     markedAsRead:
 *                       type: integer
 *                     messageIds:
 *                       type: array
 *                       items:
 *                         type: string
 *       403:
 *         description: Not authorized to access this conversation
 *       404:
 *         description: Conversation not found
 */
router.post(
  '/conversations/:conversationId/read',
  authenticate,
  readReceiptController.markConversationAsRead.bind(readReceiptController)
);

/**
 * @swagger
 * /api/read-receipts/messages/{messageId}/read:
 *   post:
 *     summary: Mark a specific message as read
 *     tags: [Read Receipts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the message
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - conversationId
 *             properties:
 *               conversationId:
 *                 type: string
 *                 description: ID of the conversation containing the message
 *     responses:
 *       200:
 *         description: Message marked as read successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   description: Updated message object
 *       400:
 *         description: Bad request - conversationId is required
 *       403:
 *         description: Not authorized - only receiver can mark as read
 *       404:
 *         description: Message or conversation not found
 */
router.post(
  '/messages/:messageId/read',
  authenticate,
  readReceiptController.markMessageAsRead.bind(readReceiptController)
);

export default router;
