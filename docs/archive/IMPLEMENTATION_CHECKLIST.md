# Realtime Integration Implementation Checklist

## Quick Start Guide

Follow these steps to complete the Realtime WebSocket Service integration.

## Step 1: Verify New Files Created ✓

The following files have been created:

- [x] `src/infrastructure/clients/realtime.client.ts` - Redis pub/sub client
- [x] `src/domain/services/message-events.service.ts` - Event publishing service
- [x] `src/api/controllers/conversation-typing.controller.ts` - Typing indicator controller

## Step 2: Update Message Controller

File: `src/api/controllers/message.controller.ts`

### 2.1 Add Import (Line 7)
```typescript
import { messageEventsService } from '../../domain/services/message-events.service';
```

### 2.2 Update sendMessage Method
After line 154 (after incrementing unread count), add:
```typescript
// Publish real-time event to receiver
await messageEventsService.publishNewMessage(createdMessage);
```

### 2.3 Update deleteMessage Method
Replace lines 331-334 with:
```typescript
const targetUserId = message.senderId === userId ? message.receiverId : message.senderId;

if (deleteForAll && message.senderId === userId) {
  // Hard delete - only sender can delete for all
  await messageRepository.delete(messageId, conversationId);

  // Publish delete event if deleting for all
  await messageEventsService.publishMessageDeleted(
    messageId,
    conversationId,
    userId,
    targetUserId
  );

  logger.info(`Message ${messageId} hard deleted by sender ${userId}`);
}
```

### 2.4 Add New Method: markMessageAsRead
Insert this method before `updateMessageStatus` (around line 357):
```typescript
/**
 * PUT /api/messages/:messageId/read
 * Mark a specific message as read
 */
async markMessageAsRead(req: AuthRequest, res: Response): Promise<Response> {
  try {
    const userId = req.user!.userId;
    const { messageId } = req.params;
    const { conversationId } = req.body;

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        error: 'conversationId is required',
      });
    }

    const message = await messageRepository.findById(messageId, conversationId);

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found',
      });
    }

    // Only receiver can mark as read
    if (message.receiverId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the receiver can mark message as read',
      });
    }

    // Update message status
    const updatedMessage = await messageRepository.update(messageId, conversationId, {
      status: MessageStatus.READ,
      readAt: new Date(),
    });

    // Publish read receipt event
    await messageEventsService.publishMessageRead(
      conversationId,
      [messageId],
      userId,
      [message.senderId]
    );

    logger.info(`Message ${messageId} marked as read by ${userId}`);

    return res.status(200).json({
      success: true,
      data: updatedMessage,
      message: 'Message marked as read',
    });
  } catch (error: any) {
    logger.error('Failed to mark message as read:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to mark message as read',
    });
  }
}
```

### 2.5 Update updateMessageStatus Method
After line 403 (after updating the message), add:
```typescript
// Publish status update event
if (status === MessageStatus.DELIVERED) {
  await messageEventsService.publishMessageDelivered(
    messageId,
    conversationId,
    userId,
    message.senderId
  );
} else if (status === MessageStatus.READ) {
  await messageEventsService.publishMessageRead(
    conversationId,
    [messageId],
    userId,
    [message.senderId]
  );
}
```

## Step 3: Update Message Routes

File: `src/api/routes/message.routes.ts`

Add this route after line 263 (after the `/:messageId/status` route):

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

## Step 4: Update Conversation Routes

File: `src/api/routes/conversation.routes.ts`

### 4.1 Add Import
At the top with other imports:
```typescript
import { conversationTypingController } from '../controllers/conversation-typing.controller';
```

### 4.2 Add Typing Route
After line 194 (after the `/:conversationId/read` route):
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

## Step 5: Update Main Index (Optional)

File: `src/index.ts`

If you want to monitor Realtime connection status in health checks:

### 5.1 Add Import
```typescript
import { messageEventsService } from './domain/services/message-events.service';
```

### 5.2 Update Health Check (around line 48-54)
```typescript
app.get('/health', (req: Request, res: Response) => {
  const realtimeStatus = messageEventsService.getStatus();

  res.status(200).json({
    status: 'healthy',
    service: 'messaging-service',
    timestamp: new Date().toISOString(),
    connections: socketManager.getConnectedCount(),
    realtime: realtimeStatus,
  });
});
```

