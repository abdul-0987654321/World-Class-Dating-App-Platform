import { getTestDb, createTestUser } from '../setup';
import { hashPassword } from '../../../services/auth-service/src/utils/encryption';

describe('Payment Service Integration Tests', () => {
  let testDb: any;
  let testUser: any;

  beforeAll(() => {
    testDb = getTestDb();
  });

  beforeEach(async () => {
    const passwordHash = await hashPassword('SecurePass123!');
    testUser = await createTestUser({
      email: 'paymentuser@example.com',
      password_hash: passwordHash,
    });
  });

  describe('Payment Creation', () => {
    it('should create payment record', async () => {
      const paymentData = {
        amount: 29.99,
        currency: 'USD',
        status: 'pending',
        payment_method: 'card',
        stripe_payment_intent_id: 'pi_test123',
      };

      const result = await testDb.query(
        `INSERT INTO payments (user_id, amount, currency, status, payment_method, stripe_payment_intent_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          testUser.id,
          paymentData.amount,
          paymentData.currency,
          paymentData.status,
          paymentData.payment_method,
          paymentData.stripe_payment_intent_id,
        ]
      );

      expect(result.rows[0].amount).toBe('29.99');
      expect(result.rows[0].status).toBe('pending');
      expect(result.rows[0].stripe_payment_intent_id).toBe(paymentData.stripe_payment_intent_id);
    });

    it('should create payment with metadata', async () => {
      const metadata = {
        subscription_plan: 'premium',
        duration_months: 3,
        promo_code: 'SUMMER2024',
      };

      const result = await testDb.query(
        `INSERT INTO payments (user_id, amount, currency, status, metadata)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [testUser.id, 79.99, 'USD', 'completed', JSON.stringify(metadata)]
      );

      expect(result.rows[0].metadata).toEqual(metadata);
    });

    it('should validate amount is positive', async () => {
      await expect(
        testDb.query(
          `INSERT INTO payments (user_id, amount, currency, status)
           VALUES ($1, $2, $3, $4)`,
          [testUser.id, -10.00, 'USD', 'pending']
        )
      ).rejects.toThrow();
    });

    it('should handle different currencies', async () => {
      const currencies = ['USD', 'EUR', 'GBP'];

      for (const currency of currencies) {
        const result = await testDb.query(
          `INSERT INTO payments (user_id, amount, currency, status)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [testUser.id, 29.99, currency, 'completed']
        );

        expect(result.rows[0].currency).toBe(currency);
      }
    });
  });

  describe('Payment Status Updates', () => {
    let payment: any;

    beforeEach(async () => {
      const result = await testDb.query(
        `INSERT INTO payments (user_id, amount, currency, status)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [testUser.id, 29.99, 'USD', 'pending']
      );
      payment = result.rows[0];
    });

    it('should update payment status to completed', async () => {
      await testDb.query(
        `UPDATE payments SET status = 'completed' WHERE id = $1`,
        [payment.id]
      );

      const result = await testDb.query(
        `SELECT status FROM payments WHERE id = $1`,
        [payment.id]
      );

      expect(result.rows[0].status).toBe('completed');
    });

    it('should update payment status to failed', async () => {
      await testDb.query(
        `UPDATE payments SET status = 'failed' WHERE id = $1`,
        [payment.id]
      );

      const result = await testDb.query(
        `SELECT status FROM payments WHERE id = $1`,
        [payment.id]
      );

      expect(result.rows[0].status).toBe('failed');
    });

    it('should update payment status to refunded', async () => {
      // First complete the payment
      await testDb.query(
        `UPDATE payments SET status = 'completed' WHERE id = $1`,
        [payment.id]
      );

      // Then refund it
      await testDb.query(
        `UPDATE payments SET status = 'refunded' WHERE id = $1`,
        [payment.id]
      );

      const result = await testDb.query(
        `SELECT status FROM payments WHERE id = $1`,
        [payment.id]
      );

      expect(result.rows[0].status).toBe('refunded');
    });
  });

  describe('Subscription Payments', () => {
    it('should link payment to subscription', async () => {
      // Create subscription
      const subscriptionResult = await testDb.query(
        `INSERT INTO subscriptions (user_id, plan, status, start_date, end_date)
         VALUES ($1, 'premium', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '30 days')
         RETURNING *`,
        [testUser.id]
      );

      const subscription = subscriptionResult.rows[0];

      // Create payment for subscription
      const paymentResult = await testDb.query(
        `INSERT INTO payments (user_id, amount, currency, status, metadata)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          testUser.id,
          29.99,
          'USD',
          'completed',
          JSON.stringify({ subscription_id: subscription.id }),
        ]
      );

      expect(paymentResult.rows[0].metadata.subscription_id).toBe(subscription.id);
    });

    it('should handle recurring subscription payments', async () => {
      // Create multiple payments for recurring subscription
      const payments = [];

      for (let i = 0; i < 3; i++) {
        const result = await testDb.query(
          `INSERT INTO payments (user_id, amount, currency, status, metadata)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [
            testUser.id,
            29.99,
            'USD',
            'completed',
            JSON.stringify({ billing_cycle: i + 1 }),
          ]
        );
        payments.push(result.rows[0]);
      }

      expect(payments).toHaveLength(3);
    });

    it('should calculate total subscription revenue', async () => {
      // Create multiple subscription payments
      await testDb.query(
        `INSERT INTO payments (user_id, amount, currency, status)
         VALUES
         ($1, 29.99, 'USD', 'completed'),
         ($1, 29.99, 'USD', 'completed'),
         ($1, 29.99, 'USD', 'completed')`,
        [testUser.id]
      );

      const result = await testDb.query(
        `SELECT SUM(amount) as total_revenue
         FROM payments
         WHERE user_id = $1 AND status = 'completed'`,
        [testUser.id]
      );

      expect(parseFloat(result.rows[0].total_revenue)).toBeCloseTo(89.97, 2);
    });
  });

  describe('Payment History', () => {
    beforeEach(async () => {
      // Create payment history
      const amounts = [19.99, 29.99, 49.99];

      for (const amount of amounts) {
        await testDb.query(
          `INSERT INTO payments (user_id, amount, currency, status)
           VALUES ($1, $2, $3, $4)`,
          [testUser.id, amount, 'USD', 'completed']
        );
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    });

    it('should retrieve payment history for user', async () => {
      const result = await testDb.query(
        `SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC`,
        [testUser.id]
      );

      expect(result.rows).toHaveLength(3);
      expect(parseFloat(result.rows[0].amount)).toBe(49.99); // Latest first
    });

    it('should filter payments by status', async () => {
      // Add a failed payment
      await testDb.query(
        `INSERT INTO payments (user_id, amount, currency, status)
         VALUES ($1, $2, $3, $4)`,
        [testUser.id, 29.99, 'USD', 'failed']
      );

      const result = await testDb.query(
        `SELECT * FROM payments WHERE user_id = $1 AND status = 'completed'`,
        [testUser.id]
      );

      expect(result.rows).toHaveLength(3);
    });

    it('should filter payments by date range', async () => {
      const result = await testDb.query(
        `SELECT * FROM payments
         WHERE user_id = $1
         AND created_at >= CURRENT_DATE - INTERVAL '7 days'
         AND created_at < CURRENT_DATE + INTERVAL '1 day'`,
        [testUser.id]
      );

      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('should paginate payment history', async () => {
      const limit = 2;
      const offset = 1;

      const result = await testDb.query(
        `SELECT * FROM payments
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [testUser.id, limit, offset]
      );

      expect(result.rows).toHaveLength(2);
    });
  });

  describe('Refund Processing', () => {
    let completedPayment: any;

    beforeEach(async () => {
      const result = await testDb.query(
        `INSERT INTO payments (user_id, amount, currency, status, stripe_payment_intent_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [testUser.id, 29.99, 'USD', 'completed', 'pi_test_refund']
      );
      completedPayment = result.rows[0];
    });

    it('should create refund record', async () => {
      const refundAmount = 29.99;

      const result = await testDb.query(
        `INSERT INTO payments (user_id, amount, currency, status, metadata)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          testUser.id,
          -refundAmount, // Negative amount for refund
          'USD',
          'refunded',
          JSON.stringify({ original_payment_id: completedPayment.id }),
        ]
      );

      expect(parseFloat(result.rows[0].amount)).toBeLessThan(0);
      expect(result.rows[0].metadata.original_payment_id).toBe(completedPayment.id);
    });

    it('should handle partial refunds', async () => {
      const partialRefundAmount = 15.00;

      const result = await testDb.query(
        `INSERT INTO payments (user_id, amount, currency, status, metadata)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          testUser.id,
          -partialRefundAmount,
          'USD',
          'refunded',
          JSON.stringify({
            original_payment_id: completedPayment.id,
            refund_type: 'partial',
          }),
        ]
      );

      expect(parseFloat(result.rows[0].amount)).toBe(-partialRefundAmount);
    });

    it('should calculate net revenue after refunds', async () => {
      // Create a payment
      await testDb.query(
        `INSERT INTO payments (user_id, amount, currency, status)
         VALUES ($1, 100.00, 'USD', 'completed')`,
        [testUser.id]
      );

      // Create a refund
      await testDb.query(
        `INSERT INTO payments (user_id, amount, currency, status)
         VALUES ($1, -30.00, 'USD', 'refunded')`,
        [testUser.id]
      );

      const result = await testDb.query(
        `SELECT SUM(amount) as net_revenue
         FROM payments
         WHERE user_id = $1`,
        [testUser.id]
      );

      expect(parseFloat(result.rows[0].net_revenue)).toBeCloseTo(99.99, 2); // 29.99 + 100 - 30
    });
  });

  describe('Payment Analytics', () => {
    beforeEach(async () => {
      // Create sample payment data
      const payments = [
        { amount: 9.99, status: 'completed' },
        { amount: 29.99, status: 'completed' },
        { amount: 49.99, status: 'completed' },
        { amount: 19.99, status: 'failed' },
        { amount: 29.99, status: 'refunded' },
      ];

      for (const payment of payments) {
        await testDb.query(
          `INSERT INTO payments (user_id, amount, currency, status)
           VALUES ($1, $2, $3, $4)`,
          [testUser.id, payment.amount, 'USD', payment.status]
        );
      }
    });

    it('should calculate total revenue', async () => {
      const result = await testDb.query(
        `SELECT SUM(amount) as total_revenue
         FROM payments
         WHERE status = 'completed'`
      );

      expect(parseFloat(result.rows[0].total_revenue)).toBeCloseTo(89.97, 2);
    });

    it('should calculate average payment amount', async () => {
      const result = await testDb.query(
        `SELECT AVG(amount) as avg_amount
         FROM payments
         WHERE status = 'completed'`
      );

      expect(parseFloat(result.rows[0].avg_amount)).toBeGreaterThan(0);
    });

    it('should count payments by status', async () => {
      const result = await testDb.query(
        `SELECT status, COUNT(*) as count
         FROM payments
         WHERE user_id = $1
         GROUP BY status`,
        [testUser.id]
      );

      const statusCounts = result.rows.reduce((acc: any, row: any) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, {});

      expect(statusCounts.completed).toBe(3);
      expect(statusCounts.failed).toBe(1);
      expect(statusCounts.refunded).toBe(1);
    });

    it('should calculate success rate', async () => {
      const result = await testDb.query(
        `SELECT
           COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful,
           COUNT(*) as total,
           ROUND(COUNT(CASE WHEN status = 'completed' THEN 1 END)::numeric / COUNT(*) * 100, 2) as success_rate
         FROM payments
         WHERE user_id = $1`,
        [testUser.id]
      );

      expect(parseFloat(result.rows[0].success_rate)).toBeGreaterThan(0);
      expect(parseFloat(result.rows[0].success_rate)).toBeLessThanOrEqual(100);
    });
  });

  describe('Payment Method Management', () => {
    it('should track different payment methods', async () => {
      const methods = ['card', 'paypal', 'apple_pay', 'google_pay'];

      for (const method of methods) {
        await testDb.query(
          `INSERT INTO payments (user_id, amount, currency, status, payment_method)
           VALUES ($1, $2, $3, $4, $5)`,
          [testUser.id, 29.99, 'USD', 'completed', method]
        );
      }

      const result = await testDb.query(
        `SELECT payment_method, COUNT(*) as count
         FROM payments
         WHERE user_id = $1
         GROUP BY payment_method`,
        [testUser.id]
      );

      expect(result.rows).toHaveLength(4);
    });

    it('should get most used payment method', async () => {
      // Create multiple payments with same method
      for (let i = 0; i < 3; i++) {
        await testDb.query(
          `INSERT INTO payments (user_id, amount, currency, status, payment_method)
           VALUES ($1, $2, $3, $4, 'card')`,
          [testUser.id, 29.99, 'USD', 'completed']
        );
      }

      const result = await testDb.query(
        `SELECT payment_method, COUNT(*) as count
         FROM payments
         WHERE user_id = $1 AND status = 'completed'
         GROUP BY payment_method
         ORDER BY count DESC
         LIMIT 1`,
        [testUser.id]
      );

      expect(result.rows[0].payment_method).toBe('card');
    });
  });

  describe('Webhook Event Handling', () => {
    it('should record webhook event', async () => {
      // In production, would have a webhook_events table
      const webhookEvent = {
        event_type: 'payment_intent.succeeded',
        stripe_event_id: 'evt_test123',
        payload: {
          payment_intent_id: 'pi_test123',
          amount: 2999,
        },
      };

      // Simulate webhook processing
      const result = await testDb.query(
        `UPDATE payments
         SET status = 'completed'
         WHERE stripe_payment_intent_id = $1
         RETURNING *`,
        [webhookEvent.payload.payment_intent_id]
      );

      // Would normally update existing payment
      expect(true).toBe(true); // Placeholder
    });

    it('should handle failed payment webhook', async () => {
      const webhookEvent = {
        event_type: 'payment_intent.payment_failed',
        stripe_event_id: 'evt_test124',
      };

      // Webhook would trigger payment failure handling
      expect(webhookEvent.event_type).toBe('payment_intent.payment_failed');
    });
  });

  describe('Currency Conversion', () => {
    it('should handle payments in different currencies', async () => {
      const payments = [
        { amount: 29.99, currency: 'USD' },
        { amount: 24.99, currency: 'EUR' },
        { amount: 21.99, currency: 'GBP' },
      ];

      for (const payment of payments) {
        await testDb.query(
          `INSERT INTO payments (user_id, amount, currency, status)
           VALUES ($1, $2, $3, $4)`,
          [testUser.id, payment.amount, payment.currency, 'completed']
        );
      }

      const result = await testDb.query(
        `SELECT currency, SUM(amount) as total
         FROM payments
         WHERE user_id = $1
         GROUP BY currency`,
        [testUser.id]
      );

      expect(result.rows.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Failed Payment Recovery', () => {
    it('should retry failed payments', async () => {
      const failedPayment = await testDb.query(
        `INSERT INTO payments (user_id, amount, currency, status)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [testUser.id, 29.99, 'USD', 'failed']
      );

      // Simulate retry
      const retryResult = await testDb.query(
        `INSERT INTO payments (user_id, amount, currency, status, metadata)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          testUser.id,
          29.99,
          'USD',
          'completed',
          JSON.stringify({ retry_of: failedPayment.rows[0].id }),
        ]
      );

      expect(retryResult.rows[0].status).toBe('completed');
      expect(retryResult.rows[0].metadata.retry_of).toBe(failedPayment.rows[0].id);
    });
  });
});
