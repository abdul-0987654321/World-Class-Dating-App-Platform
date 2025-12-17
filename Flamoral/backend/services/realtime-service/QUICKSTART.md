# Quick Start Guide - Heartly Realtime Service

Get the Heartly Realtime Service running in under 5 minutes!

## Prerequisites

- Go 1.21+ installed
- Docker and Docker Compose installed (optional, but recommended)
- Redis running (or use Docker Compose)

## Option 1: Docker Compose (Recommended)

The fastest way to get started:

```bash
# 1. Navigate to the project directory
cd realtime-service

# 2. Start the service with Redis
docker-compose up -d

# 3. Check logs
docker-compose logs -f realtime-service

# 4. Test the service
curl http://localhost:8081/health
```

That's it! The service is now running on `http://localhost:8081` with Redis.

### Test with the Web Client

1. Open `examples/client.html` in your browser
2. The default URL `ws://localhost:8081/ws` should be pre-filled
3. Click "Connect" (it will use a test token)
4. Try sending messages!

### Stop the Service

```bash
docker-compose down
```

## Option 2: Local Development (Go)

### 1. Install Dependencies

```bash
go mod download
```

### 2. Start Redis

You need Redis running. Quick start with Docker:

```bash
docker run -d -p 6379:6379 redis:7-alpine
```

Or use a local Redis installation.

### 3. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

The defaults are fine for local development.

### 4. Run the Service

```bash
# Standard run
go run cmd/server/main.go

# OR with Makefile
make run

# OR with hot reload (requires air)
make dev
```

The service will start on `http://localhost:8081`.

### 5. Test It

```bash
# Health check
curl http://localhost:8081/health

# Ready check (validates Redis)
curl http://localhost:8081/ready

# Metrics
curl http://localhost:8081/metrics
```

## Option 3: Build and Run Binary

```bash
# Build
make build

# Run
./realtime-service
```

## Testing the WebSocket Connection

### Method 1: Web Client (Easiest)

Open `examples/client.html` in your browser for an interactive test interface.

### Method 2: Command Line (wscat)

Install wscat:
```bash
npm install -g wscat
```

Connect:
```bash
wscat -c "ws://localhost:8081/ws?token=test-token"
```

Send a message:
```json
{"event":"ping","data":{},"timestamp":"2024-01-01T00:00:00Z"}
```

### Method 3: JavaScript/Node.js

```javascript
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8081/ws?token=test-token');

ws.on('open', () => {
    console.log('Connected!');

    // Send a ping
    ws.send(JSON.stringify({
        event: 'ping',
        data: {},
        timestamp: new Date().toISOString()
    }));
});

ws.on('message', (data) => {
    console.log('Received:', data.toString());
});
```

## Common Commands

```bash
# Start service
make run

# Run with hot reload
make dev

# Build binary
make build

# Run tests
make test

# Run tests with coverage
make test-coverage

# Format code
make fmt

# Lint code
make lint

# Clean build files
make clean

# Build Docker image
make docker-build

# Run Docker container
make docker-run

# Start with monitoring
docker-compose --profile monitoring up -d
```

## Monitoring Stack (Optional)

Start the service with Prometheus and Grafana:

```bash
docker-compose --profile monitoring up -d
```

Access:
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001 (admin/admin)
- Redis Commander: Start with `docker-compose --profile debug up -d`, then http://localhost:8082

## Environment Variables

### Essential Variables

```bash
# Server
PORT=8081                          # Port to listen on
ENVIRONMENT=development            # Environment name

# Redis (Required)
REDIS_HOST=localhost              # Redis hostname
REDIS_PORT=6379                   # Redis port
REDIS_PASSWORD=                   # Redis password (if any)

# JWT (Required for auth)
JWT_SECRET=your-secret-key        # JWT signing secret
```

### Optional Variables

```bash
# Logging
LOG_LEVEL=info                    # debug, info, warn, error

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# WebSocket Tuning
WS_MAX_MESSAGE_SIZE=524288        # 512KB
WS_PONG_WAIT=60s
WS_PING_PERIOD=54s

# Presence
PRESENCE_TTL=5m                   # How long before marking offline
PRESENCE_HEARTBEAT=30s            # Heartbeat interval

# Typing
TYPING_TIMEOUT=5s                 # Auto-stop typing after
```

