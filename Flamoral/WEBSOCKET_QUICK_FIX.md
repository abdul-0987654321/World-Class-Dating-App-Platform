# WebSocket/Real-time Quick Fix Guide

**Quick Reference for Real-time Features Configuration**

---

## Critical Fixes Required

### 1. Realtime Service Environment Variables

**File:** `backend/services/realtime-service/.env`

Add these missing variables:

```bash
SERVICE_TOKEN=dev-service-token-change-in-production
REDIS_TLS=false  # Set to true in production for Azure Redis
JWT_ISSUER=flamoral-auth-service
```

Update CORS origins:
```bash
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,https://flamoral.com,https://www.flamoral.com,https://app.flamoral.com
```

### 2. Mobile App WebSocket Configuration

**File:** `apps/mobile-app/src/services/realtime/WebSocketService.ts` (line 64-76)

Replace:
```typescript
const wsUrl = process.env.WEBSOCKET_URL || 'wss://ws.flamoral.com';

this.socket = io(wsUrl, {
  auth: { token },
  transports: ['websocket'],
  // ...
});
```

With:
```typescript
const wsUrl = process.env.WEBSOCKET_URL ||
              process.env.MESSAGING_SERVICE_URL ||
              'https://api.flamoral.com';

this.socket = io(wsUrl, {
  path: '/socket.io',
  auth: { token },
  transports: ['websocket', 'polling'],
  withCredentials: true,
  autoConnect: true,
  // ...
});
```

### 3. Mobile App API Configuration

**File:** `apps/mobile-app/src/services/api/config.ts`

Add WebSocket URLs:
```typescript
export const API_CONFIG = {
  BASE_URL: process.env.API_BASE_URL || 'https://api.flamoral.com',

  // ADD THESE:
  WEBSOCKET_URL: process.env.WEBSOCKET_URL || 'https://api.flamoral.com',
  MESSAGING_SERVICE_URL: process.env.MESSAGING_SERVICE_URL || 'https://api.flamoral.com',

  // ... rest of config
};
```

### 4. Web App Environment Variables

**File:** `apps/web-app/.env`

```bash
# Development
VITE_SOCKET_URL=http://localhost:3004

# Production (use in .env.production)
VITE_SOCKET_URL=https://api.flamoral.com
```

### 5. Production Environment Variables

**File:** `.env.prod.example` or Azure Key Vault

```bash
# Realtime Service
SERVICE_TOKEN=*** # Generate 64+ char token
REDIS_TLS=true
REDIS_HOST=flamoral-prod-redis.redis.cache.windows.net
REDIS_PORT=6380
REDIS_PASSWORD=*** # From Azure Key Vault
JWT_SECRET=*** # 64+ chars, from Azure Key Vault
JWT_ISSUER=flamoral-auth-service

# Messaging Service
WEBSOCKET_URL=https://api.flamoral.com
MESSAGING_SERVICE_URL=https://api.flamoral.com
```

---

## Verification Steps

1. **Check Realtime Service Health:**
   ```bash
   curl http://localhost:8081/health
   ```

2. **Check Messaging Service Health:**
   ```bash
   curl http://localhost:3004/health
   ```

3. **Test WebSocket Connection:**
   ```bash
   wscat -c "ws://localhost:3004/socket.io/?transport=websocket"
   ```

4. **Verify Redis Connection:**
   - Check both services can connect to Redis
   - Verify pub/sub channels working

---

## Quick Test Checklist

- [ ] Realtime service starts without errors
- [ ] Messaging service starts without errors
- [ ] Mobile app connects to WebSocket
- [ ] Web app connects to WebSocket
- [ ] Messages delivered in real-time
- [ ] Typing indicators work
- [ ] Presence/online status updates
- [ ] Reconnection works after disconnect

---

## Common Errors and Solutions

**Error:** `Missing required environment variable JWT_SECRET`
**Fix:** Add JWT_SECRET to realtime-service/.env

**Error:** `Missing required environment variable SERVICE_TOKEN`
**Fix:** Add SERVICE_TOKEN to realtime-service/.env

**Error:** `CORS policy blocked the request`
**Fix:** Add client origin to ALLOWED_ORIGINS

**Error:** `Redis connection failed`
**Fix:** Check REDIS_TLS setting and credentials

**Error:** `WebSocket connection failed`
**Fix:** Ensure path: '/socket.io' in client config

---

## Production Deployment Checklist

- [ ] Update .env files with production values
- [ ] Store all secrets in Azure Key Vault
- [ ] Set REDIS_TLS=true
- [ ] Remove development origins from CORS
- [ ] Generate strong SERVICE_TOKEN (64+ chars)
- [ ] Test from production domains
- [ ] Monitor connection metrics
- [ ] Verify load balancer WebSocket support

---

**For Full Details:** See `WEBSOCKET_REALTIME_FIXES_COMPLETE.md`
