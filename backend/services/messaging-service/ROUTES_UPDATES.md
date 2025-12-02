# Routes Updates for Real-Time Integration

## 1. Update conversation.routes.ts

### Add import at top:
```typescript
import { conversationTypingController } from '../controllers/conversation-typing.controller';
```

### Add new route after the '/read' route (after line 194):
```typescript
/**
 * @swagger
 * /api/conversations/{conversationId}/typing:
 *   post:
 *     summary: Send typing indicator
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
 *         description: Bad request
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Conversation not found
 */
router.post(
  '/:conversationId/typing',
  authenticate,
  conversationTypingController.sendTypingIndicator.bind(conversationTypingController)
);
```

## 2. Update message.routes.ts

### Add new route after line 263 (after '/status' route):
```typescript
/**
 * @swagger
 * /api/messages/{messageId}/read:
 *   put:
 *     summary: Mark a specific message as read
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
 *     responses:
 *       200:
 *         description: Message marked as read
 *       400:
 *         description: Bad request
 *       403:
 *         description: Not authorized (only receiver can mark as read)
 *       404:
 *         description: Message not found
 */
router.put(
  '/:messageId/read',
  authenticate,
  messageController.markMessageAsRead.bind(messageController)
);
```

## Complete Updated Files

See the following files for complete implementations:
- `src/api/controllers/conversation-typing.controller.ts` (NEW)
- `src/infrastructure/clients/realtime.client.ts` (NEW)
- `src/domain/services/message-events.service.ts` (NEW)
- `MESSAGE_CONTROLLER_UPDATES.md` for message controller updates
