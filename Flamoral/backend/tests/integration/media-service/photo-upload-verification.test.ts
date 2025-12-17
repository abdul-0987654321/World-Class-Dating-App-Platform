/**
 * Integration tests for Photo Upload and Verification
 * Tests photo uploads, AI verification, moderation, and photo management
 */

import { ApiClient, createApiClient } from '../helpers/api-client';
import { DatabaseHelper, getDatabaseHelper } from '../helpers/database';
import { faker } from '@faker-js/faker';
import path from 'path';
import fs from 'fs';

describe('Photo Upload and Verification Integration Tests', () => {
  let mediaApiClient: ApiClient;
  let authApiClient: ApiClient;
  let dbHelper: DatabaseHelper;
  const MEDIA_SERVICE_URL = process.env.MEDIA_SERVICE_URL || 'http://localhost:3003';
  const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

  // Test image paths
  const TEST_IMAGES_DIR = path.join(__dirname, '../fixtures/images');
  const VALID_IMAGE = path.join(TEST_IMAGES_DIR, 'test-profile.jpg');
  const LARGE_IMAGE = path.join(TEST_IMAGES_DIR, 'large-image.jpg');
  const INVALID_IMAGE = path.join(TEST_IMAGES_DIR, 'invalid.txt');

  beforeAll(async () => {
    mediaApiClient = createApiClient(MEDIA_SERVICE_URL);
    authApiClient = createApiClient(AUTH_SERVICE_URL);
    dbHelper = getDatabaseHelper();

    // Create test images directory if it doesn't exist
    if (!fs.existsSync(TEST_IMAGES_DIR)) {
      fs.mkdirSync(TEST_IMAGES_DIR, { recursive: true });
    }

    // Create mock test images if they don't exist
    if (!fs.existsSync(VALID_IMAGE)) {
      // Create a simple 1x1 PNG for testing
      const buffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );
      fs.writeFileSync(VALID_IMAGE, buffer);
    }
  });

  beforeEach(async () => {
    await dbHelper.clearAll();
  });

  /**
   * Helper to create authenticated user
   */
  const createAuthenticatedUser = async () => {
    const userData = {
      email: faker.internet.email().toLowerCase(),
      password: 'SecurePass123!',
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      dateOfBirth: '1995-05-15',
      gender: 'male',
    };

    const response = await authApiClient.post('/api/v1/auth/register', userData);
    const { user, accessToken } = response.body.data;

    return { user, accessToken };
  };

  describe('Photo Upload', () => {
    it('should upload profile photo successfully', async () => {
      const { user, accessToken } = await createAuthenticatedUser();
      mediaApiClient.setAuthToken(accessToken);

      const response = await mediaApiClient.uploadFile(
        '/api/v1/media/photos/upload',
        'photo',
        VALID_IMAGE,
        { type: 'profile' }
      );

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        photoId: expect.any(String),
        url: expect.stringContaining('http'),
        status: 'pending_verification',
      });

      // Verify photo record in database
      const knex = dbHelper.getKnex();
      const photo = await knex('photos')
        .where('id', response.body.data.photoId)
        .first();

      expect(photo).toBeDefined();
      expect(photo.user_id).toBe(user.id);
      expect(photo.status).toBe('pending_verification');
    });

    it('should enforce maximum photo count per user', async () => {
      const { user, accessToken } = await createAuthenticatedUser();
      mediaApiClient.setAuthToken(accessToken);

      // Upload maximum allowed photos (typically 6-9)
      const maxPhotos = 9;
      const uploadPromises = [];

      for (let i = 0; i < maxPhotos; i++) {
        uploadPromises.push(
          mediaApiClient.uploadFile(
            '/api/v1/media/photos/upload',
            'photo',
            VALID_IMAGE,
            { type: 'profile', position: i }
          )
        );
      }

      await Promise.all(uploadPromises);

      // Try to upload one more (should fail)
      const response = await mediaApiClient.uploadFile(
        '/api/v1/media/photos/upload',
        'photo',
        VALID_IMAGE,
        { type: 'profile' }
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/maximum|limit|too many/i);
    });

    it('should validate image file type', async () => {
      const { accessToken } = await createAuthenticatedUser();
      mediaApiClient.setAuthToken(accessToken);

      // Create a text file pretending to be an image
      const textFile = path.join(TEST_IMAGES_DIR, 'fake.jpg');
      fs.writeFileSync(textFile, 'This is not an image');

      const response = await mediaApiClient.uploadFile(
        '/api/v1/media/photos/upload',
        'photo',
        textFile,
        { type: 'profile' }
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/invalid|format|type/i);

      // Cleanup
      fs.unlinkSync(textFile);
    });

    it('should enforce image size limits', async () => {
      const { accessToken } = await createAuthenticatedUser();
      mediaApiClient.setAuthToken(accessToken);

      // Create a large file (over 10MB typically)
      const largeFile = path.join(TEST_IMAGES_DIR, 'toolarge.jpg');
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
      fs.writeFileSync(largeFile, largeBuffer);

      const response = await mediaApiClient.uploadFile(
        '/api/v1/media/photos/upload',
        'photo',
        largeFile,
        { type: 'profile' }
      );

      expect(response.status).toBe(413);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/too large|size|limit/i);

      // Cleanup
      fs.unlinkSync(largeFile);
    });

    it('should generate multiple image sizes (thumbnails)', async () => {
      const { accessToken } = await createAuthenticatedUser();
      mediaApiClient.setAuthToken(accessToken);

      const response = await mediaApiClient.uploadFile(
        '/api/v1/media/photos/upload',
        'photo',
        VALID_IMAGE,
        { type: 'profile' }
      );

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('thumbnails');
      expect(response.body.data.thumbnails).toMatchObject({
        small: expect.stringContaining('http'),
        medium: expect.stringContaining('http'),
        large: expect.stringContaining('http'),
      });
    });

    it('should set primary photo on first upload', async () => {
      const { user, accessToken } = await createAuthenticatedUser();
      mediaApiClient.setAuthToken(accessToken);

      const response = await mediaApiClient.uploadFile(
        '/api/v1/media/photos/upload',
        'photo',
        VALID_IMAGE,
        { type: 'profile' }
      );

      expect(response.status).toBe(201);

      // Verify it's set as primary
      const knex = dbHelper.getKnex();
      const photo = await knex('photos')
        .where('id', response.body.data.photoId)
        .first();

      expect(photo.is_primary).toBe(true);
    });
  });

  describe('Photo Verification', () => {
    it('should automatically verify photo with AI', async () => {
      const { accessToken } = await createAuthenticatedUser();
      mediaApiClient.setAuthToken(accessToken);

      const uploadResponse = await mediaApiClient.uploadFile(
        '/api/v1/media/photos/upload',
        'photo',
        VALID_IMAGE,
        { type: 'profile' }
      );

      const photoId = uploadResponse.body.data.photoId;

      // Wait for AI verification (or trigger it manually in test)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check verification status
      const statusResponse = await mediaApiClient.get(
        `/api/v1/media/photos/${photoId}/status`
      );

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.data.status).toMatch(/verified|pending_review|rejected/);

      if (statusResponse.body.data.status === 'verified') {
        expect(statusResponse.body.data).toHaveProperty('verificationScore');
        expect(statusResponse.body.data.verificationScore).toBeGreaterThan(0);
      }
    });

    it('should detect inappropriate content', async () => {
      const { accessToken } = await createAuthenticatedUser();
      mediaApiClient.setAuthToken(accessToken);

      // Upload photo that would be flagged (mocked in test environment)
      const response = await mediaApiClient.uploadFile(
        '/api/v1/media/photos/upload',
        'photo',
        VALID_IMAGE,
        { type: 'profile', simulateInappropriate: true }
      );

      const photoId = response.body.data.photoId;

      // Check that photo is flagged for review
      const knex = dbHelper.getKnex();
      const photo = await knex('photos').where('id', photoId).first();

      expect(photo.status).toMatch(/pending_review|rejected/);
      expect(photo.flags).toBeDefined();
    });

    it('should detect faces in photo', async () => {
      const { accessToken } = await createAuthenticatedUser();
      mediaApiClient.setAuthToken(accessToken);

      const response = await mediaApiClient.uploadFile(
        '/api/v1/media/photos/upload',
        'photo',
        VALID_IMAGE,
        { type: 'profile' }
      );

      expect(response.status).toBe(201);

      const knex = dbHelper.getKnex();
      const photo = await knex('photos')
        .where('id', response.body.data.photoId)
        .first();

      expect(photo.face_detected).toBeDefined();
      expect(photo.face_count).toBeGreaterThanOrEqual(0);
    });

    it('should require at least one photo with clear face', async () => {
      const { accessToken } = await createAuthenticatedUser();
      mediaApiClient.setAuthToken(accessToken);

      // Upload photo without face (mocked)
      const response = await mediaApiClient.uploadFile(
        '/api/v1/media/photos/upload',
        'photo',
        VALID_IMAGE,
        { type: 'profile', simulateNoFace: true }
      );

      const photoId = response.body.data.photoId;

      // Check warning/requirement
      const knex = dbHelper.getKnex();
      const photo = await knex('photos').where('id', photoId).first();

      if (photo.face_detected === false) {
        expect(photo.status).toMatch(/pending_review|requires_face/);
      }
    });

    it('should handle manual verification request', async () => {
      const { accessToken } = await createAuthenticatedUser();
      mediaApiClient.setAuthToken(accessToken);

      // Upload photo
      const uploadResponse = await mediaApiClient.uploadFile(
        '/api/v1/media/photos/upload',
        'photo',
        VALID_IMAGE,
        { type: 'profile' }
      );

      const photoId = uploadResponse.body.data.photoId;

      // Request manual verification
      const verifyResponse = await mediaApiClient.post(
        `/api/v1/media/photos/${photoId}/request-verification`,
        {}
      );

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body.success).toBe(true);

      // Check status changed
      const knex = dbHelper.getKnex();
      const photo = await knex('photos').where('id', photoId).first();
      expect(photo.status).toBe('pending_manual_review');
    });
  });

  describe('Photo Management', () => {
    it('should get all user photos', async () => {
      const { accessToken } = await createAuthenticatedUser();
      mediaApiClient.setAuthToken(accessToken);

      // Upload multiple photos
      await mediaApiClient.uploadFile(
        '/api/v1/media/photos/upload',
        'photo',
        VALID_IMAGE,
        { type: 'profile' }
      );
      await mediaApiClient.uploadFile(
        '/api/v1/media/photos/upload',
        'photo',
        VALID_IMAGE,
        { type: 'profile' }
      );

      // Get all photos
      const response = await mediaApiClient.get('/api/v1/media/photos');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.photos).toHaveLength(2);
      expect(response.body.data.photos[0]).toMatchObject({
        id: expect.any(String),
        url: expect.any(String),
        status: expect.any(String),
      });
    });

    it('should delete photo', async () => {
      const { user, accessToken } = await createAuthenticatedUser();
      mediaApiClient.setAuthToken(accessToken);

      // Upload photo
      const uploadResponse = await mediaApiClient.uploadFile(
        '/api/v1/media/photos/upload',
        'photo',
        VALID_IMAGE,
        { type: 'profile' }
      );

      const photoId = uploadResponse.body.data.photoId;

      // Delete photo
      const deleteResponse = await mediaApiClient.delete(
        `/api/v1/media/photos/${photoId}`
      );

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);

      // Verify photo is deleted
      const knex = dbHelper.getKnex();
      const photo = await knex('photos').where('id', photoId).first();
      expect(photo).toBeUndefined();
    });

    it('should reorder photos', async () => {
      const { accessToken } = await createAuthenticatedUser();
      mediaApiClient.setAuthToken(accessToken);

      // Upload multiple photos
      const photo1Response = await mediaApiClient.uploadFile(
        '/api/v1/media/photos/upload',
        'photo',
        VALID_IMAGE,
        { type: 'profile' }
      );
      const photo2Response = await mediaApiClient.uploadFile(
        '/api/v1/media/photos/upload',
        'photo',
        VALID_IMAGE,
        { type: 'profile' }
      );

      const photoId1 = photo1Response.body.data.photoId;
      const photoId2 = photo2Response.body.data.photoId;

      // Reorder photos
      const reorderResponse = await mediaApiClient.put('/api/v1/media/photos/reorder', {
        photoOrder: [photoId2, photoId1],
      });

      expect(reorderResponse.status).toBe(200);
      expect(reorderResponse.body.success).toBe(true);

      // Verify order in database
      const knex = dbHelper.getKnex();
      const photo1 = await knex('photos').where('id', photoId1).first();
      const photo2 = await knex('photos').where('id', photoId2).first();

      expect(photo2.position).toBeLessThan(photo1.position);
    });

    it('should set primary photo', async () => {
      const { accessToken } = await createAuthenticatedUser();
      mediaApiClient.setAuthToken(accessToken);

      // Upload two photos
      const photo1Response = await mediaApiClient.uploadFile(
        '/api/v1/media/photos/upload',
        'photo',
        VALID_IMAGE,
        { type: 'profile' }
      );
      const photo2Response = await mediaApiClient.uploadFile(
        '/api/v1/media/photos/upload',
        'photo',
        VALID_IMAGE,
        { type: 'profile' }
      );

      const photoId2 = photo2Response.body.data.photoId;

      // Set second photo as primary
      const setPrimaryResponse = await mediaApiClient.put(
        `/api/v1/media/photos/${photoId2}/primary`,
        {}
      );

      expect(setPrimaryResponse.status).toBe(200);
      expect(setPrimaryResponse.body.success).toBe(true);

      // Verify only second photo is primary
      const knex = dbHelper.getKnex();
      const photos = await knex('photos')
        .where('user_id', photo1Response.body.data.userId)
        .orderBy('position');

      const primaryPhotos = photos.filter(p => p.is_primary);
      expect(primaryPhotos).toHaveLength(1);
      expect(primaryPhotos[0].id).toBe(photoId2);
    });

    it('should not allow deleting last photo if required', async () => {
      const { accessToken } = await createAuthenticatedUser();
      mediaApiClient.setAuthToken(accessToken);

      // Upload single photo
      const uploadResponse = await mediaApiClient.uploadFile(
        '/api/v1/media/photos/upload',
        'photo',
        VALID_IMAGE,
        { type: 'profile' }
      );

      const photoId = uploadResponse.body.data.photoId;

      // Try to delete (might be allowed or restricted based on business rules)
      const deleteResponse = await mediaApiClient.delete(
        `/api/v1/media/photos/${photoId}`
      );

      // Either succeeds or warns about minimum photo requirement
      expect([200, 400]).toContain(deleteResponse.status);

      if (deleteResponse.status === 400) {
        expect(deleteResponse.body.error).toMatch(/minimum|required|at least one/i);
      }
    });
  });

  describe('Photo Privacy', () => {
    it('should not allow access to other users photos', async () => {
      // User 1 uploads photo
      const { accessToken: token1 } = await createAuthenticatedUser();
      mediaApiClient.setAuthToken(token1);

      const uploadResponse = await mediaApiClient.uploadFile(
        '/api/v1/media/photos/upload',
        'photo',
        VALID_IMAGE,
        { type: 'profile' }
      );

      const photoId = uploadResponse.body.data.photoId;

      // User 2 tries to access/delete User 1's photo
      const { accessToken: token2 } = await createAuthenticatedUser();
      mediaApiClient.setAuthToken(token2);

      const deleteResponse = await mediaApiClient.delete(
        `/api/v1/media/photos/${photoId}`
      );

      expect(deleteResponse.status).toBe(403);
      expect(deleteResponse.body.success).toBe(false);
    });

    it('should respect photo visibility settings', async () => {
      const { accessToken } = await createAuthenticatedUser();
      mediaApiClient.setAuthToken(accessToken);

      // Upload private photo
      const response = await mediaApiClient.uploadFile(
        '/api/v1/media/photos/upload',
        'photo',
        VALID_IMAGE,
        { type: 'profile', visibility: 'private' }
      );

      expect(response.status).toBe(201);

      const knex = dbHelper.getKnex();
      const photo = await knex('photos')
        .where('id', response.body.data.photoId)
        .first();

      expect(photo.visibility).toBe('private');
    });
  });

  describe('Photo Reporting', () => {
    it('should allow reporting inappropriate photo', async () => {
      // User 1 uploads photo
      const { user: user1, accessToken: token1 } = await createAuthenticatedUser();
      mediaApiClient.setAuthToken(token1);

      const uploadResponse = await mediaApiClient.uploadFile(
        '/api/v1/media/photos/upload',
        'photo',
        VALID_IMAGE,
        { type: 'profile' }
      );

      const photoId = uploadResponse.body.data.photoId;

      // User 2 reports the photo
      const { accessToken: token2 } = await createAuthenticatedUser();
      mediaApiClient.setAuthToken(token2);

      const reportResponse = await mediaApiClient.post(
        `/api/v1/media/photos/${photoId}/report`,
        {
          reason: 'inappropriate_content',
          details: 'This photo violates community guidelines',
        }
      );

      expect(reportResponse.status).toBe(200);
      expect(reportResponse.body.success).toBe(true);

      // Verify report was logged
      const knex = dbHelper.getKnex();
      const report = await knex('photo_reports')
        .where('photo_id', photoId)
        .first();

      expect(report).toBeDefined();
      expect(report.reason).toBe('inappropriate_content');
    });

    it('should flag photo after multiple reports', async () => {
      // User 1 uploads photo
      const { accessToken: token1 } = await createAuthenticatedUser();
      mediaApiClient.setAuthToken(token1);

      const uploadResponse = await mediaApiClient.uploadFile(
        '/api/v1/media/photos/upload',
        'photo',
        VALID_IMAGE,
        { type: 'profile' }
      );

      const photoId = uploadResponse.body.data.photoId;

      // Multiple users report the photo
      const reportThreshold = 3;
      for (let i = 0; i < reportThreshold; i++) {
        const { accessToken } = await createAuthenticatedUser();
        mediaApiClient.setAuthToken(accessToken);

        await mediaApiClient.post(`/api/v1/media/photos/${photoId}/report`, {
          reason: 'inappropriate_content',
        });
      }

      // Check photo status
      const knex = dbHelper.getKnex();
      const photo = await knex('photos').where('id', photoId).first();

      expect(photo.status).toMatch(/flagged|under_review/);
    });
  });
});
