/**
 * Integration tests for Payments and Subscriptions
 * Tests Stripe payments, Apple IAP, Google Play billing, and subscription management
 */

import { ApiClient, createApiClient } from '../helpers/api-client';
import { DatabaseHelper, getDatabaseHelper } from '../helpers/database';
import { faker } from '@faker-js/faker';

describe('Payments and Subscriptions Integration Tests', () => {
  let paymentApiClient: ApiClient;
  let authApiClient: ApiClient;
  let dbHelper: DatabaseHelper;

  const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3006';
  const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

  beforeAll(async () => {
    paymentApiClient = createApiClient(PAYMENT_SERVICE_URL);
    authApiClient = createApiClient(AUTH_SERVICE_URL);
    dbHelper = getDatabaseHelper();
  });

  beforeEach(async () => {
    await dbHelper.clearAll();
  });

  const createAuthenticatedUser = async () => {
    const userData = {
      email: faker.internet.email().toLowerCase(),
      password: 'SecurePass123!',
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      dateOfBirth: '1995-05-15',
      gender: 'male',
    };

    const response = await authApiClient.post('/api/v1/auth/register', userData);
    return response.body.data;
  };

  describe('Stripe Payment Integration', () => {
    it('should create Stripe payment intent', async () => {
      const { user, accessToken } = await createAuthenticatedUser();
      paymentApiClient.setAuthToken(accessToken);

      const response = await paymentApiClient.post('/api/v1/payments/create-intent', {
        amount: 999, // $9.99
        currency: 'usd',
        productType: 'subscription',
        planId: 'premium_monthly',
      });

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        clientSecret: expect.any(String),
        paymentIntentId: expect.any(String),
        amount: 999,
      });
    });

    it('should process successful Stripe payment', async () => {
      const { user, accessToken } = await createAuthenticatedUser();
      paymentApiClient.setAuthToken(accessToken);

      // Create payment intent
      const intentResponse = await paymentApiClient.post('/api/v1/payments/create-intent', {
        amount: 999,
        currency: 'usd',
        productType: 'subscription',
        planId: 'premium_monthly',
      });

      const paymentIntentId = intentResponse.body.data.paymentIntentId;

      // Simulate successful payment (in test environment)
      const confirmResponse = await paymentApiClient.post('/api/v1/payments/confirm', {
        paymentIntentId,
        paymentMethodId: 'pm_card_visa', // Test payment method
      });

      expect(confirmResponse.status).toBe(200);
      expect(confirmResponse.body.data.status).toBe('succeeded');

      // Verify payment record in database
      const knex = dbHelper.getKnex();
      const payment = await knex('payments')
        .where({ stripe_payment_intent_id: paymentIntentId })
        .first();

      expect(payment).toBeDefined();
      expect(payment.status).toBe('completed');
      expect(payment.user_id).toBe(user.id);
    });

    it('should handle failed Stripe payment', async () => {
      const { accessToken } = await createAuthenticatedUser();
      paymentApiClient.setAuthToken(accessToken);

      const intentResponse = await paymentApiClient.post('/api/v1/payments/create-intent', {
        amount: 999,
        currency: 'usd',
        productType: 'subscription',
        planId: 'premium_monthly',
      });

      const paymentIntentId = intentResponse.body.data.paymentIntentId;

      // Simulate failed payment
      const confirmResponse = await paymentApiClient.post('/api/v1/payments/confirm', {
        paymentIntentId,
        paymentMethodId: 'pm_card_chargeDeclined', // Test decline
      });

      expect(confirmResponse.status).toBe(402);
      expect(confirmResponse.body.error).toMatch(/declined|failed/i);
    });

    it('should handle Stripe webhook events', async () => {
      const webhookData = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            amount: 999,
            customer: 'cus_test_123',
            metadata: {
              userId: 'user_123',
              planId: 'premium_monthly',
            },
          },
        },
      };

      // Simulate Stripe webhook
      const response = await paymentApiClient.post(
        '/api/v1/payments/webhooks/stripe',
        webhookData,
        {
          headers: {
            'stripe-signature': 'test_signature',
          },
        }
      );

      expect(response.status).toBe(200);
    });
  });

  describe('Subscription Management', () => {
    it('should create premium subscription', async () => {
      const { user, accessToken } = await createAuthenticatedUser();
      paymentApiClient.setAuthToken(accessToken);

      const response = await paymentApiClient.post('/api/v1/subscriptions/create', {
        planId: 'premium_monthly',
        paymentMethodId: 'pm_card_visa',
      });

      expect(response.status).toBe(201);
      expect(response.body.data).toMatchObject({
        subscriptionId: expect.any(String),
        plan: 'premium_monthly',
        status: 'active',
        currentPeriodEnd: expect.any(String),
      });

      // Verify subscription in database
      const knex = dbHelper.getKnex();
      const subscription = await knex('subscriptions')
        .where({ user_id: user.id })
        .first();

      expect(subscription).toBeDefined();
      expect(subscription.plan).toBe('premium_monthly');
      expect(subscription.status).toBe('active');
    });

    it('should get current subscription status', async () => {
      const { user, accessToken } = await createAuthenticatedUser();

      // Create subscription
      paymentApiClient.setAuthToken(accessToken);
      await paymentApiClient.post('/api/v1/subscriptions/create', {
        planId: 'premium_monthly',
        paymentMethodId: 'pm_card_visa',
      });

      // Get status
      const response = await paymentApiClient.get('/api/v1/subscriptions/status');

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        isSubscribed: true,
        plan: 'premium_monthly',
        status: 'active',
        features: expect.any(Array),
      });
    });

    it('should upgrade subscription plan', async () => {
      const { accessToken } = await createAuthenticatedUser();
      paymentApiClient.setAuthToken(accessToken);

      // Create basic subscription
      await paymentApiClient.post('/api/v1/subscriptions/create', {
        planId: 'premium_monthly',
        paymentMethodId: 'pm_card_visa',
      });

      // Upgrade to annual
      const response = await paymentApiClient.put('/api/v1/subscriptions/upgrade', {
        newPlanId: 'premium_annual',
      });

      expect(response.status).toBe(200);
      expect(response.body.data.plan).toBe('premium_annual');
    });

    it('should cancel subscription', async () => {
      const { user, accessToken } = await createAuthenticatedUser();
      paymentApiClient.setAuthToken(accessToken);

      // Create subscription
      const createResponse = await paymentApiClient.post('/api/v1/subscriptions/create', {
        planId: 'premium_monthly',
        paymentMethodId: 'pm_card_visa',
      });

      const subscriptionId = createResponse.body.data.subscriptionId;

      // Cancel subscription
      const response = await paymentApiClient.delete(
        `/api/v1/subscriptions/${subscriptionId}/cancel`
      );

      expect(response.status).toBe(200);
      expect(response.body.data.status).toMatch(/canceled|cancelled/);

      // Verify cancellation in database
      const knex = dbHelper.getKnex();
      const subscription = await knex('subscriptions')
        .where({ id: subscriptionId })
        .first();

      expect(subscription.status).toMatch(/canceled|cancelled/);
    });

    it('should handle subscription renewal', async () => {
      const { user, accessToken } = await createAuthenticatedUser();
      paymentApiClient.setAuthToken(accessToken);

      // Create subscription
      const createResponse = await paymentApiClient.post('/api/v1/subscriptions/create', {
        planId: 'premium_monthly',
        paymentMethodId: 'pm_card_visa',
      });

      // Simulate renewal (typically handled by Stripe webhook)
      const knex = dbHelper.getKnex();
      const subscription = await knex('subscriptions')
        .where({ user_id: user.id })
        .first();

      // Check auto-renewal setting
      expect(subscription.auto_renew).toBe(true);
    });
  });

  describe('Apple In-App Purchase', () => {
    it('should verify Apple IAP receipt', async () => {
      const { accessToken } = await createAuthenticatedUser();
      paymentApiClient.setAuthToken(accessToken);

      const response = await paymentApiClient.post('/api/v1/payments/apple/verify', {
        receipt: 'base64_encoded_receipt',
        productId: 'com.flamoral.premium.monthly',
      });

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        valid: expect.any(Boolean),
        transactionId: expect.any(String),
      });
    });

    it('should activate subscription from Apple IAP', async () => {
      const { user, accessToken } = await createAuthenticatedUser();
      paymentApiClient.setAuthToken(accessToken);

      const response = await paymentApiClient.post('/api/v1/payments/apple/activate', {
        receipt: 'valid_receipt_data',
        productId: 'com.flamoral.premium.monthly',
        transactionId: 'apple_transaction_123',
      });

      expect(response.status).toBe(200);

      // Verify subscription created
      const knex = dbHelper.getKnex();
      const subscription = await knex('subscriptions')
        .where({ user_id: user.id })
        .first();

      expect(subscription).toBeDefined();
      expect(subscription.payment_provider).toBe('apple');
    });

    it('should handle Apple IAP webhook notifications', async () => {
      const webhookData = {
        notification_type: 'DID_RENEW',
        latest_receipt: 'receipt_data',
        latest_receipt_info: {
          transaction_id: 'apple_transaction_123',
          product_id: 'com.flamoral.premium.monthly',
        },
      };

      const response = await paymentApiClient.post(
        '/api/v1/payments/webhooks/apple',
        webhookData
      );

      expect(response.status).toBe(200);
    });
  });

  describe('Google Play Billing', () => {
    it('should verify Google Play purchase', async () => {
      const { accessToken } = await createAuthenticatedUser();
      paymentApiClient.setAuthToken(accessToken);

      const response = await paymentApiClient.post('/api/v1/payments/google/verify', {
        purchaseToken: 'google_purchase_token',
        productId: 'premium_monthly',
        packageName: 'com.flamoral.app',
      });

      expect(response.status).toBe(200);
      expect(response.body.data.valid).toBeDefined();
    });

    it('should activate subscription from Google Play', async () => {
      const { user, accessToken } = await createAuthenticatedUser();
      paymentApiClient.setAuthToken(accessToken);

      const response = await paymentApiClient.post('/api/v1/payments/google/activate', {
        purchaseToken: 'valid_purchase_token',
        productId: 'premium_monthly',
        orderId: 'google_order_123',
      });

      expect(response.status).toBe(200);

      // Verify subscription
      const knex = dbHelper.getKnex();
      const subscription = await knex('subscriptions')
        .where({ user_id: user.id })
        .first();

      expect(subscription).toBeDefined();
      expect(subscription.payment_provider).toBe('google');
    });

    it('should handle Google Play Real-time Developer Notifications', async () => {
      const webhookData = {
        message: {
          data: Buffer.from(JSON.stringify({
            subscriptionNotification: {
              subscriptionId: 'premium_monthly',
              purchaseToken: 'purchase_token',
              notificationType: 2, // SUBSCRIPTION_RENEWED
            },
          })).toString('base64'),
        },
      };

      const response = await paymentApiClient.post(
        '/api/v1/payments/webhooks/google',
        webhookData
      );

      expect(response.status).toBe(200);
    });
  });

  describe('In-App Purchases (Coins, Boosts)', () => {
    it('should purchase coins', async () => {
      const { user, accessToken } = await createAuthenticatedUser();
      paymentApiClient.setAuthToken(accessToken);

      const response = await paymentApiClient.post('/api/v1/payments/purchase/coins', {
        packageId: 'coins_100',
        paymentMethodId: 'pm_card_visa',
      });

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        coinsAdded: 100,
        totalCoins: expect.any(Number),
      });

      // Verify coins in database
      const knex = dbHelper.getKnex();
      const user_data = await knex('users').where('id', user.id).first();
      expect(user_data.coins).toBeGreaterThanOrEqual(100);
    });

    it('should purchase profile boost', async () => {
      const { accessToken } = await createAuthenticatedUser();
      paymentApiClient.setAuthToken(accessToken);

      const response = await paymentApiClient.post('/api/v1/payments/purchase/boost', {
        duration: 30, // 30 minutes
        paymentMethodId: 'pm_card_visa',
      });

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        boostActive: true,
        expiresAt: expect.any(String),
      });
    });

    it('should purchase super likes', async () => {
      const { user, accessToken } = await createAuthenticatedUser();
      paymentApiClient.setAuthToken(accessToken);

      const response = await paymentApiClient.post('/api/v1/payments/purchase/super-likes', {
        quantity: 5,
        paymentMethodId: 'pm_card_visa',
      });

      expect(response.status).toBe(200);

      // Verify super likes added
      const knex = dbHelper.getKnex();
      const userData = await knex('users').where('id', user.id).first();
      expect(userData.super_likes_remaining).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Payment History', () => {
    it('should get payment history', async () => {
      const { accessToken } = await createAuthenticatedUser();
      paymentApiClient.setAuthToken(accessToken);

      // Make a purchase
      await paymentApiClient.post('/api/v1/payments/purchase/coins', {
        packageId: 'coins_100',
        paymentMethodId: 'pm_card_visa',
      });

      // Get history
      const response = await paymentApiClient.get('/api/v1/payments/history');

      expect(response.status).toBe(200);
      expect(response.body.data.payments).toBeDefined();
      expect(response.body.data.payments.length).toBeGreaterThan(0);
      expect(response.body.data.payments[0]).toMatchObject({
        id: expect.any(String),
        amount: expect.any(Number),
        status: expect.any(String),
        createdAt: expect.any(String),
      });
    });

    it('should get subscription invoice history', async () => {
      const { accessToken } = await createAuthenticatedUser();
      paymentApiClient.setAuthToken(accessToken);

      // Create subscription
      await paymentApiClient.post('/api/v1/subscriptions/create', {
        planId: 'premium_monthly',
        paymentMethodId: 'pm_card_visa',
      });

      // Get invoices
      const response = await paymentApiClient.get('/api/v1/payments/invoices');

      expect(response.status).toBe(200);
      expect(response.body.data.invoices).toBeDefined();
    });
  });

  describe('Refunds', () => {
    it('should request refund', async () => {
      const { accessToken } = await createAuthenticatedUser();
      paymentApiClient.setAuthToken(accessToken);

      // Make a purchase
      const purchaseResponse = await paymentApiClient.post('/api/v1/payments/purchase/coins', {
        packageId: 'coins_100',
        paymentMethodId: 'pm_card_visa',
      });

      const paymentId = purchaseResponse.body.data.paymentId;

      // Request refund
      const response = await paymentApiClient.post(`/api/v1/payments/${paymentId}/refund`, {
        reason: 'Changed my mind',
      });

      expect(response.status).toBe(200);
      expect(response.body.data.refundStatus).toBe('pending');
    });
  });

  describe('Payment Security', () => {
    it('should not expose sensitive payment data', async () => {
      const { accessToken } = await createAuthenticatedUser();
      paymentApiClient.setAuthToken(accessToken);

      const response = await paymentApiClient.get('/api/v1/payments/history');

      const payments = response.body.data.payments;
      payments.forEach((payment: any) => {
        expect(payment.cardNumber).toBeUndefined();
        expect(payment.cvv).toBeUndefined();
        // Should only show last 4 digits
        if (payment.paymentMethod) {
          expect(payment.paymentMethod.last4).toBeDefined();
        }
      });
    });

    it('should validate payment amounts', async () => {
      const { accessToken } = await createAuthenticatedUser();
      paymentApiClient.setAuthToken(accessToken);

      // Try to create payment with negative amount
      const response = await paymentApiClient.post('/api/v1/payments/create-intent', {
        amount: -100,
        currency: 'usd',
        productType: 'coins',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/invalid|amount/i);
    });

    it('should enforce idempotency for payments', async () => {
      const { accessToken } = await createAuthenticatedUser();
      paymentApiClient.setAuthToken(accessToken);

      const idempotencyKey = `idem_${Date.now()}`;

      // First payment
      const response1 = await paymentApiClient.post(
        '/api/v1/payments/purchase/coins',
        {
          packageId: 'coins_100',
          paymentMethodId: 'pm_card_visa',
        },
        {
          headers: {
            'Idempotency-Key': idempotencyKey,
          },
        }
      );

      // Duplicate payment with same key (should return same result)
      const response2 = await paymentApiClient.post(
        '/api/v1/payments/purchase/coins',
        {
          packageId: 'coins_100',
          paymentMethodId: 'pm_card_visa',
        },
        {
          headers: {
            'Idempotency-Key': idempotencyKey,
          },
        }
      );

      expect(response1.body.data.paymentId).toBe(response2.body.data.paymentId);
    });
  });
});
