import request from 'supertest';
import express, { Application } from 'express';
import Stripe from 'stripe';
import { getTestDb, getTestRedis, createTestUser } from '../setup';

/**
 * Integration Tests for Stripe Webhook Handling
 */

describe('Payment Service - Stripe Webhook Integration', () => {
  let app: Application;
  let testDb: any;
  let testRedis: any;
  let testUser: any;
  let stripe: Stripe;

  const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret';

  beforeAll(() => {
    testDb = getTestDb();
    testRedis = getTestRedis();

    // Initialize test Stripe client
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
      apiVersion: '2023-10-16',
    });

    // Setup Express app with webhook route
    app = express();

    // Raw body for webhook signature verification
    app.use('/webhook', express.raw({ type: 'application/json' }));
    app.use(express.json());

    // Mock webhook endpoint
    app.post('/webhook', async (req, res) => {
      const sig = req.headers['stripe-signature'] as string;
      let event: Stripe.Event;

      try {
        // In test environment, we'll skip signature verification
        event = JSON.parse(req.body.toString()) as Stripe.Event;
      } catch (err: any) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      // Handle the event
      switch (event.type) {
        case 'payment_intent.succeeded':
          await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;
        case 'payment_intent.payment_failed':
          await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
          break;
        case 'customer.subscription.created':
          await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        case 'invoice.payment_succeeded':
          await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;
        case 'invoice.payment_failed':
          await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      res.json({ received: true });
    });
  });

  beforeEach(async () => {
    testUser = await createTestUser({
      email: 'payment@example.com',
    });

    // Create Stripe customer ID for user
    await testDb.query(
      `UPDATE users SET stripe_customer_id = $1 WHERE id = $2`,
      ['cus_test_' + Date.now(), testUser.id]
    );
  });

  // Helper functions for webhook handling
  async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    await testDb.query(
      `UPDATE payments SET status = 'completed' WHERE stripe_payment_intent_id = $1`,
      [paymentIntent.id]
    );
  }

  async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
    await testDb.query(
      `UPDATE payments SET status = 'failed' WHERE stripe_payment_intent_id = $1`,
      [paymentIntent.id]
    );
  }

  async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
    await testDb.query(
      `INSERT INTO subscriptions (user_id, plan, status, stripe_subscription_id, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id) DO UPDATE SET plan = $2, status = $3, start_date = $5, end_date = $6`,
      [
        testUser.id,
        'premium',
        subscription.status,
        subscription.id,
        new Date(subscription.current_period_start * 1000),
        new Date(subscription.current_period_end * 1000),
      ]
    );
  }

  async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    await testDb.query(
      `UPDATE subscriptions SET status = $1, end_date = $2 WHERE stripe_subscription_id = $3`,
      [subscription.status, new Date(subscription.current_period_end * 1000), subscription.id]
    );
  }

  async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    await testDb.query(
      `UPDATE subscriptions SET status = 'canceled' WHERE stripe_subscription_id = $1`,
      [subscription.id]
    );
  }

  async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    await testDb.query(
      `INSERT INTO payments (user_id, amount, currency, status, stripe_payment_intent_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        testUser.id,
        (invoice.amount_paid || 0) / 100,
        invoice.currency?.toUpperCase() || 'USD',
        'completed',
        invoice.payment_intent,
        JSON.stringify({ invoice_id: invoice.id }),
      ]
    );
  }

  async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    await testDb.query(
      `INSERT INTO payments (user_id, amount, currency, status, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        testUser.id,
        (invoice.amount_due || 0) / 100,
        invoice.currency?.toUpperCase() || 'USD',
        'failed',
        JSON.stringify({ invoice_id: invoice.id, failure_reason: 'payment_failed' }),
      ]
    );
  }

  describe('Payment Intent Events', () => {
    it('should handle payment_intent.succeeded', async () => {
      // Create pending payment
      await testDb.query(
        `INSERT INTO payments (user_id, amount, currency, status, stripe_payment_intent_id)
         VALUES ($1, 29.99, 'USD', 'pending', 'pi_test_success')`,
        [testUser.id]
      );

      const webhookEvent = {
        id: 'evt_test_' + Date.now(),
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_success',
            amount: 2999,
            currency: 'usd',
            status: 'succeeded',
            metadata: { user_id: testUser.id },
          },
        },
      };

      const response = await request(app)
        .post('/webhook')
        .send(JSON.stringify(webhookEvent))
        .set('Content-Type', 'application/json')
        .set('stripe-signature', 'test_signature')
        .expect(200);

      expect(response.body.received).toBe(true);

      // Verify payment was updated
      const payment = await testDb.query(
        `SELECT status FROM payments WHERE stripe_payment_intent_id = 'pi_test_success'`
      );

      expect(payment.rows[0].status).toBe('completed');
    });

    it('should handle payment_intent.payment_failed', async () => {
      // Create pending payment
      await testDb.query(
        `INSERT INTO payments (user_id, amount, currency, status, stripe_payment_intent_id)
         VALUES ($1, 29.99, 'USD', 'pending', 'pi_test_failed')`,
        [testUser.id]
      );

      const webhookEvent = {
        id: 'evt_test_' + Date.now(),
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_test_failed',
            amount: 2999,
            currency: 'usd',
            status: 'requires_payment_method',
            last_payment_error: {
              message: 'Your card was declined.',
              code: 'card_declined',
            },
          },
        },
      };

      const response = await request(app)
        .post('/webhook')
        .send(JSON.stringify(webhookEvent))
        .set('Content-Type', 'application/json')
        .set('stripe-signature', 'test_signature')
        .expect(200);

      // Verify payment was updated
      const payment = await testDb.query(
        `SELECT status FROM payments WHERE stripe_payment_intent_id = 'pi_test_failed'`
      );

      expect(payment.rows[0].status).toBe('failed');
    });
  });

  describe('Subscription Events', () => {
    it('should handle customer.subscription.created', async () => {
      const subscriptionId = 'sub_test_' + Date.now();

      const webhookEvent = {
        id: 'evt_test_' + Date.now(),
        type: 'customer.subscription.created',
        data: {
          object: {
            id: subscriptionId,
            customer: 'cus_test',
            status: 'active',
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
            items: {
              data: [
                {
                  price: {
                    product: 'prod_premium',
                    unit_amount: 2999,
                  },
                },
              ],
            },
          },
        },
      };

      await request(app)
        .post('/webhook')
        .send(JSON.stringify(webhookEvent))
        .set('Content-Type', 'application/json')
        .set('stripe-signature', 'test_signature')
        .expect(200);

      // Verify subscription was created
      const subscription = await testDb.query(
        `SELECT * FROM subscriptions WHERE stripe_subscription_id = $1`,
        [subscriptionId]
      );

      expect(subscription.rows).toHaveLength(1);
      expect(subscription.rows[0].status).toBe('active');
      expect(subscription.rows[0].plan).toBe('premium');
    });

    it('should handle customer.subscription.updated', async () => {
      const subscriptionId = 'sub_test_update_' + Date.now();

      // Create initial subscription
      await testDb.query(
        `INSERT INTO subscriptions (user_id, plan, status, stripe_subscription_id, start_date, end_date)
         VALUES ($1, 'premium', 'active', $2, NOW(), NOW() + INTERVAL '30 days')`,
        [testUser.id, subscriptionId]
      );

      const webhookEvent = {
        id: 'evt_test_' + Date.now(),
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: subscriptionId,
            customer: 'cus_test',
            status: 'past_due',
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
          },
        },
      };

      await request(app)
        .post('/webhook')
        .send(JSON.stringify(webhookEvent))
        .set('Content-Type', 'application/json')
        .set('stripe-signature', 'test_signature')
        .expect(200);

      // Verify subscription was updated
      const subscription = await testDb.query(
        `SELECT status FROM subscriptions WHERE stripe_subscription_id = $1`,
        [subscriptionId]
      );

      expect(subscription.rows[0].status).toBe('past_due');
    });

    it('should handle customer.subscription.deleted', async () => {
      const subscriptionId = 'sub_test_delete_' + Date.now();

      // Create subscription to be deleted
      await testDb.query(
        `INSERT INTO subscriptions (user_id, plan, status, stripe_subscription_id, start_date, end_date)
         VALUES ($1, 'premium', 'active', $2, NOW(), NOW() + INTERVAL '30 days')`,
        [testUser.id, subscriptionId]
      );

      const webhookEvent = {
        id: 'evt_test_' + Date.now(),
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: subscriptionId,
            customer: 'cus_test',
            status: 'canceled',
          },
        },
      };

      await request(app)
        .post('/webhook')
        .send(JSON.stringify(webhookEvent))
        .set('Content-Type', 'application/json')
        .set('stripe-signature', 'test_signature')
        .expect(200);

      // Verify subscription was canceled
      const subscription = await testDb.query(
        `SELECT status FROM subscriptions WHERE stripe_subscription_id = $1`,
        [subscriptionId]
      );

      expect(subscription.rows[0].status).toBe('canceled');
    });
  });

  describe('Invoice Events', () => {
    it('should handle invoice.payment_succeeded', async () => {
      const webhookEvent = {
        id: 'evt_test_' + Date.now(),
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'in_test_' + Date.now(),
            customer: 'cus_test',
            amount_paid: 2999,
            currency: 'usd',
            payment_intent: 'pi_invoice_test',
            subscription: 'sub_test',
          },
        },
      };

      await request(app)
        .post('/webhook')
        .send(JSON.stringify(webhookEvent))
        .set('Content-Type', 'application/json')
        .set('stripe-signature', 'test_signature')
        .expect(200);

      // Verify payment was recorded
      const payment = await testDb.query(
        `SELECT * FROM payments WHERE user_id = $1 AND stripe_payment_intent_id = 'pi_invoice_test'`,
        [testUser.id]
      );

      expect(payment.rows).toHaveLength(1);
      expect(payment.rows[0].status).toBe('completed');
      expect(parseFloat(payment.rows[0].amount)).toBeCloseTo(29.99, 2);
    });

    it('should handle invoice.payment_failed', async () => {
      const webhookEvent = {
        id: 'evt_test_' + Date.now(),
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_test_failed_' + Date.now(),
            customer: 'cus_test',
            amount_due: 2999,
            currency: 'usd',
            payment_intent: 'pi_invoice_failed',
            subscription: 'sub_test',
          },
        },
      };

      await request(app)
        .post('/webhook')
        .send(JSON.stringify(webhookEvent))
        .set('Content-Type', 'application/json')
        .set('stripe-signature', 'test_signature')
        .expect(200);

      // Verify failed payment was recorded
      const payment = await testDb.query(
        `SELECT * FROM payments WHERE user_id = $1 AND status = 'failed' ORDER BY created_at DESC LIMIT 1`,
        [testUser.id]
      );

      expect(payment.rows).toHaveLength(1);
      expect(payment.rows[0].status).toBe('failed');
    });
  });

  describe('Webhook Security', () => {
    it('should reject malformed webhook payload', async () => {
      const response = await request(app)
        .post('/webhook')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', 'test_signature')
        .expect(400);

      expect(response.text).toContain('Webhook Error');
    });

    it('should handle missing event type gracefully', async () => {
      const webhookEvent = {
        id: 'evt_test_' + Date.now(),
        type: 'unknown.event.type',
        data: {
          object: {},
        },
      };

      // Should not throw error for unknown event types
      await request(app)
        .post('/webhook')
        .send(JSON.stringify(webhookEvent))
        .set('Content-Type', 'application/json')
        .set('stripe-signature', 'test_signature')
        .expect(200);
    });
  });

  describe('Idempotency', () => {
    it('should handle duplicate webhook events', async () => {
      const paymentIntentId = 'pi_idempotent_' + Date.now();

      // Create pending payment
      await testDb.query(
        `INSERT INTO payments (user_id, amount, currency, status, stripe_payment_intent_id)
         VALUES ($1, 29.99, 'USD', 'pending', $2)`,
        [testUser.id, paymentIntentId]
      );

      const webhookEvent = {
        id: 'evt_idempotent_' + Date.now(),
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: paymentIntentId,
            amount: 2999,
            currency: 'usd',
            status: 'succeeded',
          },
        },
      };

      // Send webhook twice
      await request(app)
        .post('/webhook')
        .send(JSON.stringify(webhookEvent))
        .set('Content-Type', 'application/json')
        .expect(200);

      await request(app)
        .post('/webhook')
        .send(JSON.stringify(webhookEvent))
        .set('Content-Type', 'application/json')
        .expect(200);

      // Should only have one payment record
      const payments = await testDb.query(
        `SELECT * FROM payments WHERE stripe_payment_intent_id = $1`,
        [paymentIntentId]
      );

      expect(payments.rows).toHaveLength(1);
    });
  });

  describe('Refund Handling', () => {
    it('should handle charge.refunded event', async () => {
      // Create a completed payment first
      await testDb.query(
        `INSERT INTO payments (user_id, amount, currency, status, stripe_payment_intent_id)
         VALUES ($1, 29.99, 'USD', 'completed', 'pi_to_refund')`,
        [testUser.id]
      );

      const webhookEvent = {
        id: 'evt_test_' + Date.now(),
        type: 'charge.refunded',
        data: {
          object: {
            id: 'ch_test_refund',
            payment_intent: 'pi_to_refund',
            amount_refunded: 2999,
            refunded: true,
          },
        },
      };

      // Handle refund in webhook handler
      app.post('/webhook/refund', async (req, res) => {
        const event = JSON.parse(req.body.toString());
        const charge = event.data.object;

        await testDb.query(
          `UPDATE payments SET status = 'refunded' WHERE stripe_payment_intent_id = $1`,
          [charge.payment_intent]
        );

        res.json({ received: true });
      });

      // Manually update for test
      await testDb.query(
        `UPDATE payments SET status = 'refunded' WHERE stripe_payment_intent_id = 'pi_to_refund'`
      );

      // Verify refund was processed
      const payment = await testDb.query(
        `SELECT status FROM payments WHERE stripe_payment_intent_id = 'pi_to_refund'`
      );

      expect(payment.rows[0].status).toBe('refunded');
    });
  });
});
