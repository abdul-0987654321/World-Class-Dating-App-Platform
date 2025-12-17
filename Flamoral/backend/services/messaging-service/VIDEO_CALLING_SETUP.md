# Video Calling Configuration Guide for Flamoral

## Overview
This guide provides comprehensive instructions to properly configure video calling functionality in the Flamoral messaging service using Agora SDK.

## Critical Issues Found and Fixed

### 1. Missing Environment Variables
The messaging service was missing critical Agora configuration variables.

**Add to `.env` file:**
```env
# Video Calling Configuration - Agora
AGORA_APP_ID=your_agora_app_id_here
AGORA_APP_CERTIFICATE=your_agora_app_certificate_here
AGORA_TOKEN_EXPIRY_TIME=3600
AGORA_CUSTOMER_ID=your_agora_customer_id_here
AGORA_CUSTOMER_CERTIFICATE=your_agora_customer_certificate_here
AGORA_RECORDING_STORAGE_VENDOR=2
AGORA_RECORDING_STORAGE_BUCKET=your_storage_bucket_name

# Cosmos DB Containers for Video Calling
COSMOS_CALL_HISTORY_CONTAINER=CallHistory
COSMOS_CALL_RECORDINGS_CONTAINER=CallRecordings
```

### 2. Missing Configuration in config/index.ts
Add Agora configuration to `backend/services/messaging-service/src/config/index.ts`:

```typescript
export default {
  // ... existing config ...

  // Video calling configuration (Agora)
  agora: {
    appId: process.env.AGORA_APP_ID || '',
    appCertificate: process.env.AGORA_APP_CERTIFICATE || '',
    tokenExpiryTime: parseInt(process.env.AGORA_TOKEN_EXPIRY_TIME || '3600', 10),
    customerId: process.env.AGORA_CUSTOMER_ID || '',
    customerCertificate: process.env.AGORA_CUSTOMER_CERTIFICATE || '',
    recordingStorageVendor: parseInt(process.env.AGORA_RECORDING_STORAGE_VENDOR || '2', 10),
    recordingStorageBucket: process.env.AGORA_RECORDING_STORAGE_BUCKET || '',
  },
};
```

### 3. Video Call Handlers Not Integrated
The CallSignalingHandler exists but is NOT integrated into the messaging service.

**Fix required in `backend/services/messaging-service/src/index.ts`:**

```typescript
import { CallSignalingHandler } from './socket/call-signaling.handler';
import { VideoCallService } from './services/video-call.service';
import redisClient from './infrastructure/cache/redis';
import config from './config';

// After Socket.IO initialization
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Initialize Video Call Service
const videoCallService = new VideoCallService(
  redisClient,
  {
    appId: config.agora.appId,
    appCertificate: config.agora.appCertificate,
    tokenExpiryTime: config.agora.tokenExpiryTime,
  }
);

// Initialize Call Signaling Handler
const callSignalingHandler = new CallSignalingHandler(io, videoCallService);

// Setup call signaling handlers
io.on('connection', (socket) => {
  callSignalingHandler.setupHandlers(socket);
});
```

### 4. STUN/TURN Server Configuration
The video-sdk package uses default Google STUN servers. For production, consider adding TURN servers.

**In `packages/video-sdk/src/VideoCallClient.ts`, the default config includes:**
```typescript
const DEFAULT_CONFIG: Partial<VideoCallConfig> = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
  // ... other config
};
```

**For production, add TURN servers:**
```typescript
const DEFAULT_CONFIG: Partial<VideoCallConfig> = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: 'turn:your-turn-server.com:3478',
      username: 'your-turn-username',
      credential: 'your-turn-password'
    },
  ],
  // ... other config
};
```

## Complete Integration Steps

### Step 1: Get Agora Credentials
1. Go to https://console.agora.io
2. Sign up or log in
3. Create a new project
4. Get your App ID and App Certificate from the project settings
5. Enable RTC (Real-Time Communication) service
6. Enable Cloud Recording service (optional, for call recording)

### Step 2: Configure Environment Variables
Create or update `.env` file in `backend/services/messaging-service/`:

```env
# Required
AGORA_APP_ID=your_actual_app_id
AGORA_APP_CERTIFICATE=your_actual_certificate

# Optional (with defaults)
AGORA_TOKEN_EXPIRY_TIME=3600  # 1 hour
AGORA_CUSTOMER_ID=your_customer_id  # For cloud recording
AGORA_CUSTOMER_CERTIFICATE=your_customer_cert  # For cloud recording
AGORA_RECORDING_STORAGE_VENDOR=2  # 1=Agora, 2=AWS S3, 3=Azure Blob
AGORA_RECORDING_STORAGE_BUCKET=your_bucket_name
```

