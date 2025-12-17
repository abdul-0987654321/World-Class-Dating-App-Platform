# WebSocket Quick Reference Guide

## Connection URLs

### Production
```
Socket.IO (Web App):  wss://api.flamoral.com
Realtime Service:     wss://api.flamoral.com/realtime/ws
API:                  https://api.flamoral.com/api/v1
```

### Development
```
Socket.IO (Web App):  http://localhost:3000
Realtime Service:     http://localhost:8081/ws
API:                  http://localhost:3000/api/v1
```

## Quick Setup

### 1. Install Socket Client
```bash
npm install @flamoral/socket-client
# or
yarn add @flamoral/socket-client
```

### 2. Connect to WebSocket
```typescript
import { SocketClient } from '@flamoral/socket-client';

const socket = new SocketClient({
  url: process.env.VITE_SOCKET_URL,
});

await socket.connect({
  token: authToken,
  userId: currentUser.id,
});
```

### 3. Listen for Events
```typescript
// New messages
socket.on('message', (msg) => {
  console.log('New message:', msg);
});

// Typing indicators
socket.on('typing', ({ userId, isTyping }) => {
  console.log(`${userId} is typing: ${isTyping}`);
});

// Presence updates
socket.on('presence', ({ userId, status }) => {
  console.log(`${userId} is now ${status}`);
});

// New matches
socket.on('new_match', (match) => {
  console.log('New match!', match);
});
```

### 4. Send Events
```typescript
// Send message
await socket.sendMessage(conversationId, 'Hello!');

// Join conversation
socket.joinConversation(conversationId);

// Send typing indicator
socket.setTyping(conversationId, true);

// Mark as read
socket.markAsRead(conversationId, messageId);
```

## Common Issues & Fixes

### ❌ Connection Refused
```typescript
// ✅ Make sure URL includes protocol
const socket = new SocketClient({
  url: 'https://api.flamoral.com', // ✅ Good
  // url: 'api.flamoral.com',      // ❌ Bad - missing protocol
});
```

### ❌ Authentication Failed
```typescript
// ✅ Include valid JWT token
await socket.connect({
  token: 'eyJhbGciOiJIUzI1NiIs...', // ✅ Good - valid JWT
  userId: 'user-123',
});

// ❌ Don't use expired or invalid tokens
```

### ❌ CORS Errors
```typescript
// ✅ Enable credentials
const socket = io('https://api.flamoral.com', {
  withCredentials: true, // ✅ Required for CORS
  auth: { token },
});
```

### ❌ Messages Not Received
```typescript
// ✅ Join conversation before sending
socket.joinConversation(conversationId);
await socket.sendMessage(conversationId, 'Hello!');

// ❌ Don't send without joining
```

## Environment Variables

### Web App (.env.production)
```env
VITE_SOCKET_URL=https://api.flamoral.com
VITE_WS_URL=wss://api.flamoral.com/ws
VITE_REALTIME_URL=wss://api.flamoral.com/realtime/ws
```

### Backend Services
```env
# API Gateway
PORT=3000
ALLOWED_ORIGINS=https://flamoral.com,https://www.flamoral.com
JWT_SECRET=*** # From Azure Key Vault

# Realtime Service
PORT=8081
REDIS_HOST=flamoral-prod-redis.redis.cache.windows.net
REDIS_PORT=6380
REDIS_TLS=true
JWT_SECRET=*** # From Azure Key Vault
SERVICE_TOKEN=*** # From Azure Key Vault
```

## Testing

### Browser Console
```javascript
// Quick test in production
const socket = io('https://api.flamoral.com', {
  auth: { token: localStorage.getItem('accessToken') },
  path: '/socket.io',
});

socket.on('connect', () => console.log('✅ Connected'));
socket.on('connect_error', (err) => console.error('❌ Error:', err));
socket.on('authenticated', () => console.log('✅ Authenticated'));
```

### Command Line
```bash
# Health check - API Gateway
curl https://api.flamoral.com/health

# Health check - Realtime Service
curl https://api.flamoral.com/realtime/health

# Ready check (validates Redis)
curl https://api.flamoral.com/realtime/ready

# WebSocket test (requires websocat)
websocat wss://api.flamoral.com/socket.io/?EIO=4&transport=websocket \
  --header="Authorization: Bearer YOUR_TOKEN"
```

### Kubernetes
```bash
# Check pod status
kubectl get pods -n flamoral | grep -E "(api-gateway|realtime)"

# View logs
kubectl logs -f deployment/api-gateway -n flamoral
kubectl logs -f deployment/realtime-service -n flamoral

# Test from inside pod
kubectl exec -it deployment/realtime-service -n flamoral -- \
  wget -O- http://localhost:8081/ready
```

## Event Reference

### Server → Client Events

| Event | Description | Payload |
|-------|-------------|---------|
| `connect` | Connected to server | - |
| `disconnect` | Disconnected from server | `reason: string` |
| `authenticated` | Successfully authenticated | `{ userId: string }` |
| `message` | New message received | `Message` |
| `message_delivered` | Message delivered | `{ messageId: string }` |
| `message_read` | Message read | `{ messageId: string, conversationId: string }` |
| `typing` | Typing indicator | `{ userId: string, conversationId: string, isTyping: boolean }` |
| `presence` | User status change | `{ userId: string, status: 'online' \| 'away' \| 'offline' }` |
| `new_match` | New match notification | `{ matchId: string, userId: string, userName: string }` |
| `new_like` | New like received | `{ fromUserId: string, fromUserName: string }` |
| `call_signal` | Video call signaling | `CallSignal` |
| `error` | Error occurred | `{ message: string, code?: string }` |

