# WebSocket & Real-Time Connectivity Fix Summary

## Overview
This document summarizes the fixes applied to the WebSocket and real-time connectivity infrastructure for flamoral.com.

## Issues Identified and Fixed

### 1. WebSocket URL Configuration Issues

**Problem:**
- Incorrect WebSocket URL in web app environment configuration
- Missing path configuration for Socket.IO connections
- Confusion between API Gateway WebSocket and Realtime Service

**Fix:**
- Updated `apps/web-app/.env.production`:
  - `VITE_WS_URL=wss://api.flamoral.com/ws` - WebSocket endpoint
  - `VITE_SOCKET_URL=https://api.flamoral.com` - Socket.IO endpoint
  - `VITE_REALTIME_URL=wss://api.flamoral.com/realtime/ws` - Direct realtime service
- Updated `apps/web-app/src/services/socket.service.ts`:
  - Added `path: '/socket.io'` configuration
  - Added `timeout: 20000` for proper timeout handling
  - Added `withCredentials: true` for CORS support

### 2. API Gateway WebSocket Namespace Issue

**Problem:**
- WebSocket gateway using `/ws` namespace which conflicts with path-based routing
- Limited CORS origins configuration

**Fix:**
- Updated `backend/services/api-gateway/src/websocket/websocket.gateway.ts`:
  - Removed `namespace: '/ws'` (namespaces are for Socket.IO logical separation, not URL paths)
  - Changed to `path: '/socket.io'` (standard Socket.IO path)
  - Added localhost origins for development: `http://localhost:3000`, `http://localhost:5173`

### 3. Socket Client Configuration

**Problem:**
- Missing `reconnectionDelayMax` configuration
- Missing transport configuration
- No credential support for CORS

**Fix:**
- Updated `packages/socket-client/src/SocketClient.ts`:
  - Added `reconnectionDelayMax: 5000` to DEFAULT_CONFIG
  - Added `transports: ['websocket', 'polling']` for fallback support
  - Added `withCredentials: true` for CORS authentication
- Updated `packages/socket-client/src/types.ts`:
  - Added `reconnectionDelayMax?: number` to SocketConfig interface

### 4. Missing SERVICE_TOKEN Environment Variable

**Problem:**
- Realtime service requires `SERVICE_TOKEN` for service-to-service authentication
- Not configured in production environment

**Fix:**
- Updated `infrastructure/config/.env.production`:
  - Added `SERVICE_TOKEN=***` with note to store in Azure Key Vault

### 5. Realtime Service Kubernetes Deployment Issues

**Problem:**
- Missing critical environment variables
- Incorrect health check endpoints
- REDIS_TLS not properly configured

**Fix:**
- Updated `infrastructure/kubernetes/production/deployments/realtime-service.yaml`:
  - Added `ENVIRONMENT=production`
  - Added `LOG_LEVEL=info`
  - Added `ALLOWED_ORIGINS` with all production domains
  - Added `JWT_ISSUER=flamoral-auth-service`
  - Added `JWT_EXPIRATION=15m`
  - Set `REDIS_TLS=true` (hardcoded for production Azure Redis)
  - Added `REDIS_DB=0`
  - Changed readiness probe from `/health` to `/ready` (validates Redis connection)

## Architecture

### WebSocket Connection Flow

```
┌─────────────────┐
│   Web Client    │
│ (Browser/App)   │
└────────┬────────┘
         │
         │ WSS/HTTPS
         │
         ▼
┌─────────────────────────────────────┐
│     Azure Front Door / Ingress      │
│   - TLS Termination                 │
│   - Load Balancing                  │
│   - CDN & Caching                   │
└────────┬────────────────────────────┘
         │
         ├─────────────────────────────────┐
         │                                 │
         ▼                                 ▼
┌─────────────────┐            ┌──────────────────┐
│  API Gateway    │            │ Realtime Service │
│  (Port 3000)    │            │   (Port 8081)    │
│                 │            │                  │
│ Socket.IO       │            │ Native WebSocket │
│ /socket.io      │            │ /ws endpoint     │
│                 │            │                  │
│ - Messaging     │            │ - Pub/Sub        │
│ - Presence      │            │ - Presence       │
│ - Typing        │            │ - Typing         │
│ - Matches       │            │ - Message Relay  │
│ - Calls         │            │ - Broadcasting   │
└────────┬────────┘            └────────┬─────────┘
         │                              │
         │                              │
         └──────────┬───────────────────┘
                    │
                    ▼
         ┌──────────────────┐
         │   Redis Cache    │
         │   (Azure Redis)  │
         │                  │
         │ - Pub/Sub        │
         │ - Session Store  │
         │ - Presence Data  │
         │ - Typing State   │
         └──────────────────┘
```

