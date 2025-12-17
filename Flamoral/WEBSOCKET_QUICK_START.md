# WebSocket Quick Start Guide

Quick reference for using WebSocket/Socket.IO in Flamoral

---

## Client-Side Usage (Web App)

### 1. Connect to WebSocket

```typescript
import { socketService } from '@/services/socket.service';

// In your authentication flow
const token = 'your-jwt-token';
await socketService.connect(token);
```

### 2. Send a Message

```typescript
socketService.sendMessage(conversationId, content, 'text');
```

### 3. Listen for Messages

```typescript
// Subscribe to specific conversation
const unsubscribe = socketService.onMessage(conversationId, (message) => {
  console.log('New message:', message);
});

// Cleanup when component unmounts
unsubscribe();
```

### 4. Send Typing Indicator

```typescript
socketService.sendTyping(conversationId, true);  // Started typing
socketService.sendTyping(conversationId, false); // Stopped typing
```

### 5. Mark Messages as Read

```typescript
socketService.markAsRead(conversationId, [messageId1, messageId2]);
```

### 6. Join/Leave Conversation

```typescript
socketService.joinConversation(conversationId);
socketService.leaveConversation(conversationId);
```

### 7. Listen for Typing

```typescript
const unsubscribe = socketService.onTyping((data) => {
  console.log(`${data.userId} is typing: ${data.isTyping}`);
});
```

### 8. Listen for Online Status

```typescript
const unsubscribe = socketService.onOnlineStatus((data) => {
  console.log(`${data.userId} is ${data.isOnline ? 'online' : 'offline'}`);
});
```

### 9. Disconnect

```typescript
socketService.disconnect();
```

---

## Server-Side Event Handling (API Gateway)

### Event Names (Receive from Client)

- `message:send` - Send a message
- `message:typing` / `typing` - Typing indicator
- `message:read` / `mark_read` - Mark message as read
- `conversation:join` / `join_conversation` - Join conversation
- `conversation:leave` / `leave_conversation` - Leave conversation
- `presence:get` - Get user presence
- `status:update` - Update user status

### Event Names (Emit to Client)

- `connected` - Connection confirmation
- `message:new` / `new_message` - New message received
- `message:sent` - Message sent confirmation
- `message:delivered` - Message delivered
- `message:read` / `message_read` - Message read receipt
- `typing` - Typing indicator
- `user:online` / `user_online` - User online
- `user:offline` / `user_offline` - User offline
- `match:new` / `new_match` - New match
- `conversation:joined` - User joined conversation
- `conversation:left` - User left conversation
- `error` - Error event

---

## Environment Variables

### Required

```bash
# Server
PORT=4000
NODE_ENV=production

# JWT
JWT_SECRET=your-secret-key

# Redis
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-password
REDIS_TLS=true

# CORS
ALLOWED_ORIGINS=https://flamoral.com,https://www.flamoral.com
```

---

## WebSocket URLs

### Development
```
ws://localhost:4000/socket.io
```

### Production
```
wss://api.flamoral.com/socket.io
```

---

## Error Codes

- `AUTH_REQUIRED` - No authentication token provided
- `AUTH_FAILED` - Invalid or expired token
- `DUPLICATE_CONNECTION` - User connected from another device
- `INVALID_MESSAGE` - Message format invalid
- `UNKNOWN_EVENT` - Event type not recognized

---

## Testing WebSocket Connection

### Using Browser Console

```javascript
// Connect
const socket = io('ws://localhost:4000', {
  path: '/socket.io',
  auth: { token: 'your-jwt-token' },
  transports: ['websocket', 'polling']
});

// Listen for connection
socket.on('connect', () => {
  console.log('Connected!', socket.id);
});

socket.on('connected', (data) => {
  console.log('Server confirmed:', data);
});

// Send message
socket.emit('message:send', {
  conversationId: 'conv-123',
  content: 'Hello!',
  type: 'text'
}, (response) => {
  console.log('Response:', response);
});

// Listen for messages
socket.on('message:new', (message) => {
  console.log('New message:', message);
});
```

### Using curl (Health Check)

```bash
curl http://localhost:4000/health
```

---

## Common Issues and Solutions

### Issue: Connection Refused
**Solution:** Check that API Gateway is running and PORT is correct

### Issue: CORS Error
**Solution:** Add your origin to ALLOWED_ORIGINS environment variable

### Issue: Authentication Failed
**Solution:** Verify JWT token is valid and not expired

### Issue: Messages Not Received
**Solution:** Ensure you've joined the conversation room first

### Issue: Reconnection Issues
**Solution:** Check network connectivity and Redis connection

---

## Redis Adapter (Horizontal Scaling)

### Check if Redis Adapter is Active

Look for this in server logs:
```
✅ Redis adapter for Socket.IO connected successfully
✅ Socket.IO using Redis adapter for horizontal scaling
```

### If Redis Unavailable

Server will fall back to standalone mode:
```
⚠️ Failed to connect to Redis for Socket.IO adapter
⚠️ Running Socket.IO in standalone mode (no horizontal scaling)
```

---

## Debugging Tips

### Enable Socket.IO Debug Logs (Client)

```javascript
localStorage.debug = 'socket.io-client:*';
```

### Enable Socket.IO Debug Logs (Server)

```bash
DEBUG=socket.io:* npm run start:dev
```

### Monitor WebSocket Traffic

Use browser DevTools → Network → WS to see WebSocket frames

---

## Performance Tips

1. **Join only active conversations** - Don't join all conversations at once
2. **Unsubscribe from events** - Always cleanup event listeners
3. **Batch messages** - Send multiple messages together when possible
4. **Use message compression** - Enabled by default for messages > 1KB
5. **Limit reconnection attempts** - Default is 5 attempts

---

## Security Best Practices

1. **Always use wss:// in production** - Never use ws:// (unencrypted)
2. **Validate JWT on server** - Done automatically
3. **Use HTTPS for token exchange** - Never send JWT over HTTP
4. **Set secure cookies** - Enabled in production mode
5. **Implement rate limiting** - Already configured

---

## Architecture Overview

```
┌─────────────┐
│  Web Client │
└──────┬──────┘
       │ wss://
       │
┌──────┴──────────┐      ┌─────────────┐
│  API Gateway    │──────│    Redis    │
│  (Socket.IO)    │      │  (Pub/Sub)  │
└──────┬──────────┘      └─────────────┘
       │
┌──────┴──────────┐
│  Realtime Svc   │
│  (Go WebSocket) │
└─────────────────┘
```

---

## Quick Commands

### Install Dependencies
```bash
cd backend/services/api-gateway
npm install
```

### Run Development
```bash
npm run start:dev
```

### Run Production
```bash
npm run build
npm run start:prod
```

### Test Connection
```bash
# Node.js test script
node -e "const io = require('socket.io-client'); const socket = io('ws://localhost:4000', { path: '/socket.io', auth: { token: 'test' } }); socket.on('connect', () => console.log('Connected!')); socket.on('error', (e) => console.error('Error:', e));"
```

---

## Support

For issues or questions:
1. Check server logs for errors
2. Verify environment variables
3. Test with health check endpoint: `GET /health`
4. Review comprehensive documentation: `WEBSOCKET_FIXES_COMPLETE.md`

---

**Last Updated:** 2025-12-15
**Status:** ✅ Production Ready
