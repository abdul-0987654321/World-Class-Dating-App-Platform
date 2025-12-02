# Video Profiles and Voice Notes Implementation Guide

## Overview

This guide documents the complete implementation of video profiles, voice notes, and voice prompts for the Flamoral dating platform. The implementation includes backend services, database migrations, mobile components (React Native), and web components (React).

## Table of Contents

1. [Features Implemented](#features-implemented)
2. [Architecture Overview](#architecture-overview)
3. [Backend Services](#backend-services)
4. [Database Schema](#database-schema)
5. [Mobile Components](#mobile-components)
6. [Web Components](#web-components)
7. [API Endpoints](#api-endpoints)
8. [Setup Instructions](#setup-instructions)
9. [Usage Examples](#usage-examples)
10. [Dependencies](#dependencies)

---

## Features Implemented

### 1. Video Profiles
- **30-second intro video upload**: Users can upload or record a 30-second video introducing themselves
- **In-app video recording**: Native camera recording on mobile devices
- **Video processing and compression**: Automatic video optimization using FFmpeg
- **Thumbnail generation**: Multiple thumbnail snapshots generated automatically
- **Video player component**: Custom video player with playback controls
- **Content moderation**: Automated video content moderation before approval

### 2. Voice Notes
- **Voice message recording**: Up to 60 seconds of audio recording
- **Audio compression**: Automatic audio compression to MP3 format
- **Waveform visualization**: Real-time waveform display during recording and playback
- **Audio player component**: Custom audio player with waveform visualization
- **Context support**: Voice notes for messages, profiles, and prompts

### 3. Voice Prompts
- **Answer prompts with voice**: Users can respond to profile prompts using voice
- **Voice playback on profile**: Play voice responses directly on user profiles
- **Prompt management**: Predefined prompts with support for voice responses

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │   Mobile App     │         │     Web App      │         │
│  │  (React Native)  │         │     (React)      │         │
│  │                  │         │                  │         │
│  │ - VideoRecorder  │         │ - VideoUploader  │         │
│  │ - VideoPlayer    │         │ - VideoPlayer    │         │
│  │ - VoiceRecorder  │         │ - VoiceRecorder  │         │
│  │ - VoicePlayer    │         │ - VoicePlayer    │         │
│  └──────────────────┘         └──────────────────┘         │
└─────────────────┬───────────────────┬───────────────────────┘
                  │                   │
                  ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway                             │
│                    (Port 3000)                               │
└─────────────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    Media Service                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Controllers:                                          │  │
│  │  - VideoController                                     │  │
│  │  - VoiceNoteController                                 │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  Services:                                             │  │
│  │  - VideoUploadService                                  │  │
│  │  - VideoProcessingService                              │  │
│  │  - VoiceNoteService                                    │  │
│  │  - AudioProcessingService                              │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  Repositories:                                         │  │
│  │  - VideoRepository                                     │  │
│  │  - VoiceNoteRepository                                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  PostgreSQL  │  │ Azure Blob   │  │    Redis     │     │
│  │              │  │   Storage    │  │              │     │
│  │ - videos     │  │ - video/     │  │ - Cache      │     │
│  │ - voice_notes│  │ - voice/     │  │              │     │
│  │ - prompts    │  │ - thumbs/    │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## Backend Services

### Location
```
backend/services/media-service/src/domain/services/
```

### Key Services

#### 1. VideoUploadService
**File**: `video-upload.service.ts`

**Responsibilities**:
- Upload and process video files
- Generate thumbnails
- Store videos in Azure Blob Storage
- Create video metadata records
- Trigger content moderation

**Key Methods**:
```typescript
- uploadVideo(file: UploadedFile, userId: string, videoType: 'profile' | 'prompt'): Promise<VideoMetadata>
- deleteVideo(videoId: string, urls: VideoUrls): Promise<boolean>
- getUserVideos(userId: string): Promise<VideoMetadata[]>
- getVideo(videoId: string): Promise<VideoMetadata | null>
- getUserProfileVideo(userId: string): Promise<VideoMetadata | null>
```

#### 2. VideoProcessingService
**File**: `video-processing.service.ts`

**Responsibilities**:
- Validate video files (format, duration, size)
- Compress videos using FFmpeg
- Generate multiple thumbnails
- Extract video metadata

**Key Methods**:
```typescript
- processVideo(file: UploadedFile): Promise<ProcessedVideo>
- validateVideo(buffer: Buffer, mimetype: string, filename: string): Promise<ValidationResult>
- compressVideo(inputBuffer: Buffer): Promise<Buffer>
- generateThumbnails(inputBuffer: Buffer): Promise<Buffer[]>
```

#### 3. VoiceNoteService
**File**: `voice-note.service.ts`

**Responsibilities**:
- Upload and process voice notes
- Compress audio files
- Generate waveform data
- Store audio in Azure Blob Storage
- Create voice note metadata records

**Key Methods**:
```typescript
- uploadVoiceNote(file: UploadedFile, userId: string, context: 'profile' | 'prompt' | 'message', options?: VoiceNoteOptions): Promise<VoiceNoteMetadata>
- deleteVoiceNote(voiceNoteId: string, url: string): Promise<boolean>
- getUserVoiceNotes(userId: string, context?: string): Promise<VoiceNoteMetadata[]>
- getVoiceNote(voiceNoteId: string): Promise<VoiceNoteMetadata | null>
```

#### 4. AudioProcessingService
**File**: `audio-processing.service.ts`

**Responsibilities**:
- Validate audio files
- Compress audio to MP3
- Normalize audio levels
- Trim silence
- Generate waveform visualization data

**Key Methods**:
```typescript
- processVoiceNote(buffer: Buffer): Promise<ProcessedAudio>
- validateAudio(buffer: Buffer, mimetype: string, filename: string): Promise<ValidationResult>
- compressAudio(inputBuffer: Buffer): Promise<Buffer>
- generateWaveform(audioBuffer: Buffer): Promise<WaveformData>
```

---

## Database Schema

### Location
```
database/migrations/20250101000014_create_video_voice_media_tables.ts
```

### Tables Created

#### 1. `videos` Table
Stores video metadata and references.

**Schema**:
```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key -> users.id)
- file_name: VARCHAR(255)
- original_name: VARCHAR(255)
- mime_type: VARCHAR(100)
- size: BIGINT
- duration: INTEGER (seconds)
- original_url: TEXT
- compressed_url: TEXT
- thumbnail_urls: JSONB
- width: INTEGER
- height: INTEGER
- codec: VARCHAR(50)
- bitrate: INTEGER
- frame_rate: INTEGER
- video_type: ENUM ('profile', 'prompt', 'story')
- prompt_id: UUID (nullable)
- moderation_status: ENUM ('pending', 'approved', 'rejected', 'flagged')
- moderation_result: JSONB
- moderated_at: TIMESTAMP
- moderated_by: UUID
- view_count: INTEGER
- like_count: INTEGER
- share_count: INTEGER
- is_active: BOOLEAN
- is_primary: BOOLEAN
- uploaded_at: TIMESTAMP
- updated_at: TIMESTAMP
- deleted_at: TIMESTAMP
```

**Indexes**:
- `idx_videos_user_id`: User ID
- `idx_videos_type`: Video type
- `idx_videos_moderation`: Moderation status
- `idx_videos_user_type`: User ID + Video type
- `idx_videos_user_primary`: User ID + Is primary

#### 2. `voice_notes` Table
Stores voice note metadata and references.

**Schema**:
```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key -> users.id)
- file_name: VARCHAR(255)
- original_name: VARCHAR(255)
- mime_type: VARCHAR(100)
- size: BIGINT
- duration: INTEGER (seconds, max 60)
- url: TEXT
- waveform_data: JSONB
- sample_rate: INTEGER
- bitrate: INTEGER
- codec: VARCHAR(50)
- context: ENUM ('profile', 'prompt', 'message')
- prompt_id: UUID (nullable)
- conversation_id: UUID (nullable)
- message_id: UUID (nullable)
- moderation_status: ENUM ('pending', 'approved', 'rejected', 'flagged')
- moderation_result: JSONB
- moderated_at: TIMESTAMP
- play_count: INTEGER
- last_played_at: TIMESTAMP
- is_active: BOOLEAN
- is_transcribed: BOOLEAN
- transcript: TEXT
- uploaded_at: TIMESTAMP
- updated_at: TIMESTAMP
- deleted_at: TIMESTAMP
```

**Indexes**:
- `idx_voice_notes_user_id`: User ID
- `idx_voice_notes_context`: Context
- `idx_voice_notes_moderation`: Moderation status
- `idx_voice_notes_conversation`: Conversation ID
- `idx_voice_notes_user_context`: User ID + Context
- `idx_voice_notes_user_prompt`: User ID + Prompt ID

#### 3. `profile_prompts` Table
Stores available profile prompts.

**Schema**:
```sql
- id: UUID (Primary Key)
- prompt_text: VARCHAR(500)
- category: VARCHAR(100)
- response_type: ENUM ('text', 'voice', 'video', 'both')
- icon: VARCHAR(50)
- display_order: INTEGER
- is_active: BOOLEAN
- is_premium: BOOLEAN
- usage_count: INTEGER
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

**Default Prompts**:
1. "A perfect day for me would be..." (both)
2. "My most controversial opinion is..." (both)
3. "The key to my heart is..." (both)
4. "My hidden talent is..." (both)
5. "I geek out on..." (both)
6. "Tell me about yourself in 30 seconds" (voice)
7. "Show me your world" (video, premium)

#### 4. `prompt_responses` Table
Links users with their prompt responses.

**Schema**:
```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key -> users.id)
- prompt_id: UUID (Foreign Key -> profile_prompts.id)
- response_type: ENUM ('text', 'voice', 'video')
- text_response: TEXT (nullable)
- voice_note_id: UUID (Foreign Key -> voice_notes.id, nullable)
- video_id: UUID (Foreign Key -> videos.id, nullable)
- display_order: INTEGER
- is_visible: BOOLEAN
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

**Constraints**:
- UNIQUE(user_id, prompt_id)

#### 5. `video_views` Table
Tracks video views for analytics.

**Schema**:
```sql
- id: UUID (Primary Key)
- video_id: UUID (Foreign Key -> videos.id)
- viewer_id: UUID (Foreign Key -> users.id)
- watch_duration: INTEGER (seconds watched)
- watched_complete: BOOLEAN
- device_type: VARCHAR(50)
- viewed_at: TIMESTAMP
```

---

## Mobile Components

### Location
```
apps/mobile-app/src/components/media/
```

### Components Created

#### 1. VideoRecorder
**File**: `VideoRecorder.tsx`

**Features**:
- Native camera access with permissions
- Front/back camera switching
- Real-time recording with timer
- Pause/resume functionality
- Maximum duration enforcement
- Recording preview
- Progress indicator

**Props**:
```typescript
interface VideoRecorderProps {
  maxDuration?: number; // default: 30 seconds
  onVideoRecorded: (videoPath: string, thumbnail: string) => void;
  onCancel: () => void;
  videoType?: 'profile' | 'prompt';
}
```

**Usage**:
```typescript
import VideoRecorder from '@/components/media/VideoRecorder';

<VideoRecorder
  maxDuration={30}
  videoType="profile"
  onVideoRecorded={(videoPath, thumbnail) => {
    // Handle video upload
  }}
  onCancel={() => {
    // Handle cancel
  }}
/>
```

#### 2. VideoPlayer
**File**: `VideoPlayer.tsx`

**Features**:
- Video playback with custom controls
- Play/pause functionality
- Progress tracking
- Time display
- Thumbnail preview when paused

**Props**:
```typescript
interface VideoPlayerProps {
  videoUrl: string;
  thumbnailUrl?: string;
  autoPlay?: boolean;
  muted?: boolean;
  onEnd?: () => void;
  onError?: (error: any) => void;
  style?: any;
}
```

#### 3. VoiceRecorder
**File**: `VoiceRecorder.tsx`

**Features**:
- Audio recording with permissions
- Real-time waveform visualization
- Recording timer (up to 60 seconds)
- Pause/resume functionality
- Recording preview with playback
- Visual feedback during recording

**Props**:
```typescript
interface VoiceRecorderProps {
  maxDuration?: number; // default: 60 seconds
  onRecordingComplete: (audioPath: string, duration: number, waveformData: number[]) => void;
  onCancel: () => void;
  context?: 'profile' | 'prompt' | 'message';
}
```

#### 4. VoicePlayer
**File**: `VoicePlayer.tsx`

**Features**:
- Audio playback with waveform
- Play/pause controls
- Progress tracking
- Compact mode option
- Waveform visualization during playback

**Props**:
```typescript
interface VoicePlayerProps {
  audioUrl: string;
  duration: number;
  waveformData?: number[];
  onPlaybackComplete?: () => void;
  style?: any;
  showWaveform?: boolean;
  compact?: boolean;
}
```

---

## Web Components

### Location
```
apps/web/src/components/media/
```

### Components Created

#### 1. VideoUploader
**File**: `VideoUploader.tsx`

**Features**:
- Drag-and-drop file upload
- File validation (format, size, duration)
- Video preview before upload
- Upload progress indicator
- Video metadata display
- Helpful tips for users

**Props**:
```typescript
interface VideoUploaderProps {
  onUpload: (file: File) => Promise<void>;
  onCancel?: () => void;
  maxSizeInMB?: number; // default: 100MB
  maxDurationInSeconds?: number; // default: 30 seconds
  acceptedFormats?: string[]; // default: ['video/mp4', 'video/quicktime', 'video/x-m4v']
  context?: 'profile' | 'prompt';
}
```

**Usage**:
```typescript
import VideoUploader from '@/components/media/VideoUploader';

<VideoUploader
  maxDurationInSeconds={30}
  context="profile"
  onUpload={async (file) => {
    // Handle video upload
    const formData = new FormData();
    formData.append('video', file);
    await uploadVideo(formData);
  }}
  onCancel={() => {
    // Handle cancel
  }}
/>
```

#### 2. VideoPlayer
**File**: `VideoPlayer.tsx`

**Features**:
- Custom video player with styled controls
- Play/pause/seek functionality
- Fullscreen support
- Mute/unmute controls
- Auto-hide controls during playback
- Thumbnail poster support
- Loading state

**Props**:
```typescript
interface VideoPlayerProps {
  videoUrl: string;
  thumbnailUrl?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  onEnd?: () => void;
  onError?: (error: Error) => void;
  className?: string;
}
```

#### 3. VoiceRecorder
**File**: `VoiceRecorder.tsx`

**Features**:
- Browser-based audio recording using Web Audio API
- Real-time waveform visualization
- Recording timer with maximum duration
- Pause/resume functionality
- Playback preview before submission
- Error handling with user-friendly messages
- Context-aware titles and hints

**Props**:
```typescript
interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  onCancel?: () => void;
  maxDurationInSeconds?: number; // default: 60 seconds
  context?: 'profile' | 'prompt' | 'message';
}
```

**Usage**:
```typescript
import VoiceRecorder from '@/components/media/VoiceRecorder';

<VoiceRecorder
  maxDurationInSeconds={60}
  context="prompt"
  onRecordingComplete={(audioBlob, duration) => {
    // Handle audio upload
    const formData = new FormData();
    formData.append('audio', audioBlob, 'voice-note.webm');
    formData.append('duration', duration.toString());
    await uploadVoiceNote(formData);
  }}
  onCancel={() => {
    // Handle cancel
  }}
/>
```

#### 4. VoicePlayer
**File**: `VoicePlayer.tsx`

**Features**:
- Custom audio player with waveform visualization
- Play/pause controls
- Seek functionality
- Progress tracking
- Compact mode for chat messages
- Waveform shows playback progress

**Props**:
```typescript
interface VoicePlayerProps {
  audioUrl: string;
  duration: number;
  waveformData?: number[];
  onPlaybackComplete?: () => void;
  compact?: boolean;
  className?: string;
}
```

---

## API Endpoints

### Video Endpoints

#### Upload Video
```
POST /api/media/videos/upload
Content-Type: multipart/form-data

Body:
- video: File (required)
- videoType: 'profile' | 'prompt' (optional, default: 'profile')

Response:
{
  "success": true,
  "message": "Video uploaded successfully",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "fileName": "video.mp4",
    "duration": 25,
    "urls": {
      "original": "https://...",
      "compressed": "https://...",
      "thumbnails": ["https://...", "https://..."]
    },
    "dimensions": {
      "width": 1080,
      "height": 1920
    },
    "moderationStatus": "pending",
    "uploadedAt": "2025-01-01T00:00:00Z"
  }
}
```

#### Get User Videos
```
GET /api/media/videos

Response:
{
  "success": true,
  "data": [VideoMetadata, ...]
}
```

#### Get Video by ID
```
GET /api/media/videos/:id

Response:
{
  "success": true,
  "data": VideoMetadata
}
```

#### Get User Profile Video
```
GET /api/media/videos/profile/:userId

Response:
{
  "success": true,
  "data": VideoMetadata | null
}
```

#### Delete Video
```
DELETE /api/media/videos/:id

Response:
{
  "success": true,
  "message": "Video deleted successfully"
}
```

### Voice Note Endpoints

#### Upload Voice Note
```
POST /api/media/voice-notes/upload
Content-Type: multipart/form-data

Body:
- audio: File (required)
- context: 'profile' | 'prompt' | 'message' (required)
- promptId: UUID (optional)
- conversationId: UUID (optional)

Response:
{
  "success": true,
  "message": "Voice note uploaded successfully",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "fileName": "voice-note.mp3",
    "duration": 45,
    "url": "https://...",
    "waveformData": {
      "samples": [20, 35, 50, ...],
      "duration": 45,
      "sampleRate": 44100,
      "peaks": [85, 78, 92, ...]
    },
    "context": "prompt",
    "moderationStatus": "pending",
    "uploadedAt": "2025-01-01T00:00:00Z"
  }
}
```

#### Get User Voice Notes
```
GET /api/media/voice-notes?context=profile

Response:
{
  "success": true,
  "data": [VoiceNoteMetadata, ...]
}
```

#### Get Voice Note by ID
```
GET /api/media/voice-notes/:id

Response:
{
  "success": true,
  "data": VoiceNoteMetadata
}
```

#### Get Conversation Voice Notes
```
GET /api/media/voice-notes/conversation/:conversationId

Response:
{
  "success": true,
  "data": [VoiceNoteMetadata, ...]
}
```

#### Get User Profile Voice
```
GET /api/media/voice-notes/profile/:userId

Response:
{
  "success": true,
  "data": VoiceNoteMetadata | null
}
```

#### Delete Voice Note
```
DELETE /api/media/voice-notes/:id

Response:
{
  "success": true,
  "message": "Voice note deleted successfully"
}
```

---

## Setup Instructions

### 1. Database Migration

Run the migration to create the required tables:

```bash
cd database
npm install
npm run migrate
```

Or use the run script:

```bash
# Windows
./run-migrations.bat

# Linux/Mac
./run-migrations.sh
```

### 2. Backend Service Setup

Install FFmpeg (required for video/audio processing):

**Ubuntu/Debian**:
```bash
sudo apt update
sudo apt install ffmpeg
```

**macOS**:
```bash
brew install ffmpeg
```

**Windows**:
Download from https://ffmpeg.org/download.html and add to PATH

Install dependencies:
```bash
cd backend/services/media-service
npm install
```

Configure environment variables in `.env`:
```env
# Azure Storage
AZURE_STORAGE_CONNECTION_STRING=your_connection_string
AZURE_STORAGE_CONTAINER_NAME=media

# Media Processing
VIDEO_MAX_SIZE_MB=100
VIDEO_MAX_DURATION_SECONDS=30
AUDIO_MAX_SIZE_MB=10
AUDIO_MAX_DURATION_SECONDS=60

# FFmpeg Paths (if not in PATH)
FFMPEG_PATH=/usr/bin/ffmpeg
FFPROBE_PATH=/usr/bin/ffprobe
```

### 3. Mobile App Setup

Install required React Native packages:

```bash
cd apps/mobile-app
npm install

# Install additional dependencies
npm install react-native-vision-camera
npm install react-native-audio-recorder-player
npm install react-native-permissions
npm install react-native-vector-icons
```

**iOS Setup**:
```bash
cd ios
pod install
```

Add permissions to `ios/YourApp/Info.plist`:
```xml
<key>NSCameraUsageDescription</key>
<string>We need camera access to record your profile video</string>
<key>NSMicrophoneUsageDescription</key>
<string>We need microphone access to record audio</string>
```

**Android Setup**:
Add permissions to `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

### 4. Web App Setup

Install dependencies:
```bash
cd apps/web-app
npm install
```

No additional configuration needed for web components as they use browser APIs.

---

## Usage Examples

### Mobile App Example

```typescript
import React, { useState } from 'react';
import { View, Button, Modal } from 'react-native';
import VideoRecorder from '@/components/media/VideoRecorder';
import VideoPlayer from '@/components/media/VideoPlayer';
import VoiceRecorder from '@/components/media/VoiceRecorder';
import VoicePlayer from '@/components/media/VoicePlayer';
import { uploadVideo, uploadVoiceNote } from '@/services/media';

const ProfileScreen = () => {
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [profileVideo, setProfileVideo] = useState<string | null>(null);
  const [profileVoice, setProfileVoice] = useState<any | null>(null);

  const handleVideoRecorded = async (videoPath: string, thumbnail: string) => {
    try {
      const formData = new FormData();
      formData.append('video', {
        uri: videoPath,
        type: 'video/mp4',
        name: 'profile-video.mp4',
      });
      formData.append('videoType', 'profile');

      const response = await uploadVideo(formData);
      setProfileVideo(response.data.urls.compressed);
      setShowVideoRecorder(false);
    } catch (error) {
      console.error('Video upload failed:', error);
    }
  };

  const handleVoiceRecorded = async (
    audioPath: string,
    duration: number,
    waveformData: number[]
  ) => {
    try {
      const formData = new FormData();
      formData.append('audio', {
        uri: audioPath,
        type: 'audio/mp3',
        name: 'profile-voice.mp3',
      });
      formData.append('context', 'profile');
      formData.append('duration', duration.toString());

      const response = await uploadVoiceNote(formData);
      setProfileVoice(response.data);
      setShowVoiceRecorder(false);
    } catch (error) {
      console.error('Voice upload failed:', error);
    }
  };

  return (
    <View>
      <Button title="Record Profile Video" onPress={() => setShowVideoRecorder(true)} />
      <Button title="Record Voice Intro" onPress={() => setShowVoiceRecorder(true)} />

      {profileVideo && (
        <VideoPlayer
          videoUrl={profileVideo}
          autoPlay={false}
          muted={false}
        />
      )}

      {profileVoice && (
        <VoicePlayer
          audioUrl={profileVoice.url}
          duration={profileVoice.duration}
          waveformData={profileVoice.waveformData.samples}
        />
      )}

      <Modal visible={showVideoRecorder} animationType="slide">
        <VideoRecorder
          maxDuration={30}
          videoType="profile"
          onVideoRecorded={handleVideoRecorded}
          onCancel={() => setShowVideoRecorder(false)}
        />
      </Modal>

      <Modal visible={showVoiceRecorder} animationType="slide">
        <VoiceRecorder
          maxDuration={60}
          context="profile"
          onRecordingComplete={handleVoiceRecorded}
          onCancel={() => setShowVoiceRecorder(false)}
        />
      </Modal>
    </View>
  );
};

export default ProfileScreen;
```

### Web App Example

```typescript
import React, { useState } from 'react';
import VideoUploader from '@/components/media/VideoUploader';
import VideoPlayer from '@/components/media/VideoPlayer';
import VoiceRecorder from '@/components/media/VoiceRecorder';
import VoicePlayer from '@/components/media/VoicePlayer';
import { uploadVideo, uploadVoiceNote } from '@/services/media';

const ProfilePage = () => {
  const [showVideoUploader, setShowVideoUploader] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [profileVideo, setProfileVideo] = useState<string | null>(null);
  const [profileVoice, setProfileVoice] = useState<any | null>(null);

  const handleVideoUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('video', file);
    formData.append('videoType', 'profile');

    const response = await uploadVideo(formData);
    setProfileVideo(response.data.urls.compressed);
    setShowVideoUploader(false);
  };

  const handleVoiceRecorded = async (audioBlob: Blob, duration: number) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'profile-voice.webm');
    formData.append('context', 'profile');
    formData.append('duration', duration.toString());

    const response = await uploadVoiceNote(formData);
    setProfileVoice(response.data);
    setShowVoiceRecorder(false);
  };

  return (
    <div>
      <button onClick={() => setShowVideoUploader(true)}>
        Upload Profile Video
      </button>
      <button onClick={() => setShowVoiceRecorder(true)}>
        Record Voice Intro
      </button>

      {profileVideo && (
        <VideoPlayer
          videoUrl={profileVideo}
          autoPlay={false}
          muted={false}
          controls={true}
        />
      )}

      {profileVoice && (
        <VoicePlayer
          audioUrl={profileVoice.url}
          duration={profileVoice.duration}
          waveformData={profileVoice.waveformData.samples}
        />
      )}

      {showVideoUploader && (
        <VideoUploader
          maxDurationInSeconds={30}
          context="profile"
          onUpload={handleVideoUpload}
          onCancel={() => setShowVideoUploader(false)}
        />
      )}

      {showVoiceRecorder && (
        <VoiceRecorder
          maxDurationInSeconds={60}
          context="profile"
          onRecordingComplete={handleVoiceRecorded}
          onCancel={() => setShowVoiceRecorder(false)}
        />
      )}
    </div>
  );
};

export default ProfilePage;
```

---

## Dependencies

### Backend Dependencies

**Required NPM Packages** (already installed in media-service):
```json
{
  "fluent-ffmpeg": "^2.1.2",
  "@types/fluent-ffmpeg": "^2.1.24",
  "sharp": "^0.33.1",
  "@azure/storage-blob": "^12.17.0",
  "multer": "^1.4.5-lts.1",
  "uuid": "^9.0.1"
}
```

**System Requirements**:
- FFmpeg (for video/audio processing)
- Node.js >= 20.0.0
- PostgreSQL >= 15
- Azure Blob Storage account

### Mobile Dependencies

**Required NPM Packages**:
```json
{
  "react-native-vision-camera": "^3.0.0",
  "react-native-audio-recorder-player": "^3.6.0",
  "react-native-permissions": "^4.0.3",
  "react-native-vector-icons": "^10.0.2"
}
```

**Note**: Some packages are commented out in the code and need to be installed and uncommented when ready to use.

### Web Dependencies

**Required NPM Packages** (already in web-app):
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "styled-components": "^6.1.19",
  "react-icons": "^5.5.0"
}
```

**Browser APIs Used**:
- MediaDevices API (camera/microphone access)
- MediaRecorder API (recording)
- Web Audio API (waveform visualization)
- File API (file handling)

---

## Security Considerations

### 1. File Validation
- File type validation (MIME type checking)
- File size limits enforced
- Duration limits enforced
- Video resolution validation

### 2. Content Moderation
- All uploaded videos go through moderation queue
- Azure Content Moderator integration for thumbnails
- Manual review for flagged content
- Automatic rejection of inappropriate content

### 3. Storage Security
- Azure Blob Storage with private containers
- SAS tokens for temporary access
- Signed URLs with expiration
- Encrypted storage at rest

### 4. User Permissions
- Authentication required for all endpoints
- User ownership verification before deletion
- Privacy settings respected for profile media

---

## Performance Considerations

### 1. Video Processing
- Asynchronous processing to avoid blocking
- Queue-based video compression
- Multiple thumbnail sizes generated
- Progressive encoding for faster playback

### 2. Audio Processing
- Lightweight MP3 compression
- Waveform pre-generation for instant playback
- Caching of processed audio

### 3. Frontend Optimization
- Lazy loading of media components
- Thumbnail previews before video load
- Compressed waveform data transfer
- Progressive enhancement for older browsers

---

## Testing

### Backend Tests
```bash
cd backend/services/media-service
npm test
```

### Mobile Tests
```bash
cd apps/mobile-app
npm test
```

### Web Tests
```bash
cd apps/web-app
npm test
```

---

## Troubleshooting

### Common Issues

#### 1. FFmpeg Not Found
**Error**: `FFmpeg not found in PATH`

**Solution**:
- Install FFmpeg on your system
- Add FFmpeg to system PATH
- Or set FFMPEG_PATH in .env

#### 2. Azure Storage Connection Failed
**Error**: `Azure Storage connection string invalid`

**Solution**:
- Verify AZURE_STORAGE_CONNECTION_STRING in .env
- Check Azure portal for correct connection string
- Ensure storage account exists and is accessible

#### 3. Permission Denied (Mobile)
**Error**: `Camera/Microphone permission denied`

**Solution**:
- Check app permissions in device settings
- Verify Info.plist (iOS) or AndroidManifest.xml (Android) has correct permissions
- Request permissions at runtime before accessing camera/microphone

#### 4. Video Upload Fails
**Error**: `Video upload failed - file too large`

**Solution**:
- Check file size limits (default: 100MB)
- Compress video before upload
- Adjust VIDEO_MAX_SIZE_MB in backend .env

---

## Future Enhancements

### Planned Features
1. **Video Filters**: Add filters and effects to videos
2. **Live Streaming**: Enable live video streaming
3. **Video Stories**: 24-hour temporary video stories
4. **Voice Filters**: Fun voice effects for voice notes
5. **Transcription**: Automatic speech-to-text for voice notes
6. **Translation**: Multi-language support for voice messages
7. **Video Reactions**: React to videos with emojis
8. **Advanced Editing**: Trim, crop, and edit videos in-app

---

## Support

For issues, questions, or feature requests:
- Email: support@flamoral.com
- Documentation: https://docs.flamoral.com
- GitHub Issues: https://github.com/flamoral/platform/issues

---

## License

Copyright © 2025 Flamoral. All rights reserved.

---

**Last Updated**: January 1, 2025
**Version**: 1.0.0
**Author**: Claude (Anthropic)
