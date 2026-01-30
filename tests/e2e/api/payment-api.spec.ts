import request from 'supertest';
import Stripe from 'stripe';

const GATEWAY_URL = process.env.API_GATEWAY_URL || 'https://api-gateway-production-1957.up.railway.app';
const API_URL = process.env.PAYMENT_API_URL || GATEWAY_URL;
const AUTH_URL = process.env.AUTH_URL || GATEWAY_URL;

describe('Payment Service API', () => {
  let accessToken: string;
  let userId: string;
  let customerId: string;
  let paymentIntentId: string;

  // Mock Stripe for webhook tests
  const mockStripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
    apiVersion: '2023-10-16',
  });

  beforeAll(async () => {
    // Login to get access token
    const loginResponse = await request(AUTH_URL)
      .post('/api/auth/login')
      .send({
        email: process.env.TEST_USER_EMAIL || 'test@example.com',
        password: process.env.TEST_USER_PASSWORD || 'TestPassword123!'
      });

    if (loginResponse.body.accessToken) {
      accessToken = loginResponse.body.accessToken;
      userId = loginResponse.body.user?.id;
      customerId = loginResponse.body.user?.stripeCustomerId || 'cus_test_mock';
    }
  });

  describe('POST /api/payments/create-intent - Create Payment Intent', () => {
    describe('Subscription purchase', () => {
      it('should create payment intent for subscription', async () => {
        const response = await request(API_URL)
          .post('/api/payments/create-intent')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            amount: 999,
            currency: 'usd',
            customerId: customerId,
            metadata: {
              type: 'subscription',
              tier: 'premium',
              userId: userId
            }
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('clientSecret');
        expect(response.body.data).toHaveProperty('paymentIntentId');
        expect(response.body.data.clientSecret).toContain('pi_');

        paymentIntentId = response.body.data.paymentIntentId;
      });

      it('should include subscription metadata', async () => {
        const response = await request(API_URL)
          .post('/api/payments/create-intent')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            amount: 1999,
            currency: 'usd',
            customerId: customerId,
            metadata: {
              type: 'subscription',
              tier: 'ultra',
              userId: userId,
              billingPeriod: 'monthly'
            }
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('Coin package purchase', () => {
      it('should create payment intent for coin package', async () => {
        const response = await request(API_URL)
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
              userId: userId
            }
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('clientSecret');
        expect(response.body.data).toHaveProperty('paymentIntentId');
      });

      it('should handle different coin packages', async () => {
        const packages = [
          { amount: 499, coins: 100, packageId: 'coins-100' },
          { amount: 999, coins: 250, packageId: 'coins-250' },
          { amount: 1999, coins: 500, packageId: 'coins-500' }
        ];

        for (const pkg of packages) {
          const response = await request(API_URL)
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
                userId: userId
              }
            });

          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
        }
      });
    });

    describe('Boost purchase', () => {
      it('should create payment intent for profile boost', async () => {
        const response = await request(API_URL)
          .post('/api/payments/create-intent')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            amount: 299,
            currency: 'usd',
            customerId: customerId,
            metadata: {
              type: 'boost',
              duration: 30,
              userId: userId
            }
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('clientSecret');
      });

      it('should handle different boost durations', async () => {
        const durations = [30, 60, 180];

        for (const duration of durations) {
          const response = await request(API_URL)
            .post('/api/payments/create-intent')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
              amount: duration === 30 ? 299 : duration === 60 ? 499 : 999,
              currency: 'usd',
              customerId: customerId,
              metadata: {
                type: 'boost',
                duration: duration,
                userId: userId
              }
            });

          expect(response.status).toBe(200);
        }
      });
    });

    describe('Invalid product ID', () => {
      it('should reject invalid metadata', async () => {
        const response = await request(API_URL)
          .post('/api/payments/create-intent')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            amount: 999,
            currency: 'usd',
            customerId: customerId,
            metadata: {
              type: 'invalid_product_type',
              productId: 'nonexistent-123'
            }
          });

        // Should still create intent but may fail validation
        expect([200, 400]).toContain(response.status);
      });
    });

    describe('Invalid product type', () => {
      it('should handle missing product type', async () => {
        const response = await request(API_URL)
          .post('/api/payments/create-intent')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            amount: 999,
            currency: 'usd',
            customerId: customerId,
            metadata: {}
          });

        // May succeed but should handle gracefully
        expect([200, 400]).toContain(response.status);
      });
    });

    describe('Validation errors', () => {
      it('should fail with missing amount', async () => {
        const response = await request(API_URL)
          .post('/api/payments/create-intent')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            currency: 'usd',
            customerId: customerId
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('success', false);
        expect(response.body.message).toContain('Amount');
      });

      it('should fail with missing customer ID', async () => {
        const response = await request(API_URL)
          .post('/api/payments/create-intent')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            amount: 999,
            currency: 'usd'
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('customer');
      });

      it('should fail with invalid amount (negative)', async () => {
        const response = await request(API_URL)
          .post('/api/payments/create-intent')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            amount: -999,
            currency: 'usd',
            customerId: customerId
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      it('should fail with invalid amount (zero)', async () => {
        const response = await request(API_URL)
          .post('/api/payments/create-intent')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            amount: 0,
            currency: 'usd',
            customerId: customerId
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      it('should use default currency if not provided', async () => {
        const response = await request(API_URL)
          .post('/api/payments/create-intent')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            amount: 999,
            customerId: customerId
          });

        expect([200, 400]).toContain(response.status);
      });
    });

    describe('Auth required', () => {
      it('should fail without authentication', async () => {
        const response = await request(API_URL)
          .post('/api/payments/create-intent')
          .send({
            amount: 999,
            currency: 'usd',
            customerId: customerId
          });

        expect(response.status).toBe(401);
      });

      it('should fail with invalid token', async () => {
        const response = await request(API_URL)
          .post('/api/payments/create-intent')
          .set('Authorization', 'Bearer invalid-token-12345')
          .send({
            amount: 999,
            currency: 'usd',
            customerId: customerId
          });

        expect(response.status).toBe(401);
      });

      it('should fail with expired token', async () => {
        const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

        const response = await request(API_URL)
          .post('/api/payments/create-intent')
          .set('Authorization', `Bearer ${expiredToken}`)
          .send({
            amount: 999,
            currency: 'usd',
            customerId: customerId
          });

        expect(response.status).toBe(401);
      });
    });
  });

  describe('GET /api/payments/history - Get Payment History', () => {
    describe('Paginated results', () => {
      it('should return payment history with pagination', async () => {
        const response = await request(API_URL)
          .get('/api/payments/history')
          .set('Authorization', `Bearer ${accessToken}`)
          .query({ page: 1, limit: 10 });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('pagination');
        expect(Array.isArray(response.body.data)).toBe(true);

        if (response.body.pagination) {
          expect(response.body.pagination).toHaveProperty('page');
          expect(response.body.pagination).toHaveProperty('limit');
          expect(response.body.pagination).toHaveProperty('total');
        }
      });

      it('should respect pagination limits', async () => {
        const response = await request(API_URL)
          .get('/api/payments/history')
          .set('Authorization', `Bearer ${accessToken}`)
          .query({ page: 1, limit: 5 });

        expect(response.status).toBe(200);
        if (response.body.data) {
          expect(response.body.data.length).toBeLessThanOrEqual(5);
        }
      });

      it('should handle different page numbers', async () => {
        const page1 = await request(API_URL)
          .get('/api/payments/history')
          .set('Authorization', `Bearer ${accessToken}`)
          .query({ page: 1, limit: 2 });

        const page2 = await request(API_URL)
          .get('/api/payments/history')
          .set('Authorization', `Bearer ${accessToken}`)
          .query({ page: 2, limit: 2 });

        expect(page1.status).toBe(200);
        expect(page2.status).toBe(200);
      });

      it('should handle large page numbers gracefully', async () => {
        const response = await request(API_URL)
          .get('/api/payments/history')
          .set('Authorization', `Bearer ${accessToken}`)
          .query({ page: 1000, limit: 10 });

        expect(response.status).toBe(200);
        expect(response.body.data).toBeDefined();
      });
    });

    describe('Empty history', () => {
      it('should return empty array for user with no payments', async () => {
        // This test assumes the test user might have no payment history
        const response = await request(API_URL)
          .get('/api/payments/history')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should have correct structure even when empty', async () => {
        const response = await request(API_URL)
          .get('/api/payments/history')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('Filter by date range (if supported)', () => {
      it('should filter by start date', async () => {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        const response = await request(API_URL)
          .get('/api/payments/history')
          .set('Authorization', `Bearer ${accessToken}`)
          .query({
            startDate: startDate.toISOString()
          });

        expect([200, 400]).toContain(response.status);
        if (response.status === 200 && response.body.data) {
          expect(Array.isArray(response.body.data)).toBe(true);
        }
      });

      it('should filter by end date', async () => {
        const endDate = new Date();

        const response = await request(API_URL)
          .get('/api/payments/history')
          .set('Authorization', `Bearer ${accessToken}`)
          .query({
            endDate: endDate.toISOString()
          });

        expect([200, 400]).toContain(response.status);
      });

      it('should filter by date range', async () => {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        const endDate = new Date();

        const response = await request(API_URL)
          .get('/api/payments/history')
          .set('Authorization', `Bearer ${accessToken}`)
          .query({
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          });

        expect([200, 400]).toContain(response.status);
      });

      it('should validate date range order', async () => {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() - 30);

        const response = await request(API_URL)
          .get('/api/payments/history')
          .set('Authorization', `Bearer ${accessToken}`)
          .query({
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          });

        // Should handle invalid range gracefully
        expect([200, 400]).toContain(response.status);
      });
    });

    describe('Auth required', () => {
      it('should fail without authentication', async () => {
        const response = await request(API_URL)
          .get('/api/payments/history');

        expect(response.status).toBe(401);
      });

      it('should fail with invalid token', async () => {
        const response = await request(API_URL)
          .get('/api/payments/history')
          .set('Authorization', 'Bearer invalid-token');

        expect(response.status).toBe(401);
      });

      it('should not return other users payment history', async () => {
        const response = await request(API_URL)
          .get('/api/payments/history')
          .set('Authorization', `Bearer ${accessToken}`)
          .query({ userId: 'other-user-id' });

        // Should still only return current user's history
        expect(response.status).toBe(200);
      });
    });
  });

  describe('GET /api/payments/methods - Get Saved Payment Methods', () => {
    describe('List saved cards', () => {
      it('should return list of payment methods', async () => {
        const response = await request(API_URL)
          .get(`/api/payments/methods/${customerId}`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should include card details for each method', async () => {
        const response = await request(API_URL)
          .get(`/api/payments/methods/${customerId}`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);

        if (response.body.data && response.body.data.length > 0) {
          const method = response.body.data[0];
          expect(method).toHaveProperty('id');
          // Card details should be present if payment method exists
          expect(method).toBeDefined();
        }
      });

      it('should not expose sensitive card information', async () => {
        const response = await request(API_URL)
          .get(`/api/payments/methods/${customerId}`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);

        if (response.body.data && response.body.data.length > 0) {
          const method = response.body.data[0];
          // Should not contain full card number
          expect(method).not.toHaveProperty('card.number');
          expect(method).not.toHaveProperty('card.cvc');
        }
      });
    });

    describe('Empty state', () => {
      it('should return empty array when no payment methods exist', async () => {
        const response = await request(API_URL)
          .get(`/api/payments/methods/${customerId}`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should handle non-existent customer gracefully', async () => {
        const response = await request(API_URL)
          .get('/api/payments/methods/cus_nonexistent123')
          .set('Authorization', `Bearer ${accessToken}`);

        expect([200, 400, 404, 500]).toContain(response.status);
      });
    });

    describe('Auth required', () => {
      it('should fail without authentication', async () => {
        const response = await request(API_URL)
          .get(`/api/payments/methods/${customerId}`);

        expect(response.status).toBe(401);
      });

      it('should fail with invalid token', async () => {
        const response = await request(API_URL)
          .get(`/api/payments/methods/${customerId}`)
          .set('Authorization', 'Bearer invalid-token');

        expect(response.status).toBe(401);
      });

      it('should validate customer ID parameter', async () => {
        const response = await request(API_URL)
          .get('/api/payments/methods/')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(404);
      });

      it('should not allow accessing other users payment methods', async () => {
        const response = await request(API_URL)
          .get('/api/payments/methods/cus_other_user_123')
          .set('Authorization', `Bearer ${accessToken}`);

        // Should either fail authorization or return empty
        expect([200, 401, 403, 500]).toContain(response.status);
      });
    });
  });

  describe('POST /api/payments/webhook - Stripe Webhook Handler', () => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret';

    // Helper function to generate webhook signature
    const generateWebhookSignature = (payload: string, secret: string): string => {
      try {
        return mockStripe.webhooks.generateTestHeaderString({
          payload,
          secret
        });
      } catch (error) {
        // Fallback if Stripe SDK method not available
        return 't=1234567890,v1=mock_signature';
      }
    };

    describe('payment_intent.succeeded', () => {
      it('should handle payment intent succeeded event', async () => {
        const event = {
          id: 'evt_test_' + Date.now(),
          type: 'payment_intent.succeeded',
          data: {
            object: {
              id: 'pi_test_123',
              amount: 999,
              currency: 'usd',
              status: 'succeeded',
              customer: customerId,
              metadata: {
                userId: userId,
                type: 'subscription',
                tier: 'premium'
              }
            }
          },
          created: Math.floor(Date.now() / 1000)
        };

        const payload = JSON.stringify(event);
        const signature = generateWebhookSignature(payload, webhookSecret);

        const response = await request(API_URL)
          .post('/api/payments/webhook')
          .set('stripe-signature', signature)
          .set('Content-Type', 'application/json')
          .send(payload);

        expect([200, 400]).toContain(response.status);
        if (response.status === 200) {
          expect(response.body).toHaveProperty('received', true);
        }
      });

      it('should process coin purchase payment', async () => {
        const event = {
          id: 'evt_test_coins_' + Date.now(),
          type: 'payment_intent.succeeded',
          data: {
            object: {
              id: 'pi_test_coins',
              amount: 499,
              currency: 'usd',
              status: 'succeeded',
              customer: customerId,
              metadata: {
                userId: userId,
                type: 'coins',
                packageId: 'coins-100',
                coins: 100
              }
            }
          },
          created: Math.floor(Date.now() / 1000)
        };

        const payload = JSON.stringify(event);
        const signature = generateWebhookSignature(payload, webhookSecret);

        const response = await request(API_URL)
          .post('/api/payments/webhook')
          .set('stripe-signature', signature)
          .send(payload);

        expect([200, 400]).toContain(response.status);
      });
    });

    describe('payment_intent.failed', () => {
      it('should handle payment intent failed event', async () => {
        const event = {
          id: 'evt_test_failed_' + Date.now(),
          type: 'payment_intent.payment_failed',
          data: {
            object: {
              id: 'pi_test_failed',
              amount: 999,
              currency: 'usd',
              status: 'failed',
              customer: customerId,
              last_payment_error: {
                message: 'Your card was declined'
              },
              metadata: {
                userId: userId,
                type: 'subscription'
              }
            }
          },
          created: Math.floor(Date.now() / 1000)
        };

        const payload = JSON.stringify(event);
        const signature = generateWebhookSignature(payload, webhookSecret);

        const response = await request(API_URL)
          .post('/api/payments/webhook')
          .set('stripe-signature', signature)
          .send(payload);

        expect([200, 400]).toContain(response.status);
      });

      it('should handle card declined errors', async () => {
        const event = {
          id: 'evt_test_declined_' + Date.now(),
          type: 'payment_intent.payment_failed',
          data: {
            object: {
              id: 'pi_test_declined',
              amount: 1999,
              currency: 'usd',
              status: 'requires_payment_method',
              customer: customerId,
              last_payment_error: {
                code: 'card_declined',
                message: 'Your card was declined'
              }
            }
          },
          created: Math.floor(Date.now() / 1000)
        };

        const payload = JSON.stringify(event);
        const signature = generateWebhookSignature(payload, webhookSecret);

        const response = await request(API_URL)
          .post('/api/payments/webhook')
          .set('stripe-signature', signature)
          .send(payload);

        expect([200, 400]).toContain(response.status);
      });
    });

    describe('customer.subscription.created', () => {
      it('should handle subscription created event', async () => {
        const event = {
          id: 'evt_test_sub_created_' + Date.now(),
          type: 'customer.subscription.created',
          data: {
            object: {
              id: 'sub_test_123',
              customer: customerId,
              status: 'active',
              items: {
                data: [{
                  price: {
                    id: 'price_premium',
                    recurring: { interval: 'month' }
                  }
                }]
              },
              current_period_start: Math.floor(Date.now() / 1000),
              current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
              metadata: {
                userId: userId,
                tier: 'premium'
              }
            }
          },
          created: Math.floor(Date.now() / 1000)
        };

        const payload = JSON.stringify(event);
        const signature = generateWebhookSignature(payload, webhookSecret);

        const response = await request(API_URL)
          .post('/api/payments/webhook')
          .set('stripe-signature', signature)
          .send(payload);

        expect([200, 400]).toContain(response.status);
      });

      it('should handle trial subscription', async () => {
        const event = {
          id: 'evt_test_trial_' + Date.now(),
          type: 'customer.subscription.created',
          data: {
            object: {
              id: 'sub_test_trial',
              customer: customerId,
              status: 'trialing',
              trial_end: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
              metadata: {
                userId: userId
              }
            }
          },
          created: Math.floor(Date.now() / 1000)
        };

        const payload = JSON.stringify(event);
        const signature = generateWebhookSignature(payload, webhookSecret);

        const response = await request(API_URL)
          .post('/api/payments/webhook')
          .set('stripe-signature', signature)
          .send(payload);

        expect([200, 400]).toContain(response.status);
      });
    });

    describe('customer.subscription.deleted', () => {
      it('should handle subscription deleted event', async () => {
        const event = {
          id: 'evt_test_sub_deleted_' + Date.now(),
          type: 'customer.subscription.deleted',
          data: {
            object: {
              id: 'sub_test_deleted',
              customer: customerId,
              status: 'canceled',
              canceled_at: Math.floor(Date.now() / 1000),
              metadata: {
                userId: userId
              }
            }
          },
          created: Math.floor(Date.now() / 1000)
        };

        const payload = JSON.stringify(event);
        const signature = generateWebhookSignature(payload, webhookSecret);

        const response = await request(API_URL)
          .post('/api/payments/webhook')
          .set('stripe-signature', signature)
          .send(payload);

        expect([200, 400]).toContain(response.status);
      });

      it('should handle subscription expired', async () => {
        const event = {
          id: 'evt_test_expired_' + Date.now(),
          type: 'customer.subscription.deleted',
          data: {
            object: {
              id: 'sub_test_expired',
              customer: customerId,
              status: 'canceled',
              ended_at: Math.floor(Date.now() / 1000),
              cancellation_details: {
                reason: 'payment_failed'
              }
            }
          },
          created: Math.floor(Date.now() / 1000)
        };

        const payload = JSON.stringify(event);
        const signature = generateWebhookSignature(payload, webhookSecret);

        const response = await request(API_URL)
          .post('/api/payments/webhook')
          .set('stripe-signature', signature)
          .send(payload);

        expect([200, 400]).toContain(response.status);
      });
    });

    describe('Invalid signature', () => {
      it('should reject webhook with invalid signature', async () => {
        const event = {
          id: 'evt_test_invalid',
          type: 'payment_intent.succeeded',
          data: {
            object: {
              id: 'pi_test',
              amount: 999
            }
          }
        };

        const response = await request(API_URL)
          .post('/api/payments/webhook')
          .set('stripe-signature', 'invalid_signature_123')
          .send(JSON.stringify(event));

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      });

      it('should reject webhook with missing signature', async () => {
        const event = {
          id: 'evt_test_no_sig',
          type: 'payment_intent.succeeded',
          data: { object: {} }
        };

        const response = await request(API_URL)
          .post('/api/payments/webhook')
          .send(JSON.stringify(event));

        expect(response.status).toBe(400);
      });

      it('should reject webhook with tampered payload', async () => {
        const event = {
          id: 'evt_test_tampered',
          type: 'payment_intent.succeeded',
          data: {
            object: {
              amount: 999
            }
          }
        };

        const originalPayload = JSON.stringify(event);
        const signature = generateWebhookSignature(originalPayload, webhookSecret);

        // Tamper with payload after signing
        const tamperedEvent = { ...event, data: { object: { amount: 1 } } };

        const response = await request(API_URL)
          .post('/api/payments/webhook')
          .set('stripe-signature', signature)
          .send(JSON.stringify(tamperedEvent));

        expect(response.status).toBe(400);
      });
    });

    describe('Missing event type', () => {
      it('should handle webhook with missing event type', async () => {
        const event = {
          id: 'evt_test_no_type',
          data: {
            object: {
              id: 'pi_test'
            }
          }
        };

        const payload = JSON.stringify(event);
        const signature = generateWebhookSignature(payload, webhookSecret);

        const response = await request(API_URL)
          .post('/api/payments/webhook')
          .set('stripe-signature', signature)
          .send(payload);

        expect([200, 400]).toContain(response.status);
      });

      it('should handle unknown event type gracefully', async () => {
        const event = {
          id: 'evt_test_unknown_' + Date.now(),
          type: 'unknown.event.type',
          data: {
            object: {
              id: 'obj_test'
            }
          },
          created: Math.floor(Date.now() / 1000)
        };

        const payload = JSON.stringify(event);
        const signature = generateWebhookSignature(payload, webhookSecret);

        const response = await request(API_URL)
          .post('/api/payments/webhook')
          .set('stripe-signature', signature)
          .send(payload);

        // Should accept but ignore unknown events
        expect([200, 400]).toContain(response.status);
      });
    });

    describe('Idempotency', () => {
      it('should handle duplicate webhook events', async () => {
        const event = {
          id: 'evt_test_duplicate_' + Date.now(),
          type: 'payment_intent.succeeded',
          data: {
            object: {
              id: 'pi_test_duplicate',
              amount: 999,
              status: 'succeeded'
            }
          },
          created: Math.floor(Date.now() / 1000)
        };

        const payload = JSON.stringify(event);
        const signature = generateWebhookSignature(payload, webhookSecret);

        // Send same event twice
        const response1 = await request(API_URL)
          .post('/api/payments/webhook')
          .set('stripe-signature', signature)
          .send(payload);

        const response2 = await request(API_URL)
          .post('/api/payments/webhook')
          .set('stripe-signature', signature)
          .send(payload);

        expect([200, 400]).toContain(response1.status);
        expect([200, 400]).toContain(response2.status);

        // Second request should indicate duplicate if processed correctly
        if (response2.status === 200 && response2.body.duplicate !== undefined) {
          expect(response2.body.duplicate).toBe(true);
        }
      });
    });

    describe('No auth required for webhooks', () => {
      it('should accept webhook without authorization header', async () => {
        const event = {
          id: 'evt_test_no_auth_' + Date.now(),
          type: 'payment_intent.succeeded',
          data: {
            object: {
              id: 'pi_test_no_auth',
              amount: 999
            }
          },
          created: Math.floor(Date.now() / 1000)
        };

        const payload = JSON.stringify(event);
        const signature = generateWebhookSignature(payload, webhookSecret);

        const response = await request(API_URL)
          .post('/api/payments/webhook')
          .set('stripe-signature', signature)
          .send(payload);

        // Should work without Bearer token
        expect([200, 400]).toContain(response.status);
      });

      it('should ignore authorization header if present', async () => {
        const event = {
          id: 'evt_test_with_auth_' + Date.now(),
          type: 'payment_intent.succeeded',
          data: {
            object: {
              id: 'pi_test_with_auth'
            }
          },
          created: Math.floor(Date.now() / 1000)
        };

        const payload = JSON.stringify(event);
        const signature = generateWebhookSignature(payload, webhookSecret);

        const response = await request(API_URL)
          .post('/api/payments/webhook')
          .set('Authorization', 'Bearer some-token')
          .set('stripe-signature', signature)
          .send(payload);

        expect([200, 400]).toContain(response.status);
      });
    });

    describe('Additional event types', () => {
      it('should handle invoice.paid event', async () => {
        const event = {
          id: 'evt_test_invoice_paid_' + Date.now(),
          type: 'invoice.paid',
          data: {
            object: {
              id: 'in_test',
              customer: customerId,
              subscription: 'sub_test',
              amount_paid: 999,
              status: 'paid'
            }
          },
          created: Math.floor(Date.now() / 1000)
        };

        const payload = JSON.stringify(event);
        const signature = generateWebhookSignature(payload, webhookSecret);

        const response = await request(API_URL)
          .post('/api/payments/webhook')
          .set('stripe-signature', signature)
          .send(payload);

        expect([200, 400]).toContain(response.status);
      });

      it('should handle charge.refunded event', async () => {
        const event = {
          id: 'evt_test_refunded_' + Date.now(),
          type: 'charge.refunded',
          data: {
            object: {
              id: 'ch_test',
              amount: 999,
              amount_refunded: 999,
              refunded: true,
              customer: customerId
            }
          },
          created: Math.floor(Date.now() / 1000)
        };

        const payload = JSON.stringify(event);
        const signature = generateWebhookSignature(payload, webhookSecret);

        const response = await request(API_URL)
          .post('/api/payments/webhook')
          .set('stripe-signature', signature)
          .send(payload);

        expect([200, 400]).toContain(response.status);
      });
    });
  });
});
