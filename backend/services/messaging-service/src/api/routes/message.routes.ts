import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { messageController } from '../controllers/message.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Messages
 *   description: Message management endpoints
 */

/**
 * @swagger
 * /api/messages:
 *   post:
 *     summary: Send a new message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - receiverId
 *               - content
 *             properties:
 *               conversationId:
 *                 type: string
 *                 description: Optional - if not provided, will find or create conversation
 *               receiverId:
 *                 type: string
 *               content:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [text, image, video, audio, file, gif]
 *                 default: text
 *               metadata:
 *                 type: object
 *                 properties:
 *                   mediaUrl:
 *                     type: string
 *                   thumbnailUrl:
 *                     type: string
 *                   duration:
 *                     type: number
 *                   fileSize:
 *                     type: number
 *                   fileName:
 *                     type: string
 *                   mimeType:
 *                     type: string
 *               replyTo:
 *                 type: string
 *                 description: Message ID being replied to
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not authorized to send messages in this conversation
 */
router.post(
  '/',
  authenticate,
  messageController.sendMessage.bind(messageController)
);

/**
 * @swagger
 * /api/messages/unread-count:
 *   get:
 *     summary: Get total unread message count for user
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count retrieved
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/unread-count',
  authenticate,
  messageController.getUnreadCount.bind(messageController)
);

/**
 * @swagger
 * /api/messages/{messageId}:
 *   get:
 *     summary: Get a specific message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Message details
 *       400:
 *         description: Bad request (missing conversationId)
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Message not found
 */
router.get(
  '/:messageId',
  authenticate,
  messageController.getMessage.bind(messageController)
);

/**
 * @swagger
 * /api/messages/{messageId}:
 *   put:
 *     summary: Update a message (edit content)
 *     tags: [Messages]
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
 *             properties:
 *               conversationId:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Message updated successfully
 *       400:
 *         description: Bad request
 *       403:
 *         description: Not authorized (only sender can edit)
 *       404:
 *         description: Message not found
 */
router.put(
  '/:messageId',
  authenticate,
  messageController.updateMessage.bind(messageController)
);

/**
 * @swagger
 * /api/messages/{messageId}:
 *   delete:
 *     summary: Delete a message
 *     tags: [Messages]
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
 *             properties:
 *               conversationId:
 *                 type: string
 *               deleteForAll:
 *                 type: boolean
 *                 default: false
 *                 description: If true and user is sender, deletes for all participants
 *     responses:
 *       200:
 *         description: Message deleted successfully
 *       400:
 *         description: Bad request
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Message not found
 */
router.delete(
  '/:messageId',
  authenticate,
  messageController.deleteMessage.bind(messageController)
);

/**
 * @swagger
 * /api/messages/{messageId}/status:
 *   put:
 *     summary: Update message status (delivered, read)
 *     tags: [Messages]
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
 *               - status
 *             properties:
 *               conversationId:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [delivered, read]
 *     responses:
 *       200:
 *         description: Message status updated
 *       400:
 *         description: Bad request
 *       403:
 *         description: Not authorized (only receiver can update)
 *       404:
 *         description: Message not found
 */
router.put(
  '/:messageId/status',
  authenticate,
  messageController.updateMessageStatus.bind(messageController)
);

/**
 * @swagger
 * /api/conversations/{conversationId}/messages:
 *   get:
 *     summary: Get messages for a conversation
 *     tags: [Messages]
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
 *         description: List of messages
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Conversation not found
 */
// Note: This route is defined in conversation.routes.ts to match REST conventions

export default router;