### Two WebSocket Systems

**1. API Gateway WebSocket (Socket.IO)**
- **URL:** `wss://api.flamoral.com` (connects to `/socket.io` path)
- **Technology:** Socket.IO (NestJS)
- **Purpose:** Primary real-time communication for web app
- **Features:**
  - Authentication via JWT
  - Room-based messaging
  - Automatic reconnection
  - Fallback to HTTP long-polling

**2. Realtime Service (Native WebSocket)**
- **URL:** `wss://api.flamoral.com/realtime/ws` (or internal: `ws://realtime-service:8081/ws`)
- **Technology:** Go with Gorilla WebSocket
- **Purpose:** High-performance message relay and pub/sub
- **Features:**
  - Redis pub/sub integration
  - Horizontal scaling support
  - Presence tracking
  - Typing indicators
  - Service-to-service messaging

## Configuration Reference

### Environment Variables (Production)

**Web App:**
```env
VITE_API_URL=https://api.flamoral.com/api/v1
VITE_WS_URL=wss://api.flamoral.com/ws
VITE_SOCKET_URL=https://api.flamoral.com
VITE_REALTIME_URL=wss://api.flamoral.com/realtime/ws
```

**API Gateway:**
```env
PORT=3000
ALLOWED_ORIGINS=https://flamoral.com,https://www.flamoral.com,https://app.flamoral.com,https://admin.flamoral.com
JWT_SECRET=*** # From Azure Key Vault
REDIS_URL=*** # Azure Redis with TLS
```

**Realtime Service:**
```env
PORT=8081
ENVIRONMENT=production
LOG_LEVEL=info
ALLOWED_ORIGINS=https://flamoral.com,https://www.flamoral.com,https://app.flamoral.com,https://admin.flamoral.com

# Redis (Azure Cache for Redis)
REDIS_HOST=flamoral-prod-redis.redis.cache.windows.net
REDIS_PORT=6380
REDIS_PASSWORD=*** # From Azure Key Vault
REDIS_TLS=true
REDIS_DB=0

# JWT Authentication
JWT_SECRET=*** # From Azure Key Vault
JWT_ISSUER=flamoral-auth-service
JWT_EXPIRATION=15m

# Service-to-Service Auth
SERVICE_TOKEN=*** # From Azure Key Vault
```

### Socket.IO Client Configuration

```typescript
import { io } from 'socket.io-client';

const socket = io('https://api.flamoral.com', {
  path: '/socket.io',
  auth: { token: 'JWT_TOKEN' },
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  withCredentials: true,
});
```

### Using @flamoral/socket-client Package

```typescript
import { SocketClient } from '@flamoral/socket-client';

const client = new SocketClient({
  url: 'https://api.flamoral.com',
  path: '/socket.io',
  reconnection: true,
  reconnectionAttempts: 10,
  timeout: 20000,
});

// Connect with authentication
await client.connect({
  token: userToken,
  userId: currentUserId,
});

// Subscribe to messages
client.on('message', (message) => {
  console.log('New message:', message);
});

// Send a message
await client.sendMessage(conversationId, 'Hello!');

// Join a conversation
client.joinConversation(conversationId);

// Send typing indicator
client.setTyping(conversationId, true);
```

## CORS Configuration

### API Gateway WebSocket
```typescript
cors: {
  origin: [
    'https://flamoral.com',
    'https://www.flamoral.com',
    'https://app.flamoral.com',
    'https://admin.flamoral.com',
    'http://localhost:3000',  // Development
    'http://localhost:5173',  // Vite development
  ],
  credentials: true,
}
```

### Realtime Service (Go)
```go
AllowedOrigins: []string{
  "https://flamoral.com",
  "https://www.flamoral.com",
  "https://admin.flamoral.com",
  "http://localhost:3000",
  "http://localhost:5173",
}
```

