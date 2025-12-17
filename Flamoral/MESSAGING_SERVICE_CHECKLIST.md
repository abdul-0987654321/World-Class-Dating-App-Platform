# Messaging Service - Quick Fix Checklist

## ⚡ IMMEDIATE FIX (5 minutes)

### Step 1: Apply Routes Fix
- [ ] Navigate to `backend/services/messaging-service`
- [ ] Choose one method:
  - [ ] **Automated:** Run `node fix-routes.js`
  - [ ] **Manual:** Edit `src/api/routes/index.ts` (see MESSAGING_FIX_SUMMARY.md)

### Step 2: Rebuild Service
- [ ] Run `npm run build`
- [ ] Check for TypeScript errors (should be none)

### Step 3: Restart Service
- [ ] Development: `npm run dev`
- [ ] Production: `docker-compose restart messaging-service`

### Step 4: Verify Fix
- [ ] Run `node verify-messaging-service.js`
- [ ] Check output shows all green checkmarks ✓

---

## ✅ CONFIGURATION CHECKLIST

### Core Services (Required)
- [ ] **CosmosDB** configured
  - [ ] COSMOS_ENDPOINT set
  - [ ] COSMOS_KEY set
  - [ ] Database "Flamoral" created
  - [ ] Container "Messages" exists
  - [ ] Container "Conversations" exists
  - [ ] Container "Reactions" exists

- [ ] **Redis** configured
  - [ ] REDIS_HOST set
  - [ ] REDIS_PORT set (default: 6379)
  - [ ] Redis server running

- [ ] **Security** configured
  - [ ] JWT_ACCESS_SECRET set (matches auth service)
  - [ ] JWT_REFRESH_SECRET set
  - [ ] ENCRYPTION_KEY set (32 characters)

### Optional Features
- [ ] **GIF Integration**
  - [ ] TENOR_API_KEY set
  - [ ] GIPHY_API_KEY set
  - [ ] Test: `curl /api/v1/api/gifs/search?query=happy`

- [ ] **Voice Transcription** (optional)
  - [ ] AZURE_SPEECH_KEY set
  - [ ] AZURE_SPEECH_REGION set

---

## 🧪 TESTING CHECKLIST

### Health Checks
- [ ] Service health: `GET /api/v1/health` → 200 OK
- [ ] Readiness probe: `GET /api/v1/health/ready` → 200 OK
- [ ] Liveness probe: `GET /api/v1/health/live` → 200 OK

### Standard Messaging
- [ ] Send message: `POST /api/v1/api/messages`
- [ ] Get messages: `GET /api/v1/api/conversations/:id/messages`
- [ ] Mark as read: `PUT /api/v1/api/messages/:id/status`
- [ ] Delete message: `DELETE /api/v1/api/messages/:id`

### Enhanced Messaging (After Fix)
- [ ] **Reactions**
  - [ ] Add reaction: `POST /api/v1/api/messages/:id/reactions`
  - [ ] Get reactions: `GET /api/v1/api/messages/:id/reactions`
  - [ ] Remove reaction: `DELETE /api/v1/api/messages/:id/reactions`

- [ ] **Search**
  - [ ] Search messages: `POST /api/v1/api/messages/search`
  - [ ] Get shared media: `GET /api/v1/api/conversations/:id/media`

- [ ] **GIFs**
  - [ ] Search GIFs: `GET /api/v1/api/gifs/search?query=happy`
  - [ ] Trending GIFs: `GET /api/v1/api/gifs/trending`
  - [ ] GIF categories: `GET /api/v1/api/gifs/categories`

- [ ] **Pinning**
  - [ ] Pin message: `POST /api/v1/api/conversations/:id/messages/:msgId/pin`
  - [ ] Get pinned: `GET /api/v1/api/conversations/:id/pinned`
  - [ ] Unpin message: `DELETE /api/v1/api/conversations/:id/messages/:msgId/pin`

- [ ] **Export**
  - [ ] Export chat: `POST /api/v1/api/conversations/:id/export`

- [ ] **Icebreakers**
  - [ ] Get suggestions: `GET /api/v1/api/icebreakers/suggestions?otherUserId=123`
  - [ ] Random icebreaker: `GET /api/v1/api/icebreakers/random`
  - [ ] Categories: `GET /api/v1/api/icebreakers/categories`

### WebSocket Testing
- [ ] Connect to WebSocket: `ws://localhost:3004`
- [ ] Authenticate with userId
- [ ] Send message via socket
- [ ] Receive message in real-time
- [ ] Test typing indicators
- [ ] Test online/offline status
- [ ] Test read receipts

