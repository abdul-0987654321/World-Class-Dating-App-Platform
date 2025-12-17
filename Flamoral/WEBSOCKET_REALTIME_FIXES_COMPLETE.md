# WebSocket/Real-time Configuration Fixes
## Complete Fix Guide for Real-time Features

**Date:** 2025-12-15
**Status:** Ready for Implementation
**Priority:** HIGH

---

## Executive Summary

This document contains all necessary fixes for WebSocket/real-time functionality across the Flamoral dating platform. Issues identified and fixed include:

1. Missing environment variables in realtime-service (Go)
2. WebSocket client configuration issues in mobile and web apps
3. CORS configuration for WebSocket connections
4. Socket.IO event handler mismatches
5. Missing service authentication tokens

---

## 1. Realtime Service (Go) Configuration Fixes

### File: `backend/services/realtime-service/.env.example`

**Add the following missing environment variables:**

```bash
# Service Authentication (for service-to-service communication)
SERVICE_TOKEN=dev-service-token-change-in-production

# Redis TLS Configuration (for Azure Redis)
REDIS_TLS=false

# Update JWT Issuer
JWT_ISSUER=flamoral-auth-service  # Changed from 'heartly'

# Add app subdomain to CORS origins
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:8080,https://flamoral.com,https://www.flamoral.com,https://admin.flamoral.com,https://app.flamoral.com
```

### Production Environment File

Create `backend/services/realtime-service/.env.production`:

```bash
# Production Configuration
PORT=8081
ENVIRONMENT=production
LOG_LEVEL=warn

# CORS Origins - Production only
ALLOWED_ORIGINS=https://flamoral.com,https://www.flamoral.com,https://admin.flamoral.com,https://app.flamoral.com

# Service Authentication - STORE IN AZURE KEY VAULT
SERVICE_TOKEN=*** # CRITICAL: Generate 64+ character token

# Redis Configuration - Azure Cache for Redis Premium
REDIS_HOST=flamoral-prod-redis.redis.cache.windows.net
REDIS_PORT=6380
REDIS_PASSWORD=*** # STORE IN AZURE KEY VAULT
REDIS_DB=0
REDIS_TLS=true  # CRITICAL: Enable TLS for Azure Redis

# JWT Configuration - STORE IN AZURE KEY VAULT
JWT_SECRET=*** # CRITICAL: 64+ character secret
JWT_ISSUER=flamoral-auth-service
JWT_EXPIRATION=15m

# WebSocket Configuration (Production Optimized)
WS_READ_BUFFER_SIZE=4096
WS_WRITE_BUFFER_SIZE=4096
WS_MAX_MESSAGE_SIZE=524288
WS_PONG_WAIT=60s
WS_PING_PERIOD=54s
WS_WRITE_WAIT=10s
WS_HANDSHAKE_TIMEOUT=10s

# Rate Limiting (Stricter for production)
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=1m

# Presence Configuration
PRESENCE_TTL=5m
PRESENCE_HEARTBEAT=30s

# Typing Configuration
TYPING_TIMEOUT=5s
```

---

## 2. Mobile App WebSocket Client Fixes

### File: `apps/mobile-app/src/services/realtime/WebSocketService.ts`

**Current Issue:** Hardcoded WebSocket URL and missing configuration options

**Fix (lines 64-76):**

```typescript
// BEFORE:
const wsUrl = process.env.WEBSOCKET_URL || 'wss://ws.flamoral.com';

this.socket = io(wsUrl, {
  auth: { token },
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: this.maxReconnectAttempts,
  reconnectionDelay: this.reconnectDelay,
  reconnectionDelayMax: 5000,
  timeout: 20000,
});

// AFTER:
// WebSocket URL configuration
// For development: use localhost or local network IP
// For production: use production messaging service URL
const wsUrl = process.env.WEBSOCKET_URL ||
              process.env.MESSAGING_SERVICE_URL ||
              'https://api.flamoral.com';

console.log('[WebSocket] Connecting to:', wsUrl);

this.socket = io(wsUrl, {
  path: '/socket.io',                    // ADDED: Explicit Socket.IO path
  auth: { token },
  transports: ['websocket', 'polling'],   // ADDED: Fallback to polling
  reconnection: true,
  reconnectionAttempts: this.maxReconnectAttempts,
  reconnectionDelay: this.reconnectDelay,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  withCredentials: true,                  // ADDED: Send cookies/auth
  autoConnect: true,                      // ADDED: Auto-connect on creation
});
```

### File: `apps/mobile-app/src/services/api/config.ts`

**Add WebSocket URL configuration:**

```typescript
export const API_CONFIG = {
  // Base URLs for microservices
  BASE_URL: process.env.API_BASE_URL || 'https://api.flamoral.com',

  // ADDED: WebSocket/Real-time configuration
  WEBSOCKET_URL: process.env.WEBSOCKET_URL || 'https://api.flamoral.com',
  MESSAGING_SERVICE_URL: process.env.MESSAGING_SERVICE_URL || 'https://api.flamoral.com',

  // AI Services
  AI_SERVICES: {
    // ... existing config
  },

  // ... rest of config
};
```

