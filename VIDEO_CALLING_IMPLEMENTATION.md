# Video Calling Implementation Guide

## Overview

This document provides a comprehensive guide to the video calling feature implementation using Agora SDK in the Flamoral Dating App Platform.

## Features Implemented

### 1. Core Video Calling Features
- ✅ Video and audio call initiation
- ✅ Agora RTC token generation
- ✅ Call request/accept/reject flow
- ✅ Real-time WebSocket signaling
- ✅ In-call controls (mute, camera toggle, speaker, end call)
- ✅ Call duration tracking
- ✅ Connection quality monitoring
- ✅ Call history and statistics

### 2. Premium Features
- ✅ HD video quality for premium users
- ✅ Call duration limits for free users (30 min video, 60 min audio per day)
- ✅ Per-call duration limits (15 min video, 30 min audio for free users)
- ✅ Unlimited calls for premium subscribers
- ✅ Quality settings (SD/HD/Full HD)
- ✅ Call recording support (infrastructure ready)

### 3. Monetization
- ✅ Coin-based charging (10 coins/min for video, 5 coins/min for audio)
- ✅ Free tier limitations with upgrade prompts
- ✅ Premium tier benefits

## Architecture

### Backend Components

#### 1. Database Schema
**Location:** `database/migrations/20250101000012_create_video_calls_table.ts`

Tables created:
- `video_calls` - Call records with status, duration, quality metrics
- `call_duration_limits` - Daily usage tracking for free users
- `call_recordings` - Recording metadata for premium feature

#### 2. Video Chat Service
**Location:** `backend/services/user-service/src/services/video-chat.service.ts`

Key methods:
- `generateToken()` - Generate Agora RTC tokens
- `initiateCall()` - Start a video/audio call
- `acceptCall()` - Accept incoming call
- `endCall()` - End active call with billing
- `getCallHistory()` - Retrieve call history
- `checkCallDurationLimit()` - Verify daily limits

#### 3. WebSocket Events
**Location:** `backend/services/user-service/src/infrastructure/websocket/socket.config.ts`

Events implemented:
- `call_initiated` - Notify receiver of incoming call
- `call_accepted` - Notify caller that call was accepted
- `call_rejected` - Notify caller of rejection
- `call_ended` - Notify party that call ended
- `call_busy` - Notify caller that receiver is busy
- `ice_candidate` - WebRTC ICE candidate exchange

#### 4. API Routes
**Location:** `backend/services/user-service/src/api/routes/video-chat.routes.ts`

Endpoints:
- `POST /api/video-chat/initiate` - Initiate call
- `POST /api/video-chat/accept/:callId` - Accept call
- `POST /api/video-chat/end/:callId` - End call
- `GET /api/video-chat/history` - Get call history
- `GET /api/video-chat/active` - Get active call
- `PATCH /api/video-chat/status/:callId` - Update call status

### Frontend Components (React Native)

#### 1. Video Call Hook
**Location:** `apps/mobile-app/src/hooks/useVideoCall.ts`

Features:
- Agora RTC engine initialization
- Channel join/leave management
- Audio/video track control
- Camera switching
- Call statistics collection
- Permission handling

#### 2. Video Call Screen
**Location:** `apps/mobile-app/src/screens/VideoCall/AgoraVideoCallScreen.tsx`

States:
- Idle - Ready to call
- Ringing - Incoming/outgoing call
- Connecting - Establishing connection
- Connected - Active call
- Ended - Call completed

Features:
- Full-screen remote video
- Picture-in-picture local video
- Auto-hiding controls
- Duration timer
- Max duration warnings
- Quality indicators

#### 3. Call Controls Component
**Location:** `apps/mobile-app/src/components/VideoCall/CallControls.tsx`

Controls:
- Mute/Unmute microphone
- Enable/Disable video
- Toggle speaker
- Switch camera (front/back)
- End call

#### 4. Incoming Call Overlay
**Location:** `apps/mobile-app/src/components/VideoCall/IncomingCallOverlay.tsx`

Features:
- Full-screen overlay
- Animated caller avatar
- Accept/Reject buttons
- Vibration pattern
- Quick actions

#### 5. Call History Screen
**Location:** `apps/mobile-app/src/screens/VideoCall/CallHistoryScreen.tsx`

Features:
- Call list with details
- Call type indicators (video/audio)
- Status badges (completed, missed, declined)
- Duration display
- HD quality badge
- Call again functionality
- Pull-to-refresh
- Infinite scroll