## Redis Pub/Sub Channels

The realtime service uses Redis pub/sub for message distribution:

- `heartly:messages` - Chat messages
- `heartly:matches` - New matches
- `heartly:notifications` - Push notifications
- `heartly:presence` - User online/offline status
- `heartly:typing` - Typing indicators
- `heartly:calls` - Video/audio call signaling

## Health Checks

### API Gateway
- `GET /health` - Simple health check
- WebSocket: Connect to `/socket.io` with valid JWT

### Realtime Service
- `GET /health` - Service is running
- `GET /ready` - Service is ready (validates Redis connection)
- `GET /metrics` - Prometheus metrics

## Testing WebSocket Connectivity

### 1. Test API Gateway WebSocket
```bash
# Using websocat
websocat wss://api.flamoral.com/socket.io/?EIO=4&transport=websocket \
  --header="Authorization: Bearer YOUR_JWT_TOKEN"

# Expected: Socket.IO handshake response
```

### 2. Test Realtime Service
```bash
# Health check
curl https://api.flamoral.com/realtime/health

# Ready check (validates Redis)
curl https://api.flamoral.com/realtime/ready

# WebSocket connection
websocat wss://api.flamoral.com/realtime/ws?token=YOUR_JWT_TOKEN
```

### 3. Test from Browser Console
```javascript
// Test Socket.IO connection
const socket = io('https://api.flamoral.com', {
  path: '/socket.io',
  auth: { token: localStorage.getItem('accessToken') },
});

socket.on('connect', () => console.log('Connected!'));
socket.on('connect_error', (err) => console.error('Connection error:', err));
socket.on('authenticated', (data) => console.log('Authenticated:', data));
```

## Deployment Checklist

- [ ] Update Azure Key Vault with required secrets:
  - `JWT_SECRET`
  - `SERVICE_TOKEN`
  - `REDIS_PASSWORD`

- [ ] Configure Azure Redis:
  - [ ] Enable TLS (port 6380)
  - [ ] Configure firewall rules for AKS cluster
  - [ ] Set up persistence for production

- [ ] Update Kubernetes secrets:
  ```bash
  kubectl create secret generic flamoral-auth-secrets \
    --from-literal=JWT_SECRET="$(az keyvault secret show --vault-name flamoral-prod-kv --name JWT-SECRET --query value -o tsv)" \
    --from-literal=INTERNAL_SERVICE_KEY="$(az keyvault secret show --vault-name flamoral-prod-kv --name SERVICE-TOKEN --query value -o tsv)" \
    -n flamoral --dry-run=client -o yaml | kubectl apply -f -
  ```

- [ ] Deploy updated services:
  ```bash
  # Deploy API Gateway
  kubectl apply -f infrastructure/kubernetes/production/deployments/api-gateway.yaml

  # Deploy Realtime Service
  kubectl apply -f infrastructure/kubernetes/production/deployments/realtime-service.yaml

  # Verify deployments
  kubectl get pods -n flamoral | grep -E "(api-gateway|realtime-service)"
  ```

- [ ] Configure Azure Front Door routing:
  - `/socket.io/*` → API Gateway (port 3000)
  - `/realtime/*` → Realtime Service (port 8081)
  - Enable WebSocket support on both routes
  - Set session affinity for sticky sessions

- [ ] Test WebSocket connections from production domain

- [ ] Monitor logs and metrics:
  ```bash
  # API Gateway logs
  kubectl logs -f deployment/api-gateway -n flamoral

  # Realtime Service logs
  kubectl logs -f deployment/realtime-service -n flamoral

  # Check Redis connectivity
  kubectl exec -it deployment/realtime-service -n flamoral -- wget -O- http://localhost:8081/ready
  ```

## Troubleshooting

### Connection Refused / 404 Errors
- **Check:** Front Door / Ingress routing configuration
- **Verify:** Service is running: `kubectl get pods -n flamoral`
- **Check:** Endpoint exists: `kubectl exec -it POD_NAME -- curl http://localhost:8081/health`

### Authentication Failures
- **Check:** JWT_SECRET matches between auth-service and realtime-service
- **Verify:** Token is not expired
- **Check:** Token format: `Authorization: Bearer TOKEN` or `?token=TOKEN`

