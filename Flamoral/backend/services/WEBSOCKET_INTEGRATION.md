# WebSocket Integration: Realtime Service & Messaging Service

## Overview

This document describes the complete WebSocket integration between the **Realtime Service** (Go) and **Messaging Service** (TypeScript). The integration enables real-time message delivery, typing indicators, read receipts, and presence management.

## Architecture

### Communication Flow

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Client    │◄───WS───┤ Realtime Service │◄──HTTP──┤ Messaging       │
│ (WebSocket) │         │      (Go)        │         │ Service (TS)    │
└─────────────┘         └──────────────────┘         └─────────────────┘
                              │     ▲                         │
                              │     │                         │
                              ▼     │                         ▼
                         ┌────────────────┐         ┌─────────────────┐
                         │  Redis Pub/Sub │◄────────┤   Cosmos DB     │
                         └────────────────┘         └─────────────────┘
```

### Component Responsibilities

#### Realtime Service (Go)
- WebSocket connection management
- Client authentication and session management
- Real-time event broadcasting
- Presence tracking (online/offline/away)
- Typing indicator management
- Conversation room management
- Redis pub/sub event handling

#### Messaging Service (TypeScript)
- Message persistence (Cosmos DB)
- Conversation management
- Read receipt tracking
- Message validation and encryption
- Publishing events to Realtime Service

## Features Implemented

### 1. WebSocket Event Handlers

**Client → Server Events:**
- `message:send` - Send a new message
- `message:read` - Mark message as read
- `message:react` - React to a message
- `typing:start` - Start typing
- `typing:stop` - Stop typing
- `presence:update` - Update presence status
- `subscribe` - Subscribe to channels
- `unsubscribe` - Unsubscribe from channels
- `ping` - Heartbeat

**Server → Client Events:**
- `message:new` - New message received
- `message:delivered` - Message delivery confirmation
- `message:read_receipt` - Read receipt notification
- `typing:indicator` - Typing indicator
- `presence:changed` - Presence status changed
- `connected` - Connection established
- `error` - Error notification
- `pong` - Heartbeat response

### 2. Message Delivery Acknowledgment

**Flow:**
1. User sends message via HTTP to Messaging Service
2. Messaging Service persists message to Cosmos DB
3. Messaging Service publishes to Realtime Service (HTTP + Redis)
4. Realtime Service broadcasts to recipient's WebSocket
5. If recipient is online, Realtime Service sends delivery acknowledgment
6. Sender receives `message:delivered` event

**Implementation Files:**
- `realtime-service/internal/websocket/hub.go` - `HandleNewMessageFromService()`
- `messaging-service/src/api/controllers/message.controller.ts` - `sendMessage()`
- `messaging-service/src/infrastructure/clients/realtime-http.client.ts` - `publishMessage()`

### 3. Typing Indicators

**Features:**
- Start/stop typing events
- Automatic timeout (5 seconds default)
- Conversation-scoped indicators
- Only sent to conversation participants

**Flow:**
1. User starts typing
2. Client sends `typing:start` event
3. Realtime Service broadcasts to other participants
4. Auto-timeout stops typing after 5 seconds

**Implementation Files:**
- `realtime-service/internal/typing/typing.go` - Typing manager
- `messaging-service/src/api/controllers/conversation-typing.controller.ts`

### 4. Read Receipts Broadcasting

**Features:**
- Per-message read receipts
- Bulk conversation read receipts
- Broadcasted to all participants
- Persisted in message metadata

**Flow:**
1. User reads messages
2. HTTP request to mark as read
3. Messaging Service updates Cosmos DB
4. Publishes read receipt to Realtime Service
5. Realtime Service broadcasts to conversation participants
6. Sender receives `message:read_receipt` event

**Implementation Files:**
- `messaging-service/src/api/controllers/read-receipt.controller.ts`
- `realtime-service/internal/websocket/hub.go` - `HandleReadReceiptFromService()`

### 5. Online/Offline Presence Updates

**Features:**
- Real-time presence tracking (online/away/offline)
- Automatic offline on disconnect
- TTL-based expiration (5 minutes)
- Heartbeat mechanism (30 seconds)

**States:**
- `online` - User is actively connected
- `away` - User is idle
- `offline` - User is disconnected

**Implementation Files:**
- `realtime-service/internal/presence/presence.go` - Presence manager
- `realtime-service/internal/websocket/hub.go` - Presence updates on connect/disconnect

### 6. Room/Conversation Management

**Features:**
- Automatic conversation joining on message send
- Participant tracking
- Online participant queries
- Broadcast to conversation participants

**API Endpoints:**
- `POST /api/internal/conversations/join` - Join conversation
- `POST /api/internal/conversations/leave` - Leave conversation
- `GET /api/internal/conversations/:id/participants` - Get online participants

**Implementation Files:**
- `realtime-service/internal/websocket/conversation.go` - Conversation manager
- `realtime-service/internal/server/handlers.go` - Conversation endpoints

## API Documentation

### Realtime Service Internal API

**Base URL:** `http://localhost:8081/api/internal`