### Client → Server Events

| Event | Description | Payload |
|-------|-------------|---------|
| `send_message` | Send a message | `{ conversationId: string, content: string, type?: string }` |
| `join_conversation` | Join conversation room | `{ conversationId: string }` |
| `leave_conversation` | Leave conversation room | `{ conversationId: string }` |
| `typing` | Send typing indicator | `{ conversationId: string, isTyping: boolean }` |
| `mark_read` | Mark messages as read | `{ conversationId: string, messageIds: string[] }` |
| `get_online_status` | Request online status | `{ userIds: string[] }` |

## Architecture

```
Client (Browser/App)
       ↓
   Socket.IO
       ↓
  API Gateway (NestJS)
       ↓
   Redis Pub/Sub
       ↓
  Realtime Service (Go)
       ↓
  Broadcasting to all connected clients
```

## Best Practices

### ✅ DO

1. **Always handle disconnections**
   ```typescript
   socket.on('disconnect', () => {
     // Show offline indicator
     // Queue messages for retry
   });
   ```

2. **Use reconnection logic**
   ```typescript
   const socket = new SocketClient({
     url: apiUrl,
     reconnection: true,
     reconnectionAttempts: 10,
   });
   ```

3. **Join conversations before sending**
   ```typescript
   socket.joinConversation(conversationId);
   await socket.sendMessage(conversationId, message);
   ```

4. **Clean up listeners**
   ```typescript
   useEffect(() => {
     const unsubscribe = socket.on('message', handleMessage);
     return () => unsubscribe(); // Clean up on unmount
   }, []);
   ```

5. **Handle errors gracefully**
   ```typescript
   socket.on('error', (error) => {
     showNotification('Connection error', 'error');
     // Retry or fallback to polling
   });
   ```

### ❌ DON'T

1. **Don't hardcode URLs**
   ```typescript
   // ❌ Bad
   const socket = io('https://api.flamoral.com');

   // ✅ Good
   const socket = io(process.env.VITE_SOCKET_URL);
   ```

2. **Don't ignore authentication**
   ```typescript
   // ❌ Bad - no auth
   const socket = io(url);

   // ✅ Good - with auth
   const socket = io(url, { auth: { token } });
   ```

3. **Don't create multiple connections**
   ```typescript
   // ❌ Bad - creates new connection on every render
   function Component() {
     const socket = io(url);
     // ...
   }

   // ✅ Good - singleton or context
   const socket = useContext(SocketContext);
   ```

4. **Don't send messages without joining**
   ```typescript
   // ❌ Bad
   socket.sendMessage(conversationId, 'Hello');

   // ✅ Good
   socket.joinConversation(conversationId);
   socket.sendMessage(conversationId, 'Hello');
   ```

## Debugging

### Enable Debug Mode
```typescript
// Socket.IO client
localStorage.setItem('debug', 'socket.io-client:*');

// Then reload page and check console
```

### Check Connection State
```typescript
console.log('Connected:', socket.isConnected);
console.log('Authenticated:', socket.isAuthenticated);
console.log('User ID:', socket.userId);
console.log('Status:', socket.status);
console.log('Error:', socket.error);
```

### Monitor Events
```typescript
// Log all events
const events = [
  'connect',
  'disconnect',
  'message',
  'typing',
  'presence',
  'error',
];

events.forEach(event => {
  socket.on(event, (...args) => {
    console.log(`[${event}]`, ...args);
  });
});
```

## Performance Tips

1. **Batch messages** when possible
2. **Throttle typing indicators** (max 1 per second)
3. **Unsubscribe from unused events**
4. **Use presence heartbeat** instead of constant updates
5. **Limit number of subscriptions** per user

## Security

1. **Always use WSS** (WebSocket Secure) in production
2. **Validate JWT tokens** on every connection
3. **Sanitize message content** before displaying
4. **Rate limit** message sending (client and server)
5. **Use CSP headers** to restrict WebSocket origins

## Support & Resources

- 📚 Full Documentation: `/docs/api/WEBSOCKET_API.md`
- 🔧 Troubleshooting: `/WEBSOCKET_FIX_SUMMARY.md`
- 🚀 Deployment Guide: `/infrastructure/DEPLOYMENT_RUNBOOK.md`
- 📊 Monitoring: Grafana Dashboard (Redis WebSocket)

## Quick Commands Cheat Sheet

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Build for production

# Kubernetes
kubectl get pods -n flamoral   # List pods
kubectl logs -f POD_NAME       # View logs
kubectl describe pod POD_NAME  # Pod details

# Testing
curl /health                   # Health check
curl /ready                    # Ready check
websocat wss://...             # WebSocket test

# Debugging
localStorage.debug = '*'       # Enable all debug logs
localStorage.debug = 'socket.io-client:*'  # Socket.IO only
```

## Version Information

- Socket.IO Client: 4.7.0
- Socket.IO Server: 4.x
- Realtime Service: Go 1.21+
- Redis: 6.0+
- Node.js: 20.x

---

**Last Updated:** December 2024
**Maintained By:** Flamoral DevOps Team
