# Quick Start Guide - Video Calling

## Setup in 5 Minutes

### 1. Get Agora Credentials (2 min)
1. Go to https://console.agora.io
2. Sign up / Log in
3. Create new project
4. Copy **App ID** and **App Certificate**

### 2. Configure Environment (1 min)

**Web App** - Create `apps/web-app/.env`:
```env
VITE_AGORA_APP_ID=paste_your_app_id_here
```

**Mobile App** - Create `apps/mobile-app/.env`:
```env
AGORA_APP_ID=paste_your_app_id_here
```

**Backend** - Create `backend/services/messaging-service/.env`:
```env
AGORA_APP_ID=paste_your_app_id_here
AGORA_APP_CERTIFICATE=paste_your_certificate_here
AGORA_TOKEN_EXPIRY_TIME=3600
```

### 3. Install Dependencies (2 min)

```bash
# Web app
cd apps/web-app
npm install

# Mobile app
cd apps/mobile-app
npm install
cd ios && pod install  # iOS only

# Backend
cd backend/services/messaging-service
npm install
```

### 4. Run the Apps

```bash
# Terminal 1 - Backend
cd backend/services/messaging-service
npm run dev

# Terminal 2 - Web App
cd apps/web-app
npm run dev

# Terminal 3 - Mobile App
cd apps/mobile-app
npm run android  # or npm run ios
```

## Basic Usage

### Start a Video Call (Web)

```tsx
import { VideoCallContainer } from './components/video';
import { useDispatch } from 'react-redux';
import { startCall } from './store/slices/callSlice';

function CallButton({ recipientId, recipientName }) {
  const dispatch = useDispatch();

  const handleCall = async () => {
    // Call signaling service to initiate
    const response = await fetch('/api/calls/initiate', {
      method: 'POST',
      body: JSON.stringify({
        calleeId: recipientId,
        callType: 'video'
      })
    });

    const { callId, channelName, agoraToken } = await response.json();

    // Update Redux state
    dispatch(startCall({
      callId,
      channelName,
      agoraToken,
      callType: 'video',
      participant: { id: recipientId, name: recipientName }
    }));
  };

  return <button onClick={handleCall}>Video Call</button>;
}
```

### Start a Video Call (Mobile)

```tsx
import { VideoCallScreen } from './components/video';

function CallButton({ recipientId, recipientName, navigation }) {
  const handleCall = async () => {
    // Initiate call
    const response = await fetch(`${API_URL}/calls/initiate`, {
      method: 'POST',
      body: JSON.stringify({
        calleeId: recipientId,
        callType: 'video'
      })
    });

    const { callId, channelName, agoraToken } = await response.json();

    // Navigate to call screen
    navigation.navigate('VideoCallScreen', {
      callId,
      channelName,
      agoraToken,
      participantId: recipientId,
      participantName: recipientName,
      callType: 'video',
      currentUserId: currentUser.id,
      onCallEnd: () => navigation.goBack()
    });
  };

  return <TouchableOpacity onPress={handleCall}>
    <Text>Video Call</Text>
  </TouchableOpacity>;
}
```

## Key Features

### Video Quality Settings
```typescript
// Set video quality
await agoraService.setVideoQuality('hd'); // 'low', 'medium', 'high', 'hd'
```

### Mute/Unmute
```typescript
const isMuted = await agoraService.toggleMicrophone();
```

### Camera On/Off
```typescript
const isVideoEnabled = await agoraService.toggleCamera();
```

### Screen Sharing (Web Only)
```typescript
await agoraService.startScreenShare();
await agoraService.stopScreenShare();
```

### Recording with Consent
```typescript
// Request consent
await signalingService.setRecordingConsent(callId, true);

// Recording starts when both parties consent
```

## Troubleshooting

### No Video/Audio?
- Check camera/microphone permissions
- Verify Agora App ID is correct
- Check browser console for errors

### Can't Connect?
- Ensure backend is running
- Check WebSocket connection
- Verify both users are online

### Poor Quality?
- Check network connection
- Lower video quality setting
- Switch to audio-only mode

## API Endpoints

The backend exposes these WebSocket events:

**Client → Server:**
- `initiate-call` - Start new call
- `accept-call` - Accept incoming call
- `reject-call` - Reject incoming call
- `end-call` - End active call

**Server → Client:**
- `incoming-call` - Incoming call notification
- `call-accepted` - Call was accepted
- `call-rejected` - Call was rejected
- `call-ended` - Call ended by other party

## Files You'll Work With

**Web:**
- `apps/web-app/src/components/video/VideoCallContainer.tsx`
- `apps/web-app/src/services/agora.service.ts`
- `apps/web-app/src/store/slices/callSlice.ts`

**Mobile:**
- `apps/mobile-app/src/components/video/VideoCallScreen.tsx`
- `apps/mobile-app/src/services/AgoraService.ts`
- `apps/mobile-app/src/services/CallKeepService.ts`

**Backend:**
- `backend/services/messaging-service/src/services/video-call.service.ts`
- `backend/services/messaging-service/src/socket/call-signaling.handler.ts`

## Next Steps

1. ✅ Test basic video calls
2. ✅ Test audio-only calls
3. ✅ Configure call recording
4. ✅ Customize UI/styling
5. ✅ Add analytics tracking
6. ✅ Deploy to production

## Need Help?

- 📚 Full Docs: `docs/VIDEO_CALLING_IMPLEMENTATION.md`
- 🎯 Implementation Summary: `VIDEO_CALLING_IMPLEMENTATION_SUMMARY.md`
- 🌐 Agora Docs: https://docs.agora.io
- 💬 Support: support@flamoral.com

---

**You're all set!** The video calling system is ready to use. Start making calls! 🎥📞
