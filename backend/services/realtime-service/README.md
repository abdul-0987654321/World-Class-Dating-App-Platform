# Heartly Realtime Service

A production-ready WebSocket service for real-time communication in the Heartly dating platform. Built with Go and Gorilla WebSocket.

## Features

- **WebSocket Connection Management**
  - Authentication via JWT token (URL parameter, header, or cookie)
  - Automatic reconnection handling
  - Connection health monitoring with ping/pong
  - Graceful shutdown with connection cleanup

- **Message Types**
  - `message:send` - Send chat messages
  - `message:read` - Mark messages as read
  - `message:react` - React to messages with emojis
  - `typing:start` / `typing:stop` - Typing indicators
  - `presence:update` - Update online/away/offline status
  - Server events: `message:new`, `match:new`, `notification`, etc.

- **Presence Tracking**
  - Real-time online/offline/away status
  - Last seen tracking
  - Bulk presence queries
  - Presence change subscriptions

- **Typing Indicators**
  - Per-conversation typing state
  - Automatic timeout (configurable)
  - Redis-backed for multi-instance sync

- **Redis Pub/Sub**
  - Message distribution across service instances
  - Support for horizontal scaling
  - Channel-based routing

- **REST API**
  - `/health` - Health check
  - `/ready` - Readiness check (validates Redis)
  - `/metrics` - Prometheus metrics
  - `/api/v1/presence/{userId}` - Get user presence
  - `/api/v1/online` - List online users
  - `/api/v1/typing/{conversationId}` - Get typing users

## Getting Started

### Prerequisites

- Go 1.21 or higher
- Redis 6.0 or higher

### Installation

1. Clone the repository
2. Copy `.env.example` to `.env` and configure:
   ```bash
   cp .env.example .env
   ```

3. Install dependencies:
   ```bash
   go mod download
   ```

4. Run the service:
   ```bash
   go run cmd/server/main.go
   ```

### Docker

Build and run with Docker:

```bash
# Build
docker build -t heartly-realtime .

# Run
docker run -p 8081:8081 --env-file .env heartly-realtime
```

### Development

```bash
# Run with hot reload (requires air)
air

# Run tests
go test ./...

# Run tests with coverage
go test -cover ./...

# Build binary
make build

# Run linter
make lint
```

## WebSocket Protocol

### Connection

Connect to WebSocket endpoint with JWT token:

```
ws://localhost:8081/ws?token=YOUR_JWT_TOKEN
```

Or use Authorization header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Message Format

All messages follow this JSON structure:

```json
{
  "event": "event_name",
  "data": { ... },
  "requestId": "optional-client-id",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Client → Server Events

**Send Message**
```json
{
  "event": "message:send",
  "data": {
    "conversationId": "conv-123",
    "type": "TEXT",
    "content": {
      "text": "Hello!"
    },
    "tempId": "temp-456"
  }
}
```

**Mark as Read**
```json
{
  "event": "message:read",
  "data": {
    "conversationId": "conv-123",
    "messageId": "msg-789"
  }
}
```

**Typing Start**
```json
{
  "event": "typing:start",
  "data": {
    "conversationId": "conv-123"
  }
}
```

**Typing Stop**
```json
{
  "event": "typing:stop",
  "data": {
    "conversationId": "conv-123"
  }
}
```

**Presence Update**
```json
{
  "event": "presence:update",
  "data": {
    "status": "online"  // online, away, offline
  }
}
```

### Server → Client Events

**Connected**
```json
{
  "event": "connected",
  "data": {
    "userId": "user-123",
    "sessionId": "session-456",
    "serverTime": "2024-01-01T00:00:00Z"
  }
}
```

**New Message**
```json
{
  "event": "message:new",
  "data": {
    "message": {
      "id": "msg-789",
      "conversationId": "conv-123",
      "senderId": "user-456",
      "type": "TEXT",
      "content": { "text": "Hello!" },
      "createdAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

**Typing Indicator**
```json
{
  "event": "typing:indicator",
  "data": {
    "conversationId": "conv-123",
    "userId": "user-456",
    "isTyping": true
  }
}
```

**Presence Changed**
```json
{
  "event": "presence:changed",
  "data": {
    "userId": "user-456",
    "status": "online",
    "lastSeen": "2024-01-01T00:00:00Z"
  }
}
```

**New Match**
```json
{
  "event": "match:new",
  "data": {
    "match": {
      "id": "match-123",
      "matchedWith": {
        "id": "user-789",
        "displayName": "Jane",
        "photoUrl": "https://..."
      },
      "matchedAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

## Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ WebSocket
       ▼
┌─────────────────────────────────────┐
│        Realtime Service             │
│  ┌──────────┐      ┌──────────┐    │
│  │   Hub    │◄────►│  Client  │    │
│  └─────┬────┘      └──────────┘    │
│        │                            │
│  ┌─────▼────┐  ┌────────────┐      │
│  │ Presence │  │   Typing   │      │
│  └──────────┘  └────────────┘      │
└──────────┬──────────────────────────┘
           │
           ▼
    ┌─────────────┐
    │    Redis    │
    │  Pub/Sub    │
    └─────────────┘
```

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8081` | Server port |
| `ENVIRONMENT` | `development` | Environment name |
| `LOG_LEVEL` | `info` | Log level (debug, info, warn, error) |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | CORS allowed origins |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `JWT_SECRET` | - | JWT secret key (required) |
| `WS_MAX_MESSAGE_SIZE` | `524288` | Max message size (bytes) |
| `PRESENCE_TTL` | `5m` | Presence expiration time |
| `TYPING_TIMEOUT` | `5s` | Typing indicator timeout |

## Monitoring

### Prometheus Metrics

Available at `/metrics`:

- Connection count
- Message throughput
- Error rates
- Latency histograms

### Health Checks

- `/health` - Always returns 200 if service is running
- `/ready` - Returns 200 if Redis is connected

## Production Deployment

### Best Practices

1. **Use SSL/TLS**: Always use `wss://` in production
2. **Set JWT Secret**: Use a strong, random JWT secret
3. **Configure CORS**: Limit allowed origins to your domains
4. **Redis Persistence**: Enable Redis persistence for production
5. **Horizontal Scaling**: Run multiple instances behind a load balancer
6. **Monitoring**: Set up Prometheus and Grafana for metrics
7. **Rate Limiting**: Configure appropriate rate limits

### Load Balancing

For horizontal scaling, use sticky sessions or Redis-based session storage:

```nginx
upstream realtime {
    ip_hash;  # Sticky sessions
    server realtime1:8081;
    server realtime2:8081;
    server realtime3:8081;
}
```

### Resource Limits

Recommended limits:
- Memory: 512MB - 2GB per instance
- CPU: 1-2 cores per instance
- Max connections: 10,000 per instance

## Troubleshooting

### WebSocket Connection Fails

1. Check JWT token validity
2. Verify CORS settings
3. Check Redis connection
4. Review server logs

### Messages Not Received

1. Verify Redis pub/sub is working
2. Check client subscriptions
3. Review message routing logic
4. Check for errors in logs

### High Memory Usage

1. Check for connection leaks
2. Review buffer sizes
3. Monitor active connections
4. Adjust cleanup intervals

## License

Proprietary - Heartly Dating Platform