#### 6. Video Call Service
**Location:** `apps/mobile-app/src/services/videoCallService.ts`

API integration for:
- Initiating calls
- Accepting/rejecting calls
- Ending calls
- Fetching call history
- Checking call eligibility
- Updating call status

### Frontend Components (Web App)

#### 1. Video Call Screen
**Location:** `apps/web-app/src/components/VideoCall/VideoCallScreen.tsx`

Features:
- Agora WebRTC SDK integration
- Browser-based video calling
- Responsive design
- Network quality monitoring
- HD video support
- Audio/video controls

#### 2. Video Call Styles
**Location:** `apps/web-app/src/components/VideoCall/VideoCallScreen.css`

Includes:
- Full-screen layout
- PIP local video
- Responsive breakpoints
- Control button styles
- Animations

## Installation & Setup

### 1. Install Dependencies

#### Backend
```bash
cd backend/services/user-service
npm install agora-access-token
```

#### React Native App
```bash
cd apps/mobile-app
npm install react-native-agora
npm install react-native-incall-manager
```

#### Web App
```bash
cd apps/web-app
npm install agora-rtc-sdk-ng
```

### 2. Environment Variables

Add to `.env` file:
```env
# Agora Configuration
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_app_certificate
```

### 3. Database Migration

Run the migration:
```bash
cd database
npm run migrate
```

This creates the necessary tables:
- `video_calls`
- `call_duration_limits`
- `call_recordings`

### 4. iOS Setup (React Native)

Add to `ios/Podfile`:
```ruby
pod 'AgoraRtcEngine_iOS'
```

Add permissions to `ios/Info.plist`:
```xml
<key>NSCameraUsageDescription</key>
<string>We need access to your camera for video calls</string>
<key>NSMicrophoneUsageDescription</key>
<string>We need access to your microphone for calls</string>
```

### 5. Android Setup (React Native)

Add permissions to `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

## Usage

### Initiating a Call (React Native)

```typescript
import { useNavigation } from '@react-navigation/native';

const navigation = useNavigation();

// Start video call
navigation.navigate('AgoraVideoCall', {
  userId: 'receiver-user-id',
  userName: 'John Doe',
  callType: 'video',
  isIncoming: false,
});

// Start audio call
navigation.navigate('AgoraVideoCall', {
  userId: 'receiver-user-id',
  userName: 'John Doe',
  callType: 'audio',
  isIncoming: false,
});
```

### Handling Incoming Calls

```typescript
// Listen for incoming call events
socket.on('incoming_call', (data) => {
  const { callId, callerId, callerName, callType } = data;

  // Show incoming call overlay
  navigation.navigate('AgoraVideoCall', {
    callId,
    userId: callerId,
    userName: callerName,
    callType,
    isIncoming: true,
  });
});
```

### Web App Integration

```typescript
import VideoCallScreen from './components/VideoCall/VideoCallScreen';

<VideoCallScreen
  channelName={channelName}
  token={token}
  appId={appId}
  userId={userId}
  userName={userName}
  isAudioOnly={false}
  enableHD={isPremiumUser}
  maxDuration={maxDuration}
  onCallEnd={handleCallEnd}
