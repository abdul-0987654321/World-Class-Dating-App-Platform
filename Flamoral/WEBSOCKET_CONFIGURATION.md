# WebSocket Configuration Guide

This document provides comprehensive information about WebSocket and real-time features configuration in the Flamoral dating app.

## Overview

Flamoral uses Socket.IO for real-time WebSocket communication across multiple services:

1. **API Gateway** - Main WebSocket gateway with NestJS
2. **Messaging Service** - Handles chat messages and conversations
3. **User Service** - Handles user presence and video calls
4. **Automation Service** - Sends real-time suggestions and notifications

## Architecture

### API Gateway WebSocket Gateway

**Location**: `backend/services/api-gateway/src/websocket/websocket.gateway.ts`

The main WebSocket gateway handles:
- User authentication via JWT
- Connection management
- Message routing
- Presence/online status
- Video call signaling
- Match notifications

#### Configuration

```typescript
@WebSocketGateway({
  cors: {
    origin: [
      'https://flamoral.com',
      'https://www.flamoral.com',
      'https://admin.flamoral.com',
      'https://app.flamoral.com',
      'https://flamoral.vercel.app',
      'https://*.flamoral.com',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:4000',
    ],
    credentials: true,
    methods: ['GET', 'POST'],
  },
  path: '/socket.io',
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
})
```

#### Authentication

Supports multiple authentication methods:
- `auth.token` - Socket.IO auth object
- `headers.authorization` - Bearer token header
- `query.token` - Query parameter

Example client connection:
```javascript
import { io } from 'socket.io-client';

const socket = io('https://api.flamoral.com', {
  auth: {
    token: 'your-jwt-token'
  },
  transports: ['websocket', 'polling']
});
```

### Redis Adapter (Horizontal Scaling)

**Location**: `backend/services/api-gateway/src/adapters/redis-io.adapter.ts`

The Redis adapter enables horizontal scaling across multiple API Gateway instances.

#### Configuration

