# Messaging Implementation Guide

## Overview

This document provides a comprehensive guide to the messaging system implementation in the Flamoral mobile dating app. The messaging system includes real-time chat, typing indicators, read receipts, image/GIF sending, and unread message badges.

## Features Implemented

### 1. Matches List Screen (MatchesScreen.tsx)
- **Location**: `src/screens/Main/MatchesScreen.tsx`
- **Features**:
  - Display all matches with photos and compatibility scores
  - New matches section with visual indicators
  - Filter matches by recent or compatibility
  - Match detail modal with full profile information
  - "Send Message" button that creates/opens conversation
  - Integration with messaging API

### 2. Messages List Screen (MessagesScreen.tsx)
- **Location**: `src/screens/Main/MessagesScreen.tsx`
- **Features**:
  - List all conversations with last message preview
  - User avatar with online status indicator (green dot)
  - Unread message count badges
  - Real-time message updates via WebSocket
  - Search conversations by user name
  - Pull-to-refresh functionality
  - Connection status indicator
  - Empty state with helpful message

### 3. Chat Screen (ChatScreen.tsx)
- **Location**: `src/screens/Main/ChatScreen.tsx`
- **Features**:
  - Full message thread with message bubbles
  - Real-time message delivery and updates
  - Typing indicators when other user is typing
  - Read receipts (checkmarks with color coding)
  - Message status indicators (sending, sent, delivered, read)
  - Text input with auto-expanding multiline support
  - Image picker integration
  - GIF picker integration
  - User presence status in header
  - Auto-scroll to latest messages
  - Message timestamps
  - Connection status banner

### 4. Real-time Features

#### WebSocket Service (WebSocketService.ts)
- **Location**: `src/services/realtime/WebSocketService.ts`
- **Features**:
  - Socket.io client integration
  - Auto-reconnection with exponential backoff
  - Event-based architecture
  - Room management for conversations
  - Typing indicator broadcasting
  - Read receipt tracking
  - Presence/online status updates
  - Message delivery confirmation

#### Events Supported:
- `message:new` - New message received
- `message:delivered` - Message delivered to recipient
- `message:read` - Messages marked as read
- `typing:start` - User started typing
- `typing:stop` - User stopped typing
- `presence:update` - User online status changed
- `match:new` - New match created
- `connection` - Connection status changed

### 5. Messaging API Service (MessagingService.ts)
- **Location**: `src/services/api/MessagingService.ts`
- **Endpoints**:
  - `GET /conversations` - Get all conversations
  - `GET /conversations/:id` - Get specific conversation
  - `POST /conversations` - Create conversation with match
  - `GET /conversations/:id/messages` - Get messages
  - `POST /conversations/:id/messages` - Send text message
  - `POST /conversations/:id/messages/image` - Send image
  - `POST /conversations/:id/messages/voice` - Send voice message
  - `POST /conversations/:id/read` - Mark messages as read
  - `DELETE /conversations/:id/messages/:messageId` - Delete message
  - `POST /conversations/:id/messages/:messageId/report` - Report message
  - `POST /conversations/:id/block` - Block user
  - `GET /unread-count` - Get unread message count

### 6. Redux State Management
- **Location**: `src/store/slices/messagingSlice.ts`
- **State Structure**:
  ```typescript
  {
    conversations: Conversation[],
    currentConversationId: string | null,
    messages: Record<string, Message[]>,
    typingStatuses: Record<string, TypingStatus[]>,
    presenceStatuses: Record<string, PresenceStatus>,
    unreadCount: number,
    unreadByConversation: Record<string, number>,
    isLoading: boolean,
    isLoadingMessages: boolean,
    error: string | null,
    isConnected: boolean
  }
  ```

- **Async Actions**:
  - `fetchConversations` - Load all conversations
  - `fetchMessages` - Load messages for conversation
  - `sendMessage` - Send text message
  - `sendImageMessage` - Send image message
  - `sendGifMessage` - Send GIF message
  - `markConversationAsRead` - Mark all messages as read

