# Messaging Setup Guide

## Quick Start

Follow these steps to get the messaging system up and running in the Flamoral mobile app.

## 1. Install Dependencies

```bash
cd apps/mobile-app

# Install npm packages
npm install socket.io-client@^4.7.2 react-native-image-picker@^7.1.0

# iOS only - install pods
cd ios && pod install && cd ..
```

## 2. Configure Navigation

Add the ChatScreen to your navigation stack:

**File**: `src/navigation/MainNavigator.tsx` or your root navigator

```typescript
import ChatScreen from '@screens/Main/ChatScreen';

// In your Stack.Navigator
<Stack.Screen
  name="Chat"
  component={ChatScreen}
  options={{
    headerShown: false,
    presentation: 'card',
  }}
/>
```

## 3. Configure Environment Variables

Create or update `.env` file in the mobile app root:

```env
# Backend API
API_BASE_URL=https://api.flamoral.com

# WebSocket Server
WEBSOCKET_URL=wss://ws.flamoral.com

# Optional: Giphy API for GIFs
GIPHY_API_KEY=your_giphy_api_key_here
```

## 4. Setup Permissions

### iOS Permissions

**File**: `ios/YourApp/Info.plist`

Add these keys:

```xml
<key>NSCameraUsageDescription</key>
<string>We need camera access to take photos for messages</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>We need photo library access to select images for messages</string>
<key>NSMicrophoneUsageDescription</key>
<string>We need microphone access to record voice messages</string>
```

### Android Permissions

**File**: `android/app/src/main/AndroidManifest.xml`

Add these permissions:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.INTERNET" />
```

## 5. Initialize WebSocket Connection

Update your main App component to connect WebSocket on startup:

**File**: `src/App.tsx`

```typescript
import { useEffect } from 'react';
import { webSocketService } from '@services/realtime/WebSocketService';
import { useDispatch } from 'react-redux';
import { setConnectionStatus } from '@store/slices/messagingSlice';

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    // Connect to WebSocket
    const connectWebSocket = async () => {
      try {
        await webSocketService.connect();
        dispatch(setConnectionStatus(true));
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        dispatch(setConnectionStatus(false));
      }
    };

    connectWebSocket();

    // Cleanup on unmount
    return () => {
      webSocketService.disconnect();
    };
  }, [dispatch]);

  return (
    // Your app components
  );
}
```

## 6. Update Redux Store

Ensure the messaging slice is added to your Redux store:

**File**: `src/store/store.ts`

```typescript
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import messagingReducer from './slices/messagingSlice';
// ... other reducers

export const store = configureStore({
  reducer: {
    auth: authReducer,
    messaging: messagingReducer,
    // ... other reducers
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

## 7. Test the Implementation

### Test Matches Screen Integration

1. Navigate to Matches screen
2. Tap on a match
3. Click "Send Message" button
4. Should navigate to Chat screen

### Test Messages Screen

1. Navigate to Messages screen
2. Should see list of conversations
3. Tap on a conversation
4. Should navigate to Chat screen

### Test Chat Screen

1. Type a message
2. Should see typing indicator appear for other user (if implemented on backend)
3. Send message
4. Should see message appear with "sending" → "sent" → "delivered" → "read" statuses

### Test Image/GIF Sending

1. In Chat screen, tap the "+" button
2. Select "Take Photo" or "Choose from Library"
3. Select/take an image
4. Should see preview
5. Tap "Send Photo"
6. Image should appear in chat

1. In Chat screen, tap the "GIF" button
2. Search for a GIF or browse categories
3. Tap on a GIF
4. GIF should appear in chat

## 8. Backend Requirements

Ensure your backend implements these endpoints:

### REST API Endpoints

```
GET    /api/v1/messaging/conversations
GET    /api/v1/messaging/conversations/:id
POST   /api/v1/messaging/conversations
GET    /api/v1/messaging/conversations/:id/messages
POST   /api/v1/messaging/conversations/:id/messages
POST   /api/v1/messaging/conversations/:id/messages/image
POST   /api/v1/messaging/conversations/:id/read
GET    /api/v1/messaging/unread-count
```

### WebSocket Events

**Client Emits**:
- `message:send` - Send a message
- `typing` - Typing indicator
- `message:read` - Mark messages as read
- `conversation:join` - Join conversation room
- `conversation:leave` - Leave conversation room
- `presence:update` - Update online status

**Server Emits**:
- `message:new` - New message received
- `message:delivered` - Message delivered
- `message:read` - Messages read
- `typing:start` - User started typing
- `typing:stop` - User stopped typing
- `presence:update` - User presence changed
- `match:new` - New match created

## 9. Troubleshooting

### WebSocket Connection Issues

```typescript
// Add debug logging
webSocketService.on('connection', (data) => {
  console.log('WebSocket connection status:', data);
});

// Check connection status
console.log('Is connected:', webSocketService.isConnected());
```

### Messages Not Appearing

1. Check Redux DevTools for state updates
2. Verify API responses in Network tab
3. Check console for errors
4. Verify conversationId is correct

### Image Upload Failing

1. Check file size (should be < 5MB)
2. Verify file permissions
3. Check multipart/form-data headers
4. Review backend upload limits

### Typing Indicators Not Working

1. Verify WebSocket connection
2. Check conversation room is joined
3. Review typing event emissions
4. Check debounce timing (2 seconds)

## 10. Build and Run

```bash
# iOS
npm run ios

# Android
npm run android

# Start Metro bundler
npm start
```

## 11. Optional: Enable Giphy Integration

To enable real GIF search instead of mock data:

1. Get API key from https://developers.giphy.com/
2. Add to `.env`: `GIPHY_API_KEY=your_key`
3. Update `GifPicker.tsx`:

```typescript
// Replace mock search with real API
const response = await fetch(
  `https://api.giphy.com/v1/gifs/search?api_key=${process.env.GIPHY_API_KEY}&q=${query}&limit=20`
);
const data = await response.json();
setGifs(data.data.map(gif => ({
  id: gif.id,
  url: gif.images.fixed_height.url,
  title: gif.title
})));
```

## 12. Production Checklist

Before deploying to production:

- [ ] Environment variables configured for production
- [ ] WebSocket URL points to production server
- [ ] API endpoints tested and working
- [ ] All permissions requested and handled
- [ ] Error boundaries implemented
- [ ] Analytics tracking added
- [ ] Push notifications configured for new messages
- [ ] Image compression optimized
- [ ] WebSocket reconnection tested
- [ ] Offline handling implemented
- [ ] Message encryption enabled (if required)

## Support Resources

- **API Documentation**: See backend `/docs/api`
- **WebSocket Protocol**: See backend `/docs/websocket`
- **Component Documentation**: See `MESSAGING_IMPLEMENTATION.md`
- **Issue Tracking**: GitHub Issues

## Next Steps

1. Test thoroughly with real users
2. Monitor error logs for issues
3. Optimize based on usage patterns
4. Add analytics tracking
5. Implement push notifications
6. Add message search
7. Add voice messages
8. Implement message reactions

---

**Congratulations!** Your messaging system is now set up and ready to use. For detailed documentation on each component, see `MESSAGING_IMPLEMENTATION.md`.