Environment variables:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password
REDIS_TLS=false
REDIS_DB=0
```

Features:
- Auto-reconnection with exponential backoff
- Connection timeout: 10 seconds
- Max reconnection attempts: 10
- Graceful fallback to standalone mode if Redis unavailable

## Event Reference

### Connection Events

#### Client -> Server

**connect**
```javascript
socket.on('connected', (data) => {
  console.log('Connected:', data.userId, data.socketId);
});
```

**disconnect**
```javascript
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});
```

### Messaging Events

#### Client -> Server

**message:send**
```javascript
socket.emit('message:send', {
  conversationId: 'conv-123',
  content: 'Hello!',
  type: 'text',
  replyTo: 'msg-456', // optional
  tempId: 'temp-789' // optional
});
```

**message:typing**
```javascript
socket.emit('message:typing', {
  conversationId: 'conv-123',
  isTyping: true
});
```

**message:read**
```javascript
socket.emit('message:read', {
  conversationId: 'conv-123',
  messageId: 'msg-123', // or messageIds: ['msg-123', 'msg-124']
});
```

#### Server -> Client

**message:new**
```javascript
socket.on('message:new', (message) => {
  console.log('New message:', message);
});
```

**message:sent**
```javascript
socket.on('message:sent', (data) => {
  console.log('Message sent:', data.messageId);
});
```

**message:delivered**
```javascript
socket.on('message:delivered', (data) => {
  console.log('Message delivered:', data.messageId);
});
```

**message_read**
```javascript
socket.on('message_read', (data) => {
  console.log('Messages read:', data.messageIds);
});
```

**typing**
```javascript
socket.on('typing', (data) => {
  console.log('User typing:', data.userId, data.isTyping);
});
```

### Conversation Events

#### Client -> Server

**conversation:join**
```javascript
socket.emit('conversation:join', {
  conversationId: 'conv-123'
});
```

**conversation:leave**
```javascript
socket.emit('conversation:leave', {
  conversationId: 'conv-123'
});
```

#### Server -> Client

**conversation:joined**
```javascript
socket.on('conversation:joined', (data) => {
  console.log('User joined:', data.userId);
});
```

**conversation:left**
```javascript
socket.on('conversation:left', (data) => {
  console.log('User left:', data.userId);
});
```

### Presence Events

#### Client -> Server

**presence:get**
```javascript
socket.emit('presence:get', {
  userIds: ['user-1', 'user-2', 'user-3']
}, (response) => {
  console.log('Online users:', response.online);
  console.log('Offline users:', response.offline);
});
```

**status:update**
```javascript
socket.emit('status:update', {
  status: 'online' // or 'away', 'busy'
});
```

#### Server -> Client

**user:online**
```javascript
socket.on('user:online', (data) => {
  console.log('User came online:', data.userId);
});
```

**user:offline**
```javascript
socket.on('user:offline', (data) => {
  console.log('User went offline:', data.userId);
});
```

**user:status**
```javascript
socket.on('user:status', (data) => {
  console.log('User status changed:', data.userId, data.status);
});
```

### Video Call Events

#### Client -> Server

**call:initiate**
```javascript
socket.emit('call:initiate', {
  targetUserId: 'user-123',
  callType: 'video' // or 'audio'
}, (response) => {
  if (response.success) {
    console.log('Call initiated:', response.callId);
  }
});
```

**call:answer**
```javascript
socket.emit('call:answer', {
  callId: 'call-123',
  callerId: 'user-456',
  accepted: true
});
```

**call:end**
```javascript
socket.emit('call:end', {
  callId: 'call-123',
  targetUserId: 'user-456'
});
```

**call:signal** (WebRTC signaling)
```javascript
socket.emit('call:signal', {
  targetUserId: 'user-456',
  signal: rtcSignalData
});
```

#### Server -> Client

**call:incoming**
```javascript
socket.on('call:incoming', (data) => {
  console.log('Incoming call from:', data.callerId);
  console.log('Call type:', data.callType);
  console.log('Call ID:', data.callId);
});
```

**call:answered**
```javascript
socket.on('call:answered', (data) => {
  console.log('Call answered:', data.accepted);
});
```

**call:ended**
```javascript
socket.on('call:ended', (data) => {
  console.log('Call ended by:', data.endedBy);
});
```

**call:signal**
```javascript
socket.on('call:signal', (data) => {
  console.log('WebRTC signal from:', data.from);
  // Handle WebRTC signaling
});
```

### Match Events

#### Server -> Client

**match:new**
```javascript
socket.on('match:new', (data) => {
  console.log('New match!', data.matchId, data.userId);
});
```

### Error Events

#### Server -> Client

**error**
```javascript
socket.on('error', (error) => {
  console.error('Socket error:', error.code, error.message);
});
```

Common error codes:
- `AUTH_REQUIRED` - No authentication token provided
- `AUTH_FAILED` - Authentication failed
- `DUPLICATE_CONNECTION` - New connection from another device
- `INVALID_USER_ID` - Invalid userId format

## CORS Configuration

All WebSocket services use consistent CORS configuration:

### Allowed Origins

- Production: `https://flamoral.com`, `https://www.flamoral.com`, `https://admin.flamoral.com`, `https://app.flamoral.com`
- Vercel: `https://flamoral.vercel.app`
- Wildcard: `https://*.flamoral.com` (all subdomains)
- Development: `http://localhost:3000`, `http://localhost:4000`, `http://localhost:5173`, `http://localhost:5174`

### Configuration

```javascript
cors: {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, server-to-server)
    if (!origin) return callback(null, true);

    // Check allowed origins with wildcard support
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin === '*') return true;
      if (allowedOrigin.includes('*')) {
        const pattern = allowedOrigin.replace(/\*/g, '.*');
        return new RegExp(`^${pattern}$`).test(origin);
      }
      return allowedOrigin === origin;
    });

    callback(null, isAllowed);
  },
  credentials: true,
  methods: ['GET', 'POST'],
}
```

## Environment Variables

### API Gateway

```env
# CORS
ALLOWED_ORIGINS=https://flamoral.com,https://www.flamoral.com,http://localhost:5173

# JWT
JWT_SECRET=your-jwt-secret
JWT_ACCESS_SECRET=your-jwt-access-secret

# Redis (for Socket.IO adapter)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TLS=false
REDIS_DB=0
```

### Messaging Service

