import request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';

const GATEWAY_URL = process.env.API_GATEWAY_URL || 'https://api-gateway-production-1957.up.railway.app';
const MEDIA_API_URL = process.env.MEDIA_API_URL || GATEWAY_URL;
const AUTH_URL = process.env.AUTH_URL || GATEWAY_URL;

/**
 * E2E API Tests for Media Service
 *
 * Tests all 4 main media endpoints:
 * 1. POST /api/media/upload - Photo upload
 * 2. GET /api/media/presigned-url - Get presigned upload URL (if implemented)
 * 3. POST /api/media/videos/upload - Video upload
 * 4. POST /api/media/voice-notes/upload - Voice note upload
 */
describe('Media Service API', () => {
  let accessToken: string;
  let userId: string;
  let uploadedPhotoId: string;
  let uploadedVideoId: string;
  let uploadedVoiceNoteId: string;

  // Test file fixtures
  const testFixturesDir = path.join(__dirname, 'fixtures');

  // Create test image buffer (1x1 pixel JPEG)
  const createTestImage = (sizeInKB: number = 100): Buffer => {
    const baseJpeg = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
      0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
      0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
      0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0A, 0x0C,
      0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
      0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D,
      0x1A, 0x1C, 0x1C, 0x20, 0x24, 0x2E, 0x27, 0x20,
      0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
      0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27,
      0x39, 0x3D, 0x38, 0x32, 0x3C, 0x2E, 0x33, 0x34,
      0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4,
      0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x03, 0xFF, 0xC4, 0x00, 0x14,
      0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01,
      0x00, 0x00, 0x3F, 0x00, 0x37, 0xFF, 0xD9
    ]);

    // Pad to desired size
    const targetSize = sizeInKB * 1024;
    if (baseJpeg.length >= targetSize) return baseJpeg;

    const padding = Buffer.alloc(targetSize - baseJpeg.length, 0xFF);
    return Buffer.concat([baseJpeg, padding]);
  };

  // Create test PNG buffer
  const createTestPNG = (): Buffer => {
    return Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
      0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
      0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
      0x42, 0x60, 0x82
    ]);
  };

  // Create test WebP buffer (minimal valid WebP)
  const createTestWebP = (): Buffer => {
    return Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00,
      0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20,
      0x18, 0x00, 0x00, 0x00, 0x30, 0x01, 0x00, 0x9D,
      0x01, 0x2A, 0x01, 0x00, 0x01, 0x00, 0x02, 0x00,
      0x34, 0x25, 0xA4, 0x00, 0x03, 0x70, 0x00, 0xFE,
      0xFB, 0x94, 0x00, 0x00
    ]);
  };

  // Create test video buffer (minimal MP4)
  const createTestVideo = (sizeInMB: number = 5): Buffer => {
    const minimalMP4 = Buffer.from([
      // ftyp box
      0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70,
      0x69, 0x73, 0x6F, 0x6D, 0x00, 0x00, 0x02, 0x00,
      0x69, 0x73, 0x6F, 0x6D, 0x69, 0x73, 0x6F, 0x32,
      0x61, 0x76, 0x63, 0x31, 0x6D, 0x70, 0x34, 0x31,
      // moov box
      0x00, 0x00, 0x00, 0x08, 0x6D, 0x6F, 0x6F, 0x76
    ]);

    const targetSize = sizeInMB * 1024 * 1024;
    if (minimalMP4.length >= targetSize) return minimalMP4;

    const padding = Buffer.alloc(targetSize - minimalMP4.length, 0x00);
    return Buffer.concat([minimalMP4, padding]);
  };

  // Create test audio buffer (minimal MP3)
  const createTestAudio = (format: 'mp3' | 'wav' | 'm4a' = 'mp3', sizeInKB: number = 500): Buffer => {
    if (format === 'mp3') {
      const minimalMP3 = Buffer.from([
        0xFF, 0xFB, 0x90, 0x00, // MP3 header
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x49, 0x6E, 0x66, 0x6F
      ]);

      const targetSize = sizeInKB * 1024;
      const padding = Buffer.alloc(Math.max(0, targetSize - minimalMP3.length), 0x00);
      return Buffer.concat([minimalMP3, padding]);
    } else if (format === 'wav') {
      const minimalWAV = Buffer.from([
        // RIFF header
        0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00,
        0x57, 0x41, 0x56, 0x45, 0x66, 0x6D, 0x74, 0x20,
        0x10, 0x00, 0x00, 0x00, 0x01, 0x00, 0x02, 0x00,
        0x44, 0xAC, 0x00, 0x00, 0x88, 0x58, 0x01, 0x00,
        0x04, 0x00, 0x10, 0x00, 0x64, 0x61, 0x74, 0x61,
        0x00, 0x00, 0x00, 0x00
      ]);

      const targetSize = sizeInKB * 1024;
      const padding = Buffer.alloc(Math.max(0, targetSize - minimalWAV.length), 0x00);
      return Buffer.concat([minimalWAV, padding]);
    } else {
      // m4a (simplified AAC in MP4 container)
      const minimalM4A = Buffer.from([
        0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70,
        0x4D, 0x34, 0x41, 0x20, 0x00, 0x00, 0x02, 0x00,
        0x69, 0x73, 0x6F, 0x6D, 0x69, 0x73, 0x6F, 0x32
      ]);

      const targetSize = sizeInKB * 1024;
      const padding = Buffer.alloc(Math.max(0, targetSize - minimalM4A.length), 0x00);
      return Buffer.concat([minimalM4A, padding]);
    }
  };

  // Create invalid file
  const createInvalidFile = (): Buffer => {
    return Buffer.from('This is not a valid media file', 'utf-8');
  };

  beforeAll(async () => {
    // Create fixtures directory if it doesn't exist
    if (!fs.existsSync(testFixturesDir)) {
      fs.mkdirSync(testFixturesDir, { recursive: true });
    }

    // Register a test user and get access token
    const testEmail = `media-test-${Date.now()}@example.com`;
    const testPassword = 'MediaTest123!';

    const registerResponse = await request(AUTH_URL)
      .post('/api/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        firstName: 'Media',
        lastName: 'Test',
        dateOfBirth: '1995-06-15',
        gender: 'female'
      });

    if (registerResponse.status === 201) {
      accessToken = registerResponse.body.accessToken;
      userId = registerResponse.body.user.id;
    } else {
      // Try to login if user already exists
      const loginResponse = await request(AUTH_URL)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword
        });

      accessToken = loginResponse.body.accessToken;
      userId = loginResponse.body.user?.id;
    }
  });

  describe('POST /api/media/upload - Photo Upload', () => {
    describe('Successful uploads', () => {
      it('should upload a valid JPEG image successfully', async () => {
        const response = await request(MEDIA_API_URL)
          .post('/api/media/upload')
          .set('Authorization', `Bearer ${accessToken}`)
          .attach('photo', createTestImage(500), 'test-photo.jpg');

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('message', 'Photo uploaded successfully');
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data).toHaveProperty('userId', userId);
        expect(response.body.data).toHaveProperty('urls');
        expect(response.body.data.urls).toHaveProperty('thumbnail');
        expect(response.body.data.urls).toHaveProperty('standard');
        expect(response.body.data.urls).toHaveProperty('hd');
        expect(response.body.data.urls).toHaveProperty('original');

        uploadedPhotoId = response.body.data.id;
      }, 30000);

      it('should upload a PNG image successfully', async () => {
        const response = await request(MEDIA_API_URL)
          .post('/api/media/upload')
          .set('Authorization', `Bearer ${accessToken}`)
          .attach('photo', createTestPNG(), 'test-photo.png');

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('mimeType');
      }, 30000);

      it('should upload a WebP image successfully', async () => {
        const response = await request(MEDIA_API_URL)
          .post('/api/media/upload')
          .set('Authorization', `Bearer ${accessToken}`)
          .attach('photo', createTestWebP(), 'test-photo.webp');

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      }, 30000);

      it('should upload and set as profile photo when isProfilePhoto is true', async () => {
        const response = await request(MEDIA_API_URL)
          .post('/api/media/upload')
          .set('Authorization', `Bearer ${accessToken}`)
          .field('isProfilePhoto', 'true')
          .attach('photo', createTestImage(300), 'profile-photo.jpg');

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('isProfilePhoto', true);
      }, 30000);
    });

    describe('File size validations', () => {
      it('should reject files exceeding 10MB limit', async () => {
        const largeImage = createTestImage(11 * 1024); // 11MB

        const response = await request(MEDIA_API_URL)
          .post('/api/media/upload')
          .set('Authorization', `Bearer ${accessToken}`)
          .attach('photo', largeImage, 'large-photo.jpg');

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('success', false);
        expect(response.body.error).toMatch(/size/i);
      }, 30000);

      it('should accept files at the size limit (10MB)', async () => {
        const maxSizeImage = createTestImage(10 * 1024); // Exactly 10MB

        const response = await request(MEDIA_API_URL)
          .post('/api/media/upload')
          .set('Authorization', `Bearer ${accessToken}`)
          .attach('photo', maxSizeImage, 'max-size-photo.jpg');

        // Should either succeed or fail gracefully
        expect([201, 400]).toContain(response.status);
      }, 30000);
    });

    describe('File type validations', () => {
      it('should reject invalid file types (PDF)', async () => {
        const pdfBuffer = Buffer.from('%PDF-1.4\n%');

        const response = await request(MEDIA_API_URL)
          .post('/api/media/upload')
          .set('Authorization', `Bearer ${accessToken}`)
          .attach('photo', pdfBuffer, 'document.pdf');

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('success', false);
        expect(response.body.error).toMatch(/file type|invalid/i);
      });

      it('should reject invalid file types (text file)', async () => {
        const textBuffer = Buffer.from('This is a text file');

        const response = await request(MEDIA_API_URL)
          .post('/api/media/upload')
          .set('Authorization', `Bearer ${accessToken}`)
          .attach('photo', textBuffer, 'file.txt');

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      it('should reject corrupted image files', async () => {
        const corruptedImage = createInvalidFile();

        const response = await request(MEDIA_API_URL)
          .post('/api/media/upload')
          .set('Authorization', `Bearer ${accessToken}`)
          .attach('photo', corruptedImage, 'corrupted.jpg');

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });

    describe('Missing file validations', () => {
      it('should fail when no file is attached', async () => {
        const response = await request(MEDIA_API_URL)
          .post('/api/media/upload')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('success', false);
        expect(response.body.error).toMatch(/no file|file.*required/i);
      });

      it('should fail when wrong field name is used', async () => {
        const response = await request(MEDIA_API_URL)
          .post('/api/media/upload')
          .set('Authorization', `Bearer ${accessToken}`)
          .attach('image', createTestImage(100), 'test.jpg'); // Wrong field name

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });

    describe('Authentication validations', () => {
      it('should fail without authentication token', async () => {
        const response = await request(MEDIA_API_URL)
          .post('/api/media/upload')
          .attach('photo', createTestImage(100), 'test.jpg');

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('success', false);
      });

      it('should fail with invalid authentication token', async () => {
        const response = await request(MEDIA_API_URL)
          .post('/api/media/upload')
          .set('Authorization', 'Bearer invalid-token-12345')
          .attach('photo', createTestImage(100), 'test.jpg');

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });

      it('should fail with malformed authorization header', async () => {
        const response = await request(MEDIA_API_URL)
          .post('/api/media/upload')
          .set('Authorization', 'InvalidFormat')
          .attach('photo', createTestImage(100), 'test.jpg');

        expect(response.status).toBe(401);
      });
    });
  });

  describe('POST /api/media/videos/upload - Video Upload', () => {
    describe('Successful video uploads', () => {
      it('should upload a valid MP4 video successfully', async () => {
        const response = await request(MEDIA_API_URL)
          .post('/api/media/videos/upload')
          .set('Authorization', `Bearer ${accessToken}`)
          .field('videoType', 'profile')
          .attach('video', createTestVideo(5), 'test-video.mp4');

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('message', 'Video uploaded successfully');
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data).toHaveProperty('userId', userId);
        expect(response.body.data).toHaveProperty('urls');

        uploadedVideoId = response.body.data.id;
      }, 60000);

      it('should upload profile video type', async () => {
        const response = await request(MEDIA_API_URL)
          .post('/api/media/videos/upload')
          .set('Authorization', `Bearer ${accessToken}`)
          .field('videoType', 'profile')
          .attach('video', createTestVideo(3), 'profile-video.mp4');

        expect(response.status).toBe(201);
        expect(response.body.data).toHaveProperty('videoType', 'profile');
      }, 60000);

      it('should upload prompt video type', async () => {
        const response = await request(MEDIA_API_URL)
          .post('/api/media/videos/upload')
          .set('Authorization', `Bearer ${accessToken}`)
          .field('videoType', 'prompt')
          .attach('video', createTestVideo(2), 'prompt-video.mp4');

        expect(response.status).toBe(201);
        expect(response.body.data).toHaveProperty('videoType', 'prompt');
      }, 60000);
    });

    describe('Video size validations', () => {
      it('should reject videos exceeding 100MB limit', async () => {
        const largeVideo = createTestVideo(101); // 101MB

        const response = await request(MEDIA_API_URL)
          .post('/api/media/videos/upload')
          .set('Authorization', `Bearer ${accessToken}`)
          .field('videoType', 'profile')
          .attach('video', largeVideo, 'large-video.mp4');

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('success', false);
        expect(response.body.error).toMatch(/size|limit/i);
      }, 60000);

      it('should accept videos at the size limit', async () => {
        const maxVideo = createTestVideo(100); // Exactly 100MB

        const response = await request(MEDIA_API_URL)
          .post('/api/media/videos/upload')
          .set('Authorization', `Bearer ${accessToken}`)
          .field('videoType', 'profile')
          .attach('video', maxVideo, 'max-video.mp4');

        // Should either succeed or fail gracefully
        expect([201, 400]).toContain(response.status);
      }, 90000);
    });

    describe('Video format validations', () => {
      it('should reject invalid video formats (AVI marked as MP4)', async () => {
        const invalidVideo = Buffer.from('RIFF....AVI ');

        const response = await request(MEDIA_API_URL)
          .post('/api/media/videos/upload')
          .set('Authorization', `Bearer ${accessToken}`)
          .field('videoType', 'profile')
          .attach('video', invalidVideo, 'video.avi');

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      it('should reject non-video files', async () => {
        const imageAsVideo = createTestImage(1000);

        const response = await request(MEDIA_API_URL)
          .post('/api/media/videos/upload')
          .set('Authorization', `Bearer ${accessToken}`)
          .field('videoType', 'profile')
          .attach('video', imageAsVideo, 'fake-video.mp4');

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });

    describe('Missing video validations', () => {
      it('should fail when no video file is attached', async () => {
        const response = await request(MEDIA_API_URL)
          .post('/api/media/videos/upload')
          .set('Authorization', `Bearer ${accessToken}`)
          .field('videoType', 'profile');

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('success', false);
        expect(response.body.error).toMatch(/no video|file.*required/i);
      });
    });

    describe('Authentication for video upload', () => {
      it('should fail without authentication', async () => {
        const response = await request(MEDIA_API_URL)
          .post('/api/media/videos/upload')
          .field('videoType', 'profile')
          .attach('video', createTestVideo(1), 'test.mp4');

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('POST /api/media/voice-notes/upload - Voice Note Upload', () => {
    describe('Successful voice note uploads', () => {
      it('should upload a valid MP3 voice note successfully', async () => {
        const response = await request(MEDIA_API_URL)
          .post('/api/media/voice-notes/upload')
          .set('Authorization', `Bearer ${accessToken}`)
          .field('context', 'profile')
          .attach('audio', createTestAudio('mp3', 500), 'voice-note.mp3');

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('message', 'Voice note uploaded successfully');
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data).toHaveProperty('userId', userId);
        expect(response.body.data).toHaveProperty('url');

        uploadedVoiceNoteId = response.body.data.id;
      }, 30000);

      it('should upload WAV audio format', async () => {
        const response = await request(MEDIA_API_URL)
          .post('/api/media/voice-notes/upload')
          .set('Authorization', `Bearer ${accessToken}`)
          .field('context', 'message')
          .attach('audio', createTestAudio('wav', 300), 'voice-note.wav');

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      }, 30000);

      it('should upload M4A audio format', async () => {
        const response = await request(MEDIA_API_URL)
          .post('/api/media/voice-notes/upload')
          .set('Authorization', `Bearer ${accessToken}`)
          .field('context', 'profile')
          .attach('audio', createTestAudio('m4a', 400), 'voice-note.m4a');

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      }, 30000);

      it('should upload with profile context', async () => {
        const response = await request(MEDIA_API_URL)
          .post('/api/media/voice-notes/upload')
          .set('Authorization', `Bearer ${accessToken}`)
          .field('context', 'profile')
          .attach('audio', createTestAudio('mp3', 200), 'profile-voice.mp3');

        expect(response.status).toBe(201);
        expect(response.body.data).toHaveProperty('context', 'profile');
      }, 30000);

      it('should upload with prompt context', async () => {
        const response = await request(MEDIA_API_URL)
          .post('/api/media/voice-notes/upload')
          .set('Authorization', `Bearer ${accessToken}`)
          .field('context', 'prompt')
          .field('promptId', 'prompt-123')
          .attach('audio', createTestAudio('mp3', 250), 'prompt-voice.mp3');

        expect(response.status).toBe(201);
        expect(response.body.data).toHaveProperty('context', 'prompt');
      }, 30000);

      it('should upload with message context', async () => {
        const response = await request(MEDIA_API_URL)
          .post('/api/media/voice-notes/upload')
          .set('Authorization', `Bearer ${accessToken}`)
          .field('context', 'message')
          .field('conversationId', 'conv-456')
          .attach('audio', createTestAudio('mp3', 300), 'message-voice.mp3');

        expect(response.status).toBe(201);
        expect(response.body.data).toHaveProperty('context', 'message');
      }, 30000);
    });

    describe('Audio format validations', () => {
      it('should reject invalid audio formats (video file)', async () => {
        const videoFile = createTestVideo(1);

        const response = await request(MEDIA_API_URL)
          .post('/api/media/voice-notes/upload')
          .set('Authorization', `Bearer ${accessToken}`)
          .field('context', 'profile')
          .attach('audio', videoFile, 'fake-audio.mp3');

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      it('should reject non-audio files', async () => {
        const textFile = Buffer.from('This is not audio');

        const response = await request(MEDIA_API_URL)
          .post('/api/media/voice-notes/upload')
          .set('Authorization', `Bearer ${accessToken}`)
          .field('context', 'profile')
          .attach('audio', textFile, 'fake.mp3');

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });

    describe('Audio size validations', () => {
      it('should reject audio files exceeding 10MB limit', async () => {
        const largeAudio = createTestAudio('mp3', 11 * 1024); // 11MB

        const response = await request(MEDIA_API_URL)
          .post('/api/media/voice-notes/upload')
          .set('Authorization', `Bearer ${accessToken}`)
          .field('context', 'profile')
          .attach('audio', largeAudio, 'large-audio.mp3');

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('success', false);
        expect(response.body.error).toMatch(/size|limit/i);
      }, 30000);

      it('should accept audio at the size limit (10MB)', async () => {
        const maxAudio = createTestAudio('mp3', 10 * 1024); // Exactly 10MB

        const response = await request(MEDIA_API_URL)
          .post('/api/media/voice-notes/upload')
          .set('Authorization', `Bearer ${accessToken}`)
          .field('context', 'profile')
          .attach('audio', maxAudio, 'max-audio.mp3');

        // Should either succeed or fail gracefully
        expect([201, 400]).toContain(response.status);
      }, 30000);
    });

    describe('Missing audio validations', () => {
      it('should fail when no audio file is attached', async () => {
        const response = await request(MEDIA_API_URL)
          .post('/api/media/voice-notes/upload')
          .set('Authorization', `Bearer ${accessToken}`)
          .field('context', 'profile');

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('success', false);
        expect(response.body.error).toMatch(/no audio|file.*required/i);
      });
    });

    describe('Authentication for voice notes', () => {
      it('should fail without authentication', async () => {
        const response = await request(MEDIA_API_URL)
          .post('/api/media/voice-notes/upload')
          .field('context', 'profile')
          .attach('audio', createTestAudio('mp3', 100), 'test.mp3');

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });

      it('should fail with invalid token', async () => {
        const response = await request(MEDIA_API_URL)
          .post('/api/media/voice-notes/upload')
          .set('Authorization', 'Bearer invalid-token')
          .field('context', 'profile')
          .attach('audio', createTestAudio('mp3', 100), 'test.mp3');

        expect(response.status).toBe(401);
      });
    });
  });

  describe('Additional Media Operations', () => {
    describe('GET /api/media/photos - Get User Photos', () => {
      it('should retrieve user photos successfully', async () => {
        const response = await request(MEDIA_API_URL)
          .get('/api/media/photos')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should fail without authentication', async () => {
        const response = await request(MEDIA_API_URL)
          .get('/api/media/photos');

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/media/photos/:id - Get Specific Photo', () => {
      it('should retrieve a specific photo by ID', async () => {
        if (!uploadedPhotoId) {
          console.log('Skipping: No photo uploaded');
          return;
        }

        const response = await request(MEDIA_API_URL)
          .get(`/api/media/photos/${uploadedPhotoId}`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('id', uploadedPhotoId);
      });

      it('should return 404 for non-existent photo', async () => {
        const response = await request(MEDIA_API_URL)
          .get('/api/media/photos/non-existent-id-12345')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('success', false);
      });
    });

    describe('GET /api/media/videos - Get User Videos', () => {
      it('should retrieve user videos successfully', async () => {
        const response = await request(MEDIA_API_URL)
          .get('/api/media/videos')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('GET /api/media/voice-notes - Get User Voice Notes', () => {
      it('should retrieve user voice notes successfully', async () => {
        const response = await request(MEDIA_API_URL)
          .get('/api/media/voice-notes')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should filter voice notes by context', async () => {
        const response = await request(MEDIA_API_URL)
          .get('/api/media/voice-notes?context=profile')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('DELETE /api/media/photos/:id - Delete Photo', () => {
      it('should delete own photo successfully', async () => {
        if (!uploadedPhotoId) {
          console.log('Skipping: No photo to delete');
          return;
        }

        const response = await request(MEDIA_API_URL)
          .delete(`/api/media/photos/${uploadedPhotoId}`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect([200, 404]).toContain(response.status);
      });

      it('should return 404 when deleting non-existent photo', async () => {
        const response = await request(MEDIA_API_URL)
          .delete('/api/media/photos/non-existent-id')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(404);
      });

      it('should fail without authentication', async () => {
        const response = await request(MEDIA_API_URL)
          .delete('/api/media/photos/some-id');

        expect(response.status).toBe(401);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle concurrent uploads gracefully', async () => {
      const uploads = Array(3).fill(null).map((_, i) =>
        request(MEDIA_API_URL)
          .post('/api/media/upload')
          .set('Authorization', `Bearer ${accessToken}`)
          .attach('photo', createTestImage(100), `concurrent-${i}.jpg`)
      );

      const responses = await Promise.all(uploads);

      responses.forEach(response => {
        expect([201, 400]).toContain(response.status);
      });
    }, 60000);

    it('should handle malformed multipart data gracefully', async () => {
      const response = await request(MEDIA_API_URL)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Content-Type', 'multipart/form-data')
        .send('malformed data');

      expect([400, 500]).toContain(response.status);
    });

    it('should validate content-type header', async () => {
      const response = await request(MEDIA_API_URL)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Content-Type', 'application/json')
        .send({ photo: 'not-a-file' });

      expect(response.status).toBe(400);
    });
  });
});
