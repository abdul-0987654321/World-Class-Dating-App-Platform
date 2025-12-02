# Video & Voice Features - Quick Start Guide

## Quick Setup (5 minutes)

### 1. Run Database Migration
```bash
cd database
npm run migrate
```

### 2. Install FFmpeg
```bash
# Ubuntu/Debian
sudo apt install ffmpeg

# macOS
brew install ffmpeg

# Windows - Download from https://ffmpeg.org
```

### 3. Configure Azure Storage
Update `backend/services/media-service/.env`:
```env
AZURE_STORAGE_CONNECTION_STRING=your_connection_string
AZURE_STORAGE_CONTAINER_NAME=media
```

### 4. Start Media Service
```bash
cd backend/services/media-service
npm install
npm run dev
```

## Quick Integration

### Mobile (React Native)

```typescript
// Record and upload video
import VideoRecorder from '@/components/media/VideoRecorder';

<VideoRecorder
  maxDuration={30}
  onVideoRecorded={async (path, thumbnail) => {
    const formData = new FormData();
    formData.append('video', { uri: path, type: 'video/mp4', name: 'video.mp4' });
    await uploadVideo(formData);
  }}
  onCancel={() => {}}
/>

// Record and upload voice
import VoiceRecorder from '@/components/media/VoiceRecorder';

<VoiceRecorder
  maxDuration={60}
  context="profile"
  onRecordingComplete={async (path, duration, waveform) => {
    const formData = new FormData();
    formData.append('audio', { uri: path, type: 'audio/mp3', name: 'voice.mp3' });
    formData.append('context', 'profile');
    await uploadVoiceNote(formData);
  }}
  onCancel={() => {}}
/>
```

### Web (React)

```typescript
// Upload video
import VideoUploader from '@/components/media/VideoUploader';

<VideoUploader
  maxDurationInSeconds={30}
  onUpload={async (file) => {
    const formData = new FormData();
    formData.append('video', file);
    await uploadVideo(formData);
  }}
/>

// Record voice
import VoiceRecorder from '@/components/media/VoiceRecorder';

<VoiceRecorder
  maxDurationInSeconds={60}
  context="profile"
  onRecordingComplete={async (blob, duration) => {
    const formData = new FormData();
    formData.append('audio', blob, 'voice.webm');
    formData.append('context', 'profile');
    await uploadVoiceNote(formData);
  }}
/>
```

## API Quick Reference

### Upload Video
```bash
POST /api/media/videos/upload
Content-Type: multipart/form-data

# Body
video: <file>
videoType: "profile" | "prompt"
```

### Upload Voice Note
```bash
POST /api/media/voice-notes/upload
Content-Type: multipart/form-data

# Body
audio: <file>
context: "profile" | "prompt" | "message"
promptId: <uuid> (optional)
conversationId: <uuid> (optional)
```

### Get User Videos
```bash
GET /api/media/videos
```

### Get User Voice Notes
```bash
GET /api/media/voice-notes?context=profile
```

### Delete Media
```bash
DELETE /api/media/videos/:id
DELETE /api/media/voice-notes/:id
```

## File Locations

### Backend Services
```
backend/services/media-service/src/domain/services/
├── video-upload.service.ts
├── video-processing.service.ts
├── voice-note.service.ts
└── audio-processing.service.ts
```

### Mobile Components
```
apps/mobile-app/src/components/media/
├── VideoRecorder.tsx
├── VideoPlayer.tsx
├── VoiceRecorder.tsx
└── VoicePlayer.tsx
```

### Web Components
```
apps/web/src/components/media/
├── VideoUploader.tsx
├── VideoPlayer.tsx
├── VoiceRecorder.tsx
└── VoicePlayer.tsx
```

### Database Migration
```
database/migrations/
└── 20250101000014_create_video_voice_media_tables.ts
```

## Default Limits

| Feature | Limit | Configurable |
|---------|-------|--------------|
| Video Duration | 30 seconds | Yes (.env) |
| Video Size | 100MB | Yes (.env) |
| Voice Duration | 60 seconds | Yes (.env) |
| Voice Size | 10MB | Yes (.env) |
| Thumbnails per Video | 3 | Yes (code) |

## Environment Variables

```env
# Video Settings
VIDEO_MAX_SIZE_MB=100
VIDEO_MAX_DURATION_SECONDS=30

# Audio Settings
AUDIO_MAX_SIZE_MB=10
AUDIO_MAX_DURATION_SECONDS=60

# Azure Storage
AZURE_STORAGE_CONNECTION_STRING=your_connection_string
AZURE_STORAGE_CONTAINER_NAME=media

# FFmpeg (optional, if not in PATH)
FFMPEG_PATH=/usr/bin/ffmpeg
FFPROBE_PATH=/usr/bin/ffprobe
```

## Common Issues

### FFmpeg Not Found
```bash
# Verify installation
ffmpeg -version

# Add to PATH if needed
export PATH=$PATH:/usr/local/bin
```

### Permission Errors (Mobile)
**iOS**: Add to Info.plist
```xml
<key>NSCameraUsageDescription</key>
<string>We need camera access</string>
<key>NSMicrophoneUsageDescription</key>
<string>We need microphone access</string>
```

**Android**: Add to AndroidManifest.xml
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

### Azure Storage Issues
```bash
# Test connection
az storage blob list --account-name <account> --container-name media
```

## Testing

```bash
# Backend
cd backend/services/media-service
npm test

# Mobile
cd apps/mobile-app
npm test

# Web
cd apps/web-app
npm test
```

## Next Steps

1. Review full documentation: `VIDEO_VOICE_IMPLEMENTATION_GUIDE.md`
2. Customize limits in `.env` files
3. Configure Azure Storage
4. Test components in your app
5. Deploy to production

## Support

- Full Documentation: `VIDEO_VOICE_IMPLEMENTATION_GUIDE.md`
- Architecture: `ARCHITECTURE.md`
- Database Schema: `DATABASE_SCHEMA.md`

---

**Quick Start Version**: 1.0.0
**Last Updated**: January 1, 2025