## Step 6: Environment Configuration

### 6.1 Verify .env File
Ensure your `.env` has Redis configuration:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=2
```

### 6.2 Start Redis (if not running)
```bash
docker run -d -p 6379:6379 redis:alpine
```

## Step 7: Test the Integration

### 7.1 Start Services
```bash
# Terminal 1: Start Redis (if using Docker)
docker run -d -p 6379:6379 redis:alpine

# Terminal 2: Start Realtime Service
cd ../realtime-service
go run cmd/server/main.go

# Terminal 3: Start Messaging Service
npm run dev
```

### 7.2 Test Endpoints

**Test Health Check:**
```bash
curl http://localhost:3003/health
```

Expected response should include realtime status:
```json
{
  "status": "healthy",
  "realtime": {
    "connected": true,
    "service": "realtime-pubsub"
  }
}
```

**Test Send Message:**
```bash
curl -X POST http://localhost:3003/api/messages \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "receiverId": "user-456",
    "content": "Hello from messaging service!"
  }'
```

**Test Typing Indicator:**
```bash
curl -X POST http://localhost:3003/api/conversations/conv-123/typing \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "isTyping": true
  }'
```

**Test Mark as Read:**
```bash
curl -X PUT http://localhost:3003/api/messages/msg-123/read \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "conv-123"
  }'
```

### 7.3 Verify Real-time Events

Monitor Redis pub/sub:
```bash
redis-cli
> PSUBSCRIBE heartly:*
```

You should see events being published when:
- Messages are sent
- Typing indicators are sent
- Messages are marked as read

## Step 8: Verify Integration

### Checklist:
- [ ] Realtime client connects to Redis successfully
- [ ] Health endpoint shows realtime status
- [ ] Sending message publishes NEW_MESSAGE event
- [ ] Typing endpoint publishes TYPING_START/STOP events
- [ ] Mark as read publishes MESSAGE_READ event
- [ ] Message delete publishes MESSAGE_DELETED event
- [ ] No errors in application logs
- [ ] Redis pub/sub shows events

## Troubleshooting

### Redis Connection Failed
**Problem**: Realtime client can't connect to Redis

**Solution**:
1. Verify Redis is running: `redis-cli ping`
2. Check REDIS_HOST and REDIS_PORT in .env
3. Check firewall rules
4. Review logs: look for "Redis client error"

### Events Not Published
**Problem**: Messages sent but no events in Redis

**Solution**:
1. Check realtime client connection: call `/health` endpoint
2. Verify Redis channels: `redis-cli PUBSUB CHANNELS heartly:*`
3. Check logs for publishing errors
4. Ensure message was saved to database first

### Typing Indicators Not Working
**Problem**: Typing endpoint returns 200 but no events

**Solution**:
1. Verify user is participant in conversation
2. Check conversation exists
3. Monitor Redis: `redis-cli PSUBSCRIBE heartly:typing`
4. Verify controller is called: add debug logs

## Completion Checklist

- [ ] All new files created
- [ ] Message controller updated
- [ ] Message routes updated
- [ ] Conversation routes updated
- [ ] Health check updated (optional)
- [ ] .env configured
- [ ] Redis running
- [ ] Realtime service running
- [ ] Tests passing
- [ ] Documentation reviewed

## Next Steps

After completing the integration:

1. **Update Client Applications**: Integrate WebSocket client to receive real-time events
2. **Add Monitoring**: Set up alerts for Redis connection failures
3. **Performance Testing**: Test with high message volume
4. **Production Deploy**: Update production .env and deploy services

## Reference Documentation

- **Complete Guide**: See `REALTIME_INTEGRATION_GUIDE.md`
- **Controller Updates**: See `MESSAGE_CONTROLLER_UPDATES.md`
- **Route Updates**: See `ROUTES_UPDATES.md`
- **Realtime Service**: See `../realtime-service/README.md`

## Support

For issues or questions:
1. Check logs: `tail -f logs/messaging-service.log`
2. Review documentation files
3. Test Redis connection: `redis-cli ping`
4. Verify Realtime Service is running: `curl http://localhost:8081/health`
