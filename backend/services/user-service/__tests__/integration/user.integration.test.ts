import request from 'supertest';
import { Express } from 'express';
import { Pool } from 'pg';
import { createClient } from 'redis';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

/**
 * User Service Integration Tests
 * Tests user profile management, photos, settings
 */

describe('User Service - Integration Tests', () => {
  let app: Express;
  let dbPool: Pool;
  let redisClient: ReturnType<typeof createClient>;
  let authToken: string;
  let userId: string;

  const testUser = {
    email: 'usertest@example.com',
    password: 'Test123!@#',
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '1990-05-15',
    gender: 'male'
  };

  beforeAll(async () => {
    dbPool = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    redisClient = createClient({
      url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
    });
    await redisClient.connect();

    // Create test user and get auth token
    const authResponse = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    authToken = authResponse.body.accessToken;
    userId = authResponse.body.user.id;
  });

  afterAll(async () => {
    await dbPool.query('DELETE FROM users WHERE email = $1', [testUser.email]);
    await dbPool.end();
    await redisClient.quit();
  });

  describe('GET /api/users/profile/:userId', () => {
    it('should get user profile by ID', async () => {
      const response = await request(app)
        .get(`/api/users/profile/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(userId);
      expect(response.body.email).toBe(testUser.email);
      expect(response.body).not.toHaveProperty('password');
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app)
        .get(`/api/users/profile/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app)
        .get(`/api/users/profile/${userId}`)
        .expect(401);
    });
  });

  describe('PUT /api/users/profile', () => {
    it('should update user profile', async () => {
      const updates = {
        bio: 'Looking for meaningful connections',
        interests: ['hiking', 'photography', 'cooking'],
        location: {
          city: 'San Francisco',
          state: 'CA',
          country: 'USA'
        },
        lookingFor: 'serious relationship',
        occupation: 'Software Engineer',
        education: 'Bachelor\'s in Computer Science'
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.bio).toBe(updates.bio);
      expect(response.body.interests).toEqual(updates.interests);
      expect(response.body.occupation).toBe(updates.occupation);

      // Verify in database
      const dbUser = await dbPool.query(
        'SELECT bio, interests, occupation FROM user_profiles WHERE user_id = $1',
        [userId]
      );
      expect(dbUser.rows[0].bio).toBe(updates.bio);
    });

    it('should validate profile data', async () => {
      const invalidUpdate = {
        bio: 'x'.repeat(1001) // Exceeds max length
      };

      await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidUpdate)
        .expect(400);
    });

    it('should sanitize user input', async () => {
      const xssUpdate = {
        bio: '<script>alert("XSS")</script>Normal bio text'
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(xssUpdate)
        .expect(200);

      expect(response.body.bio).not.toContain('<script>');
    });

    it('should update only allowed fields', async () => {
      const maliciousUpdate = {
        bio: 'Updated bio',
        verified: true, // Should not be updatable by user
        isPremium: true // Should not be updatable by user
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(maliciousUpdate)
        .expect(200);

      expect(response.body.bio).toBe(maliciousUpdate.bio);
      expect(response.body.verified).toBeFalsy(); // Should remain unchanged
    });
  });

  describe('POST /api/users/photos', () => {
    it('should upload profile photo', async () => {
      const testImagePath = path.join(__dirname, '../fixtures/test-photo.jpg');

      const response = await request(app)
        .post('/api/users/photos')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('photo', testImagePath)
        .field('isPrimary', 'true')
        .expect(201);

      expect(response.body).toHaveProperty('photoUrl');
      expect(response.body.isPrimary).toBe(true);

      // Verify in database
      const photos = await dbPool.query(
        'SELECT * FROM user_photos WHERE user_id = $1',
        [userId]
      );
      expect(photos.rows.length).toBeGreaterThan(0);
    });

    it('should validate image file type', async () => {
      const textFilePath = path.join(__dirname, '../fixtures/test.txt');

      await request(app)
        .post('/api/users/photos')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('photo', textFilePath)
        .expect(400);
    });

    it('should enforce maximum photo limit', async () => {
      // Upload photos up to limit (usually 6-9 photos)
      const testImagePath = path.join(__dirname, '../fixtures/test-photo.jpg');

      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/api/users/photos')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('photo', testImagePath);
      }

      // Attempt to upload beyond limit
      const response = await request(app)
        .post('/api/users/photos')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('photo', testImagePath)
        .expect(400);

      expect(response.body.error).toContain('limit');
    });

    it('should validate image dimensions', async () => {
      // Test with very small image
      const tinyImagePath = path.join(__dirname, '../fixtures/tiny-image.jpg');

      await request(app)
        .post('/api/users/photos')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('photo', tinyImagePath)
        .expect(400);
    });

    it('should scan for inappropriate content', async () => {
      // This would integrate with content moderation API
      const response = await request(app)
        .post('/api/users/photos')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('photo', path.join(__dirname, '../fixtures/test-photo.jpg'))
        .expect(201);

      expect(response.body).toHaveProperty('moderationStatus');
    });
  });

  describe('DELETE /api/users/photos/:photoId', () => {
    let photoId: string;

    beforeEach(async () => {
      const uploadResponse = await request(app)
        .post('/api/users/photos')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('photo', path.join(__dirname, '../fixtures/test-photo.jpg'));

      photoId = uploadResponse.body.id;
    });

    it('should delete user photo', async () => {
      await request(app)
        .delete(`/api/users/photos/${photoId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify deletion
      const photos = await dbPool.query(
        'SELECT * FROM user_photos WHERE id = $1',
        [photoId]
      );
      expect(photos.rows).toHaveLength(0);
    });

    it('should not allow deleting other users photos', async () => {
      // Create another user
      const otherUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          ...testUser,
          email: 'other@example.com'
        });

      await request(app)
        .delete(`/api/users/photos/${photoId}`)
        .set('Authorization', `Bearer ${otherUserResponse.body.accessToken}`)
        .expect(403);

      // Clean up
      await dbPool.query('DELETE FROM users WHERE email = $1', ['other@example.com']);
    });
  });

  describe('GET /api/users/preferences', () => {
    it('should get user preferences', async () => {
      const response = await request(app)
        .get('/api/users/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('ageRange');
      expect(response.body).toHaveProperty('distance');
      expect(response.body).toHaveProperty('genderPreference');
    });
  });

  describe('PUT /api/users/preferences', () => {
    it('should update user preferences', async () => {
      const preferences = {
        ageRange: { min: 25, max: 35 },
        distance: 50,
        genderPreference: ['female'],
        dealBreakers: ['smoking'],
        mustHaves: ['wants_children']
      };

      const response = await request(app)
        .put('/api/users/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send(preferences)
        .expect(200);

      expect(response.body.ageRange).toEqual(preferences.ageRange);
      expect(response.body.distance).toBe(preferences.distance);
    });

    it('should validate preference ranges', async () => {
      const invalidPreferences = {
        ageRange: { min: 17, max: 18 } // Below legal age
      };

      await request(app)
        .put('/api/users/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidPreferences)
        .expect(400);
    });
  });

  describe('POST /api/users/block/:targetUserId', () => {
    let targetUserId: string;

    beforeEach(async () => {
      const targetUser = await request(app)
        .post('/api/auth/register')
        .send({
          ...testUser,
          email: 'target@example.com'
        });
      targetUserId = targetUser.body.user.id;
    });

    afterEach(async () => {
      await dbPool.query('DELETE FROM users WHERE email = $1', ['target@example.com']);
    });

    it('should block a user', async () => {
      const response = await request(app)
        .post(`/api/users/block/${targetUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toContain('blocked');

      // Verify in database
      const blocks = await dbPool.query(
        'SELECT * FROM blocked_users WHERE blocker_id = $1 AND blocked_id = $2',
        [userId, targetUserId]
      );
      expect(blocks.rows).toHaveLength(1);
    });

    it('should prevent viewing blocked user profile', async () => {
      await request(app)
        .post(`/api/users/block/${targetUserId}`)
        .set('Authorization', `Bearer ${authToken}`);

      await request(app)
        .get(`/api/users/profile/${targetUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });

    it('should not allow blocking yourself', async () => {
      await request(app)
        .post(`/api/users/block/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('DELETE /api/users/block/:targetUserId', () => {
    let targetUserId: string;

    beforeEach(async () => {
      const targetUser = await request(app)
        .post('/api/auth/register')
        .send({
          ...testUser,
          email: 'target@example.com'
        });
      targetUserId = targetUser.body.user.id;

      await request(app)
        .post(`/api/users/block/${targetUserId}`)
        .set('Authorization', `Bearer ${authToken}`);
    });

    afterEach(async () => {
      await dbPool.query('DELETE FROM users WHERE email = $1', ['target@example.com']);
    });

    it('should unblock a user', async () => {
      const response = await request(app)
        .delete(`/api/users/block/${targetUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toContain('unblocked');

      // Verify in database
      const blocks = await dbPool.query(
        'SELECT * FROM blocked_users WHERE blocker_id = $1 AND blocked_id = $2',
        [userId, targetUserId]
      );
      expect(blocks.rows).toHaveLength(0);
    });
  });

  describe('POST /api/users/report/:targetUserId', () => {
    let targetUserId: string;

    beforeEach(async () => {
      const targetUser = await request(app)
        .post('/api/auth/register')
        .send({
          ...testUser,
          email: 'reported@example.com'
        });
      targetUserId = targetUser.body.user.id;
    });

    afterEach(async () => {
      await dbPool.query('DELETE FROM users WHERE email = $1', ['reported@example.com']);
    });

    it('should report a user', async () => {
      const report = {
        reason: 'inappropriate_content',
        description: 'User has inappropriate photos',
        evidenceUrls: ['https://example.com/screenshot.jpg']
      };

      const response = await request(app)
        .post(`/api/users/report/${targetUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(report)
        .expect(200);

      expect(response.body.message).toContain('reported');

      // Verify in database
      const reports = await dbPool.query(
        'SELECT * FROM user_reports WHERE reporter_id = $1 AND reported_id = $2',
        [userId, targetUserId]
      );
      expect(reports.rows).toHaveLength(1);
      expect(reports.rows[0].reason).toBe(report.reason);
    });

    it('should require a reason', async () => {
      await request(app)
        .post(`/api/users/report/${targetUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ description: 'Something wrong' })
        .expect(400);
    });

    it('should not allow reporting yourself', async () => {
      await request(app)
        .post(`/api/users/report/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: 'fake',
          description: 'Test'
        })
        .expect(400);
    });
  });

  describe('DELETE /api/users/account', () => {
    it('should delete user account', async () => {
      // Create a user specifically for deletion test
      const deleteUser = await request(app)
        .post('/api/auth/register')
        .send({
          ...testUser,
          email: 'delete@example.com'
        });

      const response = await request(app)
        .delete('/api/users/account')
        .set('Authorization', `Bearer ${deleteUser.body.accessToken}`)
        .send({ password: testUser.password })
        .expect(200);

      expect(response.body.message).toContain('deleted');

      // Verify soft delete
      const user = await dbPool.query(
        'SELECT deleted_at FROM users WHERE email = $1',
        ['delete@example.com']
      );
      expect(user.rows[0].deleted_at).not.toBeNull();
    });

    it('should require password confirmation', async () => {
      await request(app)
        .delete('/api/users/account')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ password: 'WrongPassword' })
        .expect(401);
    });

    it('should anonymize user data on deletion', async () => {
      const deleteUser = await request(app)
        .post('/api/auth/register')
        .send({
          ...testUser,
          email: 'anonymize@example.com'
        });

      await request(app)
        .delete('/api/users/account')
        .set('Authorization', `Bearer ${deleteUser.body.accessToken}`)
        .send({ password: testUser.password });

      const user = await dbPool.query(
        'SELECT email, first_name, last_name FROM users WHERE email LIKE $1',
        ['%anonymize%']
      );

      // Should be anonymized or marked as deleted
      expect(user.rows).toHaveLength(0);
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent profile updates', async () => {
      const updates = Array(10).fill(null).map((_, i) =>
        request(app)
          .put('/api/users/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ bio: `Bio update ${i}` })
      );

      const responses = await Promise.all(updates);
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should cache frequently accessed profiles', async () => {
      // First request - should cache
      const start1 = Date.now();
      await request(app)
        .get(`/api/users/profile/${userId}`)
        .set('Authorization', `Bearer ${authToken}`);
      const duration1 = Date.now() - start1;

      // Second request - should be faster (from cache)
      const start2 = Date.now();
      await request(app)
        .get(`/api/users/profile/${userId}`)
        .set('Authorization', `Bearer ${authToken}`);
      const duration2 = Date.now() - start2;

      expect(duration2).toBeLessThan(duration1);
    });
  });
});