**Authentication:** All internal endpoints require `X-Service-Token` header

#### Publish Message
```http
POST /messages/publish
Content-Type: application/json
X-Service-Token: {SERVICE_TOKEN}

{
  "conversationId": "uuid",
  "messageId": "uuid",
  "senderId": "uuid",
  "receiverId": "uuid",
  "content": "Hello!",
  "type": "TEXT",
  "metadata": {}
}
```

#### Publish Read Receipt
```http
POST /messages/read-receipt
Content-Type: application/json
X-Service-Token: {SERVICE_TOKEN}

{
  "conversationId": "uuid",
  "messageIds": ["uuid1", "uuid2"],
  "readBy": "uuid",
  "senderId": "uuid"
}
```

#### Publish Typing Indicator
```http
POST /messages/typing
Content-Type: application/json
X-Service-Token: {SERVICE_TOKEN}

{
  "conversationId": "uuid",
  "userId": "uuid",
  "targetUserId": "uuid",
  "isTyping": true
}
```

#### Get Conversation Participants
```http
GET /conversations/{conversationId}/participants
X-Service-Token: {SERVICE_TOKEN}
```

#### Join Conversation
```http
POST /conversations/join
Content-Type: application/json
X-Service-Token: {SERVICE_TOKEN}

{
  "conversationId": "uuid",
  "userId": "uuid"
}
```

### Messaging Service Public API

#### Send Message
```http
POST /api/messages
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

{
  "receiverId": "uuid",
  "content": "Hello!",
  "type": "TEXT",
  "conversationId": "uuid" // Optional
}
```

#### Mark Conversation as Read
```http
POST /api/conversations/{conversationId}/read
Authorization: Bearer {JWT_TOKEN}
```

#### Send Typing Indicator
```http
POST /api/conversations/{conversationId}/typing
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

{
  "isTyping": true
}
```

## Configuration

### Environment Variables

#### Realtime Service (.env)
```env
PORT=8081
ENVIRONMENT=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT
JWT_SECRET=your-jwt-secret-key
JWT_ISSUER=heartly
JWT_EXPIRATION=15m

# Service-to-Service Auth
SERVICE_TOKEN=dev-service-token-change-in-production

# WebSocket
WS_READ_BUFFER_SIZE=1024
WS_WRITE_BUFFER_SIZE=1024
WS_MAX_MESSAGE_SIZE=524288
WS_PONG_WAIT=60s
WS_PING_PERIOD=54s
WS_WRITE_WAIT=10s

# Presence
PRESENCE_TTL=5m
PRESENCE_HEARTBEAT=30s

# Typing
TYPING_TIMEOUT=5s
```

#### Messaging Service (.env)
```env
PORT=3003
NODE_ENV=development

# JWT
JWT_ACCESS_SECRET=your-jwt-secret-key

# Cosmos DB
COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/
COSMOS_KEY=your-cosmos-key
COSMOS_DATABASE_ID=Flamoral
COSMOS_MESSAGES_CONTAINER=Messages
COSMOS_CONVERSATIONS_CONTAINER=Conversations

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Realtime Service Integration
REALTIME_SERVICE_URL=http://localhost:8081
SERVICE_TOKEN=dev-service-token-change-in-production

# CORS
CORS_ORIGINS=http://localhost:3000
```

## Redis Pub/Sub Channels

