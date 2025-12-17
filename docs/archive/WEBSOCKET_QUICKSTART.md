# WebSocket Integration - Quick Start Guide

## Prerequisites

- Go 1.21+ installed
- Node.js 18+ installed
- Redis running on localhost:6379
- Cosmos DB account (for Messaging Service)

## Setup

### 1. Start Redis

```bash
# Using Docker
docker run -d -p 6379:6379 redis:7-alpine

# Or using local Redis
redis-server
```

### 2. Configure Realtime Service

```bash
cd realtime-service

# Create .env file
cat > .env <<EOF
PORT=8081
ENVIRONMENT=development
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-jwt-secret-key
SERVICE_TOKEN=dev-service-token-change-in-production
PRESENCE_TTL=5m
TYPING_TIMEOUT=5s
EOF

# Install dependencies
go mod download

# Run the service
go run cmd/server/main.go
```

The Realtime Service will start on `http://localhost:8081`

### 3. Configure Messaging Service

```bash
cd messaging-service

# Create .env file
cat > .env <<EOF
PORT=3003
NODE_ENV=development
JWT_ACCESS_SECRET=your-jwt-secret-key
REDIS_HOST=localhost
REDIS_PORT=6379
REALTIME_SERVICE_URL=http://localhost:8081
SERVICE_TOKEN=dev-service-token-change-in-production

# Cosmos DB (replace with your values)
COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/
COSMOS_KEY=your-cosmos-key
COSMOS_DATABASE_ID=Flamoral
COSMOS_MESSAGES_CONTAINER=Messages
COSMOS_CONVERSATIONS_CONTAINER=Conversations
EOF

# Install dependencies
npm install

# Run the service
npm run dev
```

The Messaging Service will start on `http://localhost:3003`

## Testing the Integration

### 1. Connect to WebSocket

Using JavaScript/TypeScript:

```typescript
const ws = new WebSocket('ws://localhost:8081/ws', {
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  }
});

ws.onopen = () => {
  console.log('Connected to WebSocket');

  // Send a ping
  ws.send(JSON.stringify({
    event: 'ping',
    timestamp: new Date().toISOString()
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);

  switch (data.event) {
    case 'connected':
      console.log('Session ID:', data.data.sessionId);
      break;
    case 'message:new':
      console.log('New message:', data.data);
      break;
    case 'typing:indicator':
      console.log('Typing:', data.data);
      break;
    case 'message:read_receipt':
      console.log('Read receipt:', data.data);
      break;
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('WebSocket closed');
};
```

### 2. Send a Message

```typescript
// Using fetch API
async function sendMessage(receiverId: string, content: string, token: string) {
  const response = await fetch('http://localhost:3003/api/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      receiverId,
      content,
      type: 'TEXT'
    })
  });

  const result = await response.json();
  console.log('Message sent:', result);
  return result;
}

// The receiver will get the message via WebSocket:
// { event: 'message:new', data: { id, conversationId, senderId, content, ... } }
```

### 3. Send Typing Indicator

```typescript
// Via WebSocket
ws.send(JSON.stringify({
  event: 'typing:start',
  data: {
    conversationId: 'conv-123'
  },
  timestamp: new Date().toISOString()
}));

// Or via HTTP
async function sendTypingIndicator(conversationId: string, isTyping: boolean, token: string) {
  const response = await fetch(`http://localhost:3003/api/conversations/${conversationId}/typing`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ isTyping })
  });

  return await response.json();
}

// Stop typing after 5 seconds
setTimeout(() => {
  ws.send(JSON.stringify({
    event: 'typing:stop',
    data: {
      conversationId: 'conv-123'
    },
    timestamp: new Date().toISOString()
  }));
}, 5000);
```

### 4. Mark Messages as Read

```typescript
// Via WebSocket (single message)
ws.send(JSON.stringify({
  event: 'message:read',
  data: {
    conversationId: 'conv-123',
    messageId: 'msg-456'
  },
  timestamp: new Date().toISOString()
}));

