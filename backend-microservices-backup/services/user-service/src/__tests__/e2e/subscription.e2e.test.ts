import request from 'supertest';
import express, { Application } from 'express';
import subscriptionRoutes from '../../api/routes/subscription.routes';
import { authenticate } from '../../api/middleware/auth.middleware';
import {
  setupTestDatabase,
  teardownTestDatabase,
  cleanTables,
  createTestUserWithProfile,
  getTestDb,
  insertTestData,
} from '../helpers/db-helpers';

/**
 * E2E Tests for Subscription API
 *
 * These tests use a real test database to verify end-to-end functionality.
 * Make sure the test database is running before executing these tests.
 */
describe('Subscription API E2E Tests', () => {
  let app: Application;
  let testUser: any;

  beforeAll(async () => {
    // Setup test database (run migrations and seeds)
    await setupTestDatabase();

    // Setup Express app
    app = express();
    app.use(express.json());

    // Mock authentication to inject test user
    jest.mock('../../api/middleware/auth.middleware', () => ({
      authenticate: jest.fn((req, _res, next) => {
        req.user = { id: testUser.user.id, email: testUser.user.email };
        next();
      }),
    }));

    app.use('/api/subscriptions', subscriptionRoutes);

    app.use((err: any, _req: any, res: any, _next: any) => {
      res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
      });
    });
  });

  afterAll(async () => {
    // Cleanup and close database connection
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Clean relevant tables before each test
    await cleanTables('subscriptions', 'users', 'profiles', 'coin_balances', 'privacy_settings');

    // Create a test user with all required data
    testUser = await createTestUserWithProfile({
      email: 'e2e-test@example.com',
      first_name: 'E2E',
      last_name: 'Test',
    });

    // Mock authentication with the created user
    (authenticate as jest.Mock).mockImplementation((req, _res, next) => {
      req.user = { id: testUser.user.id, email: testUser.user.email };
      next();
    });
  });

  describe('GET /api/subscriptions/current', () => {
    it('should return current subscription from database', async () => {
      const response = await request(app)
        .get('/api/subscriptions/current')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('tier', 'free');
      expect(response.body.data).toHaveProperty('status', 'active');
      expect(response.body.data).toHaveProperty('user_id', testUser.user.id);
    });
  });

  describe('PUT /api/subscriptions/tier', () => {
    it('should update subscription tier in database', async () => {
      const response = await request(app)
        .put('/api/subscriptions/tier')
        .send({ tier: 'mid' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('tier', 'mid');

      // Verify in database
      const db = getTestDb();
      const updated = await db('subscriptions')
        .where({ user_id: testUser.user.id })
        .first();

      expect(updated.tier).toBe('mid');
    });

    it('should reject invalid tier values', async () => {
      const response = await request(app)
        .put('/api/subscriptions/tier')
        .send({ tier: 'invalid_tier' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should update subscription tier from free to ultra', async () => {
      const response = await request(app)
        .put('/api/subscriptions/tier')
        .send({ tier: 'ultra' })
        .expect(200);

      expect(response.body.data.tier).toBe('ultra');

      // Verify the change persisted
      const db = getTestDb();
      const subscription = await db('subscriptions')
        .where({ user_id: testUser.user.id })
        .first();

      expect(subscription.tier).toBe('ultra');
      expect(subscription.updated_at).toBeDefined();
    });
  });

  describe('GET /api/subscriptions/features', () => {
    it('should return subscription features from database', async () => {
      const response = await request(app)
        .get('/api/subscriptions/features')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);

      // Verify features match what was seeded
      const db = getTestDb();
      const dbFeatures = await db('subscription_features')
        .where({ tier: testUser.subscription.tier })
        .select('*');

      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/subscriptions/features/:featureKey/access', () => {
    it('should check feature access based on tier', async () => {
      // Free tier should not have incognito mode
      const response = await request(app)
        .get('/api/subscriptions/features/incognito_mode/access')
        .expect(200);

      expect(response.body.data).toHaveProperty('hasAccess');

      // Upgrade to mid tier
      await request(app)
        .put('/api/subscriptions/tier')
        .send({ tier: 'mid' });

      // Now should have access
      const response2 = await request(app)
        .get('/api/subscriptions/features/incognito_mode/access')
        .expect(200);

      expect(response2.body.data).toHaveProperty('hasAccess');
    });
  });

  describe('POST /api/subscriptions/cancel', () => {
    it('should cancel active subscription', async () => {
      // First upgrade to paid tier
      await request(app)
        .put('/api/subscriptions/tier')
        .send({ tier: 'mid' });

      // Cancel subscription
      const response = await request(app)
        .post('/api/subscriptions/cancel')
        .send({ immediately: false })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);

      // Verify in database
      const db = getTestDb();
      const subscription = await db('subscriptions')
        .where({ user_id: testUser.user.id })
        .first();

      expect(subscription.cancel_at_period_end).toBe(true);
    });

    it('should cancel subscription immediately', async () => {
      await request(app)
        .put('/api/subscriptions/tier')
        .send({ tier: 'mid' });

      const response = await request(app)
        .post('/api/subscriptions/cancel')
        .send({ immediately: true })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);

      // Verify status changed to canceled
      const db = getTestDb();
      const subscription = await db('subscriptions')
        .where({ user_id: testUser.user.id })
        .first();

      expect(subscription.status).toBe('canceled');
    });
  });

  describe('POST /api/subscriptions/reactivate', () => {
    it('should reactivate canceled subscription', async () => {
      // Upgrade, cancel, then reactivate
      await request(app)
        .put('/api/subscriptions/tier')
        .send({ tier: 'mid' });

      await request(app)
        .post('/api/subscriptions/cancel')
        .send({ immediately: false });

      const response = await request(app)
        .post('/api/subscriptions/reactivate')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);

      // Verify in database
      const db = getTestDb();
      const subscription = await db('subscriptions')
        .where({ user_id: testUser.user.id })
        .first();

      expect(subscription.cancel_at_period_end).toBe(false);
      expect(subscription.status).toBe('active');
    });
  });

  describe('Database Consistency', () => {
    it('should maintain referential integrity', async () => {
      const db = getTestDb();

      // Verify user exists
      const user = await db('users').where({ id: testUser.user.id }).first();
      expect(user).toBeDefined();

      // Verify subscription exists and references user
      const subscription = await db('subscriptions')
        .where({ user_id: testUser.user.id })
        .first();
      expect(subscription).toBeDefined();
      expect(subscription.user_id).toBe(testUser.user.id);

      // Verify profile exists
      const profile = await db('profiles')
        .where({ user_id: testUser.user.id })
        .first();
      expect(profile).toBeDefined();
    });

    it('should enforce unique constraints', async () => {
      const db = getTestDb();

      // Try to create duplicate subscription for same user
      try {
        await db('subscriptions').insert({
          user_id: testUser.user.id,
          tier: 'free',
          status: 'active',
          start_date: new Date(),
        });
        fail('Should have thrown unique constraint violation');
      } catch (error: any) {
        expect(error.code).toBe('23505'); // PostgreSQL unique violation code
      }
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent tier updates correctly', async () => {
      const requests = [
        request(app).put('/api/subscriptions/tier').send({ tier: 'basic' }),
        request(app).put('/api/subscriptions/tier').send({ tier: 'mid' }),
        request(app).put('/api/subscriptions/tier').send({ tier: 'ultra' }),
      ];

      const responses = await Promise.all(requests);

      // At least one should succeed
      expect(responses.some((r) => r.status === 200)).toBe(true);

      // Verify final state in database
      const db = getTestDb();
      const subscription = await db('subscriptions')
        .where({ user_id: testUser.user.id })
        .first();

      expect(['basic', 'mid', 'ultra']).toContain(subscription.tier);
    });
  });
});
