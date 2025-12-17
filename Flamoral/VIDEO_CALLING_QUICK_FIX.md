# Video Calling - QUICK FIX GUIDE

## TL;DR - Fix in 5 Steps

### 1. Get Agora Credentials (2 min)
```
1. Go to: https://console.agora.io
2. Sign up / Log in
3. Create new project
4. Copy App ID and App Certificate
```

### 2. Update Config File (1 min)
```bash
cd backend/services/messaging-service/src/config
cp index-VIDEO-FIXED.ts index.ts
```

### 3. Update Main Service File (1 min)
```bash
cd backend/services/messaging-service/src
cp index-VIDEO-FIXED.ts index.ts
```

### 4. Set Environment Variables (1 min)
```bash
cd backend/services/messaging-service
```

Create/edit `.env` file:
```env
AGORA_APP_ID=<paste_your_app_id>
AGORA_APP_CERTIFICATE=<paste_your_certificate>
AGORA_TOKEN_EXPIRY_TIME=3600
```

### 5. Restart Service (30 sec)
```bash
npm run dev
```

## Verify It Works

### Check 1: Service Logs
Look for:
```
✓ Video Call Service initialized
✓ Video Calling: ENABLED
```

### Check 2: Health Endpoint
```bash
curl http://localhost:3004/health
```

Should see:
```json
{
  "status": "healthy",
  "videoCallsEnabled": true
}
```

### Check 3: Video Call Status
```bash
curl http://localhost:3004/api/video-calls/status
```

Should see:
```json
{
  "enabled": true,
  "agoraConfigured": true
}
```

## What Was Fixed?

### Issue 1: Missing Agora Config
**Fixed:** Added Agora configuration to `config/index.ts`

### Issue 2: Video Handlers Not Connected
**Fixed:** Integrated CallSignalingHandler into `index.ts`

### Issue 3: Missing Environment Variables
**Fixed:** Added Agora env vars to `.env`

## Files Changed

1. ✅ `backend/services/messaging-service/src/config/index.ts`
2. ✅ `backend/services/messaging-service/src/index.ts`
3. ✅ `backend/services/messaging-service/.env`

## What's Included?

The platform already has complete implementation of:
- ✅ Video SDK (WebRTC)
- ✅ Video Call Service
- ✅ Call Signaling Handler
- ✅ Frontend Components
- ✅ Mobile Components
- ✅ Call Recording
- ✅ Call History

**It just needed the config integration!**

## Troubleshooting

### "videoCallsEnabled: false"
**Fix:** Check your AGORA_APP_ID and AGORA_APP_CERTIFICATE in .env

### "Failed to generate Agora token"
**Fix:** Verify credentials are correct at https://console.agora.io

### Calls don't connect
**Fix:**
1. Check both users are online
2. Verify WebSocket connection
3. Check firewall settings

## Optional: Update .env.example
To help other developers, update `.env.example`:

```bash
cd backend/services/messaging-service
```

Add to `.env.example`:
```env
# Video Calling - Agora
AGORA_APP_ID=your_agora_app_id_here
AGORA_APP_CERTIFICATE=your_agora_app_certificate_here
AGORA_TOKEN_EXPIRY_TIME=3600
COSMOS_CALL_HISTORY_CONTAINER=CallHistory
COSMOS_CALL_RECORDINGS_CONTAINER=CallRecordings
```

## Full Documentation

For comprehensive documentation, see:
- `FIX_VIDEO_CALLING.md` - Complete fix guide
- `backend/services/messaging-service/VIDEO_CALLING_SETUP.md` - Setup guide
- `VIDEO_CALLING_IMPLEMENTATION_SUMMARY.md` - Implementation details
- `QUICK_START_VIDEO_CALLS.md` - Original quick start

---

**That's it! Video calling should now work. Total time: ~5 minutes.**