---

## 3. Web App WebSocket Client Fixes

### File: `apps/web-app/src/services/socket.service.ts`

**Current Status:** ✅ Already properly configured with:
- Correct Socket.IO path (`/socket.io`)
- Dual transport support (`['websocket', 'polling']`)
- Proper credentials and auto-connect
- Event handler compatibility (supports both `message:new` and `new_message` formats)

**No changes needed**, but verify environment variables:

```typescript
const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;
```

**Environment Variable Setup:**

Create/Update `apps/web-app/.env`:
```bash
# Development
VITE_SOCKET_URL=http://localhost:3004

# Production
VITE_SOCKET_URL=https://api.flamoral.com
```

---

## 4. Messaging Service Socket.IO Configuration

### File: `backend/services/messaging-service/src/index.ts`

**Current Status:** ✅ Properly configured with:
- Comprehensive CORS configuration
- Dual transport support
- Proper Socket.IO initialization
- Event handlers for all message types

**Verification:**

The messaging service Socket.IO configuration is correct (lines 38-64):

```typescript
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
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
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
});
```

**Ensure Environment Variable:**

```bash
# backend/services/messaging-service/.env
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,https://flamoral.com,https://www.flamoral.com,https://app.flamoral.com
```

---

## 5. Event Handler Standardization

### Issue: Inconsistent event names across services

The Socket.IO events use different naming conventions:

**Go Realtime Service Events:**
- `message:new`
- `message:delivered`
- `message:read`
- `typing:start`
- `typing:stop`

**Node.js Messaging Service Events:**
- `message:new`
- `message:delivered`
- `message:read`
- `typing:indicator`

**Frontend Clients Support Both:**
- `message:new` and `new_message` ✅
- `message:delivered` and `message_delivered` ✅
- `message:read` and `message_read` ✅
- `typing` and `message:typing` ✅

**Recommendation:** Use colon-separated format (`message:new`) as standard across all services.

---

## 6. CORS Configuration Summary

### Realtime Service (Go)

**File:** `backend/services/realtime-service/internal/server/server.go`

Already correctly configured (lines 111-149):
```go
cors.New(cors.Options{
    AllowedOrigins: s.config.AllowedOrigins,
    AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"},
    AllowedHeaders: []string{
        "Authorization", "Content-Type", "X-Request-ID",
        "X-Requested-With", "X-CSRF-Token", "X-API-Key",
        "X-Device-ID", "X-Platform", "Accept", "Accept-Language",
        "Accept-Encoding", "Cache-Control", "Pragma",
        "Upgrade", "Connection",  // CRITICAL for WebSocket upgrade
    },
    AllowCredentials: true,
    MaxAge: 86400,
})
```

### Messaging Service (Node.js)

**File:** `backend/services/messaging-service/src/index.ts`

Already correctly configured (lines 72-94):
```typescript
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);  // Allow native apps
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
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token', 'X-API-Key'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400,
}));
```

---

## 7. Required Environment Variables Checklist

### Realtime Service (Go)
- [x] `PORT` - Server port (default: 8081)
- [x] `ENVIRONMENT` - development/production
- [x] `ALLOWED_ORIGINS` - Comma-separated CORS origins
- [ ] `SERVICE_TOKEN` - **MISSING** - Add for service-to-service auth
- [x] `REDIS_HOST` - Redis hostname
- [x] `REDIS_PORT` - Redis port
- [x] `REDIS_PASSWORD` - Redis password
- [ ] `REDIS_TLS` - **MISSING** - Add for Azure Redis
- [x] `JWT_SECRET` - JWT signing secret
- [x] `JWT_ISSUER` - JWT issuer (update to 'flamoral-auth-service')

### Messaging Service (Node.js)
- [x] `PORT` - Server port (default: 3004)
- [x] `ALLOWED_ORIGINS` - CORS origins
- [x] `JWT_ACCESS_SECRET` - JWT validation
- [x] `REDIS_HOST` - Redis hostname
- [x] `REDIS_PORT` - Redis port
- [x] `REDIS_PASSWORD` - Redis password
- [x] `COSMOS_ENDPOINT` - Cosmos DB endpoint
- [x] `COSMOS_KEY` - Cosmos DB key

### Frontend Apps
- [ ] `VITE_SOCKET_URL` (Web) - **ADD** to `.env`
- [ ] `WEBSOCKET_URL` (Mobile) - **ADD** to app config
- [ ] `MESSAGING_SERVICE_URL` (Mobile) - **ADD** to app config

---

## 8. Deployment Checklist

### Pre-Deployment
- [ ] Update `.env` files with production values
- [ ] Store secrets in Azure Key Vault
- [ ] Verify REDIS_TLS=true for Azure Redis
- [ ] Update CORS origins to production domains only
- [ ] Generate strong SERVICE_TOKEN (64+ characters)
- [ ] Update JWT_ISSUER to 'flamoral-auth-service'

