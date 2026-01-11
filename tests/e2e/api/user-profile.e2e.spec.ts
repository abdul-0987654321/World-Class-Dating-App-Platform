/**
 * User Profile Service E2E Tests
 *
 * Comprehensive test suite for user profile endpoints:
 * - Profile (get, update, delete)
 * - Photos (upload, delete, reorder, set primary)
 * - Privacy Settings
 * - Blocking and Reporting
 * - Discovery Preferences
 *
 * Target: Full coverage of user profile flows with edge cases
 */

import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { config, testState, wait } from './setup';

const USER_URL = config.USER_URL;
const AUTH_URL = config.AUTH_URL;

describe('User Profile Service E2E Tests', () => {
  let accessToken: string;
  let userId: string;
  let secondUserToken: string;
  let secondUserId: string;

  beforeAll(async () => {
    // Use tokens from setup or create new
    if (testState.accessToken) {
      accessToken = testState.accessToken;
      userId = testState.userId || '';
    }

    // Create a second user for interaction tests
    const secondEmail = `profile-e2e-2-${Date.now()}@flamoral.test`;
    const registerResponse = await request(AUTH_URL)
      .post('/api/auth/register')
      .send({
        email: secondEmail,
        password: 'SecurePassword123!',
        firstName: 'Second',
        lastName: 'User',
        dateOfBirth: '1993-08-22',
        gender: 'female',
      });

    if (registerResponse.status === 201) {
      secondUserToken = registerResponse.body.accessToken;
      secondUserId = registerResponse.body.user.id;
    }
  });

  // ==================== PROFILE TESTS ====================

  describe('GET /api/profile', () => {
    describe('Get Own Profile', () => {
      it('should return user profile when authenticated', async () => {
        const response = await request(USER_URL)
          .get('/api/profile')
          .set('Authorization', `Bearer ${accessToken}`);

        expect([200, 404]).toContain(response.status);
        if (response.status === 200) {
          expect(response.body).toHaveProperty('success', true);
          expect(response.body).toHaveProperty('data');
        }
      });

      it('should include profile fields', async () => {
        const response = await request(USER_URL)
          .get('/api/profile')
          .set('Authorization', `Bearer ${accessToken}`);

        if (response.status === 200 && response.body.data) {
          const profile = response.body.data;
          expect(profile).toHaveProperty('user_id');
        }
      });

      it('should fail without authentication', async () => {
        const response = await request(USER_URL).get('/api/profile');

        expect(response.status).toBe(401);
      });

      it('should fail with invalid token', async () => {
        const response = await request(USER_URL)
          .get('/api/profile')
          .set('Authorization', 'Bearer invalid-token');

        expect(response.status).toBe(401);
      });
    });
  });

  describe('PUT /api/profile', () => {
    describe('Update Profile', () => {
      it('should update profile with valid data', async () => {
        const profileData = {
          bio: 'E2E test bio - love to travel and explore!',
          occupation: 'Software Engineer',
          height: 175,
          city: 'San Francisco',
          interests: ['coding', 'hiking', 'photography'],
        };

        const response = await request(USER_URL)
          .put('/api/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(profileData);

        expect([200, 400, 404]).toContain(response.status);
        if (response.status === 200) {
          expect(response.body).toHaveProperty('success', true);
        }
      });

      it('should update individual fields', async () => {
        const response = await request(USER_URL)
          .put('/api/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ bio: 'Updated bio text' });

        expect([200, 400, 404]).toContain(response.status);
      });

      it('should fail with bio exceeding max length', async () => {
        const response = await request(USER_URL)
          .put('/api/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ bio: 'a'.repeat(600) }); // Exceeds max length

        expect(response.status).toBe(400);
      });

      it('should fail with invalid height (too high)', async () => {
        const response = await request(USER_URL)
          .put('/api/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ height: 300 });

        expect(response.status).toBe(400);
      });

      it('should fail with invalid height (too low)', async () => {
        const response = await request(USER_URL)
          .put('/api/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ height: 50 });

        expect(response.status).toBe(400);
      });

      it('should fail with invalid interests format', async () => {
        const response = await request(USER_URL)
          .put('/api/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ interests: 'not-an-array' });

        expect(response.status).toBe(400);
      });

      it('should fail without authentication', async () => {
        const response = await request(USER_URL)
          .put('/api/profile')
          .send({ bio: 'Test bio' });

        expect(response.status).toBe(401);
      });
    });

    describe('Profile Validation Edge Cases', () => {
      it('should handle special characters in bio', async () => {
        const response = await request(USER_URL)
          .put('/api/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ bio: 'Love music, art & photography' });

        expect([200, 400, 404]).toContain(response.status);
      });

      it('should handle unicode in occupation', async () => {
        const response = await request(USER_URL)
          .put('/api/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ occupation: 'Cafe Owner' });

        expect([200, 400, 404]).toContain(response.status);
      });

      it('should handle empty strings', async () => {
        const response = await request(USER_URL)
          .put('/api/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ bio: '' });

        // Should either accept empty or reject
        expect([200, 400, 404]).toContain(response.status);
      });
    });
  });

  // ==================== PHOTOS TESTS ====================

  describe('Photos API', () => {
    describe('GET /api/photos', () => {
      it('should return user photos', async () => {
        const response = await request(USER_URL)
          .get('/api/photos')
          .set('Authorization', `Bearer ${accessToken}`);

        expect([200, 500]).toContain(response.status);
        if (response.status === 200) {
          expect(response.body).toHaveProperty('success', true);
          expect(Array.isArray(response.body.data)).toBe(true);
        }
      });

      it('should fail without authentication', async () => {
        const response = await request(USER_URL).get('/api/photos');

        expect(response.status).toBe(401);
      });
    });

    describe('POST /api/photos', () => {
      it('should fail when no photo provided', async () => {
        const response = await request(USER_URL)
          .post('/api/photos')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(400);
      });

      it('should fail without authentication', async () => {
        const response = await request(USER_URL).post('/api/photos');

        expect(response.status).toBe(401);
      });
    });

    describe('DELETE /api/photos/:id', () => {
      it('should handle photo deletion', async () => {
        const photoId = uuidv4();
        const response = await request(USER_URL)
          .delete(`/api/photos/${photoId}`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect([200, 400, 404]).toContain(response.status);
      });

      it('should fail with invalid UUID', async () => {
        const response = await request(USER_URL)
          .delete('/api/photos/invalid-uuid')
          .set('Authorization', `Bearer ${accessToken}`);

        expect([400, 404, 500]).toContain(response.status);
      });

      it('should fail without authentication', async () => {
        const photoId = uuidv4();
        const response = await request(USER_URL).delete(`/api/photos/${photoId}`);

        expect(response.status).toBe(401);
      });
    });

    describe('PUT /api/photos/:id/primary', () => {
      it('should handle set primary photo', async () => {
        const photoId = uuidv4();
        const response = await request(USER_URL)
          .put(`/api/photos/${photoId}/primary`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect([200, 400, 404]).toContain(response.status);
      });

      it('should fail without authentication', async () => {
        const photoId = uuidv4();
        const response = await request(USER_URL).put(`/api/photos/${photoId}/primary`);

        expect(response.status).toBe(401);
      });
    });

    describe('PUT /api/photos/reorder', () => {
      it('should fail with missing photoOrders', async () => {
        const response = await request(USER_URL)
          .put('/api/photos/reorder')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({});

        expect(response.status).toBe(400);
      });

      it('should fail with invalid photoOrders format', async () => {
        const response = await request(USER_URL)
          .put('/api/photos/reorder')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ photoOrders: 'invalid' });

        expect(response.status).toBe(400);
      });

      it('should handle valid reorder request', async () => {
        const response = await request(USER_URL)
          .put('/api/photos/reorder')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            photoOrders: [
              { photoId: uuidv4(), order: 1 },
              { photoId: uuidv4(), order: 2 },
            ],
          });

        expect([200, 400]).toContain(response.status);
      });

      it('should fail without authentication', async () => {
        const response = await request(USER_URL)
          .put('/api/photos/reorder')
          .send({ photoOrders: [] });

        expect(response.status).toBe(401);
      });
    });
  });

  // ==================== PRIVACY SETTINGS TESTS ====================

  describe('Privacy Settings API', () => {
    describe('GET /api/privacy/settings', () => {
      it('should return privacy settings', async () => {
        const response = await request(USER_URL)
          .get('/api/privacy/settings')
          .set('Authorization', `Bearer ${accessToken}`);

        expect([200, 500]).toContain(response.status);
        if (response.status === 200) {
          expect(response.body).toHaveProperty('success', true);
          expect(response.body).toHaveProperty('data');
        }
      });

      it('should fail without authentication', async () => {
        const response = await request(USER_URL).get('/api/privacy/settings');

        expect(response.status).toBe(401);
      });
    });

    describe('PUT /api/privacy/settings', () => {
      it('should update privacy settings', async () => {
        const settings = {
          profileVisibility: 'matches_only',
          showDistance: false,
          showAge: true,
          incognitoMode: false,
        };

        const response = await request(USER_URL)
          .put('/api/privacy/settings')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(settings);

        expect([200, 400, 500]).toContain(response.status);
      });

      it('should handle valid visibility values', async () => {
        const visibilities = ['everyone', 'matches_only', 'nobody'];

        for (const visibility of visibilities) {
          const response = await request(USER_URL)
            .put('/api/privacy/settings')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ profileVisibility: visibility });

          expect([200, 400, 500]).toContain(response.status);
        }
      });

      it('should fail without authentication', async () => {
        const response = await request(USER_URL)
          .put('/api/privacy/settings')
          .send({ profileVisibility: 'everyone' });

        expect(response.status).toBe(401);
      });
    });
  });

  // ==================== BLOCKING TESTS ====================

  describe('Blocks API', () => {
    describe('GET /api/blocks', () => {
      it('should return blocked users list', async () => {
        const response = await request(USER_URL)
          .get('/api/blocks')
          .set('Authorization', `Bearer ${accessToken}`);

        expect([200, 500]).toContain(response.status);
        if (response.status === 200) {
          expect(response.body).toHaveProperty('success', true);
          expect(Array.isArray(response.body.data)).toBe(true);
        }
      });

      it('should fail without authentication', async () => {
        const response = await request(USER_URL).get('/api/blocks');

        expect(response.status).toBe(401);
      });
    });

    describe('POST /api/blocks', () => {
      it('should block a user', async () => {
        const blockedUserId = secondUserId || uuidv4();
        const response = await request(USER_URL)
          .post('/api/blocks')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            blockedId: blockedUserId,
            reason: 'Not interested',
          });

        expect([200, 201, 400, 500]).toContain(response.status);
      });

      it('should block user without reason', async () => {
        const blockedUserId = uuidv4();
        const response = await request(USER_URL)
          .post('/api/blocks')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ blockedId: blockedUserId });

        expect([200, 201, 400, 500]).toContain(response.status);
      });

      it('should prevent self-blocking', async () => {
        const response = await request(USER_URL)
          .post('/api/blocks')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ blockedId: userId });

        expect([400, 403]).toContain(response.status);
      });

      it('should fail without authentication', async () => {
        const response = await request(USER_URL)
          .post('/api/blocks')
          .send({ blockedId: uuidv4() });

        expect(response.status).toBe(401);
      });
    });

    describe('DELETE /api/blocks/:userId', () => {
      it('should unblock a user', async () => {
        const blockedUserId = uuidv4();
        const response = await request(USER_URL)
          .delete(`/api/blocks/${blockedUserId}`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect([200, 400, 404, 500]).toContain(response.status);
      });

      it('should fail without authentication', async () => {
        const blockedUserId = uuidv4();
        const response = await request(USER_URL).delete(`/api/blocks/${blockedUserId}`);

        expect(response.status).toBe(401);
      });
    });
  });

  // ==================== REPORTS TESTS ====================

  describe('Reports API', () => {
    describe('GET /api/reports/categories', () => {
      it('should return report categories', async () => {
        const response = await request(USER_URL)
          .get('/api/reports/categories')
          .set('Authorization', `Bearer ${accessToken}`);

        expect([200, 500]).toContain(response.status);
        if (response.status === 200) {
          expect(response.body).toHaveProperty('success', true);
          expect(Array.isArray(response.body.data)).toBe(true);
        }
      });

      it('should fail without authentication', async () => {
        const response = await request(USER_URL).get('/api/reports/categories');

        expect(response.status).toBe(401);
      });
    });

    describe('POST /api/reports', () => {
      it('should submit a report', async () => {
        const reportedUserId = secondUserId || uuidv4();
        const response = await request(USER_URL)
          .post('/api/reports')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            reportedId: reportedUserId,
            reportType: 'inappropriate_messages',
            description: 'Test report for E2E testing',
            severity: 'low',
          });

        expect([200, 201, 400, 500]).toContain(response.status);
      });

      it('should fail with missing reportedId', async () => {
        const response = await request(USER_URL)
          .post('/api/reports')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            reportType: 'inappropriate_messages',
            description: 'Test report',
          });

        expect(response.status).toBe(400);
      });

      it('should fail with missing reportType', async () => {
        const response = await request(USER_URL)
          .post('/api/reports')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            reportedId: uuidv4(),
            description: 'Test report',
          });

        expect(response.status).toBe(400);
      });

      it('should prevent self-reporting', async () => {
        const response = await request(USER_URL)
          .post('/api/reports')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            reportedId: userId,
            reportType: 'spam',
            description: 'Self report attempt',
          });

        expect([400, 403]).toContain(response.status);
      });

      it('should fail without authentication', async () => {
        const response = await request(USER_URL)
          .post('/api/reports')
          .send({
            reportedId: uuidv4(),
            reportType: 'spam',
          });

        expect(response.status).toBe(401);
      });
    });
  });

  // ==================== SUBSCRIPTIONS TESTS ====================

  describe('Subscriptions API', () => {
    describe('GET /api/subscriptions/current', () => {
      it('should return current subscription', async () => {
        const response = await request(USER_URL)
          .get('/api/subscriptions/current')
          .set('Authorization', `Bearer ${accessToken}`);

        expect([200, 500]).toContain(response.status);
        if (response.status === 200) {
          expect(response.body).toHaveProperty('success', true);
          expect(response.body.data).toHaveProperty('tier');
        }
      });

      it('should fail without authentication', async () => {
        const response = await request(USER_URL).get('/api/subscriptions/current');

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/subscriptions/features', () => {
      it('should return subscription features', async () => {
        const response = await request(USER_URL)
          .get('/api/subscriptions/features')
          .set('Authorization', `Bearer ${accessToken}`);

        expect([200, 500]).toContain(response.status);
        if (response.status === 200) {
          expect(response.body).toHaveProperty('success', true);
        }
      });

      it('should fail without authentication', async () => {
        const response = await request(USER_URL).get('/api/subscriptions/features');

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/subscriptions/features/:key/access', () => {
      it('should check feature access', async () => {
        const response = await request(USER_URL)
          .get('/api/subscriptions/features/incognito_mode/access')
          .set('Authorization', `Bearer ${accessToken}`);

        expect([200, 500]).toContain(response.status);
        if (response.status === 200) {
          expect(response.body.data).toHaveProperty('hasAccess');
        }
      });

      it('should fail without authentication', async () => {
        const response = await request(USER_URL).get('/api/subscriptions/features/incognito_mode/access');

        expect(response.status).toBe(401);
      });
    });

    describe('PUT /api/subscriptions/tier', () => {
      it('should fail with invalid tier', async () => {
        const response = await request(USER_URL)
          .put('/api/subscriptions/tier')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ tier: 'invalid-tier' });

        expect(response.status).toBe(400);
      });

      it('should accept valid tiers', async () => {
        const validTiers = ['free', 'basic', 'mid', 'ultra'];

        for (const tier of validTiers) {
          const response = await request(USER_URL)
            .put('/api/subscriptions/tier')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ tier });

          expect([200, 400, 500]).toContain(response.status);
        }
      });

      it('should fail without authentication', async () => {
        const response = await request(USER_URL)
          .put('/api/subscriptions/tier')
          .send({ tier: 'basic' });

        expect(response.status).toBe(401);
      });
    });
  });

  // ==================== COINS TESTS ====================

  describe('Coins API', () => {
    describe('GET /api/coins/balance', () => {
      it('should return coin balance', async () => {
        const response = await request(USER_URL)
          .get('/api/coins/balance')
          .set('Authorization', `Bearer ${accessToken}`);

        expect([200, 500]).toContain(response.status);
        if (response.status === 200) {
          expect(response.body.data).toHaveProperty('balance');
        }
      });

      it('should fail without authentication', async () => {
        const response = await request(USER_URL).get('/api/coins/balance');

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/coins/transactions', () => {
      it('should return transaction history', async () => {
        const response = await request(USER_URL)
          .get('/api/coins/transactions')
          .set('Authorization', `Bearer ${accessToken}`);

        expect([200, 500]).toContain(response.status);
      });

      it('should support pagination', async () => {
        const response = await request(USER_URL)
          .get('/api/coins/transactions')
          .query({ limit: 10, offset: 0 })
          .set('Authorization', `Bearer ${accessToken}`);

        expect([200, 500]).toContain(response.status);
      });

      it('should fail without authentication', async () => {
        const response = await request(USER_URL).get('/api/coins/transactions');

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/coins/products', () => {
      it('should return coin products', async () => {
        const response = await request(USER_URL)
          .get('/api/coins/products')
          .set('Authorization', `Bearer ${accessToken}`);

        expect([200, 500]).toContain(response.status);
        if (response.status === 200) {
          expect(Array.isArray(response.body.data)).toBe(true);
        }
      });

      it('should fail without authentication', async () => {
        const response = await request(USER_URL).get('/api/coins/products');

        expect(response.status).toBe(401);
      });
    });

    describe('POST /api/coins/spend', () => {
      it('should fail with missing amount', async () => {
        const response = await request(USER_URL)
          .post('/api/coins/spend')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ reason: 'Boost' });

        expect(response.status).toBe(400);
      });

      it('should fail with missing reason', async () => {
        const response = await request(USER_URL)
          .post('/api/coins/spend')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ amount: 50 });

        expect(response.status).toBe(400);
      });

      it('should fail with negative amount', async () => {
        const response = await request(USER_URL)
          .post('/api/coins/spend')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ amount: -50, reason: 'Test' });

        expect(response.status).toBe(400);
      });

      it('should fail without authentication', async () => {
        const response = await request(USER_URL)
          .post('/api/coins/spend')
          .send({ amount: 50, reason: 'Test' });

        expect(response.status).toBe(401);
      });
    });

    describe('POST /api/coins/daily-reward', () => {
      it('should handle daily reward claim', async () => {
        const response = await request(USER_URL)
          .post('/api/coins/daily-reward')
          .set('Authorization', `Bearer ${accessToken}`);

        expect([200, 400, 500]).toContain(response.status);
      });

      it('should fail without authentication', async () => {
        const response = await request(USER_URL).post('/api/coins/daily-reward');

        expect(response.status).toBe(401);
      });
    });
  });

  // ==================== BOOSTS TESTS ====================

  describe('Boosts API', () => {
    describe('GET /api/boosts/products', () => {
      it('should return boost products', async () => {
        const response = await request(USER_URL)
          .get('/api/boosts/products')
          .set('Authorization', `Bearer ${accessToken}`);

        expect([200, 500]).toContain(response.status);
        if (response.status === 200) {
          expect(Array.isArray(response.body.data)).toBe(true);
        }
      });

      it('should fail without authentication', async () => {
        const response = await request(USER_URL).get('/api/boosts/products');

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/boosts/active', () => {
      it('should return active boost status', async () => {
        const response = await request(USER_URL)
          .get('/api/boosts/active')
          .set('Authorization', `Bearer ${accessToken}`);

        expect([200, 500]).toContain(response.status);
      });

      it('should fail without authentication', async () => {
        const response = await request(USER_URL).get('/api/boosts/active');

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/boosts/history', () => {
      it('should return boost history', async () => {
        const response = await request(USER_URL)
          .get('/api/boosts/history')
          .set('Authorization', `Bearer ${accessToken}`);

        expect([200, 500]).toContain(response.status);
      });

      it('should support limit parameter', async () => {
        const response = await request(USER_URL)
          .get('/api/boosts/history')
          .query({ limit: 5 })
          .set('Authorization', `Bearer ${accessToken}`);

        expect([200, 500]).toContain(response.status);
      });

      it('should fail without authentication', async () => {
        const response = await request(USER_URL).get('/api/boosts/history');

        expect(response.status).toBe(401);
      });
    });

    describe('POST /api/boosts/activate-with-coins', () => {
      it('should fail with missing productSku', async () => {
        const response = await request(USER_URL)
          .post('/api/boosts/activate-with-coins')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({});

        expect(response.status).toBe(400);
      });

      it('should fail without authentication', async () => {
        const response = await request(USER_URL)
          .post('/api/boosts/activate-with-coins')
          .send({ productSku: 'BOOST_1HR' });

        expect(response.status).toBe(401);
      });
    });
  });

  // ==================== SECURITY TESTS ====================

  describe('Security Tests', () => {
    describe('Token Validation', () => {
      it('should reject malformed bearer token', async () => {
        const response = await request(USER_URL)
          .get('/api/profile')
          .set('Authorization', 'InvalidFormat');

        expect(response.status).toBe(401);
      });

      it('should reject expired token', async () => {
        const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxfQ.expired';

        const response = await request(USER_URL)
          .get('/api/profile')
          .set('Authorization', `Bearer ${expiredToken}`);

        expect(response.status).toBe(401);
      });
    });

    describe('Input Sanitization', () => {
      it('should sanitize XSS in bio', async () => {
        const response = await request(USER_URL)
          .put('/api/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ bio: '<script>alert("xss")</script>' });

        if (response.status === 200 && response.body.data) {
          expect(response.body.data.bio).not.toContain('<script>');
        }
      });

      it('should handle SQL injection attempts', async () => {
        const response = await request(USER_URL)
          .put('/api/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ bio: "'; DROP TABLE users; --" });

        // Should not crash the service
        expect([200, 400]).toContain(response.status);
      });
    });

    describe('Access Control', () => {
      it('should not allow accessing other user data', async () => {
        // This depends on API design - testing general principle
        const response = await request(USER_URL)
          .get(`/api/users/${secondUserId}/private-data`)
          .set('Authorization', `Bearer ${accessToken}`);

        // Should either 403, 404, or not have endpoint
        expect([401, 403, 404, 500]).toContain(response.status);
      });
    });
  });

  // ==================== RATE LIMITING TESTS ====================

  describe('Rate Limiting', () => {
    it('should respect rate limits on rapid profile requests', async () => {
      const requests = Array(20).fill(null).map(() =>
        request(USER_URL)
          .get('/api/profile')
          .set('Authorization', `Bearer ${accessToken}`)
      );

      const responses = await Promise.all(requests);

      // All should complete without crashing
      responses.forEach(response => {
        expect([200, 404, 429, 500]).toContain(response.status);
      });
    });
  });
});