- **Sync Actions**:
  - `addMessage` - Add new message to store
  - `updateMessageStatus` - Update message status
  - `setTypingStatus` - Update typing indicator
  - `setPresenceStatus` - Update user presence
  - `incrementUnreadCount` - Increment unread count
  - `clearUnreadCount` - Clear unread count for conversation

### 7. UI Components

#### ConversationList (ConversationList.tsx)
- **Location**: `src/components/messaging/ConversationList.tsx`
- Displays list of conversations
- Shows user avatar, name, last message, timestamp
- Unread count badges
- Online status indicators

#### MessageThread (MessageThread.tsx)
- **Location**: `src/components/messaging/MessageThread.tsx`
- Message bubbles with different styles for sent/received
- Support for text, image, GIF, and voice messages
- Typing indicator animation
- Read receipts with checkmarks
- Message timestamps and separators
- Input field with attachment buttons
- Auto-scroll to bottom

#### GifPicker (GifPicker.tsx)
- **Location**: `src/components/messaging/GifPicker.tsx`
- Full-screen modal for GIF selection
- Search functionality
- Category filters (Love, Happy, Funny, etc.)
- Trending GIFs section
- Grid layout with preview
- Integration ready for Giphy/Tenor API

#### ImagePicker (ImagePicker.tsx)
- **Location**: `src/components/messaging/ImagePicker.tsx`
- Bottom sheet modal
- Camera capture option
- Photo library selection
- Permission handling
- Image preview before sending
- Loading states

## Architecture

### Data Flow

1. **Message Sending Flow**:
   ```
   User Input → ChatScreen → Redux Action → API Service → Backend
                                         ↓
                                  WebSocket Service
                                         ↓
                                Real-time Broadcast
   ```

2. **Message Receiving Flow**:
   ```
   Backend → WebSocket Server → WebSocket Service → Redux Action → UI Update
   ```

3. **Typing Indicator Flow**:
   ```
   User Typing → Debounced Event → WebSocket → Other User's UI
   ```

4. **Read Receipt Flow**:
   ```
   View Message → Mark as Read API → WebSocket → Sender's UI Update
   ```

## Configuration

### Environment Variables
```env
# WebSocket Configuration
WEBSOCKET_URL=wss://ws.flamoral.com

# API Configuration
API_BASE_URL=https://api.flamoral.com

# Giphy/Tenor API (for GIF picker)
GIPHY_API_KEY=your_giphy_key
```

### Dependencies

#### Required Packages
```json
{
  "socket.io-client": "^4.7.2",
  "react-native-image-picker": "^7.1.0",
  "@react-native-async-storage/async-storage": "^1.21.0",
  "@reduxjs/toolkit": "^2.0.1",
  "react-redux": "^9.0.2"
}
```

#### Installation
```bash
npm install socket.io-client react-native-image-picker

# iOS only
cd ios && pod install
```

### Permissions

#### iOS (Info.plist)
```xml
<key>NSCameraUsageDescription</key>
<string>We need access to your camera to take photos for messages</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>We need access to your photo library to select images for messages</string>
```

#### Android (AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

## Usage Examples

### 1. Connecting to WebSocket
```typescript
import { webSocketService } from '@services/realtime/WebSocketService';

// Connect on app startup
useEffect(() => {
  webSocketService.connect();

  return () => {
    webSocketService.disconnect();
  };
}, []);
```

### 2. Listening to Real-time Messages
```typescript
useEffect(() => {
  const unsubscribe = webSocketService.on('message:new', (data) => {
    dispatch(addMessage({
      conversationId: data.conversationId,
      message: data.message
    }));
  });

  return () => unsubscribe();
}, [dispatch]);
```

### 3. Sending a Message
```typescript
const handleSendMessage = async () => {
  const tempId = `temp_${Date.now()}`;

  // Optimistic update
  dispatch(addMessage({
    conversationId,
    message: { id: tempId, content: text, status: 'sending', ... }
  }));

  // Send via API
  await dispatch(sendMessage({
    conversationId,
    content: text,
    type: 'text',
    tempId
  })).unwrap();
};
```