---

## 📊 MONITORING CHECKLIST

### Service Status
- [ ] Service is running
- [ ] No error logs
- [ ] Circuit breaker status: CLOSED (healthy)
- [ ] No repeated failures

### Database Connections
- [ ] CosmosDB connection active
- [ ] Redis connection active
- [ ] No connection timeout errors

### Performance
- [ ] Response times < 200ms for reads
- [ ] Response times < 500ms for writes
- [ ] WebSocket latency < 100ms
- [ ] No memory leaks

---

## 🔧 TROUBLESHOOTING CHECKLIST

### If Endpoints Return 404
- [ ] Check routes are registered in index.ts
- [ ] Run `node verify-messaging-service.js`
- [ ] Check service logs for routing errors
- [ ] Verify API gateway is forwarding correctly

### If Endpoints Return 401
- [ ] Check JWT_ACCESS_SECRET matches auth service
- [ ] Verify auth token is valid
- [ ] Check token in Authorization header: `Bearer TOKEN`

### If Endpoints Return 500
- [ ] Check service logs: `docker logs messaging-service`
- [ ] Verify CosmosDB connection
- [ ] Verify Redis connection
- [ ] Check environment variables are set

### If WebSocket Fails
- [ ] Check WEBSOCKET_PORT is correct (3004)
- [ ] Verify userId is sent in auth handshake
- [ ] Check CORS origins allow your domain
- [ ] Check Redis is running (for presence)

### If GIFs Don't Load
- [ ] Verify TENOR_API_KEY is set
- [ ] Verify GIPHY_API_KEY is set
- [ ] Test API keys manually
- [ ] Check API rate limits

---

## 📁 FILES REFERENCE

### Fix Scripts
- `backend/services/messaging-service/fix-routes.js` - Auto-fix script
- `backend/services/messaging-service/verify-messaging-service.js` - Verification

### Documentation
- `MESSAGING_FIX_SUMMARY.md` - Quick summary
- `MESSAGING_SERVICE_FIX_REPORT.md` - Detailed report
- `ENHANCED_MESSAGING_IMPLEMENTATION.md` - Full implementation
- `ENHANCED_MESSAGING_QUICK_START.md` - Quick start guide

### Service Files
- `src/api/routes/index.ts` - **FILE TO FIX**
- `src/api/routes/enhanced-messaging.routes.ts` - Enhanced routes
- `src/api/controllers/enhanced-messaging.controller.ts` - Controller
- `src/infrastructure/database/cosmos-client.ts` - Database client
- `src/socket/socket-manager.ts` - WebSocket manager

---

## ✨ SUCCESS CRITERIA

### Service is Working When:
- [x] All health checks return 200 OK
- [x] Standard messaging endpoints work
- [x] Enhanced messaging endpoints work (after fix)
- [x] WebSocket connections establish
- [x] Real-time message delivery works
- [x] Circuit breaker shows 0 failures
- [x] No errors in logs

### Features are Enabled When:
- [x] Users can send/receive messages
- [x] Users can react to messages with emojis
- [x] Users can search message history
- [x] Users can send GIFs
- [x] Users can pin important messages
- [x] Users can see typing indicators
- [x] Users can see read receipts
- [x] Users can export chat history
- [x] Users get icebreaker suggestions

---

## 🚀 DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] All tests pass
- [ ] Routes fix applied
- [ ] Service builds successfully
- [ ] Environment variables configured
- [ ] Documentation updated

### Deployment
- [ ] Build Docker image
- [ ] Push to container registry
- [ ] Update deployment config
- [ ] Deploy to staging first
- [ ] Run smoke tests

### Post-Deployment
- [ ] Verify all endpoints
- [ ] Check service health
- [ ] Monitor error rates
- [ ] Monitor circuit breaker
- [ ] Test WebSocket connections
- [ ] Verify database connections

---

## 📞 SUPPORT CONTACTS

### If You Need Help:
1. Check `MESSAGING_FIX_SUMMARY.md` for quick solutions
2. Review `MESSAGING_SERVICE_FIX_REPORT.md` for details
3. Run `node verify-messaging-service.js` for diagnostics
4. Check service logs: `docker logs messaging-service`

### Quick Commands:
```bash
# Check service status
docker ps | grep messaging-service

# View logs
docker logs -f messaging-service

# Restart service
docker-compose restart messaging-service

# Run verification
cd backend/services/messaging-service && node verify-messaging-service.js
```

---

**Last Updated:** 2025-12-15
**Status:** Ready for deployment after route fix
**Estimated Fix Time:** 5 minutes