/>
```

## API Reference

### Backend API

#### Initiate Call
```
POST /api/video-chat/initiate
Body: {
  receiverId: string,
  callType: 'video' | 'audio',
  hdEnabled?: boolean
}
Response: {
  success: boolean,
  callId: string,
  channelName: string,
  token: string,
  appId: string,
  maxDuration?: number,
  remainingMinutes?: number
}
```

#### Accept Call
```
POST /api/video-chat/accept/:callId
Response: {
  success: boolean,
  channelName: string,
  token: string,
  callType: 'video' | 'audio'
}
```

#### End Call
```
POST /api/video-chat/end/:callId
Body: {
  reason: 'completed' | 'declined' | 'cancelled' | 'missed',
  connectionQuality?: {
    avgBitrate: number,
    packetLoss: number,
    quality: 'poor' | 'fair' | 'good' | 'excellent'
  }
}
Response: {
  success: boolean,
  duration: number,
  coinsCharged: number
}
```

#### Get Call History
```
GET /api/video-chat/history?limit=20&offset=0
Response: {
  success: boolean,
  calls: VideoCallRecord[],
  pagination: {
    total: number,
    limit: number,
    offset: number,
    hasMore: boolean
  }
}
```

## Call Flow

### Outgoing Call Flow

1. User initiates call
2. Frontend calls `/api/video-chat/initiate`
3. Backend:
   - Validates match status
   - Checks call eligibility (limits, coins)
   - Generates Agora token
   - Creates call record
   - Returns call details
4. Frontend:
   - Initializes Agora engine
   - Joins channel
   - Emits `call_initiated` socket event
5. Receiver gets `incoming_call` event
6. Receiver accepts/rejects call
7. If accepted:
   - Receiver joins channel
   - Call status updates to 'connected'
   - Duration tracking begins

### Incoming Call Flow

1. Receiver gets `incoming_call` socket event
2. Show incoming call overlay/screen
3. User accepts/rejects
4. If accepted:
   - Call `/api/video-chat/accept/:callId`
   - Get token and channel details
   - Initialize Agora engine
   - Join channel
   - Emit `call_accepted` socket event
5. If rejected:
   - Call `/api/video-chat/end/:callId` with reason 'declined'
   - Emit `call_rejected` socket event

### End Call Flow

1. User ends call
2. Frontend:
   - Leave Agora channel
   - Stop local tracks
   - Call `/api/video-chat/end/:callId`
3. Backend:
   - Calculate duration
   - Charge coins (if applicable)
   - Update daily usage limits
   - Save call record
4. Socket event `call_ended` notifies other party
5. Navigate back to previous screen

## Premium Features

### Free Tier Limitations

- **Daily Limits:**
  - Video: 30 minutes per day
  - Audio: 60 minutes per day

- **Per-Call Limits:**
  - Video: 15 minutes per call
  - Audio: 30 minutes per call

- **Costs:**
  - Video: 10 coins per minute
  - Audio: 5 coins per minute

- **Quality:**
  - SD quality only (640x480, 15fps)

### Premium Tier Benefits

- **Unlimited Calls:**
  - No daily limits
  - No per-call duration limits
  - No coin charges

- **HD Quality:**
  - HD (1280x720, 30fps)
  - Full HD support
  - Better bitrate

- **Advanced Features:**
  - Call recording (coming soon)
  - Screen sharing (coming soon)
  - Group calls (coming soon)

## Monitoring & Analytics

### Call Metrics Tracked

- Call duration (seconds)
- Connection quality (poor/fair/good/excellent)
- Average bitrate
- Packet loss percentage
- Video quality used (SD/HD/Full HD)
- Screen share usage
- Coins charged
- User subscription status at call time

### Call Status Types

- `initiated` - Call created, waiting for receiver
- `ringing` - Receiver's device is ringing
- `active` - Call in progress
- `completed` - Call ended normally
- `declined` - Receiver declined
- `cancelled` - Caller cancelled before answer
- `missed` - Receiver didn't answer
- `failed` - Technical failure

## Troubleshooting

### Common Issues

1. **No video/audio**
   - Check camera/microphone permissions
   - Verify Agora credentials
   - Check network connectivity

2. **Token expired**
   - Tokens expire after 1 hour
   - Implement token refresh logic
   - Re-generate token if needed

3. **Call not connecting**
   - Verify WebSocket connection
   - Check Agora channel name
   - Verify both parties joined channel

4. **Poor quality**
   - Check network quality
   - Reduce video quality settings
   - Check available bandwidth

## Security Considerations

1. **Token Generation:**
   - Tokens generated server-side only
   - Short expiration time (1 hour)
   - Include user ID validation

2. **Access Control:**
   - Only matched users can call each other
   - Block list integration
   - Subscription tier verification

3. **Privacy:**
   - Encrypted video/audio streams
   - Call recording requires consent
   - Call history privacy controls

## Future Enhancements

- [ ] Call recording for premium users
- [ ] Screen sharing during calls
- [ ] Group video calls
- [ ] Call quality analytics dashboard
- [ ] Advanced network diagnostics
- [ ] Background call support
- [ ] Call waiting and hold
- [ ] Conference calling
- [ ] Virtual backgrounds
- [ ] Noise suppression
- [ ] Beauty filters

## Support

For issues or questions:
- Check Agora documentation: https://docs.agora.io
- Review server logs for errors
- Test with Agora sample projects
- Verify environment variables

## License

This implementation is part of the Flamoral Dating App Platform.