### Post-Deployment Testing
- [ ] Test WebSocket connection from web app
- [ ] Test WebSocket connection from mobile app
- [ ] Verify real-time message delivery
- [ ] Test typing indicators
- [ ] Verify presence/online status
- [ ] Test reconnection scenarios
- [ ] Verify CORS from all allowed origins
- [ ] Monitor WebSocket connection metrics
- [ ] Check Redis pub/sub functionality

### Production Environment Variables

Add to `.env.prod.example`:

```bash
# Realtime Service Configuration
REALTIME_SERVICE_URL=http://realtime-service:8081
REALTIME_SERVICE_TOKEN=*** # STORE IN AZURE KEY VAULT

# Messaging Service WebSocket
WEBSOCKET_URL=https://api.flamoral.com
MESSAGING_SERVICE_URL=https://api.flamoral.com

# Redis Configuration (Azure Cache for Redis)
REDIS_TLS=true
REDIS_HOST=flamoral-prod-redis.redis.cache.windows.net
REDIS_PORT=6380
REDIS_PASSWORD=*** # STORE IN AZURE KEY VAULT
```

---

## 9. Quick Fix Script

Create `backend/services/realtime-service/fix-env.sh`:

```bash
#!/bin/bash

# Quick fix script for realtime-service environment configuration

if [ ! -f .env ]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env
fi

# Add missing variables if not present
if ! grep -q "SERVICE_TOKEN" .env; then
  echo "" >> .env
  echo "# Service Authentication" >> .env
  echo "SERVICE_TOKEN=dev-service-token-$(openssl rand -hex 32)" >> .env
fi

if ! grep -q "REDIS_TLS" .env; then
  echo "REDIS_TLS=false" >> .env
fi

if ! grep -q "JWT_ISSUER" .env; then
  sed -i 's/JWT_ISSUER=heartly/JWT_ISSUER=flamoral-auth-service/' .env
fi

echo "✅ Environment configuration updated!"
echo "⚠️  Remember to update .env with your actual values"
```

---

## 10. Testing WebSocket Connections

### Manual Testing

```bash
# Test WebSocket endpoint (Go Realtime Service)
wscat -c "ws://localhost:8081/ws" -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test Socket.IO endpoint (Node.js Messaging Service)
wscat -c "ws://localhost:3004/socket.io/?transport=websocket" -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Automated Testing

```javascript
// Test Socket.IO connection
const io = require('socket.io-client');

const socket = io('http://localhost:3004', {
  auth: { token: 'YOUR_JWT_TOKEN' },
  transports: ['websocket']
});

socket.on('connect', () => {
  console.log('✅ Connected successfully');
  socket.emit('message:send', {
    conversationId: 'test-123',
    content: 'Test message',
    type: 'text'
  });
});

socket.on('message:new', (msg) => {
  console.log('✅ Received message:', msg);
});

socket.on('error', (err) => {
  console.error('❌ Error:', err);
});
```

---

## 11. Common Issues and Solutions

### Issue 1: WebSocket connection fails with CORS error
**Solution:** Verify ALLOWED_ORIGINS includes the client origin and matches exactly (including protocol and port)

### Issue 2: Connection upgrades to polling instead of WebSocket
**Solution:** Check firewall rules allow WebSocket protocol, verify `Upgrade` and `Connection` headers in CORS config

### Issue 3: Messages not delivered in real-time
**Solution:** Check Redis connection, verify pub/sub channels, ensure both services connected to same Redis instance

### Issue 4: Authentication failures
**Solution:** Verify JWT_SECRET matches between auth service and realtime service, check JWT_ISSUER

### Issue 5: Azure Redis connection fails
**Solution:** Ensure REDIS_TLS=true, verify port is 6380 (not 6379), check firewall rules

---

## 12. Monitoring and Metrics

### Health Checks
- Realtime Service: `GET http://localhost:8081/health`
- Messaging Service: `GET http://localhost:3004/health`

### Metrics Endpoints
- Realtime Service: `GET http://localhost:8081/metrics` (Prometheus format)
- Messaging Service: `GET http://localhost:3004/health` (includes connection count)

### Key Metrics to Monitor
- Active WebSocket connections
- Message delivery latency
- Reconnection rate
- Redis pub/sub message rate
- Error rate by type

---

## 13. Implementation Priority

**Phase 1 - Critical (Do First):**
1. Add missing environment variables to realtime-service
2. Enable Redis TLS for production
3. Fix mobile WebSocket URL configuration
4. Add SERVICE_TOKEN for service authentication

**Phase 2 - Important:**
1. Update JWT_ISSUER across all services
2. Standardize event naming conventions
3. Add production environment files
4. Update CORS origins for all domains

**Phase 3 - Nice to Have:**
1. Add monitoring and metrics
2. Implement automated testing
3. Add WebSocket load testing
4. Document troubleshooting procedures

---

## Contact & Support

For questions or issues with this fix guide:
- Review logs in Azure Application Insights
- Check service health endpoints
- Verify Redis connection status
- Monitor WebSocket connection metrics

---

**Last Updated:** 2025-12-15
**Version:** 1.0
**Status:** Ready for Implementation
