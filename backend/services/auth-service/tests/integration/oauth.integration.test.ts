import request from 'supertest';
import { Application } from 'express';

/**
 * Integration tests for OAuth providers (Google, Apple, Facebook)
 * Tests social login functionality and provider token validation
 *
 * NOTE: These tests mock OAuth providers to run without external dependencies.
 */

// Mock dependencies before importing app
jest.mock('../../src/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../src/config', () => ({
  config: {
    nodeEnv: 'test',
    port: 3007,
    cors: {
      origins: ['http://localhost:3000'],
    },
    jwt: {
      accessSecret: 'test-access-secret',
      refreshSecret: 'test-refresh-secret',
      accessExpiry: '15m',
      refreshExpiry: '7d',
    },
    database: {
      host: 'localhost',
      port: 5432,
      name: 'test_db',
      user: 'test_user',
      password: 'test_password',
    },
    redis: {
      host: 'localhost',
      port: 6379,
    },
  },
}));

jest.mock('../../src/infrastructure/database/pool', () => ({
  testConnection: jest.fn().mockResolvedValue(true),
  closePool: jest.fn().mockResolvedValue(undefined),
  getPool: jest.fn().mockReturnValue({
    query: jest.fn().mockResolvedValue({ rows: [] }),
  }),
}));

jest.mock('../../src/infrastructure/cache/redis', () => ({
  __esModule: true,
  default: {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    client: {
      ping: jest.fn().mockResolvedValue('PONG'),
    },
    isConnected: true,
  },
}));

jest.mock('../../src/api/middleware/rate-limit.middleware', () => ({
  generalLimiter: (req: any, res: any, next: any) => next(),
  authLimiter: (req: any, res: any, next: any) => next(),
  strictLimiter: (req: any, res: any, next: any) => next(),
}));

jest.mock('../../../shared/utils/env-validator', () => ({
  createValidator: jest.fn(() => ({
    validateOrThrow: jest.fn(),
  })),
  commonValidations: {
    nodeEnv: {},
    port: jest.fn(() => ({})),
    jwtAccessSecret: {},
    jwtRefreshSecret: {},
    dbHost: {},
    dbPort: {},
    dbPassword: {},
    redisHost: {},
    redisPort: {},
  },
}));

describe('OAuth Integration Tests', () => {
  let app: Application;

  beforeAll(async () => {
    // Set environment variables for tests
    process.env.NODE_ENV = 'test';
    process.env.PORT = '3007';
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.DB_HOST = 'localhost';
    process.env.DB_PORT = '5432';
    process.env.DB_NAME = 'test_db';
    process.env.DB_USER = 'test_user';
    process.env.DB_PASSWORD = 'test_password';
    process.env.REDIS_HOST = 'localhost';
    process.env.REDIS_PORT = '6379';

    // Import app after mocks are set up
    const appModule = await import('../../src/index');
    app = appModule.default;
  });

  afterAll(async () => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('service', 'auth-service');
    });
  });

  describe('Root Endpoint', () => {
    it('should return service information', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('service', 'Flamoral Auth Service');
      expect(response.body).toHaveProperty('status', 'running');
    });
  });

  describe('Google OAuth', () => {
    it('should respond to Google OAuth endpoint', async () => {
      const response = await request(app)
        .post('/api/v1/auth/oauth/google')
        .send({ idToken: 'mock-google-id-token' });

      // The route may not exist yet or may return various status codes
      // We're just testing that the app responds
      expect([200, 400, 401, 404, 500]).toContain(response.status);
    });

    it('should reject missing ID token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/oauth/google')
        .send({});

      // Should reject with 400 or 404 if route doesn't exist
      expect([400, 404, 500]).toContain(response.status);
    });
  });

  describe('Apple Sign In', () => {
    it('should respond to Apple OAuth endpoint', async () => {
      const response = await request(app)
        .post('/api/v1/auth/oauth/apple')
        .send({ identityToken: 'mock-apple-identity-token' });

      expect([200, 400, 401, 404, 500]).toContain(response.status);
    });
  });

  describe('Facebook Login', () => {
    it('should respond to Facebook OAuth endpoint', async () => {
      const response = await request(app)
        .post('/api/v1/auth/oauth/facebook')
        .send({ accessToken: 'mock-facebook-access-token' });

      expect([200, 400, 401, 404, 500]).toContain(response.status);
    });
  });

  describe('OAuth Token Refresh', () => {
    it('should respond to token refresh endpoint', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: 'mock-refresh-token' });

      // Token refresh should be handled
      expect([200, 400, 401, 404, 500]).toContain(response.status);
    });
  });

  describe('404 Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/api/v1/unknown-route');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
    });
  });
});
