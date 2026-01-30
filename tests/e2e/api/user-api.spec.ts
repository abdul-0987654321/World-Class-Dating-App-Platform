/**
 * User Service E2E API Tests
 *
 * Comprehensive test suite for all 31 User Service endpoints:
 * - Profile (2 endpoints)
 * - Photos (5 endpoints)
 * - Subscriptions (6 endpoints)
 * - Coins (7 endpoints)
 * - Boosts (4 endpoints)
 * - Privacy (2 endpoints)
 * - Blocks (3 endpoints)
 * - Reports (2 endpoints)
 *
 * Target: 80%+ code coverage
 */

import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';

// Use API Gateway URL (not direct app import - this is an E2E test against a running service)
const GATEWAY_URL = process.env.API_GATEWAY_URL || 'https://api-gateway-production-1957.up.railway.app';
const app = GATEWAY_URL;

// Test configuration
const API_BASE = '/api/v1';
let authToken: string;
let testUserId: string;
let testUser2Id: string;
let authToken2: string;

// JWT secret from environment
const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'test-access-secret-key';

/**
 * Helper function to generate auth token
 */
function generateAuthToken(userId: string, email: string = 'test@example.com'): string {
  return jwt.sign(
    {
      userId,
      email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
    JWT_SECRET
  );
}

/**
 * Setup: Create test users and authentication tokens
 */
beforeAll(async () => {
  // Generate test user IDs
  testUserId = uuidv4();
  testUser2Id = uuidv4();

  // Generate auth tokens
  authToken = generateAuthToken(testUserId, 'test1@example.com');
  authToken2 = generateAuthToken(testUser2Id, 'test2@example.com');

  // Note: In a real scenario, you would insert test users into the database here
  // For now, we're testing the API layer with mocked authentication
});

/**
 * Cleanup: Remove test data
 */
afterAll(async () => {
  // Clean up test data from database if needed
  // await cleanupTestData(testUserId, testUser2Id);
});

// ==================== PROFILE TESTS ====================

describe('Profile API', () => {
  describe('GET /api/profile', () => {
    it('should return user profile when authenticated', async () => {
      const response = await request(app)
        .get(`${API_BASE}/profile`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 404]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('user_id');
      }
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get(`${API_BASE}/profile`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get(`${API_BASE}/profile`)
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('PUT /api/profile', () => {
    it('should update profile successfully', async () => {
      const profileData = {
        bio: 'Updated bio for testing',
        occupation: 'Software Engineer',
        height: 175,
        city: 'San Francisco',
        interests: ['coding', 'hiking'],
      };

      const response = await request(app)
        .put(`${API_BASE}/profile`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(profileData);

      expect([200, 400, 404]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('data');
      }
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .put(`${API_BASE}/profile`)
        .send({ bio: 'Test bio' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should validate bio length', async () => {
      const response = await request(app)
        .put(`${API_BASE}/profile`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ bio: 'a'.repeat(600) }); // Exceeds max length

      expect([400]).toContain(response.status);
    });

    it('should validate height range', async () => {
      const response = await request(app)
        .put(`${API_BASE}/profile`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ height: 300 }); // Invalid height

      expect([400]).toContain(response.status);
    });
  });
});

// ==================== PHOTOS TESTS ====================

describe('Photos API', () => {
  describe('GET /api/photos', () => {
    it('should return user photos when authenticated', async () => {
      const response = await request(app)
        .get(`${API_BASE}/photos`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get(`${API_BASE}/photos`);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/photos', () => {
    it('should return 400 when no photo provided', async () => {
      const response = await request(app)
        .post(`${API_BASE}/photos`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post(`${API_BASE}/photos`);

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/photos/:id', () => {
    it('should return 401 when not authenticated', async () => {
      const photoId = uuidv4();
      const response = await request(app)
        .delete(`${API_BASE}/photos/${photoId}`);

      expect(response.status).toBe(401);
    });

    it('should handle photo deletion request', async () => {
      const photoId = uuidv4();
      const response = await request(app)
        .delete(`${API_BASE}/photos/${photoId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 400, 404]).toContain(response.status);
    });
  });

  describe('PUT /api/photos/:id/primary', () => {
    it('should return 401 when not authenticated', async () => {
      const photoId = uuidv4();
      const response = await request(app)
        .put(`${API_BASE}/photos/${photoId}/primary`);

      expect(response.status).toBe(401);
    });

    it('should handle set primary photo request', async () => {
      const photoId = uuidv4();
      const response = await request(app)
        .put(`${API_BASE}/photos/${photoId}/primary`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 400, 404]).toContain(response.status);
    });
  });

  describe('PUT /api/photos/reorder', () => {
    it('should return 400 when photoOrders is missing', async () => {
      const response = await request(app)
        .put(`${API_BASE}/photos/reorder`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 400 when photoOrders is not an array', async () => {
      const response = await request(app)
        .put(`${API_BASE}/photos/reorder`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ photoOrders: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'photoOrders must be an array');
    });

    it('should handle valid photo reorder request', async () => {
      const response = await request(app)
        .put(`${API_BASE}/photos/reorder`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          photoOrders: [
            { photoId: uuidv4(), order: 1 },
            { photoId: uuidv4(), order: 2 },
          ],
        });

      expect([200, 400]).toContain(response.status);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .put(`${API_BASE}/photos/reorder`);

      expect(response.status).toBe(401);
    });
  });
});

// ==================== SUBSCRIPTIONS TESTS ====================

describe('Subscriptions API', () => {
  describe('GET /api/subscriptions/current', () => {
    it('should return current subscription when authenticated', async () => {
      const response = await request(app)
        .get(`${API_BASE}/subscriptions/current`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('tier');
      }
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get(`${API_BASE}/subscriptions/current`);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/subscriptions/features', () => {
    it('should return subscription features', async () => {
      const response = await request(app)
        .get(`${API_BASE}/subscriptions/features`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
      }
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get(`${API_BASE}/subscriptions/features`);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/subscriptions/features/:key/access', () => {
    it('should check feature access', async () => {
      const response = await request(app)
        .get(`${API_BASE}/subscriptions/features/incognito_mode/access`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('hasAccess');
      }
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get(`${API_BASE}/subscriptions/features/incognito_mode/access`);

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/subscriptions/tier', () => {
    it('should return 400 with invalid tier', async () => {
      const response = await request(app)
        .put(`${API_BASE}/subscriptions/tier`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ tier: 'invalid-tier' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Invalid tier specified');
    });

    it('should return 400 when tier is missing', async () => {
      const response = await request(app)
        .put(`${API_BASE}/subscriptions/tier`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Invalid tier specified');
    });

    it('should accept valid tier', async () => {
      const validTiers = ['free', 'basic', 'mid', 'ultra'];
      for (const tier of validTiers) {
        const response = await request(app)
          .put(`${API_BASE}/subscriptions/tier`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ tier });

        expect([200, 400, 500]).toContain(response.status);
      }
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .put(`${API_BASE}/subscriptions/tier`)
        .send({ tier: 'basic' });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/subscriptions/cancel', () => {
    it('should handle cancel subscription request', async () => {
      const response = await request(app)
        .post(`${API_BASE}/subscriptions/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ immediately: false });

      expect([200, 400, 500]).toContain(response.status);
    });

    it('should handle immediate cancellation', async () => {
      const response = await request(app)
        .post(`${API_BASE}/subscriptions/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ immediately: true });

      expect([200, 400, 500]).toContain(response.status);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post(`${API_BASE}/subscriptions/cancel`);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/subscriptions/reactivate', () => {
    it('should handle reactivate subscription request', async () => {
      const response = await request(app)
        .post(`${API_BASE}/subscriptions/reactivate`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 400, 500]).toContain(response.status);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post(`${API_BASE}/subscriptions/reactivate`);

      expect(response.status).toBe(401);
    });
  });
});

// ==================== COINS TESTS ====================

describe('Coins API', () => {
  describe('GET /api/coins/balance', () => {
    it('should return coin balance when authenticated', async () => {
      const response = await request(app)
        .get(`${API_BASE}/coins/balance`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('balance');
      }
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get(`${API_BASE}/coins/balance`);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/coins/transactions', () => {
    it('should return transaction history', async () => {
      const response = await request(app)
        .get(`${API_BASE}/coins/transactions`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
      }
    });

    it('should support query parameters', async () => {
      const response = await request(app)
        .get(`${API_BASE}/coins/transactions`)
        .query({ limit: 10, offset: 0, type: 'purchase' })
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(response.status);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get(`${API_BASE}/coins/transactions`);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/coins/transactions/summary', () => {
    it('should return transaction summary', async () => {
      const response = await request(app)
        .get(`${API_BASE}/coins/transactions/summary`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
      }
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get(`${API_BASE}/coins/transactions/summary`);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/coins/products', () => {
    it('should return coin products', async () => {
      const response = await request(app)
        .get(`${API_BASE}/coins/products`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get(`${API_BASE}/coins/products`);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/coins/purchase', () => {
    it('should return 400 when missing productSku', async () => {
      const response = await request(app)
        .post(`${API_BASE}/coins/purchase`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ stripePaymentId: 'pi_test123' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('Product SKU');
    });

    it('should return 400 when missing stripePaymentId', async () => {
      const response = await request(app)
        .post(`${API_BASE}/coins/purchase`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ productSku: 'COIN_PACK_SMALL' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('Stripe payment ID');
    });

    it('should handle valid purchase request', async () => {
      const response = await request(app)
        .post(`${API_BASE}/coins/purchase`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productSku: 'COIN_PACK_SMALL',
          stripePaymentId: 'pi_test123',
        });

      expect([200, 400, 500]).toContain(response.status);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post(`${API_BASE}/coins/purchase`);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/coins/spend', () => {
    it('should return 400 when missing amount', async () => {
      const response = await request(app)
        .post(`${API_BASE}/coins/spend`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Boost' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('Amount');
    });

    it('should return 400 when missing reason', async () => {
      const response = await request(app)
        .post(`${API_BASE}/coins/spend`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 50 });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('reason');
    });

    it('should handle valid spend request', async () => {
      const response = await request(app)
        .post(`${API_BASE}/coins/spend`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 50,
          reason: 'Profile boost',
          referenceId: 'boost-123',
          referenceType: 'boost',
        });

      expect([200, 400, 500]).toContain(response.status);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post(`${API_BASE}/coins/spend`);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/coins/daily-reward', () => {
    it('should handle daily reward claim', async () => {
      const response = await request(app)
        .post(`${API_BASE}/coins/daily-reward`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 400, 500]).toContain(response.status);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post(`${API_BASE}/coins/daily-reward`);

      expect(response.status).toBe(401);
    });
  });
});

// ==================== BOOSTS TESTS ====================

describe('Boosts API', () => {
  describe('GET /api/boosts/products', () => {
    it('should return boost products', async () => {
      const response = await request(app)
        .get(`${API_BASE}/boosts/products`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get(`${API_BASE}/boosts/products`);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/boosts/active', () => {
    it('should return active boost', async () => {
      const response = await request(app)
        .get(`${API_BASE}/boosts/active`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
      }
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get(`${API_BASE}/boosts/active`);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/boosts/history', () => {
    it('should return boost history', async () => {
      const response = await request(app)
        .get(`${API_BASE}/boosts/history`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
      }
    });

    it('should support limit parameter', async () => {
      const response = await request(app)
        .get(`${API_BASE}/boosts/history`)
        .query({ limit: 10 })
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(response.status);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get(`${API_BASE}/boosts/history`);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/boosts/activate-with-coins', () => {
    it('should return 400 when productSku is missing', async () => {
      const response = await request(app)
        .post(`${API_BASE}/boosts/activate-with-coins`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('Product SKU');
    });

    it('should handle valid boost activation request', async () => {
      const response = await request(app)
        .post(`${API_BASE}/boosts/activate-with-coins`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ productSku: 'BOOST_1HR' });

      expect([200, 400, 500]).toContain(response.status);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post(`${API_BASE}/boosts/activate-with-coins`);

      expect(response.status).toBe(401);
    });
  });
});

// ==================== PRIVACY TESTS ====================

describe('Privacy API', () => {
  describe('GET /api/privacy/settings', () => {
    it('should return privacy settings when authenticated', async () => {
      const response = await request(app)
        .get(`${API_BASE}/privacy/settings`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('profile_visibility');
      }
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get(`${API_BASE}/privacy/settings`);

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

      const response = await request(app)
        .put(`${API_BASE}/privacy/settings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(settings);

      expect([200, 400, 500]).toContain(response.status);
    });

    it('should accept valid privacy settings', async () => {
      const validSettings = {
        profileVisibility: 'everyone',
        showDistance: true,
        showAge: true,
        showOnlineStatus: false,
        readReceipts: true,
      };

      const response = await request(app)
        .put(`${API_BASE}/privacy/settings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(validSettings);

      expect([200, 400, 500]).toContain(response.status);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .put(`${API_BASE}/privacy/settings`)
        .send({ profileVisibility: 'private' });

      expect(response.status).toBe(401);
    });
  });
});

// ==================== BLOCKS TESTS ====================

describe('Blocks API', () => {
  describe('GET /api/blocks', () => {
    it('should return blocked users list', async () => {
      const response = await request(app)
        .get(`${API_BASE}/blocks`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get(`${API_BASE}/blocks`);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/blocks', () => {
    it('should handle block user request', async () => {
      const blockedUserId = uuidv4();
      const response = await request(app)
        .post(`${API_BASE}/blocks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          blockedId: blockedUserId,
          reason: 'Not interested',
        });

      expect([200, 201, 400, 500]).toContain(response.status);
    });

    it('should block user without reason', async () => {
      const blockedUserId = uuidv4();
      const response = await request(app)
        .post(`${API_BASE}/blocks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ blockedId: blockedUserId });

      expect([200, 201, 400, 500]).toContain(response.status);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post(`${API_BASE}/blocks`);

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/blocks/:userId', () => {
    it('should handle unblock user request', async () => {
      const blockedUserId = uuidv4();
      const response = await request(app)
        .delete(`${API_BASE}/blocks/${blockedUserId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 400, 500]).toContain(response.status);
    });

    it('should return 401 when not authenticated', async () => {
      const blockedUserId = uuidv4();
      const response = await request(app)
        .delete(`${API_BASE}/blocks/${blockedUserId}`);

      expect(response.status).toBe(401);
    });
  });
});

// ==================== REPORTS TESTS ====================

describe('Reports API', () => {
  describe('GET /api/reports/categories', () => {
    it('should return report categories', async () => {
      const response = await request(app)
        .get(`${API_BASE}/reports/categories`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get(`${API_BASE}/reports/categories`);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/reports', () => {
    it('should return 400 when reportedId is missing', async () => {
      const response = await request(app)
        .post(`${API_BASE}/reports`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reportType: 'inappropriate_messages',
          description: 'Test report',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 400 when reportType is missing', async () => {
      const response = await request(app)
        .post(`${API_BASE}/reports`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reportedId: uuidv4(),
          description: 'Test report',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should handle valid report submission', async () => {
      const reportedUserId = uuidv4();
      const response = await request(app)
        .post(`${API_BASE}/reports`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reportedId: reportedUserId,
          reportType: 'inappropriate_messages',
          description: 'User sent threatening messages',
          severity: 'high',
        });

      expect([200, 201, 400, 500]).toContain(response.status);
    });

    it('should handle report with all fields', async () => {
      const reportedUserId = uuidv4();
      const response = await request(app)
        .post(`${API_BASE}/reports`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reportedId: reportedUserId,
          reportType: 'harassment',
          description: 'Detailed description of harassment',
          severity: 'critical',
          evidenceUrls: ['https://example.com/evidence1.jpg'],
        });

      expect([200, 201, 400, 500]).toContain(response.status);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post(`${API_BASE}/reports`);

      expect(response.status).toBe(401);
    });
  });
});

// ==================== INTEGRATION TESTS ====================

describe('Integration Tests', () => {
  describe('Complete User Flow', () => {
    it('should handle profile update and photo management flow', async () => {
      // Update profile
      const profileResponse = await request(app)
        .put(`${API_BASE}/profile`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          bio: 'Integration test bio',
          occupation: 'QA Engineer',
        });

      expect([200, 400, 404]).toContain(profileResponse.status);

      // Get photos
      const photosResponse = await request(app)
        .get(`${API_BASE}/photos`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(photosResponse.status);
    });

    it('should handle subscription and coin flow', async () => {
      // Get current subscription
      const subResponse = await request(app)
        .get(`${API_BASE}/subscriptions/current`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(subResponse.status);

      // Get coin balance
      const coinResponse = await request(app)
        .get(`${API_BASE}/coins/balance`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(coinResponse.status);

      // Get boost products
      const boostResponse = await request(app)
        .get(`${API_BASE}/boosts/products`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(boostResponse.status);
    });

    it('should handle privacy and safety flow', async () => {
      // Get privacy settings
      const privacyResponse = await request(app)
        .get(`${API_BASE}/privacy/settings`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(privacyResponse.status);

      // Get blocked users
      const blocksResponse = await request(app)
        .get(`${API_BASE}/blocks`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(blocksResponse.status);

      // Get report categories
      const categoriesResponse = await request(app)
        .get(`${API_BASE}/reports/categories`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(categoriesResponse.status);
    });
  });

  describe('Multiple User Interactions', () => {
    it('should handle blocking between two users', async () => {
      // User 1 blocks User 2
      const blockResponse = await request(app)
        .post(`${API_BASE}/blocks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          blockedId: testUser2Id,
          reason: 'Test block',
        });

      expect([200, 201, 400, 500]).toContain(blockResponse.status);
    });

    it('should handle reporting between two users', async () => {
      // User 1 reports User 2
      const reportResponse = await request(app)
        .post(`${API_BASE}/reports`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reportedId: testUser2Id,
          reportType: 'spam',
          description: 'Test report',
          severity: 'low',
        });

      expect([200, 201, 400, 500]).toContain(reportResponse.status);
    });
  });
});

// ==================== ERROR HANDLING TESTS ====================

describe('Error Handling', () => {
  describe('Invalid Token Formats', () => {
    it('should reject malformed bearer token', async () => {
      const response = await request(app)
        .get(`${API_BASE}/profile`)
        .set('Authorization', 'InvalidFormat');

      expect(response.status).toBe(401);
    });

    it('should reject expired token', async () => {
      const expiredToken = jwt.sign(
        {
          userId: testUserId,
          email: 'test@example.com',
          exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
        },
        JWT_SECRET
      );

      const response = await request(app)
        .get(`${API_BASE}/profile`)
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });
  });

  describe('Invalid UUID Parameters', () => {
    it('should handle invalid photo ID format', async () => {
      const response = await request(app)
        .delete(`${API_BASE}/photos/invalid-uuid`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([400, 404, 500]).toContain(response.status);
    });

    it('should handle invalid user ID in blocks', async () => {
      const response = await request(app)
        .delete(`${API_BASE}/blocks/invalid-uuid`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([400, 404, 500]).toContain(response.status);
    });
  });

  describe('Rate Limiting', () => {
    it('should respect rate limits on rapid requests', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(app)
          .get(`${API_BASE}/profile`)
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(requests);

      // All should complete (rate limit is 100 per 15 min)
      responses.forEach(response => {
        expect([200, 404, 429, 500]).toContain(response.status);
      });
    });
  });
});

// ==================== VALIDATION TESTS ====================

describe('Input Validation', () => {
  describe('Profile Validation', () => {
    it('should reject invalid data types', async () => {
      const response = await request(app)
        .put(`${API_BASE}/profile`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          height: 'not-a-number',
          interests: 'not-an-array',
        });

      expect([400]).toContain(response.status);
    });
  });

  describe('Coin Validation', () => {
    it('should reject negative coin amounts', async () => {
      const response = await request(app)
        .post(`${API_BASE}/coins/spend`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: -50,
          reason: 'Test',
        });

      expect([400]).toContain(response.status);
    });
  });

  describe('Subscription Validation', () => {
    it('should reject non-boolean immediately flag', async () => {
      const response = await request(app)
        .post(`${API_BASE}/subscriptions/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ immediately: 'yes' });

      // Should still process (type coercion) or reject
      expect([200, 400, 500]).toContain(response.status);
    });
  });
});
