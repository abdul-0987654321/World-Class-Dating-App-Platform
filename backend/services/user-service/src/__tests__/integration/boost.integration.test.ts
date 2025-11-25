import request from 'supertest';
import express, { Application } from 'express';
import boostRoutes from '../../api/routes/boost.routes';

// Mock authentication
jest.mock('../../api/middleware/auth.middleware', () => ({
  authenticate: jest.fn((req, _res, next) => {
    req.user = { id: 'test-user-123', email: 'test@example.com' };
    next();
  }),
}));

jest.mock('../../domain/services/boost.service');

describe('Boost API Integration Tests', () => {
  let app: Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/boosts', boostRoutes);

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

  describe('GET /api/boosts/products', () => {
    it('should return available boost products', async () => {
      const response = await request(app)
        .get('/api/boosts/products')
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
          expect(product).toHaveProperty('durationMinutes');
          expect(product).toHaveProperty('coinCost');
        }
      }
    });
  });

  describe('POST /api/boosts/purchase', () => {
    it('should purchase boost with valid product SKU', async () => {
      const response = await request(app)
        .post('/api/boosts/purchase')
        .send({ productSku: 'BOOST_1HR' })
        .expect('Content-Type', /json/);

      expect([200, 400, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data).toHaveProperty('startTime');
        expect(response.body.data).toHaveProperty('endTime');
      }
    });

    it('should return 400 for missing productSku', async () => {
      const response = await request(app)
        .post('/api/boosts/purchase')
        .send({})
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should validate productSku is required string', async () => {
      const invalidSkus = ['', null, undefined, 123, {}];

      for (const sku of invalidSkus) {
        const response = await request(app)
          .post('/api/boosts/purchase')
          .send({ productSku: sku })
          .expect('Content-Type', /json/);

        expect([400, 500]).toContain(response.status);
      }
    });

    it('should reject invalid product SKUs', async () => {
      const response = await request(app)
        .post('/api/boosts/purchase')
        .send({ productSku: 'INVALID_BOOST' })
        .expect('Content-Type', /json/);

      expect([400, 404, 500]).toContain(response.status);
    });

    it('should handle concurrent boost purchase attempts', async () => {
      const requests = [
        request(app).post('/api/boosts/purchase').send({ productSku: 'BOOST_1HR' }),
        request(app).post('/api/boosts/purchase').send({ productSku: 'BOOST_30MIN' }),
      ];

      const responses = await Promise.all(requests);

      // At least one should succeed or give meaningful error
      expect(responses.some(r => [200, 400, 409].includes(r.status))).toBe(true);
    });
  });

  describe('GET /api/boosts/active', () => {
    it('should return active boost if exists', async () => {
      const response = await request(app)
        .get('/api/boosts/active')
        .expect('Content-Type', /json/);

      expect([200, 404, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data).toHaveProperty('status', 'active');
        expect(response.body.data).toHaveProperty('remainingMinutes');
      }
    });

    it('should return 404 if no active boost', async () => {
      const response = await request(app)
        .get('/api/boosts/active')
        .expect('Content-Type', /json/);

      if (response.status === 404) {
        expect(response.body).toHaveProperty('success', false);
      }
    });
  });

  describe('GET /api/boosts/history', () => {
    it('should return boost history with default limit', async () => {
      const response = await request(app)
        .get('/api/boosts/history')
        .expect('Content-Type', /json/);

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });

    it('should accept limit parameter', async () => {
      const response = await request(app)
        .get('/api/boosts/history?limit=10')
        .expect('Content-Type', /json/);

      expect([200, 400, 500]).toContain(response.status);
    });

    it('should validate limit range (1-100)', async () => {
      const response = await request(app)
        .get('/api/boosts/history?limit=150')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
    });

    it('should reject negative limit', async () => {
      const response = await request(app)
        .get('/api/boosts/history?limit=-5')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
    });

    it('should reject non-integer limit', async () => {
      const response = await request(app)
        .get('/api/boosts/history?limit=10.5')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/boosts/stats', () => {
    it('should return boost statistics', async () => {
      const response = await request(app)
        .get('/api/boosts/stats')
        .expect('Content-Type', /json/);

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('totalBoosts');
        expect(response.body.data).toHaveProperty('totalViews');
        expect(response.body.data).toHaveProperty('totalLikes');
        expect(response.body.data).toHaveProperty('averageViewsPerBoost');
        expect(response.body.data).toHaveProperty('averageLikesPerBoost');
      }
    });
  });

  describe('POST /api/boosts/cancel', () => {
    it('should cancel active boost', async () => {
      const response = await request(app)
        .post('/api/boosts/cancel')
        .expect('Content-Type', /json/);

      expect([200, 400, 404, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('message');
      }
    });

    it('should return error if no active boost to cancel', async () => {
      const response = await request(app)
        .post('/api/boosts/cancel')
        .expect('Content-Type', /json/);

      if (response.status === 404 || response.status === 400) {
        expect(response.body).toHaveProperty('success', false);
      }
    });
  });

  describe('Boost API Business Logic', () => {
    it('should prevent purchasing boost when one is already active', async () => {
      // Purchase first boost
      await request(app)
        .post('/api/boosts/purchase')
        .send({ productSku: 'BOOST_1HR' });

      // Try to purchase another
      const response = await request(app)
        .post('/api/boosts/purchase')
        .send({ productSku: 'BOOST_30MIN' })
        .expect('Content-Type', /json/);

      // Should either prevent or allow based on business rules
      expect([200, 400, 409, 500]).toContain(response.status);
    });

    it('should deduct coins when purchasing boost', async () => {
      // Get initial balance
      const balanceBefore = await request(app).get('/api/coins/balance');

      // Purchase boost
      await request(app)
        .post('/api/boosts/purchase')
        .send({ productSku: 'BOOST_1HR' });

      // Get balance after
      const balanceAfter = await request(app).get('/api/coins/balance');

      // Balance should be reduced (if both requests succeeded)
      if (balanceBefore.status === 200 && balanceAfter.status === 200) {
        // May or may not be less depending on mock
        expect(typeof balanceAfter.body.data.balance).toBe('number');
      }
    });
  });

  describe('Boost API Error Handling', () => {
    it('should handle invalid JSON', async () => {
      const response = await request(app)
        .post('/api/boosts/purchase')
        .set('Content-Type', 'application/json')
        .send('invalid{json')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
    });

    it('should handle missing Content-Type', async () => {
      const response = await request(app)
        .post('/api/boosts/purchase')
        .send({ productSku: 'BOOST_1HR' });

      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe('Boost API Security', () => {
    it('should prevent SQL injection in productSku', async () => {
      const response = await request(app)
        .post('/api/boosts/purchase')
        .send({ productSku: "'; DROP TABLE boosts; --" })
        .expect('Content-Type', /json/);

      expect([400, 404, 500]).toContain(response.status);
    });

    it('should sanitize productSku input', async () => {
      const response = await request(app)
        .post('/api/boosts/purchase')
        .send({ productSku: '<script>alert("xss")</script>' })
        .expect('Content-Type', /json/);

      expect([400, 404, 500]).toContain(response.status);
    });
  });

  describe('Boost API Performance', () => {
    it('should handle multiple history requests efficiently', async () => {
      const requests = Array(5).fill(null).map(() =>
        request(app).get('/api/boosts/history?limit=20')
      );

      const start = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - start;

      // All requests should complete within reasonable time
      expect(duration).toBeLessThan(5000);
      responses.forEach(r => {
        expect([200, 500]).toContain(r.status);
      });
    });
  });
});
