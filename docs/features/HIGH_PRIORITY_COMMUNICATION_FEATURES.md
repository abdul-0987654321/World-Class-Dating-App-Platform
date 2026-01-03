# HIGH PRIORITY Communication Features Implementation

This document describes the implementation of four high-priority communication features for the Flamoral dating app messaging system.

## Overview

The following features have been implemented in the messaging service:

1. **Photo Sharing in Chat** - Send and receive photos with thumbnails, EXIF sanitization, and WebP optimization
2. **GIF Integration (Giphy API)** - Search and send GIFs from Giphy and Tenor
3. **Voice Messages** - Record, send, and play voice messages with waveform visualization and transcription
4. **Typing Indicators** - Real-time typing status with cross-instance coordination via Redis

## Architecture

### Backend (messaging-service)

```
backend/services/messaging-service/src/
├── api/
│   ├── controllers/
│   │   ├── media-messaging.controller.ts    # Photo & voice message handling
│   │   ├── enhanced-messaging.controller.ts # GIF search, reactions, etc.
│   │   └── conversation-typing.controller.ts # Typing indicators
│   └── routes/
│       ├── media-messaging.routes.ts        # /api/v1/conversations/:id/messages/photo|voice
│       ├── enhanced-messaging.routes.ts     # /api/v1/gifs/*
│       └── conversation.routes.ts           # /api/v1/conversations/:id/typing
├── services/
│   ├── photo-sharing.service.ts             # Image processing, thumbnails, EXIF
│   ├── voice-message.service.ts             # Audio processing, waveforms, transcription
│   ├── gif-integration.service.ts           # Giphy/Tenor API integration
│   └── typing-indicator.service.ts          # Redis-backed typing state
├── types/
│   ├── index.ts                             # WebSocket event types
│   └── enhanced-types.ts                    # Media metadata types
└── infrastructure/
    └── database/
        └── migrations/
            └── 20260102_add_media_messaging_schema.ts
```

### Frontend (web-app)

```
apps/web-app/src/
├── components/messaging/
│   ├── PhotoMessage.tsx        # Photo display with upload progress
│   ├── VoiceNoteRecorder.tsx   # Voice recording & playback
│   ├── GifPicker.tsx           # GIF search & selection
│   ├── TypingIndicator.tsx     # Typing animation components
│   ├── MediaMessage.tsx        # Universal media message renderer
│   ├── EnhancedMessageInput.tsx # Full-featured message input
│   └── index.ts                # Component exports
└── hooks/
    └── useMediaMessaging.ts    # Custom hook for media messaging
```

---

## Feature 1: Photo Sharing in Chat

### Database Schema

```typescript
interface PhotoMessageMetadata {
  mediaUrl: string;      // CDN URL to full-size image
  thumbnailUrl: string;  // CDN URL to thumbnail (300x300)
  width: number;         // Original width in pixels
  height: number;        // Original height in pixels
  fileSize: number;      // File size in bytes
  mimeType: string;      // image/webp, image/jpeg, etc.
}
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/conversations/:conversationId/messages/photo` | Upload and send photo |
| GET | `/api/v1/media/upload-url` | Get pre-signed URL for direct upload |
| GET | `/api/v1/media/supported-formats` | Get supported formats and limits |

### Photo Processing Pipeline

1. **Validation** - Check file size (max 10MB) and format (JPEG, PNG, GIF, WebP)
2. **EXIF Sanitization** - Remove GPS, camera info, and other sensitive metadata
3. **Optimization** - Resize to max 1920x1080, convert to WebP (85% quality)
4. **Thumbnail Generation** - Create 300x300 cover-fit thumbnail
5. **Upload** - Store both original and thumbnail to CDN
6. **Message Creation** - Create message with metadata

### Frontend Components

```tsx
// PhotoMessage.tsx - Display with lightbox
<PhotoMessage
  imageUrl="..."
  thumbnailUrl="..."
  isFromMe={true}
  isUploading={true}
  uploadProgress={75}
  onImageClick={(url) => setLightboxUrl(url)}
/>

// PhotoLightbox.tsx - Full-size viewer
<PhotoLightbox
  imageUrl="..."
  onClose={() => setLightboxUrl(null)}
/>
```

---

## Feature 2: GIF Integration (Giphy API)

### Configuration

