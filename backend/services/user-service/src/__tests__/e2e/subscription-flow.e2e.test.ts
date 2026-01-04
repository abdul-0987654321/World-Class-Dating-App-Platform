/**
 * Subscription Flow E2E Tests
 *
 * Tests the complete subscription upgrade flow including:
 * - Free to Premium upgrade
 * - Payment processing integration
 * - Tier changes and downgrades
 * - Subscription lifecycle management
 *
 * These tests require a running test database.
 */

import request from 'supertest';
import express, { Application } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  setupTestDatabase,
  teardownTestDatabase,
  cleanTables,
  createTestUserWithProfile,
  getTestDb,
} from '../helpers/db-helpers';
import { authenticate } from '../../api/middleware/auth.middleware';

// Mock Stripe for testing
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    customers: {
      create: jest.fn().mockResolvedValue({ id: 'cus_test123' }),
      retrieve: jest.fn().mockResolvedValue({ id: 'cus_test123', email: 'test@example.com' }),
    },
    subscriptions: {
      create: jest.fn().mockResolvedValue({
        id: 'sub_test123',
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        items: { data: [{ id: 'si_test123', price: { id: 'price_test123' } }] },
      }),
      retrieve: jest.fn().mockResolvedValue({
        id: 'sub_test123',
        status: 'active',
        items: { data: [{ id: 'si_test123' }] },
      }),
      update: jest.fn().mockResolvedValue({
        id: 'sub_test123',
        status: 'active',
        cancel_at_period_end: false,
      }),
      cancel: jest.fn().mockResolvedValue({
        id: 'sub_test123',
        status: 'canceled',
      }),
    },
    paymentMethods: {
      attach: jest.fn().mockResolvedValue({ id: 'pm_test123' }),
    },
    paymentIntents: {
      create: jest.fn().mockResolvedValue({
        id: 'pi_test123',
        client_secret: 'pi_test123_secret',
        status: 'requires_payment_method',
      }),
    },
  }));
});

