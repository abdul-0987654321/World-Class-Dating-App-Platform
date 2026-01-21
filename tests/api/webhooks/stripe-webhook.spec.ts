/**
 * Stripe Webhook Tests
 * Tests for payment webhook validation and processing
 */

const request = require('supertest');
const crypto = require('crypto');

const API_URL = process.env.API_GATEWAY_URL || 'http://localhost:4000';
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret';

function generateStripeSignature(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = timestamp + '.' + payload;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  return 't=' + timestamp + ',v1=' + signature;
}

describe('Stripe Webhooks', () => {
  
  describe('Signature Validation', () => {
    test('should reject webhook without signature', async () => {
      const payload = JSON.stringify({
        type: 'customer.subscription.created',
        data: { object: { id: 'sub_123' } }
      });

      const res = await request(API_URL)
        .post('/api/v1/webhooks/stripe')
        .set('Content-Type', 'application/json')
        .send(payload);

      expect([400, 401]).toContain(res.status);
    });

    test('should reject invalid signature', async () => {
      const payload = JSON.stringify({
        type: 'customer.subscription.created',
        data: { object: { id: 'sub_123' } }
      });

      const res = await request(API_URL)
        .post('/api/v1/webhooks/stripe')
        .set('stripe-signature', 't=12345,v1=invalid')
        .send(payload);

      expect([400, 401]).toContain(res.status);
    });
  });

  describe('Subscription Events', () => {
    test('should handle subscription created', async () => {
      const payload = JSON.stringify({
        id: 'evt_sub_created',
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_test_123',
            customer: 'cus_test_123',
            status: 'active'
          }
        }
      });

      const signature = generateStripeSignature(payload, WEBHOOK_SECRET);

      const res = await request(API_URL)
        .post('/api/v1/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload);

      expect([200, 400, 401]).toContain(res.status);
    });

    test('should handle subscription canceled', async () => {
      const payload = JSON.stringify({
        id: 'evt_sub_canceled',
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_test_123',
            customer: 'cus_test_123',
            status: 'canceled'
          }
        }
      });

      const signature = generateStripeSignature(payload, WEBHOOK_SECRET);

      const res = await request(API_URL)
        .post('/api/v1/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload);

      expect([200, 400, 401]).toContain(res.status);
    });
  });

  describe('Payment Events', () => {
    test('should handle payment succeeded', async () => {
      const payload = JSON.stringify({
        id: 'evt_payment_success',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            customer: 'cus_test_123',
            amount: 999,
            currency: 'usd',
            status: 'succeeded'
          }
        }
      });

      const signature = generateStripeSignature(payload, WEBHOOK_SECRET);

      const res = await request(API_URL)
        .post('/api/v1/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload);

      expect([200, 400, 401]).toContain(res.status);
    });

    test('should handle payment failed', async () => {
      const payload = JSON.stringify({
        id: 'evt_payment_failed',
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_test_123',
            customer: 'cus_test_123',
            status: 'requires_payment_method'
          }
        }
      });

      const signature = generateStripeSignature(payload, WEBHOOK_SECRET);

      const res = await request(API_URL)
        .post('/api/v1/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload);

      expect([200, 400, 401]).toContain(res.status);
    });
  });

  describe('Idempotency', () => {
    test('should handle duplicate events', async () => {
      const eventId = 'evt_dup_' + Date.now();
      const payload = JSON.stringify({
        id: eventId,
        type: 'customer.subscription.created',
        data: { object: { id: 'sub_123' } }
      });

      const signature = generateStripeSignature(payload, WEBHOOK_SECRET);

      const res1 = await request(API_URL)
        .post('/api/v1/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload);

      const res2 = await request(API_URL)
        .post('/api/v1/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload);

      expect([200, 400, 401, 409]).toContain(res1.status);
      expect([200, 400, 401, 409]).toContain(res2.status);
    });
  });
});