### Redis Connection Issues
- **Check:** REDIS_TLS is set to `true` for Azure Redis
- **Verify:** Redis credentials in Kubernetes secrets
- **Test:** `kubectl exec -it POD_NAME -- wget -O- http://localhost:8081/ready`

### CORS Errors
- **Check:** Origin is in ALLOWED_ORIGINS environment variable
- **Verify:** `withCredentials: true` in client configuration
- **Check:** Front Door CORS settings

### Messages Not Broadcasting
- **Check:** Redis pub/sub is working
- **Verify:** Users are joined to correct rooms/conversations
- **Check:** Message service is publishing to correct Redis channels

## Security Considerations

1. **TLS/SSL:**
   - All WebSocket connections must use WSS (WebSocket Secure)
   - Azure Front Door handles TLS termination
   - Redis connections use TLS (port 6380)

2. **Authentication:**
   - JWT tokens required for all WebSocket connections
   - Tokens validated on connection and periodically
   - Service-to-service calls use SERVICE_TOKEN

3. **CORS:**
   - Strict origin checking
   - Only production domains allowed
   - Credentials (cookies) supported for authenticated requests

4. **Rate Limiting:**
   - API Gateway: 100 requests per minute per user
   - Realtime Service: 100 messages per minute per connection

5. **CSP (Content Security Policy):**
   - `connect-src` includes `wss://api.flamoral.com`
   - Configured in Azure Front Door

## Performance Optimization

1. **Connection Pooling:**
   - Redis: Min 10, Max 50 connections per instance
   - WebSocket: Sticky sessions enabled for load balancing

2. **Message Compression:**
   - Socket.IO: Per-message deflate enabled
   - Threshold: Messages > 1KB

3. **Horizontal Scaling:**
   - API Gateway: 3-10 replicas (HPA enabled)
   - Realtime Service: 2-5 replicas (HPA enabled)
   - Redis pub/sub ensures message distribution

4. **Caching:**
   - Presence data cached in Redis (TTL: 5 minutes)
   - Typing indicators cached (TTL: 5 seconds)

## Monitoring & Alerts

### Metrics to Monitor
- WebSocket connection count
- Message throughput (messages/sec)
- Redis pub/sub latency
- Connection errors and reconnections
- Authentication failures

### Prometheus Metrics
- `websocket_connections_total`
- `websocket_messages_sent_total`
- `websocket_messages_received_total`
- `redis_pubsub_latency_seconds`

### Grafana Dashboards
- WebSocket Connections Dashboard
- Redis Pub/Sub Dashboard
- Real-time Service Performance Dashboard

## Additional Resources

- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [Gorilla WebSocket Documentation](https://github.com/gorilla/websocket)
- [Azure Redis Cache Best Practices](https://docs.microsoft.com/en-us/azure/azure-cache-for-redis/cache-best-practices)
- [WebSocket Security Best Practices](https://owasp.org/www-community/vulnerabilities/WebSocket_Security)

## Changes Made

### Files Modified
1. `apps/web-app/.env.production` - Updated WebSocket URLs
2. `apps/web-app/src/services/socket.service.ts` - Added path and credentials config
3. `backend/services/api-gateway/src/websocket/websocket.gateway.ts` - Fixed namespace and CORS
4. `packages/socket-client/src/SocketClient.ts` - Added transport and timeout config
5. `packages/socket-client/src/types.ts` - Added reconnectionDelayMax
6. `infrastructure/config/.env.production` - Added SERVICE_TOKEN
7. `infrastructure/kubernetes/production/deployments/realtime-service.yaml` - Complete env config overhaul

### No Changes Required
- Realtime service Go code (already correct)
- Redis pub/sub implementation (already correct)
- Message routing logic (already correct)

## Next Steps

1. **Test in staging environment** before production deployment
2. **Update Azure Key Vault** with production secrets
3. **Configure Front Door** routing rules
4. **Deploy to Kubernetes** cluster
5. **Monitor WebSocket connections** and adjust scaling if needed
6. **Load test** with expected concurrent users
7. **Set up alerts** for connection failures and errors

## Support

For issues or questions:
- Check logs: `kubectl logs -f deployment/DEPLOYMENT_NAME -n flamoral`
- Check metrics: `https://api.flamoral.com/metrics`
- Review documentation: `/docs/api/WEBSOCKET_API.md`
