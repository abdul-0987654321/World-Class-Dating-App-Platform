# Video and Voice Calling Implementation Guide

## Overview

This document describes the complete implementation of video and voice calling functionality for the Flamoral Dating Platform using Agora SDK.

## Architecture

### Components

1. **Web Application (React)**
   - `AgoraService`: Web RTC client wrapper
   - `CallSignalingService`: WebSocket signaling client
   - `VideoCallContainer`: Main call interface
   - `VideoCallControls`: Call control buttons
   - `IncomingCallModal`: Incoming call notification
   - Redux state management for calls

2. **Mobile Application (React Native)**
   - `AgoraService`: Native Agora SDK wrapper
   - `CallKeepService`: Native call UI integration
   - `VideoCallScreen`: Main call interface
   - Background call state handling

3. **Backend Services**
   - `VideoCallService`: Call session management
   - `CallRecordingService`: Cloud recording integration
   - `CallSignalingHandler`: WebSocket signaling handler

## Features

### Core Features
- ✅ Video calling with HD quality support
- ✅ Voice-only calling as fallback
- ✅ Call state management (ringing, connected, ended)
- ✅ Network quality indicators
- ✅ Call statistics overlay
- ✅ Screen sharing (web only)
- ✅ Camera switching (front/back)
- ✅ Speaker/microphone controls
- ✅ Background call support (mobile)
- ✅ Native call UI integration (mobile)
- ✅ Call recording with consent management
- ✅ Real-time signaling via WebSocket

## Setup Instructions

### 1. Agora Account Setup

