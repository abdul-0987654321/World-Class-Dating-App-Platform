# Realtime WebSocket Service Integration Guide

## Overview

This guide explains how the Messaging Service has been integrated with the Realtime WebSocket Service to provide real-time message delivery, typing indicators, and read receipts.

## Architecture

```
┌─────────────────────┐         ┌──────────────────────┐         ┌──────────────────┐
│  Messaging Service  │────────▶│  Redis Pub/Sub       │◀────────│  Realtime Service│
│  (REST API)         │         │  (Message Broker)    │         │  (WebSocket)     │
└─────────────────────┘         └──────────────────────┘         └──────────────────┘
         │                                                                  │
         │                                                                  │
         ▼                                                                  ▼
  ┌──────────────┐                                                  ┌─────────────┐
  │  Cosmos DB   │                                                  │   Clients   │
  │  (Messages)  │                                                  │ (WebSocket) │
  └──────────────┘                                                  └─────────────┘
```

## New Components

### 1. Realtime Client (`src/infrastructure/clients/realtime.client.ts`)

**Purpose**: Publishes events to Redis channels that the Realtime Service subscribes to.

**Key Features**:
- Automatic reconnection with exponential backoff
- Graceful error handling (won't fail message sends if real-time fails)
- Support for multiple event types:
  - `NEW_MESSAGE` - New message sent
  - `MESSAGE_READ` - Message(s) marked as read
  - `MESSAGE_DELIVERED` - Message delivered confirmation
  - `MESSAGE_DELETED` - Message deleted
  - `TYPING_START` - User started typing
  - `TYPING_STOP` - User stopped typing

**Redis Channels** (must match Realtime Service):
- `heartly:messages` - Message events
- `heartly:typing` - Typing indicators
- `heartly:matches` - Match notifications
- `heartly:notifications` - General notifications

**Usage Example**:
```typescript
import { realtimeClient } from '@/infrastructure/clients/realtime.client';

// Publish new message
await realtimeClient.publishNewMessage(receiverId, messageData);

// Publish typing indicator
await realtimeClient.publishTypingStart(conversationId, userId, targetUserId);
```

### 2. Message Events Service (`src/domain/services/message-events.service.ts`)

**Purpose**: High-level service for publishing message-related events.

**Key Methods**:
- `publishNewMessage(message)` - Notify receiver of new message
- `publishMessageRead(conversationId, messageIds, readBy, senderIds)` - Send read receipts
- `publishMessageDelivered(messageId, conversationId, deliveredTo, senderId)` - Delivery confirmation
- `publishMessageDeleted(messageId, conversationId, deletedBy, targetUserId)` - Deletion notification
- `publishTypingStart(conversationId, userId, targetUserId)` - User started typing
- `publishTypingStop(conversationId, userId, targetUserId)` - User stopped typing
- `isConnected()` - Check connection status
- `getStatus()` - Get detailed status for health checks

**Usage Example**:
```typescript
import { messageEventsService } from '@/domain/services/message-events.service';

// After saving a message to DB
const message = await messageRepository.create(messageData);
await messageEventsService.publishNewMessage(message);
```

### 3. Conversation Typing Controller (`src/api/controllers/conversation-typing.controller.ts`)

**Purpose**: Handle typing indicator API endpoint.

**Endpoint**: `POST /api/conversations/:conversationId/typing`

**Request Body**:
```json
{
  "isTyping": true
}
```

**Response**:
```json
{
  "success": true,
  "message": "Typing indicator sent"
}
```

## Updated Components

### 1. Message Controller Updates

The message controller has been updated to publish real-time events:

**`sendMessage`**:
- After saving message to database
- Publishes `NEW_MESSAGE` event to receiver

**`markMessageAsRead`** (NEW METHOD):
- Marks a specific message as read
- Publishes read receipt to sender

**`updateMessageStatus`**:
- Now publishes status change events
- Sends `MESSAGE_DELIVERED` or `MESSAGE_READ` events

**`deleteMessage`**:
- Publishes `MESSAGE_DELETED` event if deleting for all

### 2. Updated Routes

**New Message Routes**:
```typescript
PUT /api/messages/:messageId/read
  - Mark a specific message as read
  - Sends read receipt in real-time

PUT /api/messages/:messageId/status
  - Update message status (delivered/read)
  - Sends status update in real-time
```

**New Conversation Routes**:
```typescript
POST /api/conversations/:conversationId/typing
  - Send typing indicator
  - Body: { "isTyping": true/false }
```

## API Endpoints

### Message Endpoints

#### Send Message
```http
POST /api/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "conversationId": "conv-123", // Optional, will create if not exists
  "receiverId": "user-456",
  "content": "Hello!",
  "type": "text",
  "replyTo": "msg-789" // Optional
}
```

#### Mark Message as Read
```http
PUT /api/messages/:messageId/read
Authorization: Bearer <token>
Content-Type: application/json

{
  "conversationId": "conv-123"
}
```

#### Get Messages
```http
GET /api/messages/:conversationId?limit=50&offset=0
Authorization: Bearer <token>
```

#### Get Unread Count
```http
GET /api/messages/unread-count
Authorization: Bearer <token>
```

### Conversation Endpoints

#### List Conversations
```http
GET /api/conversations?limit=50&offset=0
Authorization: Bearer <token>
```

#### Create Conversation
```http
POST /api/conversations
Authorization: Bearer <token>
Content-Type: application/json

{
  "participantId": "user-456"
}
```

#### Get or Create Conversation
```http
GET /api/conversations/with/:otherUserId
Authorization: Bearer <token>
```

#### Mark Conversation as Read
```http
PUT /api/conversations/:conversationId/read
Authorization: Bearer <token>
```

#### Send Typing Indicator
```http
POST /api/conversations/:conversationId/typing
Authorization: Bearer <token>
Content-Type: application/json

{
  "isTyping": true
}
```

## Event Flow Examples

### Sending a Message

1. **Client A** sends POST to `/api/messages`
2. **Messaging Service**:
   - Validates request
   - Saves message to Cosmos DB
   - Updates conversation metadata
   - Increments unread count for receiver
   - **Publishes `NEW_MESSAGE` event to Redis**
3. **Redis** receives event on `heartly:messages` channel
4. **Realtime Service** subscribes to channel and receives event
5. **Realtime Service** sends WebSocket message to **Client B**
6. **Client B** receives real-time notification and displays message

### Typing Indicators

1. **Client A** starts typing in conversation
2. **Client A** sends POST to `/api/conversations/:id/typing` with `isTyping: true`
3. **Messaging Service**:
   - Validates user is participant
   - **Publishes `TYPING_START` event to Redis**
4. **Realtime Service** receives event and forwards to **Client B**
5. **Client B** shows "User A is typing..." indicator
6. After 5 seconds of no typing, **Client A** sends `isTyping: false`
7. Indicator is removed from **Client B**

### Read Receipts

1. **Client B** views message from **Client A**
2. **Client B** sends PUT to `/api/messages/:messageId/read`
3. **Messaging Service**:
   - Updates message status to READ
   - Sets readAt timestamp
   - **Publishes `MESSAGE_READ` event to Redis**
4. **Realtime Service** receives event and forwards to **Client A**
5. **Client A** shows double checkmark or "Read" indicator

## Configuration

### Environment Variables

Required Redis configuration in `.env`:

```env
# Redis Configuration (required for real-time features)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=2
```

### Config File

The config at `src/config/index.ts` includes Redis settings:

```typescript
redis: {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || '',
  ttl: {
    onlineStatus: 300,      // 5 minutes
    typingIndicator: 10,    // 10 seconds
    messageCache: 3600,     // 1 hour
  },
}
```

## Error Handling

### Graceful Degradation

The integration is designed to **never fail** the primary operation if real-time delivery fails:

```typescript
// After saving message
const createdMessage = await messageRepository.create(message);

// This won't throw even if Redis is down
await messageEventsService.publishNewMessage(createdMessage);

// Message is saved and API returns success
return res.status(201).json({ data: createdMessage });
```

### Connection Recovery

The Realtime Client automatically reconnects with exponential backoff:
- Initial retry: 1 second
- Max retries: 10
- Backoff: Exponential (1s, 2s, 4s, 8s, ...)

### Monitoring

Check real-time connection status:

```typescript
import { messageEventsService } from '@/domain/services/message-events.service';

const status = messageEventsService.getStatus();
// Returns: { connected: true, service: 'realtime-pubsub' }
```

## Testing

### Manual Testing

1. **Start Redis**:
   ```bash
   docker run -d -p 6379:6379 redis:alpine
   ```

2. **Start Realtime Service**:
   ```bash
   cd ../realtime-service
   go run cmd/server/main.go
   ```

3. **Start Messaging Service**:
   ```bash
   npm run dev
   ```

4. **Test Message Flow**:
   ```bash
   # Send a message
   curl -X POST http://localhost:3003/api/messages \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"receiverId": "user-123", "content": "Hello"}'

   # Check WebSocket client receives event
   ```

5. **Test Typing Indicators**:
   ```bash
   curl -X POST http://localhost:3003/api/conversations/conv-123/typing \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"isTyping": true}'
   ```

### Integration Tests

Example test for message sending with real-time:

```typescript
describe('Message Real-time Integration', () => {
  it('should publish NEW_MESSAGE event when message sent', async () => {
    const mockPublish = jest.spyOn(realtimeClient, 'publishNewMessage');

    await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({
        receiverId: 'user-456',
        content: 'Test message',
      })
      .expect(201);

    expect(mockPublish).toHaveBeenCalledWith(
      'user-456',
      expect.objectContaining({
        content: 'Test message',
      })
    );
  });
});
```

## Troubleshooting

### Messages not delivered in real-time

1. **Check Redis connection**:
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

2. **Check Realtime Service is running**:
   ```bash
   curl http://localhost:8081/health
   ```

3. **Verify channel names match**:
   - Messaging Service publishes to: `heartly:messages`
   - Realtime Service subscribes to: `heartly:messages`
   - Channel names must match exactly

4. **Check logs**:
   ```bash
   # Messaging Service logs
   tail -f logs/messaging-service.log | grep "realtime"

   # Realtime Service logs
   tail -f logs/realtime-service.log | grep "redis"
   ```

### Typing indicators not working

1. **Check endpoint is called correctly**:
   - Endpoint: `POST /api/conversations/:conversationId/typing`
   - Body: `{ "isTyping": boolean }`

2. **Verify user is participant in conversation**

3. **Check Redis pub/sub channels**:
   ```bash
   redis-cli
   PUBSUB CHANNELS heartly:*
   ```

### Read receipts not sent

1. **Verify receiver calls the read endpoint**:
   - `PUT /api/messages/:messageId/read`
   - Or `PUT /api/conversations/:conversationId/read` for all messages

2. **Check message receiver matches current user**

3. **Verify sender is subscribed to WebSocket**

## Performance Considerations

### Redis Connection Pooling

The Redis client uses connection pooling:
- Pool size: 100 connections
- Min idle: 10 connections
- Timeout: 5 seconds

### Event Batching

For marking multiple messages as read, use conversation-level endpoint:
```http
PUT /api/conversations/:conversationId/read
```

This is more efficient than marking each message individually.

### Message Size Limits

- Max message content: 5,000 characters
- Max media size: 10MB
- Redis message limit: 512MB (but keep events small)

## Security

### Event Data

Events published to Redis include:
- Message IDs
- User IDs
- Conversation IDs
- **Encrypted message content** (if applicable)

### Access Control

1. **Authentication**: All endpoints require valid JWT token
2. **Authorization**: Users can only:
   - Send messages to conversations they're part of
   - Read messages from their conversations
   - Send typing indicators in their conversations

### Redis Security

In production:
- Use Redis password authentication
- Enable SSL/TLS for Redis connections
- Restrict Redis port access with firewall rules

## Next Steps

1. **Apply the updates**:
   - Follow `MESSAGE_CONTROLLER_UPDATES.md` to update the message controller
   - Follow `ROUTES_UPDATES.md` to update the routes

2. **Test the integration**:
   - Start Redis, Realtime Service, and Messaging Service
   - Test message sending, typing indicators, and read receipts

3. **Monitor in production**:
   - Set up alerts for Redis connection failures
   - Monitor message delivery latency
   - Track real-time event success rates

4. **Optimize**:
   - Implement message queuing for high-load scenarios
   - Add rate limiting for typing indicators
   - Cache frequently accessed data

## Files Created/Modified

### New Files:
- `src/infrastructure/clients/realtime.client.ts`
- `src/domain/services/message-events.service.ts`
- `src/api/controllers/conversation-typing.controller.ts`

### Files to Update:
- `src/api/controllers/message.controller.ts` (see MESSAGE_CONTROLLER_UPDATES.md)
- `src/api/routes/message.routes.ts` (see ROUTES_UPDATES.md)
- `src/api/routes/conversation.routes.ts` (see ROUTES_UPDATES.md)

### Documentation:
- `REALTIME_INTEGRATION_GUIDE.md` (this file)
- `MESSAGE_CONTROLLER_UPDATES.md`
- `ROUTES_UPDATES.md`