```env
# CORS
ALLOWED_ORIGINS=https://flamoral.com,https://www.flamoral.com,http://localhost:5173

# Cosmos DB
COSMOS_ENDPOINT=https://your-cosmos.documents.azure.com:443/
COSMOS_KEY=your-cosmos-key

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Automation Service

```env
# CORS
CORS_ORIGINS=https://flamoral.com,https://www.flamoral.com,http://localhost:5173

# JWT
JWT_ACCESS_SECRET=your-jwt-access-secret
```

## Connection Lifecycle

1. **Client initiates connection**
   - Sends JWT token via auth, headers, or query
   - Socket.IO attempts WebSocket upgrade or falls back to polling

2. **Server authenticates**
   - Verifies JWT token
   - Extracts userId from token payload
   - Rejects connection if authentication fails

3. **Connection established**
   - Client receives `connected` event
   - Server adds to user-socket mapping
   - User joins personal room: `user:{userId}`

4. **Active connection**
   - Client can join conversation rooms
   - Send/receive messages
   - Update presence status
   - Initiate/receive calls

5. **Disconnection**
   - Server removes user from mappings
   - Broadcasts offline status
   - Cleans up rooms

6. **Reconnection**
   - Client automatically reconnects
   - Re-authenticates with same or new token
   - Rejoins necessary rooms

## Rooms

Socket.IO uses rooms for targeted broadcasting:

- `user:{userId}` - Personal room for each user
- `conversation:{conversationId}` - Room for each conversation

## Best Practices

### Client-Side

1. **Always handle reconnection**
```javascript
socket.on('reconnect', () => {
  // Rejoin rooms, refresh data
  socket.emit('conversation:join', { conversationId });
});
```

2. **Handle connection errors**
```javascript
socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  // Show user-friendly message
});
```

3. **Clean up on unmount**
```javascript
useEffect(() => {
  return () => {
    socket.disconnect();
  };
}, []);
```

4. **Use acknowledgment callbacks for critical operations**
```javascript
socket.emit('message:send', data, (response) => {
  if (response.success) {
    // Update UI
  } else {
    // Handle error
  }
});
```

### Server-Side

1. **Always validate incoming data**
2. **Use proper error handling in event handlers**
3. **Clean up resources on disconnect**
4. **Use rooms for efficient broadcasting**
5. **Monitor connection count and performance**

## Monitoring

### Health Checks

Check WebSocket status via:
```
GET /health
```

Response includes connection count:
```json
{
  "status": "healthy",
  "connections": 42
}
```

### Metrics

Monitor these metrics:
- Active connections count
- Connection attempts (success/failure)
- Message throughput
- Average latency
- Error rates by type

## Troubleshooting

### Connection Issues

**Problem**: Client can't connect
- Check JWT token is valid and not expired
- Verify CORS origin is allowed
- Check network connectivity
- Verify WebSocket port is not blocked

**Problem**: Connection drops frequently
- Check network stability
- Verify pingTimeout/pingInterval settings
- Check Redis connection (if using adapter)

### Message Delivery Issues

**Problem**: Messages not received
- Verify user is connected (check presence)
- Ensure conversation room is joined
- Check message format and validation

**Problem**: Duplicate messages
- Implement idempotency using tempId
- Handle reconnection properly

### Performance Issues

**Problem**: High latency
- Check Redis connection if using adapter
- Monitor server CPU/memory
- Check network latency

**Problem**: Memory leaks
- Ensure proper disconnect cleanup
- Monitor connection count
- Check for orphaned event listeners

## Security Considerations

1. **Always authenticate connections** - Never allow unauthenticated WebSocket connections
2. **Validate JWT on every connection** - Don't trust client-provided userId
3. **Rate limit events** - Prevent spam and abuse
4. **Sanitize messages** - Prevent XSS and injection attacks
5. **Use HTTPS/WSS in production** - Encrypt all traffic
6. **Implement proper CORS** - Only allow trusted origins
7. **Monitor for suspicious activity** - Track connection patterns

## Migration Notes

If migrating from an older Socket.IO version:
- The current setup uses Socket.IO v4+
- `allowEIO3: true` provides backward compatibility with v2/v3 clients
- Recommend upgrading all clients to latest version

## Support

For issues or questions:
- Check logs: `backend/services/*/logs/`
- Enable debug mode: `DEBUG=socket.io:* npm start`
- Review this documentation
- Contact DevOps team