1. Create an account at [Agora.io](https://www.agora.io)
2. Create a new project in the Agora Console
3. Get your App ID and App Certificate
4. Enable the following features:
   - RTC (Real-Time Communication)
   - Cloud Recording (if recording is needed)

### 2. Environment Configuration

#### Web App (.env)
```env
VITE_AGORA_APP_ID=your_agora_app_id_here
VITE_AGORA_CERTIFICATE=your_agora_certificate_here
VITE_MESSAGING_SERVICE_URL=http://localhost:3001
VITE_MESSAGING_WS_URL=ws://localhost:3001
```

#### Mobile App (.env)
```env
AGORA_APP_ID=your_agora_app_id_here
MESSAGING_SERVICE_URL=http://localhost:3001
MESSAGING_WS_URL=ws://localhost:3001
CALLKEEP_APP_NAME=Flamoral
```

#### Backend (.env)
```env
AGORA_APP_ID=your_agora_app_id_here
AGORA_APP_CERTIFICATE=your_agora_certificate_here
AGORA_CUSTOMER_ID=your_customer_id_here
AGORA_CUSTOMER_CERTIFICATE=your_customer_certificate_here
AGORA_TOKEN_EXPIRY_TIME=3600

# Cloud Recording
AGORA_RECORDING_STORAGE_VENDOR=2  # 1=Agora, 2=AWS S3, 3=Azure
AGORA_RECORDING_STORAGE_REGION=0
AGORA_RECORDING_STORAGE_BUCKET=your-bucket
AGORA_RECORDING_STORAGE_ACCESS_KEY=your_key
AGORA_RECORDING_STORAGE_SECRET_KEY=your_secret
```

### 3. Install Dependencies

#### Web App
```bash
cd apps/web-app
npm install
```

#### Mobile App
```bash
cd apps/mobile-app
npm install
cd ios && pod install  # iOS only
```

#### Backend
```bash
cd backend/services/messaging-service
npm install
```

### 4. Mobile Platform-Specific Setup

#### iOS (Info.plist)
```xml
<key>NSCameraUsageDescription</key>
<string>Flamoral needs camera access for video calls</string>
<key>NSMicrophoneUsageDescription</key>
<string>Flamoral needs microphone access for calls</string>
```

#### Android (AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.READ_PHONE_STATE" />
<uses-permission android:name="android.permission.CALL_PHONE" />
```

## Usage

### Initiating a Call (Web)

```typescript
import { useDispatch } from 'react-redux';
import { startCall } from '../store/slices/callSlice';
import CallSignalingService from '../services/call-signaling.service';

const dispatch = useDispatch();
const signalingService = new CallSignalingService(MESSAGING_WS_URL);

// Connect to signaling server
await signalingService.connect(currentUserId, authToken);

// Initiate call
const call = await signalingService.initiateCall({
  callerId: currentUserId,
  callerName: currentUser.name,
  callerAvatar: currentUser.avatar,
  calleeId: recipientId,
  calleeName: recipient.name,
  callType: 'video', // or 'audio'
});

dispatch(startCall({
  callId: call.callId,
  channelName: call.channelName,
  agoraToken: call.agoraToken,
  callType: 'video',
  participant: {
    id: recipientId,
    name: recipient.name,
    avatar: recipient.avatar,
  },
}));
```

### Accepting a Call (Web)

```typescript
// Listen for incoming calls
signalingService.on('incoming-call', async (call) => {
  dispatch(receiveIncomingCall({
    callId: call.callId,
    caller: {
      id: call.callerId,
      name: call.callerName,
      avatar: call.callerAvatar,
    },
    callType: call.callType,
    timestamp: call.timestamp,
  }));
});

// Accept the call
const acceptData = await signalingService.acceptCall(callId);
dispatch(acceptIncomingCall({
  channelName: acceptData.channelName,
  agoraToken: acceptData.agoraToken,
}));
```

### Initiating a Call (Mobile)

```typescript
import AgoraService from '../services/AgoraService';
import CallKeepService from '../services/CallKeepService';

const agoraService = new AgoraService(AGORA_APP_ID);
const callKeepService = new CallKeepService();

// Setup CallKeep
callKeepService.setup({
  ios: {
    appName: 'Flamoral',
    supportsVideo: true,
    includesCallsInRecents: true,
  },
  android: {
    alertTitle: 'Permissions Required',
    alertDescription: 'This app needs access to your microphone and camera',
    cancelButton: 'Cancel',
    okButton: 'OK',
    additionalPermissions: [],
    foregroundService: {
      channelId: 'com.flamoral.calls',
      channelName: 'Calls',
      notificationTitle: 'Flamoral Call',
    },
  },
});

// Start outgoing call
const callUuid = generateUUID();
callKeepService.startCall(callUuid, recipientId, recipientName, true);

// Navigate to call screen
navigation.navigate('VideoCallScreen', {
  callId,
  channelName,
  agoraToken,
  participantId: recipientId,
  participantName: recipientName,
  callType: 'video',
});
```

## Call Recording

### Enable Recording with Consent

```typescript
// Request consent from user
const consentGranted = await showRecordingConsentDialog();

if (consentGranted) {
  await signalingService.setRecordingConsent(callId, true);
}

// Recording starts automatically when both parties consent
signalingService.on('recording-consent-updated', ({ recordingEnabled }) => {
  if (recordingEnabled) {
    showNotification('Call is now being recorded');
  }
});
```

### Backend Recording Management

```typescript
import { CallRecordingService } from './services/call-recording.service';

const recordingService = new CallRecordingService(recordingConfig, videoCallService);

// Start recording
const recording = await recordingService.startRecording(
  callId,
  channelName,
  uid
);

// Stop recording
const stoppedRecording = await recordingService.stopRecording(recording.recordingId);
console.log('Recording files:', stoppedRecording.fileList);
```

## Network Quality Monitoring

The system automatically monitors network quality and displays indicators:

- **Excellent** (Green): Latency < 200ms, packet loss < 2%
- **Good** (Blue): Latency < 400ms, packet loss < 5%
- **Fair** (Orange): Latency < 600ms, packet loss < 10%
- **Poor** (Red): Latency > 600ms or packet loss > 10%

## Background Call Support (Mobile)

The mobile app maintains call state when the app goes to background:

- Uses `BackgroundTimer` for duration tracking
- Integrates with native call UI via CallKeep
- Maintains WebSocket connection in background
- Handles incoming calls when app is closed (via push notifications)

## WebSocket Events

### Client → Server

- `initiate-call`: Start a new call
- `accept-call`: Accept incoming call
- `reject-call`: Reject incoming call
- `end-call`: End active call
- `ice-candidate`: Exchange ICE candidates
- `recording-consent`: Set recording consent

### Server → Client

- `incoming-call`: New incoming call notification
- `call-accepted`: Call was accepted by recipient
- `call-rejected`: Call was rejected
- `call-ended`: Call was ended by other party
- `call-timeout`: Call timed out (not answered)
- `user-busy`: User is already in a call
- `user-offline`: User is not connected
- `recording-consent-updated`: Recording consent status changed

## Call States

1. **idle**: No active call
2. **ringing**: Call initiated, waiting for answer
3. **connecting**: Call accepted, establishing connection
4. **connected**: Call in progress
5. **ended**: Call completed successfully
6. **failed**: Call failed due to error
7. **rejected**: Call rejected by recipient
8. **missed**: Call not answered within timeout

## Security Considerations

1. **Token Generation**: Agora tokens are generated server-side with appropriate expiry times
2. **Authentication**: All WebSocket connections require authentication
3. **Recording Consent**: Both parties must explicitly consent before recording starts
4. **Encryption**: All media streams are encrypted by Agora
5. **Access Control**: Users can only join channels they're authorized for

## Performance Optimization

1. **Adaptive Bitrate**: Automatically adjusts video quality based on network conditions
2. **Dual Stream**: High and low quality streams for optimal performance
3. **Beauty Effects**: Optional beauty filters with minimal performance impact
4. **Noise Suppression**: AI-powered noise cancellation for better audio quality
5. **Echo Cancellation**: Automatic echo cancellation enabled by default

## Troubleshooting

### Common Issues

1. **No video/audio**
   - Check camera/microphone permissions
   - Verify Agora App ID is correct
   - Check network connectivity

2. **Poor call quality**
   - Check network quality indicator
   - Try reducing video quality
   - Switch to audio-only mode

3. **Call won't connect**
   - Verify both users have internet connection
   - Check if user is already in another call
   - Verify WebSocket connection is established

4. **Recording not working**
   - Ensure both parties have granted consent
   - Verify cloud recording credentials
   - Check storage bucket permissions

## API Reference

### AgoraService (Web)

```typescript
class AgoraService {
  async joinChannel(channelName, token, uid, options): Promise<void>
  async leaveChannel(): Promise<void>
  async toggleMicrophone(): Promise<boolean>
  async toggleCamera(): Promise<boolean>
  async switchCamera(): Promise<void>
  async startScreenShare(): Promise<void>
  async stopScreenShare(): Promise<void>
  async setVideoQuality(quality): Promise<void>
}
```

### CallSignalingService (Web)

```typescript
class CallSignalingService {
  connect(userId, authToken): Promise<void>
  initiateCall(data): Promise<CallSignal>
  acceptCall(callId): Promise<CallAcceptSignal>
  rejectCall(callId, reason): Promise<void>
  endCall(callId, duration): Promise<void>
  disconnect(): void
}
```

### VideoCallService (Backend)

```typescript
class VideoCallService {
  async initiateCall(callerId, callerName, calleeId, calleeName, callType): Promise<CallSession>
  generateAgoraToken(channelName, uid, role): string
  async acceptCall(callId, calleeId): Promise<{ callSession, agoraToken }>
  async rejectCall(callId, calleeId, reason): Promise<void>
  async endCall(callId, userId, duration): Promise<void>
  async setRecordingConsent(callId, userId, consent): Promise<void>
}
```

## Future Enhancements

1. **Group Calls**: Support for multi-party video calls
2. **Call History UI**: Comprehensive call history with filters
3. **Call Statistics Dashboard**: Detailed analytics for calls
4. **Virtual Backgrounds**: Background replacement during calls
5. **Live Streaming**: Integration with live streaming features
6. **Call Waiting**: Handle multiple incoming calls
7. **Call Transfer**: Transfer calls between devices
8. **Picture-in-Picture**: Minimize call window while using app

## Support

For issues or questions:
- Agora Documentation: https://docs.agora.io
- Project Issues: [GitHub Issues]
- Email: support@flamoral.com

## License

Copyright © 2024 Flamoral. All rights reserved.
