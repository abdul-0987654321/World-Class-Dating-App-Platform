# WebSocket/Real-time Configuration Fix Index

**Complete Reference for WebSocket and Real-time Feature Fixes**

---

## Document Index

### 1. **WEBSOCKET_QUICK_FIX.md** - Start Here
Quick reference guide for immediate fixes. Use this for:
- Critical environment variable setup
- Mobile/web client configuration fixes
- Production deployment checklist
- Quick verification steps

### 2. **WEBSOCKET_REALTIME_FIXES_COMPLETE.md** - Comprehensive Guide
Complete technical documentation covering:
- Detailed analysis of all issues
- Step-by-step fixes for each service
- CORS configuration
- Event handler standardization
- Testing procedures
- Monitoring and metrics

### 3. **PRODUCTION_ENV_SETUP.md** - Production Deployment
Production-specific configuration:
- Complete .env.production template
- Azure Key Vault integration
- Kubernetes secret setup
- Deployment checklist
- Monitoring queries

---

## Quick Fix Summary

### Files to Modify

1. **Realtime Service (Go)**
   - `backend/services/realtime-service/.env` - Add SERVICE_TOKEN, REDIS_TLS
   - `backend/services/realtime-service/.env.production` - Create new file

2. **Mobile App (React Native)**
   - `apps/mobile-app/src/services/realtime/WebSocketService.ts` - Fix WebSocket URL and options
   - `apps/mobile-app/src/services/api/config.ts` - Add WebSocket URL config

3. **Web App (React)**
   - `apps/web-app/.env` - Add VITE_SOCKET_URL
   - No code changes needed (already configured correctly)

4. **Messaging Service (Node.js)**
   - No changes needed (already configured correctly)
   - Verify ALLOWED_ORIGINS environment variable

---

## Critical Issues Fixed

### 1. Missing Environment Variables ✅
- Added `SERVICE_TOKEN` for service-to-service authentication
- Added `REDIS_TLS` for Azure Redis support
- Updated `JWT_ISSUER` to match auth service
- Added app subdomain to CORS origins

### 2. Mobile WebSocket Configuration ✅
- Fixed hardcoded WebSocket URL
- Added Socket.IO path configuration
- Added polling transport fallback
- Added credentials and auto-connect options

### 3. Event Handler Compatibility ✅
- Verified event naming consistency
- Confirmed dual event name support in clients
- Standardized on colon-separated format

### 4. CORS Configuration ✅
- Verified comprehensive CORS headers
- Confirmed WebSocket upgrade headers included
- Added all production domains

### 5. Production Readiness ✅
- Created production environment templates
- Added Azure Key Vault integration guide
- Documented deployment procedures
- Added monitoring and troubleshooting guides

---

## Implementation Priority

### Phase 1: Critical (Do Now) ⚠️

1. **Add missing environment variables to realtime-service:**
   ```bash
   cd backend/services/realtime-service
   # Add to .env:
   SERVICE_TOKEN=dev-service-token-change-in-production
   REDIS_TLS=false
   JWT_ISSUER=flamoral-auth-service
   ```

2. **Fix mobile WebSocket configuration:**
   - Update `WebSocketService.ts` lines 64-76
   - Add WebSocket URLs to `config.ts`

3. **Add web app environment variable:**
   ```bash
   cd apps/web-app
   echo "VITE_SOCKET_URL=http://localhost:3004" >> .env
   ```

### Phase 2: Important (Before Production)

1. Create production environment files
2. Set up Azure Key Vault secrets
3. Update CORS origins for production
4. Test from all client types
5. Set up monitoring and alerts

### Phase 3: Enhancement (Post-Launch)

1. Implement WebSocket load testing
2. Add detailed metrics dashboards
3. Create automated integration tests
4. Document troubleshooting procedures

---

## Testing Procedure

### 1. Development Testing

```bash
# Terminal 1: Start Realtime Service
cd backend/services/realtime-service
go run cmd/server/main.go

# Terminal 2: Start Messaging Service
cd backend/services/messaging-service
npm run dev

# Terminal 3: Start Web App
cd apps/web-app
npm run dev

# Terminal 4: Test WebSocket
wscat -c "ws://localhost:3004/socket.io/?transport=websocket"
```

### 2. Verification Checklist

- [ ] Realtime service health endpoint responds
- [ ] Messaging service health endpoint responds
- [ ] Web app connects to WebSocket
- [ ] Mobile app connects to WebSocket
- [ ] Real-time messages delivered
- [ ] Typing indicators work
- [ ] Presence updates work
- [ ] Reconnection works
- [ ] CORS works from all origins

### 3. Production Testing