## Creating a Test JWT Token

For local development, you can use a simple test token, or generate a real one:

### Using the Service's Token Generator

The service includes a token generation function in `internal/auth/jwt.go`. You can create a simple CLI tool:

```go
// tools/generate-token/main.go
package main

import (
    "fmt"
    "os"
    "time"

    "github.com/heartly/realtime-service/internal/auth"
    "github.com/heartly/realtime-service/internal/config"
)

func main() {
    cfg := config.Load()
    jwtAuth := auth.NewJWTAuth(cfg)

    token, err := jwtAuth.GenerateToken(
        "user-123",           // User ID
        "test@example.com",   // Email
        "user",               // Role
        24 * time.Hour,       // Expiration
    )

    if err != nil {
        fmt.Fprintf(os.Stderr, "Error: %v\n", err)
        os.Exit(1)
    }

    fmt.Println(token)
}
```

Run it:
```bash
go run tools/generate-token/main.go
```

### Using jwt.io

1. Go to https://jwt.io
2. Set algorithm to HS256
3. Set payload:
```json
{
  "userId": "user-123",
  "email": "test@example.com",
  "role": "user",
  "iss": "heartly",
  "sub": "user-123",
  "exp": 1735689600
}
```
4. Set secret to match your JWT_SECRET
5. Copy the encoded token

## Next Steps

### 1. Integrate with Your Backend

Update your authentication service to include the realtime service URL in login responses:

```json
{
  "accessToken": "...",
  "user": {...},
  "realtimeWs": "wss://realtime.yourdomain.com/ws"
}
```

### 2. Connect from Frontend

Use the JavaScript SDK:

```javascript
import HeartlyRealtimeClient from './client.js';

const client = new HeartlyRealtimeClient(
    'ws://localhost:8081/ws',
    userAccessToken
);

client.on('connected', () => {
    console.log('Connected to realtime service!');
});

client.on('message:new', (data) => {
    console.log('New message:', data);
    // Update UI
});

client.connect();
```

### 3. Send Messages

```javascript
// Send a chat message
client.sendMessage('conversation-123', 'Hello!');

// Start typing
client.startTyping('conversation-123');

// Update presence
client.updatePresence('online');
```

### 4. Deploy to Production

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

## Troubleshooting

### Connection Refused

**Problem**: Can't connect to ws://localhost:8081/ws

**Solutions**:
1. Check service is running: `curl http://localhost:8081/health`
2. Check logs: `docker-compose logs -f realtime-service`
3. Verify Redis is running: `docker ps | grep redis`

### Authentication Failed

**Problem**: WebSocket connection fails with 401 Unauthorized

**Solutions**:
1. Verify JWT token is valid
2. Check JWT_SECRET matches between token generator and service
3. Check token hasn't expired

### Redis Connection Failed

**Problem**: Service logs show "Failed to connect to Redis"

**Solutions**:
1. Start Redis: `docker run -d -p 6379:6379 redis:7-alpine`
2. Check REDIS_HOST and REDIS_PORT in .env
3. Test Redis: `redis-cli ping` (should return PONG)

### Messages Not Received

**Problem**: Messages sent but not received by other clients

**Solutions**:
1. Check both clients are connected
2. Verify Redis pub/sub is working
3. Check logs for errors
4. Test with example client

## Getting Help

1. Check the logs: `docker-compose logs -f`
2. Review the README.md for detailed documentation
3. Check DEPLOYMENT.md for production issues
4. Test with examples/client.html to isolate issues

## Resources

- [README.md](README.md) - Full documentation
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guide
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Technical details
- [examples/client.html](examples/client.html) - Interactive test client
- [examples/client.js](examples/client.js) - JavaScript SDK

---

**Congratulations!** You now have a fully functional realtime WebSocket service running. Start building amazing real-time features for your dating app! 💘
