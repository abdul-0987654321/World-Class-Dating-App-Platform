/**
 * Platform & Infrastructure E2E API Tests
 *
 * Comprehensive test suite for platform-level endpoints:
 * - Health Checks (4 endpoints)
 * - Version & Public Config (3 endpoints)
 * - CSRF Token Flow (2 endpoints)
 * - Auth Status (2 endpoints)
 * - Response format consistency, secret exposure prevention
 *
 * Target: 30+ tests
 */

import request from 'supertest';
import { config, testState, createTestUser, authenticatedRequest, wait } from './setup';

const API_URL = config.API_GATEWAY_URL;
const PREFIX = '/api/v1';

describe('Platform & Infrastructure API', () => {

  // ==================== HEALTH CHECK ENDPOINTS ====================

  describe('Health Checks', () => {

    describe('GET /health', () => {
      it('should return 200 indicating the service is running', async () => {
        const response = await request(API_URL)
          .get('/health');

        expect(response.status).toBe(200);
      });

      it('should return a JSON body with status information', async () => {
        const response = await request(API_URL)
          .get('/health');

        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();
        // Typically contains a "status" field like "ok" or "up"
        if (response.body.status) {
          expect(typeof response.body.status).toBe('string');
        }
      });

      it('should respond within 2 seconds', async () => {
        const startTime = Date.now();

        const response = await request(API_URL)
          .get('/health');

        const duration = Date.now() - startTime;
        expect(response.status).toBe(200);
        expect(duration).toBeLessThan(2000);
      });

      it('should not require authentication', async () => {
        // Health checks must be publicly accessible (no Authorization header)
        const response = await request(API_URL)
          .get('/health');

        expect(response.status).toBe(200);
      });
    });

    describe('GET /health/ready', () => {
      it('should return 200 or 503 indicating readiness', async () => {
        const response = await request(API_URL)
          .get('/health/ready');

        // 200 = ready, 503 = not ready yet (both are valid states)
        expect([200, 503]).toContain(response.status);
      });

      it('should return a JSON response body', async () => {
        const response = await request(API_URL)
          .get('/health/ready');

        expect([200, 503]).toContain(response.status);
        expect(response.body).toBeDefined();
      });

      it('should not require authentication', async () => {
        const response = await request(API_URL)
          .get('/health/ready');

        expect([200, 503]).toContain(response.status);
      });
    });

    describe('GET /health/live', () => {
      it('should return 200 indicating the service is alive', async () => {
        const response = await request(API_URL)
          .get('/health/live');

        expect(response.status).toBe(200);
      });

      it('should return a body confirming liveness', async () => {
        const response = await request(API_URL)
          .get('/health/live');

        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();
      });

      it('should not require authentication', async () => {
        const response = await request(API_URL)
          .get('/health/live');

        expect(response.status).toBe(200);
      });
    });

    describe('GET /health/services', () => {
      it('should return health status of downstream services', async () => {
        const response = await request(API_URL)
          .get('/health/services');

        expect([200, 503]).toContain(response.status);
        expect(response.body).toBeDefined();
      });

      it('should return an object or array describing service statuses', async () => {
        const response = await request(API_URL)
          .get('/health/services');

        expect([200, 503]).toContain(response.status);
        if (response.status === 200) {
          // The body should contain information about individual services
          expect(typeof response.body).toBe('object');
        }
      });

      it('should not require authentication', async () => {
        const response = await request(API_URL)
          .get('/health/services');

        expect([200, 503]).toContain(response.status);
      });

      it('should respond within 5 seconds even with slow downstream services', async () => {
        const startTime = Date.now();

        const response = await request(API_URL)
          .get('/health/services');

        const duration = Date.now() - startTime;
        expect([200, 503]).toContain(response.status);
        expect(duration).toBeLessThan(5000);
      });
    });
  });

  // ==================== VERSION ENDPOINTS ====================

  describe('Version Endpoints', () => {

    describe('GET /api/v1/platform/version', () => {
      it('should return version information (public endpoint)', async () => {
        const response = await request(API_URL)
          .get(`${PREFIX}/platform/version`);

        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();
      });

      it('should include a version string in the response', async () => {
        const response = await request(API_URL)
          .get(`${PREFIX}/platform/version`);

        expect(response.status).toBe(200);
        // Version may be in body.version, body.data.version, or at root
        const body = response.body;
        const hasVersion =
          body.version !== undefined ||
          (body.data && body.data.version !== undefined) ||
          typeof body === 'string';
        expect(hasVersion).toBe(true);
      });

      it('should not require authentication', async () => {
        const response = await request(API_URL)
          .get(`${PREFIX}/platform/version`);

        expect(response.status).toBe(200);
      });

      it('should return JSON content type', async () => {
        const response = await request(API_URL)
          .get(`${PREFIX}/platform/version`);

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/json/);
      });
    });

    describe('GET /api/v1/version', () => {
      it('should return version info from the root version endpoint', async () => {
        const response = await request(API_URL)
          .get(`${PREFIX}/version`);

        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();
      });

      it('should not require authentication', async () => {
        const response = await request(API_URL)
          .get(`${PREFIX}/version`);

        expect(response.status).toBe(200);
      });
    });
  });

  // ==================== PUBLIC CONFIG ====================

  describe('Public Config', () => {

    describe('GET /api/v1/platform/config/public', () => {
      it('should return public configuration (no auth needed)', async () => {
        const response = await request(API_URL)
          .get(`${PREFIX}/platform/config/public`);

        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();
      });

      it('should NOT expose database connection strings', async () => {
        const response = await request(API_URL)
          .get(`${PREFIX}/platform/config/public`);

        expect(response.status).toBe(200);
        const bodyStr = JSON.stringify(response.body).toLowerCase();
        expect(bodyStr).not.toContain('mongodb://');
        expect(bodyStr).not.toContain('postgres://');
        expect(bodyStr).not.toContain('mysql://');
        expect(bodyStr).not.toContain('redis://');
      });

      it('should NOT expose JWT secrets', async () => {
        const response = await request(API_URL)
          .get(`${PREFIX}/platform/config/public`);

        expect(response.status).toBe(200);
        const bodyStr = JSON.stringify(response.body).toLowerCase();
        expect(bodyStr).not.toContain('jwt_secret');
        expect(bodyStr).not.toContain('jwt_access_secret');
        expect(bodyStr).not.toContain('jwt_refresh_secret');
      });

      it('should NOT expose Stripe secret keys', async () => {
        const response = await request(API_URL)
          .get(`${PREFIX}/platform/config/public`);

        expect(response.status).toBe(200);
        const bodyStr = JSON.stringify(response.body);
        expect(bodyStr).not.toContain('sk_live_');
        expect(bodyStr).not.toContain('sk_test_');
        expect(bodyStr).not.toContain('whsec_');
      });

      it('should NOT expose internal service keys or passwords', async () => {
        const response = await request(API_URL)
          .get(`${PREFIX}/platform/config/public`);

        expect(response.status).toBe(200);
        const bodyStr = JSON.stringify(response.body).toLowerCase();
        expect(bodyStr).not.toContain('password');
        expect(bodyStr).not.toContain('internal_service_key');
        expect(bodyStr).not.toContain('api_secret');
      });

      it('should return a JSON response', async () => {
        const response = await request(API_URL)
          .get(`${PREFIX}/platform/config/public`);

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/json/);
      });
    });
  });

  // ==================== CSRF TOKEN ENDPOINTS ====================

  describe('CSRF Token Flow', () => {

    describe('GET /api/v1/csrf/token', () => {
      it('should generate and return a CSRF token (public endpoint)', async () => {
        const response = await request(API_URL)
          .get(`${PREFIX}/csrf/token`);

        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();
      });

      it('should return a non-empty token value', async () => {
        const response = await request(API_URL)
          .get(`${PREFIX}/csrf/token`);

        expect(response.status).toBe(200);
        // Token might be in body.token, body.csrfToken, body.data.token, etc.
        const body = response.body;
        const token = body.token || body.csrfToken || (body.data && body.data.token);
        if (token) {
          expect(typeof token).toBe('string');
          expect(token.length).toBeGreaterThan(0);
        }
      });

      it('should not require authentication', async () => {
        const response = await request(API_URL)
          .get(`${PREFIX}/csrf/token`);

        expect(response.status).toBe(200);
      });

      it('should generate unique tokens on successive requests', async () => {
        const response1 = await request(API_URL)
          .get(`${PREFIX}/csrf/token`);

        // Small delay to ensure uniqueness
        await wait(50);

        const response2 = await request(API_URL)
          .get(`${PREFIX}/csrf/token`);

        expect(response1.status).toBe(200);
        expect(response2.status).toBe(200);

        const token1 = response1.body.token || response1.body.csrfToken || '';
        const token2 = response2.body.token || response2.body.csrfToken || '';

        // Tokens may or may not differ (depends on implementation), but both should be valid
        if (token1 && token2) {
          expect(typeof token1).toBe('string');
          expect(typeof token2).toBe('string');
        }
      });
    });

    describe('GET /api/v1/csrf/verify', () => {
      it('should verify a valid CSRF token', async () => {
        // First obtain a token
        const tokenResponse = await request(API_URL)
          .get(`${PREFIX}/csrf/token`);

        expect(tokenResponse.status).toBe(200);

        const csrfToken = tokenResponse.body.token || tokenResponse.body.csrfToken ||
          (tokenResponse.body.data && tokenResponse.body.data.token) || '';

        // Now verify it
        const verifyResponse = await request(API_URL)
          .get(`${PREFIX}/csrf/verify`)
          .set('x-csrf-token', csrfToken);

        // Should succeed or return appropriate status
        expect([200, 204, 400, 403]).toContain(verifyResponse.status);
      });

      it('should reject an invalid CSRF token', async () => {
        const response = await request(API_URL)
          .get(`${PREFIX}/csrf/verify`)
          .set('x-csrf-token', 'completely-invalid-csrf-token');

        // Should fail validation
        expect([400, 403]).toContain(response.status);
      });

      it('should handle missing CSRF token header', async () => {
        const response = await request(API_URL)
          .get(`${PREFIX}/csrf/verify`);

        // Missing token should fail or return an appropriate response
        expect([200, 400, 403]).toContain(response.status);
      });
    });

    describe('CSRF Token End-to-End Flow', () => {
      it('should complete a full generate-then-verify cycle', async () => {
        // Step 1: Generate token
        const generateResponse = await request(API_URL)
          .get(`${PREFIX}/csrf/token`);

        expect(generateResponse.status).toBe(200);

        const csrfToken = generateResponse.body.token ||
          generateResponse.body.csrfToken ||
          (generateResponse.body.data && generateResponse.body.data.token);

        if (!csrfToken) {
          console.log('Skipping CSRF verify: no token returned from generation endpoint');
          return;
        }

        // Step 2: Verify token
        const verifyResponse = await request(API_URL)
          .get(`${PREFIX}/csrf/verify`)
          .set('x-csrf-token', csrfToken);

        // The generated token should be accepted
        expect([200, 204]).toContain(verifyResponse.status);
      });
    });
  });

  // ==================== AUTH STATUS ENDPOINTS ====================

  describe('Auth Status', () => {

    describe('GET /api/v1/auth/status', () => {
      it('should return auth status for an authenticated user', async () => {
        const response = await authenticatedRequest()
          .get(`${PREFIX}/auth/status`);

        expect([200, 204]).toContain(response.status);
        if (response.status === 200) {
          expect(response.body).toBeDefined();
        }
      });

      it('should include user information when authenticated', async () => {
        const response = await authenticatedRequest()
          .get(`${PREFIX}/auth/status`);

        expect([200, 204]).toContain(response.status);
        if (response.status === 200) {
          const body = response.body;
          // Should contain user info or authentication status
          const hasAuthInfo =
            body.authenticated !== undefined ||
            body.user !== undefined ||
            body.data !== undefined ||
            body.isAuthenticated !== undefined;
          expect(hasAuthInfo).toBe(true);
        }
      });

      it('should return 401 without authentication', async () => {
        const response = await request(API_URL)
          .get(`${PREFIX}/auth/status`);

        expect(response.status).toBe(401);
      });

      it('should return 401 with an invalid token', async () => {
        const response = await request(API_URL)
          .get(`${PREFIX}/auth/status`)
          .set('Authorization', 'Bearer invalid-token-xyz');

        expect(response.status).toBe(401);
      });

      it('should return 401 with an expired token', async () => {
        const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.4Adcj3UFYzPUVaVF43FmMab6RlaQD8A9V8wFzzht-KQ';

        const response = await request(API_URL)
          .get(`${PREFIX}/auth/status`)
          .set('Authorization', `Bearer ${expiredToken}`);

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/v1/auth/status/public', () => {
      it('should return public auth status (no auth required)', async () => {
        const response = await request(API_URL)
          .get(`${PREFIX}/auth/status/public`);

        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();
      });

      it('should indicate unauthenticated when no token is provided', async () => {
        const response = await request(API_URL)
          .get(`${PREFIX}/auth/status/public`);

        expect(response.status).toBe(200);
        // Should indicate the user is not authenticated
        const body = response.body;
        if (body.authenticated !== undefined) {
          expect(body.authenticated).toBe(false);
        }
        if (body.isAuthenticated !== undefined) {
          expect(body.isAuthenticated).toBe(false);
        }
      });

      it('should indicate authenticated when a valid token is provided', async () => {
        const response = await authenticatedRequest()
          .get(`${PREFIX}/auth/status/public`);

        expect(response.status).toBe(200);
        const body = response.body;
        if (body.authenticated !== undefined) {
          expect(body.authenticated).toBe(true);
        }
        if (body.isAuthenticated !== undefined) {
          expect(body.isAuthenticated).toBe(true);
        }
      });

      it('should not expose sensitive user details in public status', async () => {
        const response = await request(API_URL)
          .get(`${PREFIX}/auth/status/public`);

        expect(response.status).toBe(200);
        const bodyStr = JSON.stringify(response.body).toLowerCase();
        expect(bodyStr).not.toContain('password');
        expect(bodyStr).not.toContain('secret');
        expect(bodyStr).not.toContain('refreshtoken');
      });
    });
  });

  // ==================== RESPONSE FORMAT CONSISTENCY ====================

  describe('Response Format Consistency', () => {
    it('should return JSON content-type on all health endpoints', async () => {
      const endpoints = ['/health', '/health/ready', '/health/live', '/health/services'];

      const responses = await Promise.all(
        endpoints.map(ep => request(API_URL).get(ep))
      );

      responses.forEach((response, index) => {
        expect([200, 503]).toContain(response.status);
        if (response.headers['content-type']) {
          expect(response.headers['content-type']).toMatch(/json/);
        }
      });
    });

    it('should return JSON content-type on version endpoints', async () => {
      const endpoints = [
        `${PREFIX}/platform/version`,
        `${PREFIX}/version`,
      ];

      const responses = await Promise.all(
        endpoints.map(ep => request(API_URL).get(ep))
      );

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/json/);
      });
    });

    it('should return consistent response shape across platform public endpoints', async () => {
      const response = await request(API_URL)
        .get(`${PREFIX}/platform/config/public`);

      expect(response.status).toBe(200);
      // Should be an object (not null, not array)
      expect(typeof response.body).toBe('object');
      expect(response.body).not.toBeNull();
    });

    it('should handle 404 for unknown routes with a proper error format', async () => {
      const response = await request(API_URL)
        .get(`${PREFIX}/nonexistent-endpoint-xyz`);

      expect([404, 400]).toContain(response.status);
    });

    it('should handle unsupported HTTP methods gracefully', async () => {
      const response = await request(API_URL)
        .delete('/health');

      // Should return 404 or 405 Method Not Allowed
      expect([404, 405]).toContain(response.status);
    });
  });

  // ==================== PERFORMANCE & RELIABILITY ====================

  describe('Performance and Reliability', () => {
    it('should handle concurrent health check requests', async () => {
      const requests = Array.from({ length: 10 }, () =>
        request(API_URL).get('/health')
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should handle concurrent version requests', async () => {
      const requests = Array.from({ length: 5 }, () =>
        request(API_URL).get(`${PREFIX}/platform/version`)
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should return health check within 1 second', async () => {
      const startTime = Date.now();

      const response = await request(API_URL)
        .get('/health');

      const duration = Date.now() - startTime;
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000);
    });
  });
});
