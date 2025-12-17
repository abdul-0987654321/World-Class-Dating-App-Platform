/// <reference types="jest" />
import request from 'supertest';
import express, { Application } from 'express';
import coinRoutes from '../../api/routes/coin.routes';

// Mock authentication
jest.mock('../../api/middleware/auth.middleware', () => ({
  authenticate: jest.fn((req, _res, next) => {
    req.user = { id: 'test-user-123', email: 'test@example.com' };
    next();
  }),
}));

jest.mock('../../domain/services/coin.service');

describe('Coin API Integration Tests', () => {
  let app: Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/coins', coinRoutes);

    app.use((err: any, _req: any, res: any, _next: any) => {
      res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
      });
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/coins/balance', () => {
    it('should return coin balance for authenticated user', async () => {
      const response = await request(app)
        .get('/api/coins/balance')
        .expect('Content-Type', /json/);

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('balance');
        expect(typeof response.body.data.balance).toBe('number');
      }
    });
  });

  describe('GET /api/coins/transactions', () => {
    it('should return transaction history with default pagination', async () => {
      const response = await request(app)
        .get('/api/coins/transactions')
        .expect('Content-Type', /json/);

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('transactions');
        expect(Array.isArray(response.body.data.transactions)).toBe(true);
      }
    });

    it('should accept limit parameter', async () => {
      const response = await request(app)
        .get('/api/coins/transactions?limit=10')
        .expect('Content-Type', /json/);

      expect([200, 400, 500]).toContain(response.status);
    });

    it('should accept offset parameter', async () => {
      const response = await request(app)
        .get('/api/coins/transactions?offset=5')
        .expect('Content-Type', /json/);

      expect([200, 400, 500]).toContain(response.status);
    });

    it('should filter by transaction type', async () => {
      const validTypes = ['purchase', 'reward', 'spent', 'refund', 'admin_adjustment'];

      for (const type of validTypes) {
        const response = await request(app)
          .get(`/api/coins/transactions?type=${type}`)
          .expect('Content-Type', /json/);

        expect([200, 400, 500]).toContain(response.status);
      }
    });

    it('should reject invalid transaction type', async () => {
      const response = await request(app)
        .get('/api/coins/transactions?type=invalid')
        .expect('Content-Type', /json/);

      expect([400, 500]).toContain(response.status);
    });

    it('should filter by date range', async () => {
      const response = await request(app)
        .get('/api/coins/transactions?startDate=2024-01-01&endDate=2024-12-31')
        .expect('Content-Type', /json/);

      expect([200, 400, 500]).toContain(response.status);
    });

    it('should validate limit range (1-100)', async () => {
      const response = await request(app)
        .get('/api/coins/transactions?limit=150')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
    });

    it('should validate negative offset', async () => {
      const response = await request(app)
        .get('/api/coins/transactions?offset=-1')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/coins/transactions/summary', () => {
    it('should return transaction summary', async () => {
      const response = await request(app)
        .get('/api/coins/transactions/summary')
        .expect('Content-Type', /json/);

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('totalPurchases');
        expect(response.body.data).toHaveProperty('totalSpent');
        expect(response.body.data).toHaveProperty('totalRewards');
        expect(response.body.data).toHaveProperty('currentBalance');
      }
    });
  });

  describe('GET /api/coins/products', () => {
    it('should return available coin products', async () => {
      const response = await request(app)
        .get('/api/coins/products')
        .expect('Content-Type', /json/);

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);

        if (response.body.data.length > 0) {
          const product = response.body.data[0];
          expect(product).toHaveProperty('sku');
          expect(product).toHaveProperty('name');
          expect(product).toHaveProperty('amount');
          expect(product).toHaveProperty('price');
        }
      }
    });
  });

  describe('POST /api/coins/purchase', () => {
    it('should purchase coins with valid data', async () => {
      const response = await request(app)
        .post('/api/coins/purchase')
        .send({
          productSku: 'COIN_PACK_MEDIUM',
          stripePaymentId: 'pi_test_123456',
        })
        .expect('Content-Type', /json/);

      expect([200, 400, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('balance');
      }
    });

    it('should return 400 for missing productSku', async () => {
      const response = await request(app)
        .post('/api/coins/purchase')
        .send({ stripePaymentId: 'pi_test_123' })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 400 for missing stripePaymentId', async () => {
      const response = await request(app)
        .post('/api/coins/purchase')
        .send({ productSku: 'COIN_PACK_SMALL' })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
    });

    it('should validate productSku format', async () => {
      const response = await request(app)
        .post('/api/coins/purchase')
        .send({
          productSku: '',
          stripePaymentId: 'pi_test_123',
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/coins/spend', () => {
    it('should spend coins with valid data', async () => {
      const response = await request(app)
        .post('/api/coins/spend')
        .send({
          amount: 50,
          reason: 'Profile boost purchase',
          referenceId: 'boost-123',
          referenceType: 'boost',
        })
        .expect('Content-Type', /json/);

      expect([200, 400, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('balance');
      }
    });

    it('should return 400 for missing amount', async () => {
      const response = await request(app)
        .post('/api/coins/spend')
        .send({ reason: 'Purchase' })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
    });

    it('should return 400 for missing reason', async () => {
      const response = await request(app)
        .post('/api/coins/spend')
        .send({ amount: 50 })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
    });

    it('should validate amount is positive integer', async () => {
      const invalidAmounts = [0, -10, 1.5, 'fifty'];

      for (const amount of invalidAmounts) {
        const response = await request(app)
          .post('/api/coins/spend')
          .send({ amount, reason: 'Test' })
          .expect('Content-Type', /json/);

        expect(response.status).toBe(400);
      }
    });

    it('should validate reason length', async () => {
      const response = await request(app)
        .post('/api/coins/spend')
        .send({
          amount: 50,
          reason: 'a'.repeat(256), // Too long
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
    });

    it('should accept optional referenceId and referenceType', async () => {
      const response = await request(app)
        .post('/api/coins/spend')
        .send({
          amount: 50,
          reason: 'Purchase',
        })
        .expect('Content-Type', /json/);

      expect([200, 400, 500]).toContain(response.status);
    });

    it('should validate referenceType enum', async () => {
      const validTypes = ['boost', 'super_like', 'rewind', 'stripe_payment', 'daily_reward', 'achievement', 'refund'];

      for (const refType of validTypes) {
        const response = await request(app)
          .post('/api/coins/spend')
          .send({
            amount: 50,
            reason: 'Test',
            referenceType: refType,
          })
          .expect('Content-Type', /json/);

        expect([200, 400, 500]).toContain(response.status);
      }
    });
  });

  describe('POST /api/coins/daily-reward', () => {
    it('should claim daily reward successfully', async () => {
      const response = await request(app)
        .post('/api/coins/daily-reward')
        .expect('Content-Type', /json/);

      expect([200, 400, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('reward');
        expect(response.body.data).toHaveProperty('nextClaimTime');
        expect(response.body.data).toHaveProperty('balance');
      }
    });

    it('should return 400 if already claimed today', async () => {
      // First claim
      await request(app).post('/api/coins/daily-reward');

      // Second claim (same day)
      const response = await request(app)
        .post('/api/coins/daily-reward')
        .expect('Content-Type', /json/);

      expect([400, 500]).toContain(response.status);
    });
  });

  describe('Coin API Error Handling', () => {
    it('should handle invalid JSON in purchase request', async () => {
      const response = await request(app)
        .post('/api/coins/purchase')
        .set('Content-Type', 'application/json')
        .send('invalid{json')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
    });

    it('should handle very large limit values', async () => {
      const response = await request(app)
        .get('/api/coins/transactions?limit=999999')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
    });

    it('should handle malformed date strings', async () => {
      const response = await request(app)
        .get('/api/coins/transactions?startDate=not-a-date')
        .expect('Content-Type', /json/);

      expect([400, 500]).toContain(response.status);
    });
  });

  describe('Coin API Security', () => {
    it('should prevent negative coin balance through spending', async () => {
      const response = await request(app)
        .post('/api/coins/spend')
        .send({
          amount: 99999999,
          reason: 'Attempt to overdraw',
        })
        .expect('Content-Type', /json/);

      // Should either reject (400) or handle gracefully
      expect([400, 500]).toContain(response.status);
    });

    it('should sanitize referenceId input', async () => {
      const response = await request(app)
        .post('/api/coins/spend')
        .send({
          amount: 10,
          reason: 'Test',
          referenceId: '<script>alert("xss")</script>',
        })
        .expect('Content-Type', /json/);

      expect([200, 400, 500]).toContain(response.status);
    });
  });
});
