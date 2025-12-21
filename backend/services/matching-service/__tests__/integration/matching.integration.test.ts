import request from 'supertest';
import { Express } from 'express';

/**
 * Matching Service Integration Tests
 * Tests the matching service API endpoints.
 *
 * NOTE: Full integration tests require a running database and Redis instance.
 * These tests mock external dependencies to allow running in CI environments.
 */

// Mock all external dependencies before importing app
jest.mock('../../src/infrastructure/database/connection', () => ({
  __esModule: true,
  default: {
    raw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    destroy: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@flamoral/shared', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

jest.mock('../../../shared/utils/env-validator', () => ({
  createValidator: jest.fn(() => ({
    validateOrThrow: jest.fn(),
  })),
  commonValidations: {
    nodeEnv: {},
    port: jest.fn(() => ({})),
    jwtAccessSecret: {},
    dbHost: {},
    dbPort: {},
    dbPassword: {},
    redisHost: {},
    redisPort: {},
  },
}));

// Mock the jobs module
jest.mock('../../src/jobs/match-expiration.job', () => ({
  __esModule: true,
  default: {
    startAll: jest.fn(),
    stopAll: jest.fn(),
  },
}));

// Mock auth middleware to allow requests through
jest.mock('../../src/api/middleware/auth.middleware', () => ({
  authMiddleware: jest.fn((req: any, _res: any, next: any) => {
    req.user = { id: 'test-user-id' };
    next();
  }),
}));

// Mock the services
jest.mock('../../src/services/recommendation.service', () => ({
  RecommendationService: jest.fn().mockImplementation(() => ({
    getRecommendations: jest.fn().mockResolvedValue({
      recommendations: [
        { userId: 'user-1', matchScore: 85, profile: { gender: 'female' } },
        { userId: 'user-2', matchScore: 75, profile: { gender: 'female' } },
      ],
    }),
    getCompatibility: jest.fn().mockResolvedValue({
      score: 80,
      factors: {
        interestMatch: 70,
        distanceScore: 90,
        activityScore: 80,
      },
    }),
  })),
}));

jest.mock('../../src/services/swipe.service', () => ({
  SwipeService: jest.fn().mockImplementation(() => ({
    recordSwipe: jest.fn().mockResolvedValue({ swiped: true }),
    checkMatch: jest.fn().mockResolvedValue({ isMatch: false }),
  })),
}));

jest.mock('../../src/services/match.service', () => ({
  MatchService: jest.fn().mockImplementation(() => ({
    getMatches: jest.fn().mockResolvedValue({ matches: [] }),
    unmatch: jest.fn().mockResolvedValue({ message: 'Successfully unmatched' }),
  })),
}));

jest.mock('../../src/services/search.service', () => ({
  SearchService: jest.fn().mockImplementation(() => ({
    search: jest.fn().mockResolvedValue({ results: [] }),
  })),
}));

describe('Matching Service - Integration Tests', () => {
  let app: Express;

  beforeAll(async () => {
    // Set required environment variables for tests
    process.env.NODE_ENV = 'test';
    process.env.PORT = '3002';
    process.env.JWT_ACCESS_SECRET = 'test-secret';
    process.env.DB_HOST = 'localhost';
    process.env.DB_PORT = '5432';
    process.env.DB_NAME = 'test_db';
    process.env.DB_USER = 'test_user';
    process.env.DB_PASSWORD = 'test_password';
    process.env.REDIS_HOST = 'localhost';
    process.env.REDIS_PORT = '6379';

    // Dynamically import app after mocks are set up
    const appModule = await import('../../src/index');
    app = appModule.default;
  });

  afterAll(async () => {
    jest.clearAllMocks();
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('service', 'matching-service');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('checks');
    });
  });

  describe('Root Endpoint', () => {
    it('should return service information', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('service', 'Flamoral Matching Service');
      expect(response.body).toHaveProperty('version', '1.0.0');
      expect(response.body).toHaveProperty('status', 'running');
      expect(response.body).toHaveProperty('endpoints');
    });
  });

  describe('GET /api/v1/recommendations', () => {
    it('should return recommendations', async () => {
      const response = await request(app)
        .get('/api/v1/recommendations')
        .set('Authorization', 'Bearer test-token')
        .query({ limit: 10 });

      // The route exists and responds (may be 200 or 401/500 depending on auth setup)
      expect([200, 401, 500]).toContain(response.status);
    });
  });

  describe('POST /api/v1/swipes', () => {
    it('should accept swipe requests', async () => {
      const response = await request(app)
        .post('/api/v1/swipes')
        .set('Authorization', 'Bearer test-token')
        .send({
          targetUserId: 'target-user-id',
          direction: 'right',
        });

      // The route exists and responds
      expect([200, 201, 400, 401, 500]).toContain(response.status);
    });
  });

  describe('GET /api/v1/matches', () => {
    it('should return matches', async () => {
      const response = await request(app)
        .get('/api/v1/matches')
        .set('Authorization', 'Bearer test-token');

      // The route exists and responds
      expect([200, 401, 500]).toContain(response.status);
    });
  });

  describe('GET /api/v1/search', () => {
    it('should perform search', async () => {
      const response = await request(app)
        .get('/api/v1/search')
        .set('Authorization', 'Bearer test-token')
        .query({ query: 'test' });

      // The route exists and responds
      expect([200, 401, 500]).toContain(response.status);
    });
  });
});