- `heartly:messages` - Message events
- `heartly:typing` - Typing indicators
- `heartly:presence` - Presence updates
- `heartly:matches` - Match notifications
- `heartly:notifications` - General notifications
- `heartly:calls` - Call events

## Testing

### Manual Testing with wscat

```bash
# Install wscat
npm install -g wscat

# Connect to WebSocket
wscat -c "ws://localhost:8081/ws" -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Send typing indicator
{"event":"typing:start","data":{"conversationId":"conv-123"},"timestamp":"2025-12-01T00:00:00Z"}

# Send message
{"event":"message:send","data":{"conversationId":"conv-123","type":"TEXT","content":{"text":"Hello!"},"tempId":"temp-123"},"timestamp":"2025-12-01T00:00:00Z"}

# Mark as read
{"event":"message:read","data":{"conversationId":"conv-123","messageId":"msg-123"},"timestamp":"2025-12-01T00:00:00Z"}

# Update presence
{"event":"presence:update","data":{"status":"online"},"timestamp":"2025-12-01T00:00:00Z"}
```

### Testing HTTP Endpoints

```bash
# Publish message (service-to-service)
curl -X POST http://localhost:8081/api/internal/messages/publish \
  -H "Content-Type: application/json" \
  -H "X-Service-Token: dev-service-token-change-in-production" \
  -d '{
    "conversationId": "conv-123",
    "messageId": "msg-123",
    "senderId": "user-1",
    "receiverId": "user-2",
    "content": "Hello!",
    "type": "TEXT"
  }'

# Send message via Messaging Service
curl -X POST http://localhost:3003/api/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "receiverId": "user-2",
    "content": "Hello!",
    "type": "TEXT"
  }'
```

## Deployment

### Docker Compose

```yaml
version: '3.8'

services:
  realtime-service:
    build: ./realtime-service
    ports:
      - "8081:8081"
    environment:
      - REDIS_HOST=redis
      - SERVICE_TOKEN=${SERVICE_TOKEN}
    depends_on:
      - redis

  messaging-service:
    build: ./messaging-service
    ports:
      - "3003:3003"
    environment:
      - REDIS_HOST=redis
      - REALTIME_SERVICE_URL=http://realtime-service:8081
      - SERVICE_TOKEN=${SERVICE_TOKEN}
    depends_on:
      - redis
      - realtime-service

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

## Monitoring & Metrics

### Prometheus Metrics (Realtime Service)

- `websocket_connections_total` - Total WebSocket connections
- `websocket_messages_received_total` - Messages received by type
- `websocket_messages_sent_total` - Messages sent by type
- `online_users` - Current online users count
- `redis_pubsub_messages_total` - Redis pub/sub messages by type
- `message_processing_duration_seconds` - Message processing latency

### Health Checks

```bash
# Realtime Service
curl http://localhost:8081/health
curl http://localhost:8081/ready

# Messaging Service
curl http://localhost:3003/health
```

## Troubleshooting

### Common Issues

**WebSocket Connection Fails**
- Check JWT token validity
- Verify CORS configuration
- Ensure WebSocket upgrade headers are present

**Messages Not Delivered**
- Verify Redis connectivity
- Check service token configuration
- Ensure recipient is online and subscribed

**Read Receipts Not Working**
- Verify conversation participants
- Check Redis pub/sub channels
- Ensure message IDs are correct

**Typing Indicators Stuck**
- Check typing timeout configuration
- Verify typing stop events are sent
- Check Redis TTL settings

## Performance Considerations

- WebSocket connections: ~10,000 per instance
- Message throughput: ~100,000 messages/second
- Redis pub/sub latency: <10ms
- HTTP endpoint latency: <50ms
- Presence update frequency: 30 seconds
- Typing timeout: 5 seconds

## Security

- JWT authentication for WebSocket connections
- Service token authentication for internal APIs
- Message content encryption (AES-256-CBC)
- Rate limiting on endpoints
- CORS configuration
- Input validation and sanitization

## Future Enhancements

- [ ] Message reactions broadcasting
- [ ] Voice/video call signaling
- [ ] Group conversation support
- [ ] Message delivery status (sent/delivered/read)
- [ ] Offline message queuing
- [ ] WebSocket reconnection with state recovery
- [ ] E2E encryption support
- [ ] Message search integration
- [ ] Analytics and insights
- [ ] Multi-region deployment support