// Via HTTP (entire conversation)
async function markConversationAsRead(conversationId: string, token: string) {
  const response = await fetch(`http://localhost:3003/api/conversations/${conversationId}/read`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return await response.json();
}

// The sender will receive read receipt via WebSocket:
// { event: 'message:read_receipt', data: { conversationId, messageId, readBy, readAt } }
```

### 5. Update Presence

```typescript
// Via WebSocket
ws.send(JSON.stringify({
  event: 'presence:update',
  data: {
    status: 'online' // or 'away', 'offline'
  },
  timestamp: new Date().toISOString()
}));

// Check user's presence
async function checkPresence(userId: string, serviceToken: string) {
  const response = await fetch(`http://localhost:8081/api/v1/presence/${userId}`, {
    headers: {
      'X-Service-Token': serviceToken
    }
  });

  const result = await response.json();
  console.log('User presence:', result.data);
  return result;
}
```

## Example: Complete Chat Flow

```typescript
class ChatClient {
  private ws: WebSocket;
  private token: string;
  private userId: string;

  constructor(token: string, userId: string) {
    this.token = token;
    this.userId = userId;
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(`ws://localhost:8081/ws?token=${this.token}`);

    this.ws.onopen = () => {
      console.log('Connected to chat');
      this.updatePresence('online');
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.ws.onclose = () => {
      console.log('Disconnected from chat');
      setTimeout(() => this.connect(), 5000); // Reconnect after 5s
    };
  }

  handleMessage(message: any) {
    switch (message.event) {
      case 'connected':
        console.log('Session started:', message.data.sessionId);
        break;

      case 'message:new':
        this.onNewMessage(message.data);
        break;

      case 'typing:indicator':
        this.onTypingIndicator(message.data);
        break;

      case 'message:read_receipt':
        this.onReadReceipt(message.data);
        break;

      case 'presence:changed':
        this.onPresenceChanged(message.data);
        break;
    }
  }

  async sendMessage(receiverId: string, content: string, conversationId?: string) {
    const response = await fetch('http://localhost:3003/api/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({
        receiverId,
        content,
        type: 'TEXT',
        conversationId
      })
    });

    return await response.json();
  }

  startTyping(conversationId: string) {
    this.ws.send(JSON.stringify({
      event: 'typing:start',
      data: { conversationId },
      timestamp: new Date().toISOString()
    }));
  }

  stopTyping(conversationId: string) {
    this.ws.send(JSON.stringify({
      event: 'typing:stop',
      data: { conversationId },
      timestamp: new Date().toISOString()
    }));
  }

  async markAsRead(conversationId: string, messageId: string) {
    this.ws.send(JSON.stringify({
      event: 'message:read',
      data: { conversationId, messageId },
      timestamp: new Date().toISOString()
    }));
  }

  updatePresence(status: 'online' | 'away' | 'offline') {
    this.ws.send(JSON.stringify({
      event: 'presence:update',
      data: { status },
      timestamp: new Date().toISOString()
    }));
  }

  // Event handlers (implement these)
  onNewMessage(data: any) {
    console.log('New message:', data);
  }

  onTypingIndicator(data: any) {
    console.log('Typing indicator:', data);
  }

  onReadReceipt(data: any) {
    console.log('Read receipt:', data);
  }

  onPresenceChanged(data: any) {
    console.log('Presence changed:', data);
  }
}

// Usage
const chat = new ChatClient('your-jwt-token', 'user-123');

// Send a message
await chat.sendMessage('user-456', 'Hello!');

// Start typing
chat.startTyping('conv-123');

// Stop typing after user stops
setTimeout(() => chat.stopTyping('conv-123'), 3000);

// Mark message as read
await chat.markAsRead('conv-123', 'msg-456');

// Update presence
chat.updatePresence('away');
```

## Monitoring

### Check Service Health

```bash
# Realtime Service
curl http://localhost:8081/health
curl http://localhost:8081/ready

# Messaging Service
curl http://localhost:3003/health
```

### View Metrics

```bash
# Prometheus metrics (Realtime Service)
curl http://localhost:8081/metrics
```

### Redis Monitoring

```bash
# Monitor Redis pub/sub
redis-cli MONITOR

# Check active channels
redis-cli PUBSUB CHANNELS heartly:*

# Check subscribers
redis-cli PUBSUB NUMSUB heartly:messages heartly:typing
```

## Debugging

### Enable Debug Logs

**Realtime Service:**
```bash
export LOG_LEVEL=debug
go run cmd/server/main.go
```

**Messaging Service:**
```bash
export LOG_LEVEL=debug
npm run dev
```

### Common Issues

1. **WebSocket connection refused**
   - Ensure Realtime Service is running
   - Check JWT token is valid
   - Verify CORS settings

2. **Messages not delivered**
   - Check Redis is running
   - Verify SERVICE_TOKEN matches on both services
   - Ensure receiver is connected

3. **Read receipts not working**
   - Check conversation exists
   - Verify user is participant
   - Ensure message IDs are correct

## Next Steps

- Read the full documentation: `WEBSOCKET_INTEGRATION.md`
- Explore API endpoints in detail
- Implement error handling and reconnection logic
- Add message encryption
- Set up monitoring and alerts
- Deploy to production environment

## Support

For issues and questions, please refer to:
- Full documentation: `WEBSOCKET_INTEGRATION.md`
- API documentation in the main docs
- Service logs for debugging