```env
GIPHY_API_KEY=your-giphy-api-key
TENOR_API_KEY=your-tenor-api-key
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/gifs/search?query=happy&limit=20` | Search GIFs |
| GET | `/api/v1/gifs/trending?limit=20` | Get trending GIFs |
| GET | `/api/v1/gifs/categories` | Get GIF categories |

### GIF Response Format

```typescript
interface GifMetadata {
  gifUrl: string;        // Full GIF URL
  gifPreviewUrl: string; // Preview/still image
  giphyId?: string;      // Giphy ID for attribution
  tenorId?: string;      // Tenor ID for attribution
  width: number;
  height: number;
}
```

### Categories

Dating-appropriate categories: Happy, Love, Excited, Funny, Sad, Agree, Disagree, Thank You, Good Morning, Good Night, Dance, Celebration, Hearts, Thinking, Wow

### Content Filtering

- Rating filter: `pg-13` for Giphy, `medium` for Tenor
- Inappropriate content is automatically filtered

### Frontend Component

```tsx
<GifPicker
  isOpen={showGifPicker}
  onSelect={(gif) => sendGifMessage(gif)}
  onClose={() => setShowGifPicker(false)}
/>
```

---

## Feature 3: Voice Messages

### Database Schema

```typescript
interface VoiceMessageMetadata {
  mediaUrl: string;      // CDN URL to audio file (MP3)
  duration: number;      // Duration in seconds
  waveform: number[];    // 50 amplitude samples (0-1)
  fileSize: number;      // File size in bytes
  mimeType: string;      // audio/mpeg
  transcription?: string; // Optional voice-to-text
}
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/conversations/:conversationId/messages/voice` | Upload and send voice message |

### Voice Processing Pipeline

1. **Validation** - Check file size (max 5MB), format (MP3, WebM, WAV, OGG), duration (max 2 min)
2. **Duration Extraction** - Use FFprobe to get audio duration
3. **Compression** - Convert to MP3 at 64kbps, mono, 22050 Hz
4. **Waveform Generation** - Extract 50 amplitude samples for visualization
5. **Transcription** (optional) - Azure Speech SDK for voice-to-text
6. **Upload** - Store compressed audio to CDN
7. **Message Creation** - Create message with metadata

### Azure Speech Configuration

```env
AZURE_SPEECH_SUBSCRIPTION_KEY=your-subscription-key
AZURE_SPEECH_REGION=eastus
AZURE_SPEECH_LANGUAGE=en-US
VOICE_ENABLE_TRANSCRIPTION=true
```

### Frontend Components

```tsx
// Recording
<VoiceNoteRecorder
  onSend={(blob, duration) => sendVoiceMessage(blob, duration)}
  onCancel={() => setIsRecording(false)}
  maxDuration={120}
/>

// Playback
<VoiceNotePlayer
  audioUrl="..."
  duration={45}
  isOwn={true}
/>
```

---

## Feature 4: Typing Indicators

### Redis Storage

```
Key: typing:{conversationId}:{userId}
TTL: 10 seconds (auto-expires if not refreshed)

Value: {
  userId: string;
  conversationId: string;
  isTyping: boolean;
  startedAt: Date;
  expiresAt: Date;
}
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/conversations/:conversationId/typing` | Send typing indicator |

### Request Body

```json
{
  "isTyping": true
}
```

### WebSocket Events

```typescript
// Client → Server
'typing:start': { conversationId: string }
'typing:stop': { conversationId: string }

// Server → Client
'typing:indicator': {
  conversationId: string;
  userId: string;
  isTyping: boolean;
  timestamp: Date;
}
```

### Cross-Instance Coordination

- Redis Pub/Sub channel: `typing:updates`
- All server instances subscribe to receive typing events
- Enables horizontal scaling with consistent real-time updates

### Frontend Components

```tsx
// In message list (bubble style)
<TypingIndicator
  typingUsers={[{ userId: '123', userName: 'Sarah' }]}
  showNames={true}
  variant="bubble"
/>

// In input area (inline style)
<InlineTypingIndicator
  typingUsers={typingUsers}
/>

// In conversation list
<ConversationTypingIndicator
  userName="Sarah"
/>
```

### Custom Hook

```tsx
const {
  startTyping,
  stopTyping,
  typingUsers,
} = useMediaMessaging({
  conversationId: 'conv-123',
  onTypingChange: (users) => console.log('Typing:', users),
});

// Call startTyping() on each keystroke (debounced internally)
// Call stopTyping() when input loses focus or message is sent
```