### 4. Sending Typing Indicator
```typescript
const handleInputChange = (text: string) => {
  setInputText(text);

  if (text.length > 0) {
    webSocketService.sendTyping(conversationId, true);

    // Stop typing after 2 seconds
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      webSocketService.sendTyping(conversationId, false);
    }, 2000);
  }
};
```

### 5. Navigating to Chat
```typescript
// From MatchesScreen
const handleStartChat = async () => {
  const response = await messagingService.getOrCreateConversation(matchId);

  if (response.success) {
    navigation.navigate('Chat', {
      conversationId: response.data.id
    });
  }
};
```

## Navigation Setup

### Add Chat Screen to Navigator
```typescript
// In your stack navigator
import ChatScreen from '@screens/Main/ChatScreen';

<Stack.Screen
  name="Chat"
  component={ChatScreen}
  options={{ headerShown: false }}
/>
```

## Message Types

### Text Message
```typescript
{
  id: string,
  conversationId: string,
  senderId: string,
  content: string,
  type: 'text',
  status: 'sent' | 'delivered' | 'read',
  createdAt: string
}
```

### Image Message
```typescript
{
  id: string,
  conversationId: string,
  senderId: string,
  content: 'Photo',
  type: 'image',
  mediaUrl: string,
  status: 'sent' | 'delivered' | 'read',
  createdAt: string
}
```

### GIF Message
```typescript
{
  id: string,
  conversationId: string,
  senderId: string,
  content: 'GIF',
  type: 'gif',
  mediaUrl: string,
  status: 'sent' | 'delivered' | 'read',
  createdAt: string
}
```

## Best Practices

### 1. Optimistic Updates
Always show messages immediately in the UI before API confirmation for better UX.

### 2. Error Handling
Handle WebSocket disconnections gracefully with reconnection logic and user notifications.

### 3. Message Pagination
Load messages in batches (50 per page) and implement infinite scroll.

### 4. Image Optimization
Compress images before upload to reduce bandwidth and improve send times.

### 5. Typing Indicators
Debounce typing events (2 seconds) to reduce unnecessary network traffic.

### 6. Read Receipts
Mark messages as read when they're visible on screen, not just when conversation opens.

### 7. Presence Updates
Update presence status based on app state (foreground/background).

## Testing

### Unit Tests
```bash
npm test -- MessagingService.test.ts
npm test -- messagingSlice.test.ts
```

### Integration Tests
```bash
npm test -- ChatScreen.test.tsx
npm test -- WebSocketService.test.ts
```

## Performance Optimization

1. **Message List Virtualization**: Use FlatList with proper keyExtractor
2. **Image Caching**: Use react-native-fast-image for cached images
3. **WebSocket Batching**: Batch multiple status updates into single events
4. **Redux Memoization**: Use selectors with reselect for derived state
5. **Lazy Loading**: Load conversations and messages on demand

## Troubleshooting

### WebSocket Not Connecting
- Check `WEBSOCKET_URL` environment variable
- Verify auth token is valid
- Check network connectivity
- Review server CORS settings

### Messages Not Sending
- Verify API endpoints are correct
- Check auth headers
- Review Redux state for errors
- Check network tab in debugger

### Typing Indicators Not Working
- Ensure WebSocket is connected
- Verify conversation room is joined
- Check typing event handlers
- Review debounce timing

### Images Not Uploading
- Check file size limits
- Verify multipart/form-data headers
- Check file permissions
- Review compression settings

## Future Enhancements

1. **Voice Messages**: Record and send audio messages
2. **Message Reactions**: Add emoji reactions to messages
3. **Message Editing**: Allow users to edit sent messages
4. **Message Forwarding**: Forward messages to other conversations
5. **Rich Media**: Support for videos, locations, contacts
6. **End-to-End Encryption**: Implement E2E encryption for privacy
7. **Message Search**: Full-text search across all messages
8. **Message Pinning**: Pin important messages
9. **Conversation Muting**: Mute notifications for conversations
10. **Scheduled Messages**: Schedule messages to send later

## Support

For issues or questions, contact the development team or refer to:
- Backend API Documentation: `/docs/api`
- WebSocket Protocol: `/docs/websocket`
- UI/UX Guidelines: `/docs/design-system`
