/// <reference types="jest" />
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../../index';
import db from '../../infrastructure/database';

describe('Moderation Service Integration Tests', () => {
  beforeAll(async () => {
    // Run migrations
    await db.migrate.latest();
  });

  afterAll(async () => {
    // Clean up and close connections
    await db.destroy();
  });

  beforeEach(async () => {
    // Clean test data before each test
    await db('moderation_logs').where('content_id', 'like', 'integration-test-%').del();
    await db('user_violations').where('user_id', 'like', 'integration-test-%').del();
    await db('user_moderation_records').where('user_id', 'like', 'integration-test-%').del();
    await db('moderation_queue').where('content_id', 'like', 'integration-test-%').del();
  });

  describe('POST /api/moderation/image', () => {
    it('should moderate image and return result', async () => {
      const response = await request(app)
        .post('/api/moderation/image')
        .send({
          contentId: 'integration-test-img-001',
          imageUrl: 'https://example.com/test-photo.jpg',
          userId: 'integration-test-user-001',
          contentType: 'image',
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('result');
      expect(response.body.result).toHaveProperty('status');
      expect(response.body.result).toHaveProperty('overallRiskScore');
      expect(response.body.result).toHaveProperty('detectedViolations');
    });

    it('should save moderation log to database', async () => {
      await request(app)
        .post('/api/moderation/image')
        .send({
          contentId: 'integration-test-img-002',
          imageUrl: 'https://example.com/test-photo-2.jpg',
          userId: 'integration-test-user-002',
          contentType: 'image',
        });

      // Verify log was saved
      const log = await db('moderation_logs')
        .where('content_id', 'integration-test-img-002')
        .first();

      expect(log).toBeDefined();
      expect(log.user_id).toBe('integration-test-user-002');
      expect(log.content_type).toBe('image');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/moderation/image')
        .send({
          contentId: 'integration-test-img-003',
          // Missing imageUrl
          userId: 'integration-test-user-003',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle invalid image URLs', async () => {
      const response = await request(app)
        .post('/api/moderation/image')
        .send({
          contentId: 'integration-test-img-004',
          imageUrl: 'not-a-valid-url',
          userId: 'integration-test-user-004',
          contentType: 'image',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/moderation/text', () => {
    it('should moderate text content', async () => {
      const response = await request(app)
        .post('/api/moderation/text')
        .send({
          contentId: 'integration-test-txt-001',
          text: 'This is a test message for moderation',
          userId: 'integration-test-user-005',
          contentType: 'text',
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.result).toHaveProperty('status');
      expect(response.body.result).toHaveProperty('detectedViolations');
    });

    it('should save text moderation log', async () => {
      await request(app)
        .post('/api/moderation/text')
        .send({
          contentId: 'integration-test-txt-002',
          text: 'Another test message',
          userId: 'integration-test-user-006',
          contentType: 'text',
        });

      const log = await db('moderation_logs')
        .where('content_id', 'integration-test-txt-002')
        .first();

      expect(log).toBeDefined();
      expect(log.content_type).toBe('text');
    });
  });

  describe('GET /api/moderation/user/:userId/status', () => {
    beforeEach(async () => {
      // Create test user moderation record
      await db('user_moderation_records').insert({
        user_id: 'integration-test-status-user',
        status: 'active',
        total_violations: 2,
        severe_violations: 1,
        warnings_issued: 1,
        suspension_count: 0,
        permanently_banned: false,
      });
    });

    it('should return user moderation status', async () => {
      const response = await request(app)
        .get('/api/moderation/user/integration-test-status-user/status')
        .expect(200);

      expect(response.body).toHaveProperty('userId', 'integration-test-status-user');
      expect(response.body).toHaveProperty('status', 'active');
      expect(response.body).toHaveProperty('totalViolations', 2);
      expect(response.body).toHaveProperty('severeViolations', 1);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/moderation/user/non-existent-user/status')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/moderation/user/:userId/restricted', () => {
    it('should return false for active user', async () => {
      await db('user_moderation_records').insert({
        user_id: 'integration-test-active-user',
        status: 'active',
        total_violations: 0,
        severe_violations: 0,
        warnings_issued: 0,
        suspension_count: 0,
        permanently_banned: false,
      });

      const response = await request(app)
        .get('/api/moderation/user/integration-test-active-user/restricted')
        .expect(200);

      expect(response.body).toHaveProperty('restricted', false);
    });

    it('should return true for suspended user', async () => {
      const suspensionEnd = new Date(Date.now() + 86400000); // 24 hours from now

      await db('user_moderation_records').insert({
        user_id: 'integration-test-suspended-user',
        status: 'suspended',
        total_violations: 3,
        severe_violations: 2,
        warnings_issued: 2,
        suspension_count: 1,
        permanently_banned: false,
        current_suspension_ends_at: suspensionEnd,
      });

      const response = await request(app)
        .get('/api/moderation/user/integration-test-suspended-user/restricted')
        .expect(200);

      expect(response.body).toHaveProperty('restricted', true);
      expect(response.body).toHaveProperty('endsAt');
      expect(response.body).toHaveProperty('reason');
    });

    it('should return true for banned user', async () => {
      await db('user_moderation_records').insert({
        user_id: 'integration-test-banned-user',
        status: 'banned',
        total_violations: 6,
        severe_violations: 5,
        warnings_issued: 3,
        suspension_count: 2,
        permanently_banned: true,
        banned_at: new Date(),
        banned_reason: 'Multiple severe violations',
      });

      const response = await request(app)
        .get('/api/moderation/user/integration-test-banned-user/restricted')
        .expect(200);

      expect(response.body).toHaveProperty('restricted', true);
      expect(response.body.endsAt).toBeUndefined(); // Permanent ban
      expect(response.body.reason).toContain('banned');
    });
  });

  describe('GET /api/moderation/queue', () => {
    beforeEach(async () => {
      // Create test queue items
      await db('moderation_queue').insert([
        {
          content_id: 'integration-test-queue-001',
          content_type: 'image',
          content_url: 'https://example.com/flagged-1.jpg',
          user_id: 'integration-test-user-queue-1',
          risk_score: 0.85,
          violations: JSON.stringify(['suggestive']),
          status: 'flagged',
          priority: 'high',
          flagged_at: new Date(),
        },
        {
          content_id: 'integration-test-queue-002',
          content_type: 'image',
          content_url: 'https://example.com/flagged-2.jpg',
          user_id: 'integration-test-user-queue-2',
          risk_score: 0.92,
          violations: JSON.stringify(['violence']),
          status: 'flagged',
          priority: 'urgent',
          flagged_at: new Date(),
        },
      ]);
    });

    it('should return queue items', async () => {
      const response = await request(app)
        .get('/api/moderation/queue')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter queue by status', async () => {
      const response = await request(app)
        .get('/api/moderation/queue?status=flagged')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((item: any) => {
        expect(item.status).toBe('flagged');
      });
    });

    it('should filter queue by priority', async () => {
      const response = await request(app)
        .get('/api/moderation/queue?priority=urgent')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((item: any) => {
        expect(item.priority).toBe('urgent');
      });
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/moderation/queue?limit=1&offset=0')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(1);
    });
  });

  describe('POST /api/moderation/review', () => {
    let moderationLogId: string;

    beforeEach(async () => {
      // Create test moderation log
      const [log] = await db('moderation_logs').insert({
        content_id: 'integration-test-review-001',
        content_type: 'image',
        user_id: 'integration-test-user-review',
        status: 'flagged',
        risk_score: 0.78,
        violations: JSON.stringify(['suggestive']),
        moderated_at: new Date(),
      }).returning('*');

      moderationLogId = log.id;

      // Add to queue
      await db('moderation_queue').insert({
        content_id: 'integration-test-review-001',
        content_type: 'image',
        user_id: 'integration-test-user-review',
        risk_score: 0.78,
        violations: JSON.stringify(['suggestive']),
        status: 'flagged',
        priority: 'medium',
        flagged_at: new Date(),
      });
    });

    it('should approve flagged content', async () => {
      const response = await request(app)
        .post('/api/moderation/review')
        .send({
          moderationLogId,
          action: 'approve',
          notes: 'Content is acceptable',
          moderatorId: 'admin-001',
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);

      // Verify log was updated
      const updatedLog = await db('moderation_logs')
        .where('id', moderationLogId)
        .first();

      expect(updatedLog.status).toBe('approved');
      expect(updatedLog.reviewed_by).toBe('admin-001');
    });

    it('should reject flagged content', async () => {
      const response = await request(app)
        .post('/api/moderation/review')
        .send({
          moderationLogId,
          action: 'reject',
          notes: 'Violates community guidelines',
          moderatorId: 'admin-002',
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);

      // Verify log was updated
      const updatedLog = await db('moderation_logs')
        .where('id', moderationLogId)
        .first();

      expect(updatedLog.status).toBe('rejected');
    });

    it('should return 400 for invalid action', async () => {
      const response = await request(app)
        .post('/api/moderation/review')
        .send({
          moderationLogId,
          action: 'invalid_action',
          moderatorId: 'admin-003',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Complete Workflow Integration', () => {
    it('should handle full moderation workflow', async () => {
      const userId = 'integration-test-workflow-user';
      const contentId = 'integration-test-workflow-content';

      // Step 1: Moderate content (flagged)
      const moderationResponse = await request(app)
        .post('/api/moderation/image')
        .send({
          contentId,
          imageUrl: 'https://example.com/workflow-test.jpg',
          userId,
          contentType: 'image',
        });

      expect(moderationResponse.status).toBe(200);

      // Step 2: Check if added to queue (if flagged)
      if (moderationResponse.body.result.status === 'flagged') {
        const queueResponse = await request(app)
          .get('/api/moderation/queue')
          .query({ status: 'flagged' });

        const queueItem = queueResponse.body.find(
          (item: any) => item.contentId === contentId
        );
        expect(queueItem).toBeDefined();
      }

      // Step 3: Check user status
      const statusResponse = await request(app)
        .get(`/api/moderation/user/${userId}/status`);

      expect(statusResponse.status).toBe(200);

      // Step 4: Check restriction status
      const restrictionResponse = await request(app)
        .get(`/api/moderation/user/${userId}/restricted`);

      expect(restrictionResponse.status).toBe(200);
      expect(restrictionResponse.body).toHaveProperty('restricted');
    });

    it('should track violation escalation', async () => {
      const userId = 'integration-test-escalation-user';

      // Create violations
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/moderation/image')
          .send({
            contentId: `integration-test-escalation-${i}`,
            imageUrl: `https://example.com/violation-${i}.jpg`,
            userId,
            contentType: 'image',
          });
      }

      // Check if user status escalated
      const statusResponse = await request(app)
        .get(`/api/moderation/user/${userId}/status`);

      if (statusResponse.status === 200) {
        const status = statusResponse.body;
        // Depending on violation severity, user might be warned or suspended
        expect(['active', 'warned', 'suspended']).toContain(status.status);
      }
    });
  });

  describe('Performance and Load Tests', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = Array.from({ length: 20 }, (_, i) =>
        request(app)
          .post('/api/moderation/image')
          .send({
            contentId: `integration-test-concurrent-${i}`,
            imageUrl: `https://example.com/concurrent-${i}.jpg`,
            userId: `integration-test-user-${i}`,
            contentType: 'image',
          })
      );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
      });
    });

    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();

      await request(app)
        .post('/api/moderation/image')
        .send({
          contentId: 'integration-test-performance',
          imageUrl: 'https://example.com/perf-test.jpg',
          userId: 'integration-test-perf-user',
          contentType: 'image',
        });

      const duration = Date.now() - startTime;

      // Should respond in under 5 seconds
      expect(duration).toBeLessThan(5000);
    });
  });
});
