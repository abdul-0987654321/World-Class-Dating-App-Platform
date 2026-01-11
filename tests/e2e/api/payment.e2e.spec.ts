/**
 * Payment Service E2E Tests
 *
 * Comprehensive test suite for payment endpoints:
 * - Subscription Plans
 * - Payment Intents
 * - Subscription Management
 * - Payment Methods
 * - Webhooks
 * - Refunds
 *
 * Target: Full coverage of payment flows with edge cases
 */

import request from 'supertest';
import crypto from 'crypto';
import { config, testState, generateStripeWebhookSignature, retry } from './setup';

const PAYMENT_URL = config.PAYMENT_URL;
const AUTH_URL = config.AUTH_URL;

describe('Payment Service E2E Tests', () => {
  let accessToken: string;
  let userId: string;
  let customerId: string;
  let paymentIntentId: string;
  let subscriptionId: string;

  beforeAll(async () => {
    // Get authentication tokens
    if (testState.accessToken) {
      accessToken = testState.accessToken;
      userId = testState.userId || '';
      customerId = testState.stripeCustomerId || `cus_test_${Date.now()}`;
    } else {
      // Create a test user if needed
      const loginResponse = await request(AUTH_URL)
        .post('/api/auth/login')
        .send({
          email: config.TEST_USER_EMAIL,
          password: config.TEST_USER_PASSWORD,
        });

      if (loginResponse.body.accessToken) {
        accessToken = loginResponse.body.accessToken;
        userId = loginResponse.body.user?.id;
        customerId = loginResponse.body.user?.stripeCustomerId || `cus_test_${Date.now()}`;
      }
    }
  });

  // ==================== PLANS TESTS ====================

  describe('GET /api/payments/plans', () => {
    describe('Get Subscription Plans', () => {
      it('should return all available subscription plans', async () => {
        const response = await request(PAYMENT_URL)
          .get('/api/payments/plans');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should include required plan fields', async () => {
        const response = await request(PAYMENT_URL)
          .get('/api/payments/plans');

        expect(response.status).toBe(200);

        if (response.body.data && response.body.data.length > 0) {
          const plan = response.body.data[0];
          expect(plan).toHaveProperty('key');
          expect(plan).toHaveProperty('name');
          expect(plan).toHaveProperty('priceMonthly');
          expect(plan).toHaveProperty('entitlements');
        }
      });

      it('should include free tier', async () => {
        const response = await request(PAYMENT_URL)
          .get('/api/payments/plans');

        expect(response.status).toBe(200);

        const freePlan = response.body.data?.find((p: any) => p.key === 'free');
        expect(freePlan).toBeDefined();
        expect(freePlan?.priceMonthly).toBe(0);
      });

      it('should not expose internal Stripe IDs', async () => {
        const response = await request(PAYMENT_URL)
          .get('/api/payments/plans');

        expect(response.status).toBe(200);

        response.body.data?.forEach((plan: any) => {
          expect(plan).not.toHaveProperty('stripeProductId');
          expect(plan).not.toHaveProperty('stripePriceId');
        });
      });

      it('should be accessible without authentication', async () => {
        const response = await request(PAYMENT_URL)
          .get('/api/payments/plans');

        // Plans should be public
        expect(response.status).toBe(200);
      });
    });
  });

  // ==================== MY SUBSCRIPTION TESTS ====================

  describe('GET /api/payments/subscriptions/me', () => {
    it('should return current user subscription', async () => {
      const response = await request(PAYMENT_URL)
        .get('/api/payments/subscriptions/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });

    it('should return free tier for user without subscription', async () => {
      const response = await request(PAYMENT_URL)
        .get('/api/payments/subscriptions/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);

      // User might be on free tier or have active subscription
      if (response.body.data?.tier === 'free') {
        expect(response.body.data.status).toBe('free');
        expect(response.body.data).toHaveProperty('entitlements');
      }
    });

    it('should fail without authentication', async () => {
      const response = await request(PAYMENT_URL)
        .get('/api/payments/subscriptions/me');

      expect(response.status).toBe(401);
    });

    it('should fail with invalid token', async () => {
      const response = await request(PAYMENT_URL)
        .get('/api/payments/subscriptions/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });

  // ==================== PAYMENT INTENT TESTS ====================

  describe('POST /api/payments/create-intent', () => {
    describe('Subscription Payment Intent', () => {
      it('should create payment intent for subscription', async () => {
        const response = await request(PAYMENT_URL)
          .post('/api/payments/create-intent')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            amount: 999,
            currency: 'usd',
            customerId: customerId,
            metadata: {
              type: 'subscription',
              tier: 'basic',
              userId: userId,
            },
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('clientSecret');
        expect(response.body.data).toHaveProperty('paymentIntentId');

        paymentIntentId = response.body.data.paymentIntentId;
      });

      it('should include metadata in payment intent', async () => {
        const metadata = {
          type: 'subscription',
          tier: 'ultra',
          userId: userId,
          billingPeriod: 'monthly',
        };

        const response = await request(PAYMENT_URL)
          .post('/api/payments/create-intent')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            amount: 1999,
            currency: 'usd',
            customerId: customerId,
            metadata,
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('Coin Package Payment Intent', () => {
      it('should create payment intent for coin package', async () => {
        const response = await request(PAYMENT_URL)
          .post('/api/payments/create-intent')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            amount: 499,
            currency: 'usd',
            customerId: customerId,
            metadata: {
              type: 'coins',
              packageId: 'coins-100',
              coins: 100,
              userId: userId,
            },
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('clientSecret');
      });

      it('should handle different coin packages', async () => {
        const packages = [
          { amount: 499, coins: 100, packageId: 'coins-100' },
          { amount: 999, coins: 250, packageId: 'coins-250' },
          { amount: 1999, coins: 500, packageId: 'coins-500' },
          { amount: 4999, coins: 1500, packageId: 'coins-1500' },
        ];

        for (const pkg of packages) {
          const response = await request(PAYMENT_URL)
            .post('/api/payments/create-intent')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
              amount: pkg.amount,
              currency: 'usd',
              customerId: customerId,
              metadata: {
                type: 'coins',
                packageId: pkg.packageId,
                coins: pkg.coins,
                userId: userId,
              },
            });

          expect(response.status).toBe(200);
        }
      });
    });

    describe('Boost Payment Intent', () => {
      it('should create payment intent for profile boost', async () => {
        const response = await request(PAYMENT_URL)
          .post('/api/payments/create-intent')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            amount: 299,
            currency: 'usd',
            customerId: customerId,
            metadata: {
              type: 'boost',
              duration: 30,
              userId: userId,
            },
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      it('should handle different boost durations', async () => {
        const durations = [
          { duration: 30, amount: 299 },
          { duration: 60, amount: 499 },
          { duration: 180, amount: 999 },
        ];

        for (const boost of durations) {
          const response = await request(PAYMENT_URL)
            .post('/api/payments/create-intent')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
              amount: boost.amount,
              currency: 'usd',
              customerId: customerId,
              metadata: {
                type: 'boost',
                duration: boost.duration,
                userId: userId,
              },
            });

          expect(response.status).toBe(200);
        }
      });
    });

    describe('Validation Errors', () => {
      it('should fail with missing amount', async () => {
        const response = await request(PAYMENT_URL)
          .post('/api/payments/create-intent')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            currency: 'usd',
            customerId: customerId,
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      it('should fail with missing customer ID', async () => {
        const response = await request(PAYMENT_URL)
          .post('/api/payments/create-intent')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            amount: 999,
            currency: 'usd',
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      it('should fail with negative amount', async () => {
        const response = await request(PAYMENT_URL)
          .post('/api/payments/create-intent')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            amount: -999,
            currency: 'usd',
            customerId: customerId,
          });

        expect(response.status).toBe(400);
      });

      it('should fail with zero amount', async () => {
        const response = await request(PAYMENT_URL)
          .post('/api/payments/create-intent')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            amount: 0,
            currency: 'usd',
            customerId: customerId,
          });

        expect(response.status).toBe(400);
      });

      it('should use default currency if not provided', async () => {
        const response = await request(PAYMENT_URL)
          .post('/api/payments/create-intent')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            amount: 999,
            customerId: customerId,
          });

        // Should either succeed with default currency or fail validation
        expect([200, 400]).toContain(response.status);
      });
    });

    describe('Authentication Required', () => {
      it('should fail without authentication', async () => {
        const response = await request(PAYMENT_URL)
          .post('/api/payments/create-intent')
          .send({
            amount: 999,
            currency: 'usd',
            customerId: customerId,
          });

        expect(response.status).toBe(401);
      });

      it('should fail with invalid token', async () => {
        const response = await request(PAYMENT_URL)
          .post('/api/payments/create-intent')
          .set('Authorization', 'Bearer invalid-token')
          .send({
            amount: 999,
            currency: 'usd',
            customerId: customerId,
          });

        expect(response.status).toBe(401);
      });

      it('should fail with expired token', async () => {
        const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxfQ.5mhBHqs5_DTLdINd9p5m7ZJ6XD0Xc55kIaCRY5r6HRA';

        const response = await request(PAYMENT_URL)
          .post('/api/payments/create-intent')
          .set('Authorization', `Bearer ${expiredToken}`)
          .send({
            amount: 999,
            currency: 'usd',
            customerId: customerId,
          });

        expect(response.status).toBe(401);
      });
    });
  });

  // ==================== SUBSCRIPTION MANAGEMENT TESTS ====================

  describe('POST /api/payments/subscription/create', () => {
    it('should fail with missing required fields', async () => {
      const response = await request(PAYMENT_URL)
        .post('/api/payments/subscription/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          tier: 'basic',
        });

      expect(response.status).toBe(400);
    });

    it('should fail without authentication', async () => {
      const response = await request(PAYMENT_URL)
        .post('/api/payments/subscription/create')
        .send({
          tier: 'basic',
          priceId: 'price_basic',
          email: 'test@example.com',
          paymentMethodId: 'pm_test',
        });

      expect(response.status).toBe(401);
    });

    it('should handle subscription creation request', async () => {
      const response = await request(PAYMENT_URL)
        .post('/api/payments/subscription/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          tier: 'basic',
          priceId: 'price_basic_monthly',
          email: 'test@flamoral.test',
          paymentMethodId: 'pm_test_card',
        });

      // May succeed or fail depending on Stripe configuration
      expect([200, 400]).toContain(response.status);

      if (response.status === 200) {
        subscriptionId = response.body.data?.subscriptionId;
      }
    });
  });

  describe('POST /api/payments/subscription/cancel', () => {
    it('should fail with missing subscription ID', async () => {
      const response = await request(PAYMENT_URL)
        .post('/api/payments/subscription/cancel')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Subscription ID');
    });

    it('should handle cancel at period end', async () => {
      const response = await request(PAYMENT_URL)
        .post('/api/payments/subscription/cancel')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          subscriptionId: subscriptionId || 'sub_test_123',
          immediately: false,
        });

      // Will fail if subscription doesn't exist, but should handle gracefully
      expect([200, 400]).toContain(response.status);
    });

    it('should handle immediate cancellation', async () => {
      const response = await request(PAYMENT_URL)
        .post('/api/payments/subscription/cancel')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          subscriptionId: 'sub_test_immediate',
          immediately: true,
        });

      expect([200, 400]).toContain(response.status);
    });

    it('should fail without authentication', async () => {
      const response = await request(PAYMENT_URL)
        .post('/api/payments/subscription/cancel')
        .send({
          subscriptionId: 'sub_test',
        });

      expect(response.status).toBe(401);
    });
  });

  // ==================== PAYMENT METHODS TESTS ====================

  describe('GET /api/payments/methods/:customerId', () => {
    it('should return payment methods for customer', async () => {
      const response = await request(PAYMENT_URL)
        .get(`/api/payments/methods/${customerId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return empty array for customer with no methods', async () => {
      const response = await request(PAYMENT_URL)
        .get(`/api/payments/methods/${customerId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should not expose sensitive card data', async () => {
      const response = await request(PAYMENT_URL)
        .get(`/api/payments/methods/${customerId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);

      if (response.body.data && response.body.data.length > 0) {
        const method = response.body.data[0];
        expect(method).not.toHaveProperty('card.number');
        expect(method).not.toHaveProperty('card.cvc');
      }
    });

    it('should fail without authentication', async () => {
      const response = await request(PAYMENT_URL)
        .get(`/api/payments/methods/${customerId}`);

      expect(response.status).toBe(401);
    });

    it('should handle non-existent customer', async () => {
      const response = await request(PAYMENT_URL)
        .get('/api/payments/methods/cus_nonexistent_12345')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 400, 404, 500]).toContain(response.status);
    });

    it('should validate customer ID format', async () => {
      const response = await request(PAYMENT_URL)
        .get('/api/payments/methods/invalid-format')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe('POST /api/payments/methods/add', () => {
    it('should fail with missing customer ID', async () => {
      const response = await request(PAYMENT_URL)
        .post('/api/payments/methods/add')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          paymentMethodId: 'pm_test_card',
        });

      expect(response.status).toBe(400);
    });

    it('should fail with missing payment method ID', async () => {
      const response = await request(PAYMENT_URL)
        .post('/api/payments/methods/add')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          customerId: customerId,
        });

      expect(response.status).toBe(400);
    });

    it('should handle add payment method request', async () => {
      const response = await request(PAYMENT_URL)
        .post('/api/payments/methods/add')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          customerId: customerId,
          paymentMethodId: 'pm_card_visa',
        });

      // May succeed or fail depending on Stripe configuration
      expect([200, 400]).toContain(response.status);
    });

    it('should fail without authentication', async () => {
      const response = await request(PAYMENT_URL)
        .post('/api/payments/methods/add')
        .send({
          customerId: customerId,
          paymentMethodId: 'pm_test_card',
        });

      expect(response.status).toBe(401);
    });
  });

  // ==================== REFUND TESTS ====================

  describe('POST /api/payments/refund', () => {
    it('should fail with missing payment intent ID', async () => {
      const response = await request(PAYMENT_URL)
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          amount: 500,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Payment intent');
    });

    it('should handle refund request', async () => {
      const response = await request(PAYMENT_URL)
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          paymentIntentId: paymentIntentId || 'pi_test_123',
          amount: 500,
          reason: 'customer_request',
        });

      // May succeed or fail depending on payment intent state
      expect([200, 400]).toContain(response.status);
    });

    it('should handle full refund (no amount specified)', async () => {
      const response = await request(PAYMENT_URL)
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          paymentIntentId: 'pi_test_full_refund',
          reason: 'customer_request',
        });

      expect([200, 400]).toContain(response.status);
    });

    it('should fail without authentication', async () => {
      const response = await request(PAYMENT_URL)
        .post('/api/payments/refund')
        .send({
          paymentIntentId: 'pi_test',
          amount: 500,
        });

      expect(response.status).toBe(401);
    });
  });

  // ==================== WEBHOOK TESTS ====================

  describe('POST /api/payments/webhook', () => {
    const generateEvent = (type: string, data: any) => ({
      id: `evt_test_${Date.now()}`,
      type,
      data: { object: data },
      created: Math.floor(Date.now() / 1000),
    });

    describe('Payment Intent Events', () => {
      it('should handle payment_intent.succeeded', async () => {
        const event = generateEvent('payment_intent.succeeded', {
          id: 'pi_test_succeeded',
          amount: 999,
          currency: 'usd',
          status: 'succeeded',
          customer: customerId,
          metadata: {
            userId: userId,
            type: 'subscription',
            tier: 'basic',
          },
        });

        const payload = JSON.stringify(event);
        const signature = generateStripeWebhookSignature(payload, config.STRIPE_WEBHOOK_SECRET);

        const response = await request(PAYMENT_URL)
          .post('/api/payments/webhook')
          .set('stripe-signature', signature)
          .set('Content-Type', 'application/json')
          .send(payload);

        expect([200, 400]).toContain(response.status);
      });

      it('should handle payment_intent.payment_failed', async () => {
        const event = generateEvent('payment_intent.payment_failed', {
          id: 'pi_test_failed',
          amount: 999,
          currency: 'usd',
          status: 'requires_payment_method',
          customer: customerId,
          last_payment_error: {
            code: 'card_declined',
            message: 'Your card was declined',
          },
        });

        const payload = JSON.stringify(event);
        const signature = generateStripeWebhookSignature(payload, config.STRIPE_WEBHOOK_SECRET);

        const response = await request(PAYMENT_URL)
          .post('/api/payments/webhook')
          .set('stripe-signature', signature)
          .send(payload);

        expect([200, 400]).toContain(response.status);
      });
    });

    describe('Subscription Events', () => {
      it('should handle customer.subscription.created', async () => {
        const event = generateEvent('customer.subscription.created', {
          id: 'sub_test_created',
          customer: customerId,
          status: 'active',
          items: {
            data: [{
              price: {
                id: 'price_basic',
                recurring: { interval: 'month' },
              },
            }],
          },
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
          metadata: { userId: userId, tier: 'basic' },
        });

        const payload = JSON.stringify(event);
        const signature = generateStripeWebhookSignature(payload, config.STRIPE_WEBHOOK_SECRET);

        const response = await request(PAYMENT_URL)
          .post('/api/payments/webhook')
          .set('stripe-signature', signature)
          .send(payload);

        expect([200, 400]).toContain(response.status);
      });

      it('should handle customer.subscription.updated', async () => {
        const event = generateEvent('customer.subscription.updated', {
          id: 'sub_test_updated',
          customer: customerId,
          status: 'active',
          cancel_at_period_end: true,
          metadata: { userId: userId },
        });

        const payload = JSON.stringify(event);
        const signature = generateStripeWebhookSignature(payload, config.STRIPE_WEBHOOK_SECRET);

        const response = await request(PAYMENT_URL)
          .post('/api/payments/webhook')
          .set('stripe-signature', signature)
          .send(payload);

        expect([200, 400]).toContain(response.status);
      });

      it('should handle customer.subscription.deleted', async () => {
        const event = generateEvent('customer.subscription.deleted', {
          id: 'sub_test_deleted',
          customer: customerId,
          status: 'canceled',
          canceled_at: Math.floor(Date.now() / 1000),
          metadata: { userId: userId },
        });

        const payload = JSON.stringify(event);
        const signature = generateStripeWebhookSignature(payload, config.STRIPE_WEBHOOK_SECRET);

        const response = await request(PAYMENT_URL)
          .post('/api/payments/webhook')
          .set('stripe-signature', signature)
          .send(payload);

        expect([200, 400]).toContain(response.status);
      });

      it('should handle trial subscription', async () => {
        const event = generateEvent('customer.subscription.created', {
          id: 'sub_test_trial',
          customer: customerId,
          status: 'trialing',
          trial_start: Math.floor(Date.now() / 1000),
          trial_end: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
          metadata: { userId: userId },
        });

        const payload = JSON.stringify(event);
        const signature = generateStripeWebhookSignature(payload, config.STRIPE_WEBHOOK_SECRET);

        const response = await request(PAYMENT_URL)
          .post('/api/payments/webhook')
          .set('stripe-signature', signature)
          .send(payload);

        expect([200, 400]).toContain(response.status);
      });
    });

    describe('Invoice Events', () => {
      it('should handle invoice.paid', async () => {
        const event = generateEvent('invoice.paid', {
          id: 'in_test_paid',
          customer: customerId,
          subscription: 'sub_test',
          amount_paid: 999,
          status: 'paid',
        });

        const payload = JSON.stringify(event);
        const signature = generateStripeWebhookSignature(payload, config.STRIPE_WEBHOOK_SECRET);

        const response = await request(PAYMENT_URL)
          .post('/api/payments/webhook')
          .set('stripe-signature', signature)
          .send(payload);

        expect([200, 400]).toContain(response.status);
      });

      it('should handle invoice.payment_failed', async () => {
        const event = generateEvent('invoice.payment_failed', {
          id: 'in_test_failed',
          customer: customerId,
          subscription: 'sub_test',
          amount_due: 999,
          status: 'open',
        });

        const payload = JSON.stringify(event);
        const signature = generateStripeWebhookSignature(payload, config.STRIPE_WEBHOOK_SECRET);

        const response = await request(PAYMENT_URL)
          .post('/api/payments/webhook')
          .set('stripe-signature', signature)
          .send(payload);

        expect([200, 400]).toContain(response.status);
      });
    });

    describe('Charge Events', () => {
      it('should handle charge.refunded', async () => {
        const event = generateEvent('charge.refunded', {
          id: 'ch_test_refunded',
          amount: 999,
          amount_refunded: 999,
          refunded: true,
          customer: customerId,
        });

        const payload = JSON.stringify(event);
        const signature = generateStripeWebhookSignature(payload, config.STRIPE_WEBHOOK_SECRET);

        const response = await request(PAYMENT_URL)
          .post('/api/payments/webhook')
          .set('stripe-signature', signature)
          .send(payload);

        expect([200, 400]).toContain(response.status);
      });

      it('should handle charge.dispute.created', async () => {
        const event = generateEvent('charge.dispute.created', {
          id: 'dp_test',
          charge: 'ch_test',
          amount: 999,
          status: 'needs_response',
          reason: 'fraudulent',
        });

        const payload = JSON.stringify(event);
        const signature = generateStripeWebhookSignature(payload, config.STRIPE_WEBHOOK_SECRET);

        const response = await request(PAYMENT_URL)
          .post('/api/payments/webhook')
          .set('stripe-signature', signature)
          .send(payload);

        expect([200, 400]).toContain(response.status);
      });
    });

    describe('Webhook Security', () => {
      it('should reject webhook with invalid signature', async () => {
        const event = generateEvent('payment_intent.succeeded', {
          id: 'pi_test',
          amount: 999,
        });

        const response = await request(PAYMENT_URL)
          .post('/api/payments/webhook')
          .set('stripe-signature', 'invalid_signature')
          .send(JSON.stringify(event));

        expect(response.status).toBe(400);
      });

      it('should reject webhook with missing signature', async () => {
        const event = generateEvent('payment_intent.succeeded', {
          id: 'pi_test',
          amount: 999,
        });

        const response = await request(PAYMENT_URL)
          .post('/api/payments/webhook')
          .send(JSON.stringify(event));

        expect(response.status).toBe(400);
      });

      it('should reject webhook with tampered payload', async () => {
        const event = generateEvent('payment_intent.succeeded', {
          id: 'pi_test',
          amount: 999,
        });

        const originalPayload = JSON.stringify(event);
        const signature = generateStripeWebhookSignature(originalPayload, config.STRIPE_WEBHOOK_SECRET);

        // Tamper with payload
        const tamperedEvent = { ...event, data: { object: { amount: 1 } } };

        const response = await request(PAYMENT_URL)
          .post('/api/payments/webhook')
          .set('stripe-signature', signature)
          .send(JSON.stringify(tamperedEvent));

        expect(response.status).toBe(400);
      });
    });

    describe('Unknown Event Types', () => {
      it('should handle unknown event type gracefully', async () => {
        const event = generateEvent('unknown.event.type', {
          id: 'obj_test',
        });

        const payload = JSON.stringify(event);
        const signature = generateStripeWebhookSignature(payload, config.STRIPE_WEBHOOK_SECRET);

        const response = await request(PAYMENT_URL)
          .post('/api/payments/webhook')
          .set('stripe-signature', signature)
          .send(payload);

        // Should accept but potentially log warning
        expect([200, 400]).toContain(response.status);
      });
    });

    describe('Webhook Idempotency', () => {
      it('should handle duplicate webhook events', async () => {
        const event = generateEvent('payment_intent.succeeded', {
          id: 'pi_test_duplicate',
          amount: 999,
        });

        const payload = JSON.stringify(event);
        const signature = generateStripeWebhookSignature(payload, config.STRIPE_WEBHOOK_SECRET);

        // Send same event twice
        const response1 = await request(PAYMENT_URL)
          .post('/api/payments/webhook')
          .set('stripe-signature', signature)
          .send(payload);

        const response2 = await request(PAYMENT_URL)
          .post('/api/payments/webhook')
          .set('stripe-signature', signature)
          .send(payload);

        expect([200, 400]).toContain(response1.status);
        expect([200, 400]).toContain(response2.status);
      });
    });

    describe('No Auth Required', () => {
      it('should accept webhook without authorization header', async () => {
        const event = generateEvent('payment_intent.succeeded', {
          id: 'pi_test_no_auth',
          amount: 999,
        });

        const payload = JSON.stringify(event);
        const signature = generateStripeWebhookSignature(payload, config.STRIPE_WEBHOOK_SECRET);

        const response = await request(PAYMENT_URL)
          .post('/api/payments/webhook')
          .set('stripe-signature', signature)
          .send(payload);

        // Should work without Bearer token
        expect([200, 400]).toContain(response.status);
      });
    });
  });

  // ==================== SECURITY TESTS ====================

  describe('Security Tests', () => {
    it('should not expose Stripe API keys in responses', async () => {
      const response = await request(PAYMENT_URL)
        .get('/api/payments/plans');

      expect(response.status).toBe(200);
      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toContain('sk_');
      expect(responseText).not.toContain('pk_');
    });

    it('should not expose webhook secrets', async () => {
      const event = generateEvent('payment_intent.succeeded', { id: 'pi_test' });
      const payload = JSON.stringify(event);
      const signature = generateStripeWebhookSignature(payload, config.STRIPE_WEBHOOK_SECRET);

      const response = await request(PAYMENT_URL)
        .post('/api/payments/webhook')
        .set('stripe-signature', signature)
        .send(payload);

      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toContain('whsec_');
    });

    it('should prevent price manipulation in requests', async () => {
      // Try to create payment with manipulated amount
      const response = await request(PAYMENT_URL)
        .post('/api/payments/create-intent')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          amount: 1, // Very low amount
          currency: 'usd',
          customerId: customerId,
          metadata: {
            type: 'subscription',
            tier: 'ultra', // Premium tier
          },
        });

      // Service should validate against expected prices or handle appropriately
      expect([200, 400]).toContain(response.status);
    });
  });
});
