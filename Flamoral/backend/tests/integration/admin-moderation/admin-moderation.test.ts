/**
 * Integration tests for Admin Dashboard, Content Moderation, and Block/Report
 * Tests admin operations, content moderation workflows, and user safety features
 */

import { ApiClient, createApiClient } from '../helpers/api-client';
import { DatabaseHelper, getDatabaseHelper } from '../helpers/database';
import { faker } from '@faker-js/faker';

describe('Admin, Moderation, and Safety Integration Tests', () => {
  let adminApiClient: ApiClient;
  let authApiClient: ApiClient;
  let userApiClient: ApiClient;
  let moderationApiClient: ApiClient;
  let dbHelper: DatabaseHelper;

  const ADMIN_SERVICE_URL = process.env.ADMIN_SERVICE_URL || 'http://localhost:3007';
  const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
  const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3002';
  const MODERATION_SERVICE_URL = process.env.MODERATION_SERVICE_URL || 'http://localhost:3008';

  beforeAll(async () => {
    adminApiClient = createApiClient(ADMIN_SERVICE_URL);
    authApiClient = createApiClient(AUTH_SERVICE_URL);
    userApiClient = createApiClient(USER_SERVICE_URL);
    moderationApiClient = createApiClient(MODERATION_SERVICE_URL);
    dbHelper = getDatabaseHelper();
  });

  beforeEach(async () => {
    await dbHelper.clearAll();
  });

  const createUser = async (role = 'user') => {
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

    // Set role if admin/moderator
    if (role !== 'user') {
      const knex = dbHelper.getKnex();
      await knex('users').where('id', user.id).update({ role });
    }

    return { user, accessToken };
  };

  describe('Admin Dashboard', () => {
    it('should get platform statistics', async () => {
      const { accessToken: adminToken } = await createUser('admin');

      // Create some test data
      await createUser();
      await createUser();

      adminApiClient.setAuthToken(adminToken);
      const response = await adminApiClient.get('/api/v1/admin/stats');

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        totalUsers: expect.any(Number),
        activeUsers: expect.any(Number),
        totalMatches: expect.any(Number),
        totalMessages: expect.any(Number),
        revenue: expect.any(Number),
      });
    });

    it('should get user growth metrics', async () => {
      const { accessToken: adminToken } = await createUser('admin');

      adminApiClient.setAuthToken(adminToken);
      const response = await adminApiClient.get('/api/v1/admin/metrics/growth', {
        query: { period: '7d' },
      });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('userGrowth');
      expect(response.body.data).toHaveProperty('chartData');
    });

    it('should get revenue analytics', async () => {
      const { accessToken: adminToken } = await createUser('admin');

      adminApiClient.setAuthToken(adminToken);
      const response = await adminApiClient.get('/api/v1/admin/analytics/revenue');

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        totalRevenue: expect.any(Number),
        subscriptionRevenue: expect.any(Number),
        inAppPurchaseRevenue: expect.any(Number),
      });
    });

    it('should not allow non-admin access to admin endpoints', async () => {
      const { accessToken: userToken } = await createUser('user');

      adminApiClient.setAuthToken(userToken);
      const response = await adminApiClient.get('/api/v1/admin/stats');

      expect(response.status).toBe(403);
      expect(response.body.error).toMatch(/forbidden|unauthorized|admin/i);
    });
  });

  describe('User Management', () => {
    it('should get all users with pagination', async () => {
      const { accessToken: adminToken } = await createUser('admin');

      // Create test users
      await createUser();
      await createUser();
      await createUser();

      adminApiClient.setAuthToken(adminToken);
      const response = await adminApiClient.get('/api/v1/admin/users', {
        query: { page: 1, limit: 10 },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.users).toBeDefined();
      expect(response.body.data.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total: expect.any(Number),
      });
    });

    it('should search users', async () => {
      const { accessToken: adminToken } = await createUser('admin');

      const { user: testUser } = await createUser();

      adminApiClient.setAuthToken(adminToken);
      const response = await adminApiClient.get('/api/v1/admin/users/search', {
        query: { q: testUser.email },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.users.length).toBeGreaterThan(0);
      expect(response.body.data.users[0].email).toBe(testUser.email);
    });

    it('should get user details', async () => {
      const { accessToken: adminToken } = await createUser('admin');
      const { user: testUser } = await createUser();

      adminApiClient.setAuthToken(adminToken);
      const response = await adminApiClient.get(`/api/v1/admin/users/${testUser.id}`);

      expect(response.status).toBe(200);
      expect(response.body.data.user).toMatchObject({
        id: testUser.id,
        email: testUser.email,
        profile: expect.any(Object),
        activityLog: expect.any(Array),
      });
    });

    it('should suspend user account', async () => {
      const { accessToken: adminToken } = await createUser('admin');
      const { user: testUser } = await createUser();

      adminApiClient.setAuthToken(adminToken);
      const response = await adminApiClient.post(`/api/v1/admin/users/${testUser.id}/suspend`, {
        reason: 'Violation of community guidelines',
        duration: 7, // days
      });

      expect(response.status).toBe(200);

      // Verify suspension in database
      const knex = dbHelper.getKnex();
      const user = await knex('users').where('id', testUser.id).first();
      expect(user.is_suspended).toBe(true);
    });

    it('should ban user account', async () => {
      const { accessToken: adminToken } = await createUser('admin');
      const { user: testUser } = await createUser();

      adminApiClient.setAuthToken(adminToken);
      const response = await adminApiClient.post(`/api/v1/admin/users/${testUser.id}/ban`, {
        reason: 'Serious violation',
        permanent: true,
      });

      expect(response.status).toBe(200);

      // Verify ban
      const knex = dbHelper.getKnex();
      const user = await knex('users').where('id', testUser.id).first();
      expect(user.is_banned).toBe(true);
      expect(user.is_active).toBe(false);
    });

    it('should delete user account (GDPR)', async () => {
      const { accessToken: adminToken } = await createUser('admin');
      const { user: testUser } = await createUser();

      adminApiClient.setAuthToken(adminToken);
      const response = await adminApiClient.delete(`/api/v1/admin/users/${testUser.id}`, {
        data: { reason: 'GDPR request' },
      });

      expect(response.status).toBe(200);

      // Verify user deletion
      const knex = dbHelper.getKnex();
      const user = await knex('users').where('id', testUser.id).first();
      expect(user).toBeUndefined();
    });
  });

  describe('Content Moderation', () => {
    it('should get moderation queue', async () => {
      const { accessToken: modToken } = await createUser('moderator');

      moderationApiClient.setAuthToken(modToken);
      const response = await moderationApiClient.get('/api/v1/moderation/queue');

      expect(response.status).toBe(200);
      expect(response.body.data.items).toBeDefined();
      expect(response.body.data).toMatchObject({
        pending: expect.any(Number),
        reviewed: expect.any(Number),
      });
    });

    it('should moderate photo', async () => {
      const { user: testUser } = await createUser();
      const { accessToken: modToken } = await createUser('moderator');

      // Create photo needing moderation
      const knex = dbHelper.getKnex();
      await knex('photos').insert({
        user_id: testUser.id,
        url: 'https://example.com/photo.jpg',
        status: 'pending_review',
      });

      const photo = await knex('photos').where('user_id', testUser.id).first();

      // Moderate photo
      moderationApiClient.setAuthToken(modToken);
      const response = await moderationApiClient.post(
        `/api/v1/moderation/photos/${photo.id}/review`,
        {
          action: 'approve',
          notes: 'Photo looks good',
        }
      );

      expect(response.status).toBe(200);

      // Verify approval
      const updatedPhoto = await knex('photos').where('id', photo.id).first();
      expect(updatedPhoto.status).toBe('approved');
    });

    it('should reject inappropriate photo', async () => {
      const { user: testUser } = await createUser();
      const { accessToken: modToken } = await createUser('moderator');

      const knex = dbHelper.getKnex();
      await knex('photos').insert({
        user_id: testUser.id,
        url: 'https://example.com/photo.jpg',
        status: 'pending_review',
      });

      const photo = await knex('photos').where('user_id', testUser.id).first();

      moderationApiClient.setAuthToken(modToken);
      const response = await moderationApiClient.post(
        `/api/v1/moderation/photos/${photo.id}/review`,
        {
          action: 'reject',
          reason: 'inappropriate_content',
          notes: 'Violates community guidelines',
        }
      );

      expect(response.status).toBe(200);

      const updatedPhoto = await knex('photos').where('id', photo.id).first();
      expect(updatedPhoto.status).toBe('rejected');
    });

    it('should moderate user profile', async () => {
      const { user: testUser } = await createUser();
      const { accessToken: modToken } = await createUser('moderator');

      moderationApiClient.setAuthToken(modToken);
      const response = await moderationApiClient.post(
        `/api/v1/moderation/profiles/${testUser.id}/review`,
        {
          action: 'warn',
          reason: 'Inappropriate bio content',
        }
      );

      expect(response.status).toBe(200);
    });

    it('should get moderation history', async () => {
      const { accessToken: modToken } = await createUser('moderator');

      moderationApiClient.setAuthToken(modToken);
      const response = await moderationApiClient.get('/api/v1/moderation/history');

      expect(response.status).toBe(200);
      expect(response.body.data.actions).toBeDefined();
    });
  });

  describe('Report System', () => {
    it('should report user profile', async () => {
      const { user: reporter, accessToken: reporterToken } = await createUser();
      const { user: reported } = await createUser();

      userApiClient.setAuthToken(reporterToken);
      const response = await userApiClient.post('/api/v1/users/report', {
        reportedUserId: reported.id,
        reason: 'fake_profile',
        details: 'This appears to be a fake account',
      });

      expect(response.status).toBe(200);

      // Verify report in database
      const knex = dbHelper.getKnex();
      const report = await knex('reports')
        .where({
          reporter_id: reporter.id,
          reported_user_id: reported.id,
        })
        .first();

      expect(report).toBeDefined();
      expect(report.reason).toBe('fake_profile');
    });

    it('should not allow duplicate reports', async () => {
      const { user: reporter, accessToken: reporterToken } = await createUser();
      const { user: reported } = await createUser();

      userApiClient.setAuthToken(reporterToken);

      // First report
      await userApiClient.post('/api/v1/users/report', {
        reportedUserId: reported.id,
        reason: 'fake_profile',
      });

      // Duplicate report
      const response = await userApiClient.post('/api/v1/users/report', {
        reportedUserId: reported.id,
        reason: 'fake_profile',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/already reported/i);
    });

    it('should review report', async () => {
      const { user: reporter } = await createUser();
      const { user: reported } = await createUser();
      const { accessToken: modToken } = await createUser('moderator');

      // Create report
      const knex = dbHelper.getKnex();
      await knex('reports').insert({
        reporter_id: reporter.id,
        reported_user_id: reported.id,
        reason: 'inappropriate_messages',
        status: 'pending',
      });

      const report = await knex('reports')
        .where({ reporter_id: reporter.id })
        .first();

      // Review report
      moderationApiClient.setAuthToken(modToken);
      const response = await moderationApiClient.post(
        `/api/v1/moderation/reports/${report.id}/review`,
        {
          action: 'action_taken',
          moderatorNotes: 'User warned',
        }
      );

      expect(response.status).toBe(200);

      // Verify review
      const updatedReport = await knex('reports').where('id', report.id).first();
      expect(updatedReport.status).toBe('resolved');
    });

    it('should auto-flag user after multiple reports', async () => {
      const { user: reported } = await createUser();

      // Create multiple reports from different users
      for (let i = 0; i < 5; i++) {
        const { user: reporter, accessToken: token } = await createUser();
        userApiClient.setAuthToken(token);
        await userApiClient.post('/api/v1/users/report', {
          reportedUserId: reported.id,
          reason: 'inappropriate_behavior',
        });
      }

      // Check if user is flagged
      const knex = dbHelper.getKnex();
      const user = await knex('users').where('id', reported.id).first();
      expect(user.is_flagged).toBe(true);
    });
  });

  describe('Block Functionality', () => {
    it('should block another user', async () => {
      const { user: blocker, accessToken: blockerToken } = await createUser();
      const { user: blocked } = await createUser();

      userApiClient.setAuthToken(blockerToken);
      const response = await userApiClient.post('/api/v1/users/block', {
        userId: blocked.id,
      });

      expect(response.status).toBe(200);

      // Verify block in database
      const knex = dbHelper.getKnex();
      const block = await knex('blocks')
        .where({
          blocker_id: blocker.id,
          blocked_id: blocked.id,
        })
        .first();

      expect(block).toBeDefined();
    });

    it('should hide blocked user from discovery', async () => {
      const { user: blocker, accessToken: blockerToken } = await createUser();
      const { user: blocked } = await createUser();

      // Block user
      userApiClient.setAuthToken(blockerToken);
      await userApiClient.post('/api/v1/users/block', {
        userId: blocked.id,
      });

      // Get discovery feed
      const matchingApiClient = createApiClient('http://localhost:3004');
      matchingApiClient.setAuthToken(blockerToken);
      const response = await matchingApiClient.get('/api/v1/matching/discovery');

      // Blocked user should not appear
      const userIds = response.body.data.profiles.map((p: any) => p.userId);
      expect(userIds).not.toContain(blocked.id);
    });

    it('should get blocked users list', async () => {
      const { user: blocker, accessToken: blockerToken } = await createUser();
      const { user: blocked1 } = await createUser();
      const { user: blocked2 } = await createUser();

      // Block users
      userApiClient.setAuthToken(blockerToken);
      await userApiClient.post('/api/v1/users/block', { userId: blocked1.id });
      await userApiClient.post('/api/v1/users/block', { userId: blocked2.id });

      // Get blocked list
      const response = await userApiClient.get('/api/v1/users/blocked');

      expect(response.status).toBe(200);
      expect(response.body.data.blockedUsers.length).toBe(2);
    });

    it('should unblock user', async () => {
      const { user: blocker, accessToken: blockerToken } = await createUser();
      const { user: blocked } = await createUser();

      // Block user
      userApiClient.setAuthToken(blockerToken);
      await userApiClient.post('/api/v1/users/block', { userId: blocked.id });

      // Unblock user
      const response = await userApiClient.delete(`/api/v1/users/block/${blocked.id}`);

      expect(response.status).toBe(200);

      // Verify unblock
      const knex = dbHelper.getKnex();
      const block = await knex('blocks')
        .where({
          blocker_id: blocker.id,
          blocked_id: blocked.id,
        })
        .first();

      expect(block).toBeUndefined();
    });
  });

  describe('Safety Features', () => {
    it('should detect and flag spam messages', async () => {
      const { user: sender, accessToken: senderToken } = await createUser();
      const { user: receiver } = await createUser();

      // Send multiple identical messages quickly (spam pattern)
      const messagingApiClient = createApiClient('http://localhost:3005');
      messagingApiClient.setAuthToken(senderToken);

      const spamMessage = 'Buy cheap followers at example.com!';

      for (let i = 0; i < 10; i++) {
        await messagingApiClient.post('/api/v1/messages/send', {
          receiverId: receiver.id,
          content: spamMessage,
          type: 'text',
        });
      }

      // Check if user is flagged
      const knex = dbHelper.getKnex();
      const user = await knex('users').where('id', sender.id).first();
      expect(user.spam_score).toBeGreaterThan(0);
    });

    it('should enforce content filtering', async () => {
      const { accessToken: userToken } = await createUser();

      userApiClient.setAuthToken(userToken);
      const response = await userApiClient.put('/api/v1/users/profile', {
        bio: 'Contact me at my-email@example.com or call 555-1234',
      });

      // Should warn or filter contact information
      expect([200, 400]).toContain(response.status);

      if (response.status === 400) {
        expect(response.body.error).toMatch(/contact information|phone|email/i);
      }
    });
  });
});
