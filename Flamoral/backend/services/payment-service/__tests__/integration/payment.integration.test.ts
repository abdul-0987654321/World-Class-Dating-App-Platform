/// <reference types="jest" />
import request from 'supertest';
import { Express } from 'express';
import { Pool } from 'pg';
import Stripe from 'stripe';

/**
 * Payment Service Integration Tests
 * Tests subscriptions, payments, Stripe integration
 *
 * TODO: Complete integration test setup
 * - Initialize Express app with payment service routes
 * - Set up Stripe test environment with test API keys
 * - Configure database connection and test data
 * - Set up authentication middleware
 * - Implement complete test suite for payment features
 */

describe.skip('Payment Service - Integration Tests', () => {
  let app: Express;
  let dbPool: Pool;
  let stripe: Stripe;
  let authToken: string;
  let userId: string;

  const testUser = {
    email: 'payment@example.com',
    password: 'Test123!@#',
    firstName: 'Payment',
    lastName: 'User',
    dateOfBirth: '1990-01-01',
    gender: 'male'
  };

  beforeAll(async () => {
    // TODO: Initialize Express app with routes
    // app = createApp(); // or import app from '../src/app'

    dbPool = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: '2024-12-18.acacia',
    });

    // Create test user
    const user = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    authToken = user.body.accessToken;
    userId = user.body.user.id;
  });

  afterAll(async () => {
    await dbPool.query('DELETE FROM users WHERE email = $1', [testUser.email]);
    await dbPool.end();
  });

  describe('GET /api/payments/subscription-plans', () => {
    it('should get all subscription plans', async () => {
      const response = await request(app)
        .get('/api/payments/subscription-plans')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('plans');
      expect(Array.isArray(response.body.plans)).toBe(true);
      expect(response.body.plans.length).toBeGreaterThan(0);

      // Verify plan structure
      const plan = response.body.plans[0];
      expect(plan).toHaveProperty('id');
      expect(plan).toHaveProperty('name');
      expect(plan).toHaveProperty('price');
      expect(plan).toHaveProperty('currency');
      expect(plan).toHaveProperty('features');
      expect(plan).toHaveProperty('billingPeriod');
    });

    it('should include pricing for different durations', async () => {
      const response = await request(app)
        .get('/api/payments/subscription-plans')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const premiumPlans = response.body.plans.filter(
        (p: any) => p.tier === 'premium'
      );

      // Should have monthly, 3-month, 6-month options
      expect(premiumPlans.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('POST /api/payments/create-payment-intent', () => {
    it('should create payment intent for subscription', async () => {
      const paymentData = {
        planId: 'premium-monthly',
        paymentMethod: 'card'
      };

      const response = await request(app)
        .post('/api/payments/create-payment-intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(200);

      expect(response.body).toHaveProperty('clientSecret');
      expect(response.body).toHaveProperty('paymentIntentId');

      // Verify with Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(
        response.body.paymentIntentId
      );
      expect(paymentIntent).toBeTruthy();
      expect(paymentIntent.status).toBe('requires_payment_method');
    });

    it('should validate plan ID', async () => {
      await request(app)
        .post('/api/payments/create-payment-intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          planId: 'invalid-plan-id',
          paymentMethod: 'card'
        })
        .expect(400);
    });

    it('should apply promotional pricing', async () => {
      // Create promo code
      const promoCode = 'SAVE20';

      const response = await request(app)
        .post('/api/payments/create-payment-intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          planId: 'premium-monthly',
          paymentMethod: 'card',
          promoCode
        })
        .expect(200);

      expect(response.body).toHaveProperty('discountApplied');
      expect(response.body.discountAmount).toBeGreaterThan(0);
    });
  });

  describe('POST /api/payments/subscribe', () => {
    let paymentMethodId: string;

    beforeEach(async () => {
      // Create test payment method
      const paymentMethod = await stripe.paymentMethods.create({
        type: 'card',
        card: {
          token: 'tok_visa' // Stripe test token
        }
      });
      paymentMethodId = paymentMethod.id;
    });

    it('should create subscription successfully', async () => {
      const subscriptionData = {
        planId: 'premium-monthly',
        paymentMethodId
      };

      const response = await request(app)
        .post('/api/payments/subscribe')
        .set('Authorization', `Bearer ${authToken}`)
        .send(subscriptionData)
        .expect(201);

      expect(response.body).toHaveProperty('subscriptionId');
      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('active');

      // Verify in database
      const subscription = await dbPool.query(
        'SELECT * FROM subscriptions WHERE user_id = $1',
        [userId]
      );
      expect(subscription.rows).toHaveLength(1);
      expect(subscription.rows[0].status).toBe('active');

      // Verify user has premium features
      const user = await dbPool.query(
        'SELECT is_premium FROM users WHERE id = $1',
        [userId]
      );
      expect(user.rows[0].is_premium).toBe(true);
    });

    it('should handle payment failure', async () => {
      // Use card that will be declined
      const declinedCard = await stripe.paymentMethods.create({
        type: 'card',
        card: {
          token: 'tok_chargeDeclined'
        }
      });

      const response = await request(app)
        .post('/api/payments/subscribe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          planId: 'premium-monthly',
          paymentMethodId: declinedCard.id
        })
        .expect(402);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('declined');
    });

    it('should not allow duplicate active subscriptions', async () => {
      // Create first subscription
      await request(app)
        .post('/api/payments/subscribe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          planId: 'premium-monthly',
          paymentMethodId
        });

      // Attempt to create second subscription
      const response = await request(app)
        .post('/api/payments/subscribe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          planId: 'premium-6month',
          paymentMethodId
        })
        .expect(409);

      expect(response.body.error).toContain('active subscription');
    });

    it('should save payment method for future use', async () => {
      await request(app)
        .post('/api/payments/subscribe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          planId: 'premium-monthly',
          paymentMethodId,
          savePaymentMethod: true
        });

      const savedMethods = await dbPool.query(
        'SELECT * FROM payment_methods WHERE user_id = $1',
        [userId]
      );

      expect(savedMethods.rows.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/payments/cancel-subscription', () => {
    let subscriptionId: string;

    beforeEach(async () => {
      // Create a subscription
      const paymentMethod = await stripe.paymentMethods.create({
        type: 'card',
        card: { token: 'tok_visa' }
      });

      const response = await request(app)
        .post('/api/payments/subscribe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          planId: 'premium-monthly',
          paymentMethodId: paymentMethod.id
        });

      subscriptionId = response.body.subscriptionId;
    });

    it('should cancel subscription immediately', async () => {
      const response = await request(app)
        .post('/api/payments/cancel-subscription')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          subscriptionId,
          cancelImmediately: true
        })
        .expect(200);

      expect(response.body.message).toContain('cancelled');

      // Verify in database
      const subscription = await dbPool.query(
        'SELECT status FROM subscriptions WHERE id = $1',
        [subscriptionId]
      );
      expect(subscription.rows[0].status).toBe('cancelled');

      // Verify Stripe subscription
      const stripeSubscription = await stripe.subscriptions.retrieve(
        subscriptionId
      );
      expect(stripeSubscription.status).toBe('canceled');
    });

    it('should cancel at period end', async () => {
      const response = await request(app)
        .post('/api/payments/cancel-subscription')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          subscriptionId,
          cancelImmediately: false
        })
        .expect(200);

      expect(response.body.message).toContain('end of billing period');

      // Subscription should still be active
      const subscription = await dbPool.query(
        'SELECT status, cancel_at_period_end FROM subscriptions WHERE id = $1',
        [subscriptionId]
      );
      expect(subscription.rows[0].status).toBe('active');
      expect(subscription.rows[0].cancel_at_period_end).toBe(true);
    });

    it('should require reason for cancellation', async () => {
      const response = await request(app)
        .post('/api/payments/cancel-subscription')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          subscriptionId,
          reason: 'too_expensive',
          feedback: 'I found it too costly'
        })
        .expect(200);

      // Verify feedback is stored
      const cancellation = await dbPool.query(
        'SELECT cancellation_reason, cancellation_feedback FROM subscriptions WHERE id = $1',
        [subscriptionId]
      );
      expect(cancellation.rows[0].cancellation_reason).toBe('too_expensive');
    });
  });

  describe('POST /api/payments/purchase-coins', () => {
    it('should purchase coin package', async () => {
      const coinPurchase = {
        packageId: 'coins-100',
        paymentMethodId: 'pm_test_visa'
      };

      const response = await request(app)
        .post('/api/payments/purchase-coins')
        .set('Authorization', `Bearer ${authToken}`)
        .send(coinPurchase)
        .expect(200);

      expect(response.body).toHaveProperty('transactionId');
      expect(response.body).toHaveProperty('coinsAdded');

      // Verify coins added to user account
      const user = await dbPool.query(
        'SELECT coin_balance FROM users WHERE id = $1',
        [userId]
      );
      expect(user.rows[0].coin_balance).toBeGreaterThanOrEqual(100);

      // Verify transaction recorded
      const transaction = await dbPool.query(
        'SELECT * FROM transactions WHERE id = $1',
        [response.body.transactionId]
      );
      expect(transaction.rows).toHaveLength(1);
      expect(transaction.rows[0].type).toBe('coin_purchase');
    });

    it('should apply bonus coins for larger packages', async () => {
      const largePurchase = {
        packageId: 'coins-1000', // Larger package should have bonus
        paymentMethodId: 'pm_test_visa'
      };

      const response = await request(app)
        .post('/api/payments/purchase-coins')
        .set('Authorization', `Bearer ${authToken}`)
        .send(largePurchase)
        .expect(200);

      // Should get more than 1000 coins due to bonus
      expect(response.body.coinsAdded).toBeGreaterThan(1000);
      expect(response.body).toHaveProperty('bonusCoins');
    });

    it('should validate package ID', async () => {
      await request(app)
        .post('/api/payments/purchase-coins')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          packageId: 'invalid-package',
          paymentMethodId: 'pm_test_visa'
        })
        .expect(400);
    });
  });

  describe('POST /api/payments/boost-profile', () => {
    it('should purchase profile boost with coins', async () => {
      // Add coins to user account
      await dbPool.query(
        'UPDATE users SET coin_balance = 100 WHERE id = $1',
        [userId]
      );

      const response = await request(app)
        .post('/api/payments/boost-profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          duration: 30, // 30 minutes
          paymentMethod: 'coins'
        })
        .expect(200);

      expect(response.body).toHaveProperty('boostId');
      expect(response.body).toHaveProperty('expiresAt');

      // Verify coins deducted
      const user = await dbPool.query(
        'SELECT coin_balance FROM users WHERE id = $1',
        [userId]
      );
      expect(user.rows[0].coin_balance).toBeLessThan(100);

      // Verify boost is active
      const boost = await dbPool.query(
        'SELECT * FROM profile_boosts WHERE user_id = $1 AND active = true',
        [userId]
      );
      expect(boost.rows).toHaveLength(1);
    });

    it('should reject boost if insufficient coins', async () => {
      // Set low coin balance
      await dbPool.query(
        'UPDATE users SET coin_balance = 5 WHERE id = $1',
        [userId]
      );

      await request(app)
        .post('/api/payments/boost-profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          duration: 30,
          paymentMethod: 'coins'
        })
        .expect(402);
    });

    it('should purchase boost with payment method', async () => {
      const response = await request(app)
        .post('/api/payments/boost-profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          duration: 60,
          paymentMethod: 'card',
          paymentMethodId: 'pm_test_visa'
        })
        .expect(200);

      expect(response.body).toHaveProperty('boostId');
    });
  });

  describe('GET /api/payments/transaction-history', () => {
    beforeEach(async () => {
      // Create some test transactions
      await dbPool.query(
        `INSERT INTO transactions (user_id, type, amount, currency, status, created_at)
         VALUES ($1, 'subscription', 9.99, 'USD', 'completed', NOW()),
                ($1, 'coin_purchase', 4.99, 'USD', 'completed', NOW() - INTERVAL '1 day'),
                ($1, 'boost', 2.99, 'USD', 'completed', NOW() - INTERVAL '2 days')`,
        [userId]
      );
    });

    it('should get transaction history', async () => {
      const response = await request(app)
        .get('/api/payments/transaction-history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('transactions');
      expect(Array.isArray(response.body.transactions)).toBe(true);
      expect(response.body.transactions.length).toBeGreaterThan(0);

      // Verify transaction structure
      const transaction = response.body.transactions[0];
      expect(transaction).toHaveProperty('id');
      expect(transaction).toHaveProperty('type');
      expect(transaction).toHaveProperty('amount');
      expect(transaction).toHaveProperty('currency');
      expect(transaction).toHaveProperty('status');
      expect(transaction).toHaveProperty('createdAt');
    });

    it('should filter by transaction type', async () => {
      const response = await request(app)
        .get('/api/payments/transaction-history')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ type: 'coin_purchase' })
        .expect(200);

      response.body.transactions.forEach((t: any) => {
        expect(t.type).toBe('coin_purchase');
      });
    });

    it('should support pagination', async () => {
      const page1 = await request(app)
        .get('/api/payments/transaction-history')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 2, offset: 0 })
        .expect(200);

      expect(page1.body.transactions).toHaveLength(2);
      expect(page1.body).toHaveProperty('total');
    });

    it('should order by date descending', async () => {
      const response = await request(app)
        .get('/api/payments/transaction-history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const dates = response.body.transactions.map(
        (t: any) => new Date(t.createdAt).getTime()
      );

      for (let i = 1; i < dates.length; i++) {
        expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
      }
    });
  });

  describe('POST /api/payments/webhook', () => {
    it('should handle subscription created webhook', async () => {
      const event = {
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_test123',
            customer: 'cus_test123',
            status: 'active',
            current_period_end: Date.now() / 1000 + 30 * 24 * 60 * 60
          }
        }
      };

      const signature = stripe.webhooks.generateTestHeaderString({
        payload: JSON.stringify(event),
        secret: process.env.STRIPE_WEBHOOK_SECRET as string
      });

      const response = await request(app)
        .post('/api/payments/webhook')
        .set('stripe-signature', signature)
        .send(event)
        .expect(200);

      expect(response.body.received).toBe(true);
    });

    it('should handle payment failed webhook', async () => {
      const event = {
        type: 'invoice.payment_failed',
        data: {
          object: {
            customer: 'cus_test123',
            subscription: 'sub_test123',
            amount_due: 999
          }
        }
      };

      const signature = stripe.webhooks.generateTestHeaderString({
        payload: JSON.stringify(event),
        secret: process.env.STRIPE_WEBHOOK_SECRET as string
      });

      await request(app)
        .post('/api/payments/webhook')
        .set('stripe-signature', signature)
        .send(event)
        .expect(200);

      // Should send notification to user about failed payment
    });

    it('should reject webhook with invalid signature', async () => {
      const event = {
        type: 'customer.subscription.created',
        data: { object: {} }
      };

      await request(app)
        .post('/api/payments/webhook')
        .set('stripe-signature', 'invalid-signature')
        .send(event)
        .expect(400);
    });
  });

  describe('Refund Handling', () => {
    let transactionId: string;

    beforeEach(async () => {
      const transaction = await dbPool.query(
        `INSERT INTO transactions (user_id, type, amount, currency, status, stripe_payment_intent_id)
         VALUES ($1, 'subscription', 9.99, 'USD', 'completed', 'pi_test123')
         RETURNING id`,
        [userId]
      );
      transactionId = transaction.rows[0].id;
    });

    it('should process refund request', async () => {
      const response = await request(app)
        .post('/api/payments/request-refund')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          transactionId,
          reason: 'Service not as expected'
        })
        .expect(200);

      expect(response.body.message).toContain('refund request');

      // Verify refund request in database
      const refund = await dbPool.query(
        'SELECT * FROM refund_requests WHERE transaction_id = $1',
        [transactionId]
      );
      expect(refund.rows).toHaveLength(1);
    });

    it('should only allow refunds within 14 days', async () => {
      // Update transaction to be older
      await dbPool.query(
        'UPDATE transactions SET created_at = NOW() - INTERVAL \'15 days\' WHERE id = $1',
        [transactionId]
      );

      await request(app)
        .post('/api/payments/request-refund')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          transactionId,
          reason: 'Too late'
        })
        .expect(400);
    });
  });

  describe('Security Tests', () => {
    it('should not expose sensitive payment information', async () => {
      const response = await request(app)
        .get('/api/payments/transaction-history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.transactions.forEach((t: any) => {
        expect(t).not.toHaveProperty('stripe_secret');
        expect(t).not.toHaveProperty('payment_method_details');
      });
    });

    it('should validate Stripe webhook signatures', async () => {
      const fakeEvent = {
        type: 'payment_intent.succeeded',
        data: { object: { amount: 999999 } }
      };

      await request(app)
        .post('/api/payments/webhook')
        .send(fakeEvent)
        .expect(400);
    });

    it('should prevent price manipulation', async () => {
      const maliciousRequest = {
        planId: 'premium-monthly',
        paymentMethodId: 'pm_test',
        customAmount: 0.01 // Attempting to pay less
      };

      const response = await request(app)
        .post('/api/payments/subscribe')
        .set('Authorization', `Bearer ${authToken}`)
        .send(maliciousRequest)
        .expect(201);

      // Should charge the correct amount, not the custom amount
      expect(response.body.amountCharged).toBeGreaterThan(0.01);
    });
  });
});