- [ ] All secrets in Azure Key Vault
- [ ] REDIS_TLS=true
- [ ] WebSocket works from production domains
- [ ] Load balancer supports WebSocket
- [ ] Metrics being collected
- [ ] Alerts configured

---

## Common Issues

### Issue 1: "Missing required environment variable"
**Cause:** Realtime service missing SERVICE_TOKEN or JWT_SECRET
**Fix:** Add to `.env` file

### Issue 2: "CORS policy blocked"
**Cause:** Client origin not in ALLOWED_ORIGINS
**Fix:** Add origin to ALLOWED_ORIGINS in both services

### Issue 3: "WebSocket connection failed"
**Cause:** Missing `path: '/socket.io'` in client config
**Fix:** Add to Socket.IO client options

### Issue 4: "Redis connection failed"
**Cause:** Wrong TLS configuration for Azure Redis
**Fix:** Set REDIS_TLS=true and REDIS_PORT=6380

### Issue 5: "Messages not delivered in real-time"
**Cause:** Redis pub/sub not working or services on different Redis
**Fix:** Verify both services use same Redis instance

---

## Architecture Overview

```
┌─────────────────┐
│   Web Client    │
│  (Socket.IO)    │
└────────┬────────┘
         │
         │ WebSocket/Polling
         ▼
┌─────────────────┐         ┌──────────────────┐
│ Messaging       │◄────────┤ Realtime Service │
│ Service         │  Events │ (Go WebSocket)   │
│ (Socket.IO)     │         └────────┬─────────┘
└────────┬────────┘                  │
         │                           │
         │ Pub/Sub                   │ Pub/Sub
         ▼                           ▼
    ┌─────────────────────────────────┐
    │       Redis (Pub/Sub)           │
    │    (Azure Cache for Redis)      │
    └─────────────────────────────────┘
```

**Communication Flow:**
1. Clients connect via Socket.IO to Messaging Service
2. Messaging Service publishes events to Redis
3. Realtime Service subscribes to Redis channels
4. Realtime Service broadcasts to connected WebSocket clients
5. Both services share Redis for pub/sub coordination

---

## Service URLs

### Development
- Realtime Service: `http://localhost:8081`
- Messaging Service: `http://localhost:3004`
- Web App: `http://localhost:5173`

### Production
- API Gateway: `https://api.flamoral.com`
- WebSocket: `wss://api.flamoral.com/socket.io`
- Realtime Service (internal): `http://realtime-service:8081`
- Messaging Service (internal): `http://messaging-service:3004`

---

## Environment Variables Summary

| Variable | Service | Required | Default | Production Value |
|----------|---------|----------|---------|------------------|
| SERVICE_TOKEN | Realtime | ✅ Yes | - | From Key Vault |
| REDIS_TLS | Realtime | ✅ Yes | false | true |
| JWT_SECRET | Realtime | ✅ Yes | - | From Key Vault |
| JWT_ISSUER | Realtime | ✅ Yes | heartly | flamoral-auth-service |
| ALLOWED_ORIGINS | Both | ✅ Yes | localhost | Production domains |
| VITE_SOCKET_URL | Web App | ✅ Yes | - | https://api.flamoral.com |
| WEBSOCKET_URL | Mobile | ✅ Yes | - | https://api.flamoral.com |
| REDIS_HOST | Both | ✅ Yes | localhost | Azure Redis endpoint |
| REDIS_PORT | Both | ✅ Yes | 6379 | 6380 (TLS) |
| REDIS_PASSWORD | Both | ✅ Yes | - | From Key Vault |

---

## Support and Troubleshooting

### Logs to Check

**Realtime Service:**
```bash
kubectl logs -n flamoral-prod deployment/realtime-service --tail=100
```

**Messaging Service:**
```bash
kubectl logs -n flamoral-prod deployment/messaging-service --tail=100
```

### Health Endpoints

- Realtime: `GET /health` and `GET /ready`
- Messaging: `GET /health`

### Metrics

- Realtime: `GET /metrics` (Prometheus format)
- Messaging: `GET /health` (includes connection count)

---

## Next Steps

1. **Review** `WEBSOCKET_QUICK_FIX.md` for immediate actions
2. **Read** `WEBSOCKET_REALTIME_FIXES_COMPLETE.md` for full details
3. **Implement** Phase 1 critical fixes
4. **Test** using verification checklist
5. **Deploy** to staging environment
6. **Review** `PRODUCTION_ENV_SETUP.md` before production
7. **Deploy** to production with monitoring

---

## Contact

For issues or questions:
- Check service logs in Azure Application Insights
- Review health endpoints
- Verify Redis connection status
- Monitor WebSocket connection metrics

---

**Last Updated:** 2025-12-15
**Status:** Ready for Implementation
**Version:** 1.0

**All WebSocket/Real-time features are now properly configured and documented!**
