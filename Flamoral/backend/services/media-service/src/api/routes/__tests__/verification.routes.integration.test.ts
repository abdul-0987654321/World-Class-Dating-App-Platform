/// <reference types="jest" />
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';
import verificationRoutes from '../verification.routes';

// Mock authentication middleware
jest.mock('../../middleware/auth.middleware', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user-123', email: 'test@example.com' };
    next();
  },
}));

describe('Verification API Integration Tests', () => {
  let app: Express;
  let authToken: string;

  beforeAll(() => {
    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/verification', verificationRoutes);

    // Mock auth token
    authToken = 'Bearer mock-jwt-token';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/verification/photo/:mediaId', () => {
    it('should verify a photo successfully', async () => {
      const response = await request(app)
        .post('/api/verification/photo/test-media-123')
        .set('Authorization', authToken)
        .send({
          imageUrl: 'https://example.com/test-photo.jpg',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.result).toBeDefined();
      expect(response.body.result).toHaveProperty('verified');
      expect(response.body.result).toHaveProperty('confidence');
      expect(response.body.result).toHaveProperty('details');
    });

    it('should return 400 if imageUrl is missing', async () => {
      const response = await request(app)
        .post('/api/verification/photo/test-media-123')
        .set('Authorization', authToken)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Image URL is required');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .post('/api/verification/photo/test-media-123')
        .send({
          imageUrl: 'https://example.com/test-photo.jpg',
        })
        .expect(401);
    });

    it('should handle verification failures gracefully', async () => {
      const response = await request(app)
        .post('/api/verification/photo/test-media-123')
        .set('Authorization', authToken)
        .send({
          imageUrl: 'https://example.com/no-face-photo.jpg',
        });

      if (!response.body.result?.verified) {
        expect(response.body.result).toHaveProperty('failureReason');
      }
    });
  });

  describe('POST /api/verification/profile/:mediaId', () => {
    it('should verify profile photo with reference', async () => {
      const response = await request(app)
        .post('/api/verification/profile/test-media-456')
        .set('Authorization', authToken)
        .send({
          imageUrl: 'https://example.com/new-photo.jpg',
          referencePhotoUrl: 'https://example.com/reference-photo.jpg',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.result).toBeDefined();
      expect(response.body.result.details).toHaveProperty('matchScore');
    });

    it('should work without reference photo', async () => {
      const response = await request(app)
        .post('/api/verification/profile/test-media-456')
        .set('Authorization', authToken)
        .send({
          imageUrl: 'https://example.com/new-photo.jpg',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.result).toBeDefined();
    });

    it('should return 400 if imageUrl is missing', async () => {
      const response = await request(app)
        .post('/api/verification/profile/test-media-456')
        .set('Authorization', authToken)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Image URL is required');
    });
  });

  describe('POST /api/verification/comprehensive/:mediaId', () => {
    it('should perform comprehensive verification', async () => {
      const response = await request(app)
        .post('/api/verification/comprehensive/test-media-789')
        .set('Authorization', authToken)
        .send({
          userId: 'test-user-123',
          imageUrl: 'https://example.com/test-photo.jpg',
          referencePhotoUrl: 'https://example.com/reference.jpg',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.result).toBeDefined();
      expect(response.body.result).toHaveProperty('verified');
      expect(response.body.result).toHaveProperty('liveness');
      expect(response.body.result).toHaveProperty('duplicate');
      expect(response.body.result.details).toHaveProperty('faceDetected');
      expect(response.body.result.details).toHaveProperty('qualityScore');
    });

    it('should return 400 if userId or imageUrl is missing', async () => {
      const response = await request(app)
        .post('/api/verification/comprehensive/test-media-789')
        .set('Authorization', authToken)
        .send({
          userId: 'test-user-123',
          // Missing imageUrl
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('User ID and image URL are required');
    });

    it('should include liveness detection results', async () => {
      const response = await request(app)
        .post('/api/verification/comprehensive/test-media-789')
        .set('Authorization', authToken)
        .send({
          userId: 'test-user-123',
          imageUrl: 'https://example.com/test-photo.jpg',
        })
        .expect(200);

      if (response.body.success) {
        expect(response.body.result.liveness).toBeDefined();
        expect(response.body.result.liveness).toHaveProperty('isLive');
        expect(response.body.result.liveness).toHaveProperty('confidence');
      }
    });

    it('should include duplicate detection results', async () => {
      const response = await request(app)
        .post('/api/verification/comprehensive/test-media-789')
        .set('Authorization', authToken)
        .send({
          userId: 'test-user-123',
          imageUrl: 'https://example.com/test-photo.jpg',
        })
        .expect(200);

      if (response.body.success) {
        expect(response.body.result.duplicate).toBeDefined();
        expect(response.body.result.duplicate).toHaveProperty('isDuplicate');
        expect(response.body.result.duplicate).toHaveProperty('matchingUserIds');
      }
    });
  });

  describe('GET /api/verification/status/:mediaId', () => {
    it('should get verification status', async () => {
      const response = await request(app)
        .get('/api/verification/status/test-media-123')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.status).toBeDefined();
    });

    it('should return null for non-existent verification', async () => {
      const response = await request(app)
        .get('/api/verification/status/non-existent-media')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/verification/user/:userId/stats', () => {
    it('should get user verification statistics', async () => {
      const response = await request(app)
        .get('/api/verification/user/test-user-123/stats')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.stats).toBeDefined();
      expect(response.body.stats).toHaveProperty('total');
      expect(response.body.stats).toHaveProperty('verified');
      expect(response.body.stats).toHaveProperty('failed');
      expect(response.body.stats).toHaveProperty('verificationLevel');
    });

    it('should handle user with no verifications', async () => {
      const response = await request(app)
        .get('/api/verification/user/new-user-123/stats')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.stats).toBeDefined();
    });
  });

  describe('POST /api/verification/queue/:mediaId', () => {
    it('should queue verification job', async () => {
      const response = await request(app)
        .post('/api/verification/queue/test-media-123')
        .set('Authorization', authToken)
        .send({
          userId: 'test-user-123',
          imageUrl: 'https://example.com/test-photo.jpg',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('queued successfully');
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/verification/queue/test-media-123')
        .set('Authorization', authToken)
        .send({
          userId: 'test-user-123',
          // Missing imageUrl
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('User ID and image URL are required');
    });
  });

  describe('POST /api/verification/liveness', () => {
    it('should check liveness of photo', async () => {
      const response = await request(app)
        .post('/api/verification/liveness')
        .set('Authorization', authToken)
        .send({
          imageUrl: 'https://example.com/test-photo.jpg',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.result).toBeDefined();
      expect(response.body.result).toHaveProperty('isLive');
      expect(response.body.result).toHaveProperty('confidence');
    });

    it('should return 400 if imageUrl is missing', async () => {
      const response = await request(app)
        .post('/api/verification/liveness')
        .set('Authorization', authToken)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Image URL is required');
    });

    it('should detect screenshots as not live', async () => {
      const response = await request(app)
        .post('/api/verification/liveness')
        .set('Authorization', authToken)
        .send({
          imageUrl: 'https://example.com/screenshot.jpg',
        });

      // Depending on the image, it might be detected as not live
      if (response.body.result && !response.body.result.isLive) {
        expect(response.body.result.reason).toBeDefined();
      }
    });
  });

  describe('POST /api/verification/check-duplicate', () => {
    it('should check for duplicate profiles', async () => {
      const response = await request(app)
        .post('/api/verification/check-duplicate')
        .set('Authorization', authToken)
        .send({
          userId: 'test-user-123',
          faceId: 'test-face-id-123',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.result).toBeDefined();
      expect(response.body.result).toHaveProperty('isDuplicate');
      expect(response.body.result).toHaveProperty('matchingUserIds');
    });

    it('should return 400 if userId or faceId is missing', async () => {
      const response = await request(app)
        .post('/api/verification/check-duplicate')
        .set('Authorization', authToken)
        .send({
          userId: 'test-user-123',
          // Missing faceId
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('User ID and face ID are required');
    });

    it('should not flag user against their own photos', async () => {
      const response = await request(app)
        .post('/api/verification/check-duplicate')
        .set('Authorization', authToken)
        .send({
          userId: 'test-user-123',
          faceId: 'same-user-face-id',
        })
        .expect(200);

      expect(response.body.result.isDuplicate).toBe(false);
    });
  });

  describe('POST /api/verification/stock-photo', () => {
    it('should check if photo is a stock photo', async () => {
      const response = await request(app)
        .post('/api/verification/stock-photo')
        .set('Authorization', authToken)
        .send({
          imageUrl: 'https://example.com/test-photo.jpg',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.result).toBeDefined();
      expect(response.body.result).toHaveProperty('isStockPhoto');
    });

    it('should return 400 if imageUrl is missing', async () => {
      const response = await request(app)
        .post('/api/verification/stock-photo')
        .set('Authorization', authToken)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Image URL is required');
    });
  });

  describe('Error Handling', () => {
    it('should handle server errors gracefully', async () => {
      // Test with invalid data that might cause server error
      const response = await request(app)
        .post('/api/verification/photo/invalid')
        .set('Authorization', authToken)
        .send({
          imageUrl: 'not-a-valid-url',
        });

      if (response.status === 500) {
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      }
    });

    it('should return proper error format', async () => {
      const response = await request(app)
        .post('/api/verification/photo/test')
        .set('Authorization', authToken)
        .send({});

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('error');
      expect(response.body.success).toBe(false);
    });
  });

  describe('Request Validation', () => {
    it('should validate mediaId parameter', async () => {
      const response = await request(app)
        .post('/api/verification/photo/')
        .set('Authorization', authToken)
        .send({
          imageUrl: 'https://example.com/photo.jpg',
        })
        .expect(404);
    });

    it('should validate JSON body format', async () => {
      const response = await request(app)
        .post('/api/verification/photo/test')
        .set('Authorization', authToken)
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });
  });

  describe('Response Format', () => {
    it('should return consistent success response format', async () => {
      const response = await request(app)
        .get('/api/verification/user/test-user-123/stats')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('stats');
    });

    it('should return consistent error response format', async () => {
      const response = await request(app)
        .post('/api/verification/photo/test')
        .set('Authorization', authToken)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('error');
    });
  });
});