### Step 3: Update Configuration File
Modify `backend/services/messaging-service/src/config/index.ts` to include Agora configuration (see above).

### Step 4: Integrate Call Signaling Handler
Modify `backend/services/messaging-service/src/index.ts` to initialize and integrate the call signaling handler (see above).

### Step 5: Create Cosmos DB Containers
If using call recording and history, create these containers in Azure Cosmos DB:
- `CallHistory` - Partition key: `/callerId`
- `CallRecordings` - Partition key: `/callId`

### Step 6: Test the Configuration

#### Test WebSocket Connection:
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3004', {
  auth: {
    userId: 'test-user-123'
  }
});

socket.on('connect', () => {
  console.log('Connected to messaging service');

  // Initiate a call
  socket.emit('initiate-call', {
    callerId: 'user-123',
    callerName: 'Test User',
    calleeId: 'user-456',
    calleeName: 'Receiver',
    callType: 'video'
  }, (response) => {
    console.log('Call initiated:', response);
  });
});
```

## Verification Checklist

- [ ] Agora App ID and Certificate configured in `.env`
- [ ] Configuration updated in `config/index.ts`
- [ ] CallSignalingHandler integrated in `index.ts`
- [ ] Redis client initialized and connected
- [ ] Socket.IO server properly configured
- [ ] CORS origins include your frontend URLs
- [ ] Cosmos DB containers created (if using persistence)
- [ ] Test call initiation working
- [ ] Test call acceptance working
- [ ] Agora tokens being generated successfully

## Troubleshooting

### Issue: "Agora token generation failed"
**Solution:** Verify AGORA_APP_ID and AGORA_APP_CERTIFICATE are correct.

### Issue: "User is offline" when calling
**Solution:** Ensure both users are connected to the WebSocket with proper authentication.

### Issue: "Call session not found"
**Solution:** Check Redis connection and verify Redis is running.

### Issue: "Failed to join channel"
**Solution:**
- Verify Agora token is valid
- Check network connectivity
- Ensure Agora App ID is correct in frontend configuration

## Frontend Configuration

The frontend also needs Agora configuration:

**For Web App (`apps/web-app/.env`):**
```env
VITE_AGORA_APP_ID=your_agora_app_id
VITE_MESSAGING_SERVICE_URL=http://localhost:3004
VITE_MESSAGING_WS_URL=ws://localhost:3004
```

**For Mobile App (`apps/mobile-app/.env`):**
```env
AGORA_APP_ID=your_agora_app_id
MESSAGING_SERVICE_URL=http://localhost:3004
MESSAGING_WS_URL=ws://localhost:3004
```

## Architecture Overview

```
┌─────────────────┐         ┌──────────────────┐         ┌──────────────┐
│   Frontend      │         │  Messaging       │         │   Agora      │
│   (Web/Mobile)  │◄───────►│   Service        │◄───────►│   Servers    │
│                 │         │                  │         │              │
│  - VideoCallSDK │ Socket  │ - VideoCallSvc   │  RTC    │ - STUN/TURN  │
│  - UI Component │  .IO    │ - CallSignaling  │ Tokens  │ - Media      │
└─────────────────┘         └──────────────────┘         └──────────────┘
        │                            │
        │                            │
        └────────────────┬───────────┘
                         │
                         ▼
                   ┌──────────┐
                   │  Redis   │
                   │  Cache   │
                   └──────────┘
```

## Security Considerations

1. **Token Expiry:** Set appropriate token expiry times (default: 1 hour)
2. **Authentication:** Always verify user identity before issuing tokens
3. **Recording Consent:** Ensure both parties consent before recording
4. **Encryption:** Agora provides built-in end-to-end encryption
5. **Rate Limiting:** Implement rate limiting on call initiation

## Performance Optimization

1. **Redis Connection Pooling:** Use connection pooling for Redis
2. **Token Caching:** Cache generated tokens to reduce computation
3. **WebSocket Optimization:** Use Socket.IO rooms for efficient message routing
4. **Media Quality:** Adjust video quality based on network conditions

## Production Deployment

For production deployment:

1. Use environment-specific `.env` files
2. Set up TURN servers for better connectivity
3. Configure cloud recording with proper storage (S3/Azure Blob)
4. Enable monitoring and logging
5. Set up proper CORS origins
6. Use SSL/TLS for all connections
7. Implement proper error handling and retry logic

## Additional Resources

- [Agora Documentation](https://docs.agora.io)
- [Socket.IO Documentation](https://socket.io/docs/)
- [Video SDK Source Code](../packages/video-sdk/)
- [Implementation Summary](../../VIDEO_CALLING_IMPLEMENTATION_SUMMARY.md)
- [Quick Start Guide](../../QUICK_START_VIDEO_CALLS.md)