---

## Real-Time Events

### WebSocket Event Types

```typescript
interface ClientToServerEvents {
  'message:photo': (data: PhotoData, callback: ResponseCallback) => void;
  'message:voice': (data: VoiceData, callback: ResponseCallback) => void;
  'message:gif': (data: GifData, callback: ResponseCallback) => void;
  'typing:start': (data: { conversationId: string }) => void;
  'typing:stop': (data: { conversationId: string }) => void;
}

interface ServerToClientEvents {
  'message:new': (message: Message) => void;
  'typing:indicator': (data: TypingIndicator) => void;
  'message:media:processing': (data: ProcessingStatus) => void;
  'message:media:ready': (data: MediaReady) => void;
  'message:media:failed': (data: MediaError) => void;
}
```

---

## Storage Requirements

### Azure Blob Storage Structure

```
flamoral-media/
├── photos/
│   └── {conversationId}/
│       ├── {uuid}.webp           # Full-size image
│       └── {uuid}_thumb.webp     # Thumbnail
├── voice/
│   └── {conversationId}/
│       └── {uuid}.mp3            # Compressed audio
└── temp/
    └── {uuid}/                   # Temporary processing files
```

### CDN Configuration

- Base URL: `https://cdn.flamoral.com`
- Cache TTL: 1 year for immutable media
- CORS: Allow web app origins

---

## Configuration Reference

### Environment Variables

```env
# Photo Processing
IMAGE_MAX_FILE_SIZE=10485760        # 10MB
IMAGE_MAX_WIDTH=1920
IMAGE_MAX_HEIGHT=1080
IMAGE_THUMBNAIL_WIDTH=300
IMAGE_THUMBNAIL_HEIGHT=300
IMAGE_COMPRESSION_QUALITY=85
IMAGE_CONVERT_TO_WEBP=true

# Voice Processing
VOICE_MAX_FILE_SIZE=5242880         # 5MB
VOICE_MAX_DURATION=120              # 2 minutes
VOICE_TARGET_BITRATE=64000          # 64kbps
VOICE_WAVEFORM_SAMPLES=50
VOICE_ENABLE_TRANSCRIPTION=true

# Azure Speech (for transcription)
AZURE_SPEECH_SUBSCRIPTION_KEY=xxx
AZURE_SPEECH_REGION=eastus
AZURE_SPEECH_LANGUAGE=en-US

# GIF APIs
GIPHY_API_KEY=xxx
TENOR_API_KEY=xxx

# Redis (for typing indicators)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=xxx

# CDN
CDN_URL=https://cdn.flamoral.com
UPLOAD_URL=https://upload.flamoral.com
MEDIA_SERVICE_URL=http://media-service:3005
```

---

## Testing

### Run Tests

```bash
cd backend/services/messaging-service
npm test -- --grep "Media Messaging"
```

### Test Coverage

- Photo validation (format, size)
- Voice validation (format, size, duration)
- GIF metadata validation
- Typing indicator TTL and debounce
- API endpoint authorization
- WebSocket event broadcasting

---

## Security Considerations

1. **EXIF Sanitization** - GPS and personal metadata removed from photos
2. **Content Moderation** - GIFs filtered by rating (pg-13)
3. **Size Limits** - Prevent denial of service via large uploads
4. **Authorization** - All endpoints require authentication and conversation membership
5. **Rate Limiting** - Typing indicators debounced to prevent spam
6. **Input Validation** - DTOs validate all incoming data

---

## Performance Optimizations

1. **WebP Conversion** - Smaller file sizes for photos
2. **Thumbnail Preloading** - Low-res blur-up effect
3. **Voice Compression** - 64kbps mono for optimal size/quality
4. **GIF Caching** - 5-minute cache for API responses
5. **Typing Debounce** - 2-second minimum between updates
6. **Redis TTL** - Auto-cleanup of expired typing state

---

## Dependencies

### Backend

- `sharp` - Image processing (resize, format conversion, EXIF removal)
- `fluent-ffmpeg` - Audio processing (duration, compression, waveform)
- `microsoft-cognitiveservices-speech-sdk` - Voice transcription
- `axios` - HTTP client for Giphy/Tenor APIs
- `ioredis` - Redis client for typing indicators

### Frontend

- `styled-components` - Component styling
- `react-icons` - Icon library
- `lodash/debounce` - Input debouncing