describe('Subscription Flow E2E Tests', () => {
  let app: Application;
  let testUser: any;

  beforeAll(async () => {
    await setupTestDatabase();

    app = express();
    app.use(express.json());

    // Mock authentication middleware
    jest.mock('../../api/middleware/auth.middleware', () => ({
      authenticate: jest.fn((req: any, _res: any, next: any) => {
        req.user = { id: testUser?.user?.id, email: testUser?.user?.email };
        next();
      }),
    }));

    // Import routes
    const subscriptionRoutes = (await import('../../api/routes/subscription.routes')).default;
    app.use('/api/subscriptions', subscriptionRoutes);

    app.use((err: any, _req: any, res: any, _next: any) => {
      res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
      });
    });
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanTables(
      'subscriptions',
      'users',
      'profiles',
      'coin_balances',
      'privacy_settings'
    );

    testUser = await createTestUserWithProfile({
      email: `test-${uuidv4().slice(0, 8)}@example.com`,
      first_name: 'Subscription',
      last_name: 'Test',
    });

    (authenticate as jest.Mock).mockImplementation((req, _res, next) => {
      req.user = { id: testUser.user.id, email: testUser.user.email };
      next();
    });
  });

  describe('GET /api/subscriptions/plans', () => {
    it('should return all available subscription plans', async () => {
      const response = await request(app)
        .get('/api/subscriptions/plans')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);

      // Verify plan structure
      const plans = response.body.data;
      expect(plans.length).toBeGreaterThan(0);

      const premiumPlan = plans.find((p: any) => p.tier === 'premium');
      expect(premiumPlan).toBeDefined();
      expect(premiumPlan).toHaveProperty('price');
      expect(premiumPlan).toHaveProperty('features');
    });

    it('should include different billing cycles', async () => {
      const response = await request(app)
        .get('/api/subscriptions/plans')
        .expect(200);

      const plans = response.body.data;
      const billingCycles = [...new Set(plans.map((p: any) => p.billing_cycle))];

      expect(billingCycles).toContain('monthly');
      expect(billingCycles.length).toBeGreaterThan(1);
    });
  });

  describe('Free to Premium Upgrade', () => {
    it('should upgrade from free to basic tier', async () => {
      // Verify starting at free tier
      const initialResponse = await request(app)
        .get('/api/subscriptions/current')
        .expect(200);

      expect(initialResponse.body.data.tier).toBe('free');

      // Upgrade to basic
      const upgradeResponse = await request(app)
        .put('/api/subscriptions/tier')
        .send({ tier: 'basic' })
        .expect(200);

      expect(upgradeResponse.body).toHaveProperty('success', true);
      expect(upgradeResponse.body.data.tier).toBe('basic');

      // Verify in database
      const db = getTestDb();
      const subscription = await db('subscriptions')
        .where({ user_id: testUser.user.id })
        .first();

      expect(subscription.tier).toBe('basic');
      expect(subscription.status).toBe('active');
    });

    it('should upgrade from free to premium tier', async () => {
      const response = await request(app)
        .put('/api/subscriptions/tier')
        .send({ tier: 'premium' })
        .expect(200);

      expect(response.body.data.tier).toBe('premium');

      // Verify features are unlocked
      const featuresResponse = await request(app)
        .get('/api/subscriptions/features')
        .expect(200);

      const incognitoFeature = featuresResponse.body.data.find(
        (f: any) => f.key === 'incognito_mode'
      );
      expect(incognitoFeature).toBeDefined();
    });

    it('should upgrade from free to elite tier', async () => {
      const response = await request(app)
        .put('/api/subscriptions/tier')
        .send({ tier: 'elite' })
        .expect(200);

      expect(response.body.data.tier).toBe('elite');
    });

    it('should record subscription history on upgrade', async () => {
      await request(app)
        .put('/api/subscriptions/tier')
        .send({ tier: 'premium' })
        .expect(200);

      const db = getTestDb();
      const subscription = await db('subscriptions')
        .where({ user_id: testUser.user.id })
        .first();

      expect(subscription.updated_at).toBeDefined();
    });
  });

  describe('Tier Changes', () => {
    beforeEach(async () => {
      // Start with premium tier
      await request(app)
        .put('/api/subscriptions/tier')
        .send({ tier: 'premium' });
    });

    it('should allow upgrading to higher tier', async () => {
      const response = await request(app)
        .put('/api/subscriptions/tier')
        .send({ tier: 'elite' })
        .expect(200);

      expect(response.body.data.tier).toBe('elite');
    });

    it('should allow downgrading to lower tier', async () => {
      const response = await request(app)
        .put('/api/subscriptions/tier')
        .send({ tier: 'basic' })
        .expect(200);

      expect(response.body.data.tier).toBe('basic');
    });

    it('should handle downgrade at period end', async () => {
      // Request downgrade at period end
      const response = await request(app)
        .post('/api/subscriptions/downgrade')
        .send({ tier: 'free', at_period_end: true })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);

      const db = getTestDb();
      const subscription = await db('subscriptions')
        .where({ user_id: testUser.user.id })
        .first();

      expect(subscription.tier).toBe('premium'); // Still premium until period end
    });
  });

  describe('Payment Processing Integration', () => {
    it('should create payment intent for subscription upgrade', async () => {
      const response = await request(app)
        .post('/api/subscriptions/create-payment-intent')
        .send({
          tier: 'premium',
          billing_cycle: 'monthly',
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('client_secret');
    });

    it('should process successful payment webhook', async () => {
      // Simulate Stripe webhook for successful payment
      const webhookPayload = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test123',
            metadata: {
              userId: testUser.user.id,
              tier: 'premium',
            },
          },
        },
      };

      const response = await request(app)
        .post('/api/subscriptions/webhook')
        .set('stripe-signature', 'test-signature')
        .send(webhookPayload)
        .expect(200);

      expect(response.body).toHaveProperty('received', true);
    });

    it('should handle failed payment', async () => {
      const webhookPayload = {
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_test123',
            metadata: {
              userId: testUser.user.id,
            },
          },
        },
      };

      const response = await request(app)
        .post('/api/subscriptions/webhook')
        .set('stripe-signature', 'test-signature')
        .send(webhookPayload)
        .expect(200);

      // User should remain on free tier
      const currentSub = await request(app)
        .get('/api/subscriptions/current')
        .expect(200);

      expect(currentSub.body.data.tier).toBe('free');
    });
  });

  describe('Subscription Cancellation', () => {
    beforeEach(async () => {
      // Start with premium tier
      await request(app)
        .put('/api/subscriptions/tier')
        .send({ tier: 'premium' });
    });

    it('should cancel subscription immediately', async () => {
      const response = await request(app)
        .post('/api/subscriptions/cancel')
        .send({ immediately: true })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);

      const db = getTestDb();
      const subscription = await db('subscriptions')
        .where({ user_id: testUser.user.id })
        .first();

      expect(subscription.status).toBe('canceled');
    });

    it('should cancel subscription at period end', async () => {
      const response = await request(app)
        .post('/api/subscriptions/cancel')
        .send({ immediately: false })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);

      const db = getTestDb();
      const subscription = await db('subscriptions')
        .where({ user_id: testUser.user.id })
        .first();

      expect(subscription.cancel_at_period_end).toBe(true);
      expect(subscription.status).toBe('active'); // Still active until period end
    });

    it('should reactivate canceled subscription', async () => {
      // Cancel first
      await request(app)
        .post('/api/subscriptions/cancel')
        .send({ immediately: false });

      // Reactivate
      const response = await request(app)
        .post('/api/subscriptions/reactivate')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);

      const db = getTestDb();
      const subscription = await db('subscriptions')
        .where({ user_id: testUser.user.id })
        .first();

      expect(subscription.cancel_at_period_end).toBe(false);
      expect(subscription.status).toBe('active');
    });
  });

  describe('Feature Access by Tier', () => {
    it('should allow access to free tier features', async () => {
      const response = await request(app)
        .get('/api/subscriptions/features/daily_swipes_limit/access')
        .expect(200);

      expect(response.body.data).toHaveProperty('hasAccess', true);
      expect(response.body.data).toHaveProperty('value');
    });

    it('should restrict premium features for free users', async () => {
      const response = await request(app)
        .get('/api/subscriptions/features/incognito_mode/access')
        .expect(200);

      // Free users should not have access
      expect(response.body.data.hasAccess).toBe(false);
    });

    it('should grant premium features after upgrade', async () => {
      // Upgrade to premium
      await request(app)
        .put('/api/subscriptions/tier')
        .send({ tier: 'premium' });

      const response = await request(app)
        .get('/api/subscriptions/features/incognito_mode/access')
        .expect(200);

      expect(response.body.data.hasAccess).toBe(true);
    });

    it('should revoke features after downgrade', async () => {
      // Upgrade to premium
      await request(app)
        .put('/api/subscriptions/tier')
        .send({ tier: 'premium' });

      // Verify premium feature access
      let response = await request(app)
        .get('/api/subscriptions/features/unlimited_likes/access')
        .expect(200);
      expect(response.body.data.hasAccess).toBe(true);

      // Downgrade to free
      await request(app)
        .put('/api/subscriptions/tier')
        .send({ tier: 'free' });

      // Verify feature revoked
      response = await request(app)
        .get('/api/subscriptions/features/unlimited_likes/access')
        .expect(200);
      expect(response.body.data.hasAccess).toBe(false);
    });
  });

  describe('Grace Period Handling', () => {
    it('should enter grace period on payment failure', async () => {
      // Set up premium subscription
      await request(app)
        .put('/api/subscriptions/tier')
        .send({ tier: 'premium' });

      // Simulate payment failure webhook
      const webhookPayload = {
        type: 'invoice.payment_failed',
        data: {
          object: {
            customer: 'cus_test123',
            subscription: 'sub_test123',
          },
        },
      };

      await request(app)
        .post('/api/subscriptions/webhook')
        .set('stripe-signature', 'test-signature')
        .send(webhookPayload)
        .expect(200);

      const db = getTestDb();
      const subscription = await db('subscriptions')
        .where({ user_id: testUser.user.id })
        .first();

      expect(['grace_period', 'past_due']).toContain(subscription.status);
    });

    it('should maintain feature access during grace period', async () => {
      // Set premium with grace period status
      const db = getTestDb();
      await db('subscriptions')
        .where({ user_id: testUser.user.id })
        .update({
          tier: 'premium',
          status: 'grace_period',
        });

      const response = await request(app)
        .get('/api/subscriptions/features/unlimited_likes/access')
        .expect(200);

      // Should still have access during grace period
      expect(response.body.data.hasAccess).toBe(true);
    });
  });

  describe('Subscription Billing History', () => {
    it('should return billing history', async () => {
      const response = await request(app)
        .get('/api/subscriptions/billing-history')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Proration and Credits', () => {
    it('should calculate proration on mid-cycle upgrade', async () => {
      // Start with basic
      await request(app)
        .put('/api/subscriptions/tier')
        .send({ tier: 'basic' });

      // Upgrade to premium mid-cycle
      const response = await request(app)
        .post('/api/subscriptions/preview-upgrade')
        .send({ tier: 'premium' })
        .expect(200);

      expect(response.body.data).toHaveProperty('prorated_amount');
      expect(response.body.data.prorated_amount).toBeGreaterThan(0);
    });
  });

  describe('Validation', () => {
    it('should reject invalid tier', async () => {
      const response = await request(app)
        .put('/api/subscriptions/tier')
        .send({ tier: 'invalid_tier' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should require authentication', async () => {
      (authenticate as jest.Mock).mockImplementation((_req, res, _next) => {
        res.status(401).json({ success: false, message: 'Unauthorized' });
      });

      await request(app)
        .get('/api/subscriptions/current')
        .expect(401);
    });
  });
});
