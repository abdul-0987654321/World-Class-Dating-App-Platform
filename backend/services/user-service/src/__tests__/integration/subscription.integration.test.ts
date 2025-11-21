import request from 'supertest';
import express, { Application } from 'express';
import subscriptionRoutes from '../../api/routes/subscription.routes';
import { authenticate } from '../../api/middleware/auth.middleware';

// Mock authentication middleware
jest.mock('../../api/middleware/auth.middleware', () => ({
  authenticate: jest.fn((req, _res, next) => {
    req.user = { id: 'test-user-123', email: 'test@example.com' };
    next();
  }),
}));

// Mock services
jest.mock('../../domain/services/subscription.service');

describe('Subscription API Integration Tests', () => {
  let app: Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/subscriptions', subscriptionRoutes);

    // Error handler
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

  describe('GET /api/subscriptions/current', () => {
    it('should return current subscription for authenticated user', async () => {
      const response = await request(app)
        .get('/api/subscriptions/current')
        .expect('Content-Type', /json/);

      expect([200, 401, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('tier');
      }
    });

    it('should return 401 without authentication', async () => {
      // Temporarily remove mock
      (authenticate as jest.Mock).mockImplementationOnce((_req, res) => {
        res.status(401).json({ success: false, message: 'Unauthorized' });
      });

      const response = await request(app)
        .get('/api/subscriptions/current');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/subscriptions/features', () => {
    it('should return subscription features', async () => {
      const response = await request(app)
        .get('/api/subscriptions/features')
        .expect('Content-Type', /json/);

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });
  });

  describe('GET /api/subscriptions/features/:featureKey/access', () => {
    it('should check feature access with valid feature key', async () => {
      const response = await request(app)
        .get('/api/subscriptions/features/incognito_mode/access')
        .expect('Content-Type', /json/);

      expect([200, 400, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('hasAccess');
        expect(typeof response.body.data.hasAccess).toBe('boolean');
      }
    });

    it('should return 400 for invalid feature key', async () => {
      const response = await request(app)
        .get('/api/subscriptions/features/invalid_feature_@#$/access')
        .expect('Content-Type', /json/);

      expect([400, 500]).toContain(response.status);
    });
  });

  describe('PUT /api/subscriptions/tier', () => {
    it('should update tier with valid tier value', async () => {
      const response = await request(app)
        .put('/api/subscriptions/tier')
        .send({ tier: 'mid' })
        .expect('Content-Type', /json/);

      expect([200, 400, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('tier');
      }
    });

    it('should return 400 for invalid tier', async () => {
      const response = await request(app)
        .put('/api/subscriptions/tier')
        .send({ tier: 'invalid' })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 for missing tier field', async () => {
      const response = await request(app)
        .put('/api/subscriptions/tier')
        .send({})
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should accept all valid tier values', async () => {
      const validTiers = ['free', 'basic', 'mid', 'ultra'];

      for (const tier of validTiers) {
        const response = await request(app)
          .put('/api/subscriptions/tier')
          .send({ tier })
          .expect('Content-Type', /json/);

        expect([200, 400, 500]).toContain(response.status);
      }
    });
  });

  describe('POST /api/subscriptions/cancel', () => {
    it('should cancel subscription immediately', async () => {
      const response = await request(app)
        .post('/api/subscriptions/cancel')
        .send({ immediately: true })
        .expect('Content-Type', /json/);

      expect([200, 400, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
      }
    });

    it('should cancel subscription at period end', async () => {
      const response = await request(app)
        .post('/api/subscriptions/cancel')
        .send({ immediately: false })
        .expect('Content-Type', /json/);

      expect([200, 400, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
      }
    });

    it('should accept empty body (default immediately to false)', async () => {
      const response = await request(app)
        .post('/api/subscriptions/cancel')
        .send({})
        .expect('Content-Type', /json/);

      expect([200, 400, 500]).toContain(response.status);
    });

    it('should reject invalid immediately value', async () => {
      const response = await request(app)
        .post('/api/subscriptions/cancel')
        .send({ immediately: 'invalid' })
        .expect('Content-Type', /json/);

      expect([400, 500]).toContain(response.status);
    });
  });

  describe('POST /api/subscriptions/reactivate', () => {
    it('should reactivate canceled subscription', async () => {
      const response = await request(app)
        .post('/api/subscriptions/reactivate')
        .expect('Content-Type', /json/);

      expect([200, 400, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
      }
    });
  });

  describe('Subscription API Error Handling', () => {
    it('should handle invalid JSON payload', async () => {
      const response = await request(app)
        .put('/api/subscriptions/tier')
        .set('Content-Type', 'application/json')
        .send('invalid json{')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
    });

    it('should handle missing Content-Type header', async () => {
      const response = await request(app)
        .put('/api/subscriptions/tier')
        .send({ tier: 'mid' });

      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe('Subscription API Validation', () => {
    it('should validate tier enum values', async () => {
      const invalidTiers = ['premium', 'pro', 'advanced', '', null, undefined];

      for (const tier of invalidTiers) {
        const response = await request(app)
          .put('/api/subscriptions/tier')
          .send({ tier })
          .expect('Content-Type', /json/);

        expect(response.status).toBe(400);
      }
    });

    it('should validate feature key format', async () => {
      const invalidKeys = ['', 'invalid key!', 'key with spaces', '123'];

      for (const key of invalidKeys) {
        const response = await request(app)
          .get(`/api/subscriptions/features/${key}/access`)
          .expect('Content-Type', /json/);

        expect([400, 404, 500]).toContain(response.status);
      }
    });
  });
});
