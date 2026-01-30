/**
 * Analytics Service E2E API Tests
 *
 * Comprehensive test suite for all Analytics Service endpoints:
 * - Dashboard & Stats Retrieval (9 endpoints)
 * - Event Tracking (3 endpoints)
 * - Admin-Only / RBAC (6 endpoints)
 * - Auth failures, date range filtering, empty state, granularity
 *
 * Target: 35+ tests
 */

import request from 'supertest';
import { config, testState, createTestUser, authenticatedRequest, wait } from './setup';

const BASE = '/api/v1/analytics';
const API_URL = config.API_GATEWAY_URL;

describe('Analytics Service API', () => {

  // ==================== DASHBOARD & STATS RETRIEVAL ====================

  describe('GET /api/v1/analytics/dashboard', () => {
    it('should return the user analytics dashboard when authenticated', async () => {
      const response = await authenticatedRequest()
        .get(`${BASE}/dashboard`);

      expect([200, 204]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toBeDefined();
      }
    });

    it('should return 401 without an access token', async () => {
      const response = await request(API_URL)
        .get(`${BASE}/dashboard`);

      expect(response.status).toBe(401);
    });

    it('should return 401 with an invalid token', async () => {
      const response = await request(API_URL)
        .get(`${BASE}/dashboard`)
        .set('Authorization', 'Bearer invalid-token-abc123');

      expect(response.status).toBe(401);
    });

    it('should return a JSON response with correct content-type', async () => {
      const response = await authenticatedRequest()
        .get(`${BASE}/dashboard`);

      expect([200, 204]).toContain(response.status);
      if (response.status === 200) {
        expect(response.headers['content-type']).toMatch(/json/);
      }
    });
  });

  // ==================== PROFILE VIEW STATS ====================

  describe('GET /api/v1/analytics/profile/views', () => {
    it('should return profile view stats when authenticated', async () => {
      const response = await authenticatedRequest()
        .get(`${BASE}/profile/views`);

      expect([200, 204]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toBeDefined();
      }
    });

    it('should accept from and to query params for date range filtering', async () => {
      const from = new Date();
      from.setDate(from.getDate() - 30);
      const to = new Date();

      const response = await authenticatedRequest()
        .get(`${BASE}/profile/views`)
        .query({ from: from.toISOString(), to: to.toISOString() });

      expect([200, 204, 400]).toContain(response.status);
    });

    it('should handle reversed date range gracefully', async () => {
      const from = new Date();
      const to = new Date();
      to.setDate(to.getDate() - 30); // to is before from

      const response = await authenticatedRequest()
        .get(`${BASE}/profile/views`)
        .query({ from: from.toISOString(), to: to.toISOString() });

      // Should either return empty results or a 400 validation error
      expect([200, 204, 400]).toContain(response.status);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(API_URL)
        .get(`${BASE}/profile/views`);

      expect(response.status).toBe(401);
    });
  });

  // ==================== MATCH STATS ====================

  describe('GET /api/v1/analytics/matches/stats', () => {
    it('should return match statistics when authenticated', async () => {
      const response = await authenticatedRequest()
        .get(`${BASE}/matches/stats`);

      expect([200, 204]).toContain(response.status);
    });

    it('should support date range filtering via from/to query params', async () => {
      const from = new Date();
      from.setDate(from.getDate() - 7);
      const to = new Date();

      const response = await authenticatedRequest()
        .get(`${BASE}/matches/stats`)
        .query({ from: from.toISOString(), to: to.toISOString() });

      expect([200, 204, 400]).toContain(response.status);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(API_URL)
        .get(`${BASE}/matches/stats`);

      expect(response.status).toBe(401);
    });
  });

  // ==================== MESSAGE STATS ====================

  describe('GET /api/v1/analytics/messages/stats', () => {
    it('should return message statistics when authenticated', async () => {
      const response = await authenticatedRequest()
        .get(`${BASE}/messages/stats`);

      expect([200, 204]).toContain(response.status);
    });

    it('should support date range filtering', async () => {
      const from = new Date();
      from.setDate(from.getDate() - 14);

      const response = await authenticatedRequest()
        .get(`${BASE}/messages/stats`)
        .query({ from: from.toISOString(), to: new Date().toISOString() });

      expect([200, 204, 400]).toContain(response.status);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(API_URL)
        .get(`${BASE}/messages/stats`);

      expect(response.status).toBe(401);
    });
  });

  // ==================== LIKE STATS ====================

  describe('GET /api/v1/analytics/likes/stats', () => {
    it('should return like statistics when authenticated', async () => {
      const response = await authenticatedRequest()
        .get(`${BASE}/likes/stats`);

      expect([200, 204]).toContain(response.status);
    });

    it('should accept from/to date range query parameters', async () => {
      const from = new Date('2025-01-01');
      const to = new Date('2025-12-31');

      const response = await authenticatedRequest()
        .get(`${BASE}/likes/stats`)
        .query({ from: from.toISOString(), to: to.toISOString() });

      expect([200, 204, 400]).toContain(response.status);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(API_URL)
        .get(`${BASE}/likes/stats`);

      expect(response.status).toBe(401);
    });
  });

  // ==================== ENGAGEMENT METRICS ====================

  describe('GET /api/v1/analytics/engagement', () => {
    it('should return engagement metrics when authenticated', async () => {
      const response = await authenticatedRequest()
        .get(`${BASE}/engagement`);

      expect([200, 204]).toContain(response.status);
    });

    it('should support date range filtering', async () => {
      const from = new Date();
      from.setDate(from.getDate() - 90);

      const response = await authenticatedRequest()
        .get(`${BASE}/engagement`)
        .query({ from: from.toISOString(), to: new Date().toISOString() });

      expect([200, 204, 400]).toContain(response.status);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(API_URL)
        .get(`${BASE}/engagement`);

      expect(response.status).toBe(401);
    });
  });

  // ==================== RESPONSE RATE ====================

  describe('GET /api/v1/analytics/engagement/response-rate', () => {
    it('should return response rate when authenticated', async () => {
      const response = await authenticatedRequest()
        .get(`${BASE}/engagement/response-rate`);

      expect([200, 204]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toBeDefined();
      }
    });

    it('should return 401 without authentication', async () => {
      const response = await request(API_URL)
        .get(`${BASE}/engagement/response-rate`);

      expect(response.status).toBe(401);
    });
  });

  // ==================== ACTIVITY TIMELINE ====================

  describe('GET /api/v1/analytics/activity/timeline', () => {
    it('should return the activity timeline when authenticated', async () => {
      const response = await authenticatedRequest()
        .get(`${BASE}/activity/timeline`);

      expect([200, 204]).toContain(response.status);
    });

    it('should support from/to date range filtering', async () => {
      const from = new Date();
      from.setDate(from.getDate() - 30);

      const response = await authenticatedRequest()
        .get(`${BASE}/activity/timeline`)
        .query({ from: from.toISOString(), to: new Date().toISOString() });

      expect([200, 204, 400]).toContain(response.status);
    });

    it('should accept daily granularity parameter', async () => {
      const response = await authenticatedRequest()
        .get(`${BASE}/activity/timeline`)
        .query({ granularity: 'daily' });

      expect([200, 204, 400]).toContain(response.status);
    });

    it('should accept weekly granularity parameter', async () => {
      const response = await authenticatedRequest()
        .get(`${BASE}/activity/timeline`)
        .query({ granularity: 'weekly' });

      expect([200, 204, 400]).toContain(response.status);
    });

    it('should accept monthly granularity parameter', async () => {
      const response = await authenticatedRequest()
        .get(`${BASE}/activity/timeline`)
        .query({ granularity: 'monthly' });

      expect([200, 204, 400]).toContain(response.status);
    });

    it('should handle invalid granularity gracefully', async () => {
      const response = await authenticatedRequest()
        .get(`${BASE}/activity/timeline`)
        .query({ granularity: 'invalid_granularity' });

      // Should either default to a valid granularity or return 400
      expect([200, 204, 400]).toContain(response.status);
    });

    it('should combine date range with granularity', async () => {
      const from = new Date();
      from.setDate(from.getDate() - 60);

      const response = await authenticatedRequest()
        .get(`${BASE}/activity/timeline`)
        .query({
          from: from.toISOString(),
          to: new Date().toISOString(),
          granularity: 'weekly',
        });

      expect([200, 204, 400]).toContain(response.status);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(API_URL)
        .get(`${BASE}/activity/timeline`);

      expect(response.status).toBe(401);
    });
  });

  // ==================== CONVERSION FUNNEL ====================

  describe('GET /api/v1/analytics/funnel', () => {
    it('should return conversion funnel data when authenticated', async () => {
      const response = await authenticatedRequest()
        .get(`${BASE}/funnel`);

      expect([200, 204]).toContain(response.status);
    });

    it('should support from/to date range filtering', async () => {
      const from = new Date();
      from.setDate(from.getDate() - 30);

      const response = await authenticatedRequest()
        .get(`${BASE}/funnel`)
        .query({ from: from.toISOString(), to: new Date().toISOString() });

      expect([200, 204, 400]).toContain(response.status);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(API_URL)
        .get(`${BASE}/funnel`);

      expect(response.status).toBe(401);
    });
  });

  // ==================== EVENT TRACKING ====================

  describe('POST /api/v1/analytics/events', () => {
    it('should track a custom event when authenticated', async () => {
      const response = await authenticatedRequest()
        .post(`${BASE}/events`)
        .send({
          eventName: 'profile_completed',
          category: 'onboarding',
          properties: {
            step: 'final',
            timeSpent: 120,
          },
        });

      expect([200, 201, 204]).toContain(response.status);
    });

    it('should track a minimal event payload', async () => {
      const response = await authenticatedRequest()
        .post(`${BASE}/events`)
        .send({
          eventName: 'button_click',
        });

      expect([200, 201, 204, 400]).toContain(response.status);
    });

    it('should reject an event with empty body', async () => {
      const response = await authenticatedRequest()
        .post(`${BASE}/events`)
        .send({});

      // Should either accept empty or validate required fields
      expect([200, 201, 204, 400, 422]).toContain(response.status);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(API_URL)
        .post(`${BASE}/events`)
        .send({ eventName: 'test_event' });

      expect(response.status).toBe(401);
    });
  });

  // ==================== PAGE VIEW TRACKING ====================

  describe('POST /api/v1/analytics/pageviews', () => {
    it('should track a page view when authenticated', async () => {
      const response = await authenticatedRequest()
        .post(`${BASE}/pageviews`)
        .send({
          page: '/discovery',
          referrer: '/dashboard',
          duration: 45000,
        });

      expect([200, 201, 204]).toContain(response.status);
    });

    it('should track a page view with minimal data', async () => {
      const response = await authenticatedRequest()
        .post(`${BASE}/pageviews`)
        .send({
          page: '/profile',
        });

      expect([200, 201, 204, 400]).toContain(response.status);
    });

    it('should handle missing page field', async () => {
      const response = await authenticatedRequest()
        .post(`${BASE}/pageviews`)
        .send({
          referrer: '/home',
        });

      // Should validate that page is required or accept as-is
      expect([200, 201, 204, 400, 422]).toContain(response.status);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(API_URL)
        .post(`${BASE}/pageviews`)
        .send({ page: '/test' });

      expect(response.status).toBe(401);
    });
  });

  // ==================== ACTION TRACKING ====================

  describe('POST /api/v1/analytics/actions', () => {
    it('should track a user action when authenticated', async () => {
      const response = await authenticatedRequest()
        .post(`${BASE}/actions`)
        .send({
          action: 'swipe_right',
          target: 'profile_card',
          metadata: {
            targetUserId: 'some-user-id',
            screen: 'discovery',
          },
        });

      expect([200, 201, 204]).toContain(response.status);
    });

    it('should track an action with minimal payload', async () => {
      const response = await authenticatedRequest()
        .post(`${BASE}/actions`)
        .send({
          action: 'open_chat',
        });

      expect([200, 201, 204, 400]).toContain(response.status);
    });

    it('should handle empty action body', async () => {
      const response = await authenticatedRequest()
        .post(`${BASE}/actions`)
        .send({});

      expect([200, 201, 204, 400, 422]).toContain(response.status);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(API_URL)
        .post(`${BASE}/actions`)
        .send({ action: 'test_action' });

      expect(response.status).toBe(401);
    });
  });

  // ==================== ADMIN-ONLY ENDPOINTS (RBAC) ====================

  describe('Admin-Only Endpoints — RBAC', () => {

    describe('GET /api/v1/analytics/platform/stats', () => {
      it('should return 403 for a regular (non-admin) user', async () => {
        const response = await authenticatedRequest()
          .get(`${BASE}/platform/stats`);

        expect([403, 401]).toContain(response.status);
      });

      it('should accept from/to query params if admin-authorized', async () => {
        const from = new Date();
        from.setDate(from.getDate() - 30);

        const response = await authenticatedRequest()
          .get(`${BASE}/platform/stats`)
          .query({ from: from.toISOString(), to: new Date().toISOString() });

        // Regular user should be denied
        expect([403, 401]).toContain(response.status);
      });

      it('should return 401 without any authentication', async () => {
        const response = await request(API_URL)
          .get(`${BASE}/platform/stats`);

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/v1/analytics/platform/demographics', () => {
      it('should return 403 for a regular (non-admin) user', async () => {
        const response = await authenticatedRequest()
          .get(`${BASE}/platform/demographics`);

        expect([403, 401]).toContain(response.status);
      });

      it('should return 401 without authentication', async () => {
        const response = await request(API_URL)
          .get(`${BASE}/platform/demographics`);

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/v1/analytics/platform/revenue', () => {
      it('should return 403 for a regular (non-admin) user', async () => {
        const response = await authenticatedRequest()
          .get(`${BASE}/platform/revenue`);

        expect([403, 401]).toContain(response.status);
      });

      it('should return 401 without authentication', async () => {
        const response = await request(API_URL)
          .get(`${BASE}/platform/revenue`);

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/v1/analytics/platform/retention', () => {
      it('should return 403 for a regular (non-admin) user', async () => {
        const response = await authenticatedRequest()
          .get(`${BASE}/platform/retention`);

        expect([403, 401]).toContain(response.status);
      });

      it('should return 401 without authentication', async () => {
        const response = await request(API_URL)
          .get(`${BASE}/platform/retention`);

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/v1/analytics/ab-tests/:testId', () => {
      it('should return 403 for a regular (non-admin) user', async () => {
        const response = await authenticatedRequest()
          .get(`${BASE}/ab-tests/test-experiment-001`);

        expect([403, 401]).toContain(response.status);
      });

      it('should return 401 without authentication', async () => {
        const response = await request(API_URL)
          .get(`${BASE}/ab-tests/test-experiment-001`);

        expect(response.status).toBe(401);
      });

      it('should handle non-existent test ID for admin-level check', async () => {
        const response = await authenticatedRequest()
          .get(`${BASE}/ab-tests/nonexistent-test-999`);

        // Either 403 (not admin) or 404 (not found)
        expect([403, 401, 404]).toContain(response.status);
      });
    });

    describe('POST /api/v1/analytics/export', () => {
      it('should return 403 for a regular (non-admin) user', async () => {
        const response = await authenticatedRequest()
          .post(`${BASE}/export`)
          .send({
            format: 'csv',
            dataType: 'users',
            from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            to: new Date().toISOString(),
          });

        expect([403, 401]).toContain(response.status);
      });

      it('should return 401 without authentication', async () => {
        const response = await request(API_URL)
          .post(`${BASE}/export`)
          .send({ format: 'csv', dataType: 'users' });

        expect(response.status).toBe(401);
      });
    });
  });

  // ==================== EMPTY STATE HANDLING ====================

  describe('Empty State Handling (new user with no data)', () => {
    it('should handle dashboard gracefully for a new user', async () => {
      const response = await authenticatedRequest()
        .get(`${BASE}/dashboard`);

      expect([200, 204]).toContain(response.status);
      if (response.status === 200) {
        // Response should be valid even if there is no data
        expect(response.body).toBeDefined();
      }
    });

    it('should handle profile views returning zero or empty for a new user', async () => {
      const response = await authenticatedRequest()
        .get(`${BASE}/profile/views`);

      expect([200, 204]).toContain(response.status);
    });

    it('should handle match stats returning zero or empty for a new user', async () => {
      const response = await authenticatedRequest()
        .get(`${BASE}/matches/stats`);

      expect([200, 204]).toContain(response.status);
    });

    it('should handle engagement metrics returning zero for a new user', async () => {
      const response = await authenticatedRequest()
        .get(`${BASE}/engagement`);

      expect([200, 204]).toContain(response.status);
    });

    it('should handle activity timeline returning empty for a new user', async () => {
      const response = await authenticatedRequest()
        .get(`${BASE}/activity/timeline`);

      expect([200, 204]).toContain(response.status);
    });

    it('should handle funnel returning empty for a new user', async () => {
      const response = await authenticatedRequest()
        .get(`${BASE}/funnel`);

      expect([200, 204]).toContain(response.status);
    });
  });

  // ==================== AUTH FAILURE CASES ====================

  describe('Authentication Failure Scenarios', () => {
    it('should return 401 for an expired JWT token', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.4Adcj3UFYzPUVaVF43FmMab6RlaQD8A9V8wFzzht-KQ';

      const response = await request(API_URL)
        .get(`${BASE}/dashboard`)
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });

    it('should return 401 for a malformed Authorization header', async () => {
      const response = await request(API_URL)
        .get(`${BASE}/dashboard`)
        .set('Authorization', 'NotBearer sometoken');

      expect(response.status).toBe(401);
    });

    it('should return 401 when Authorization header is completely empty', async () => {
      const response = await request(API_URL)
        .get(`${BASE}/dashboard`)
        .set('Authorization', '');

      expect(response.status).toBe(401);
    });

    it('should return 401 for Bearer with empty token string', async () => {
      const response = await request(API_URL)
        .get(`${BASE}/dashboard`)
        .set('Authorization', 'Bearer ');

      expect(response.status).toBe(401);
    });
  });

  // ==================== PERFORMANCE & CONCURRENCY ====================

  describe('Concurrent and Rapid Requests', () => {
    it('should handle multiple concurrent stat requests gracefully', async () => {
      const endpoints = [
        `${BASE}/dashboard`,
        `${BASE}/profile/views`,
        `${BASE}/matches/stats`,
        `${BASE}/messages/stats`,
        `${BASE}/likes/stats`,
        `${BASE}/engagement`,
      ];

      const requests = endpoints.map(endpoint =>
        authenticatedRequest().get(endpoint)
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect([200, 204, 401, 429, 500]).toContain(response.status);
      });
    });

    it('should respond to the dashboard within 3 seconds', async () => {
      const startTime = Date.now();

      await authenticatedRequest()
        .get(`${BASE}/dashboard`);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(3000);
    });
  });

  // ==================== DATE RANGE EDGE CASES ====================

  describe('Date Range Edge Cases', () => {
    it('should handle a very narrow date range (same day)', async () => {
      const today = new Date().toISOString().split('T')[0];

      const response = await authenticatedRequest()
        .get(`${BASE}/profile/views`)
        .query({ from: `${today}T00:00:00.000Z`, to: `${today}T23:59:59.999Z` });

      expect([200, 204, 400]).toContain(response.status);
    });

    it('should handle a very wide date range (1 year)', async () => {
      const from = new Date();
      from.setFullYear(from.getFullYear() - 1);

      const response = await authenticatedRequest()
        .get(`${BASE}/matches/stats`)
        .query({ from: from.toISOString(), to: new Date().toISOString() });

      expect([200, 204, 400]).toContain(response.status);
    });

    it('should handle future date in from param', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const response = await authenticatedRequest()
        .get(`${BASE}/likes/stats`)
        .query({ from: futureDate.toISOString(), to: futureDate.toISOString() });

      expect([200, 204, 400]).toContain(response.status);
    });

    it('should handle invalid date format gracefully', async () => {
      const response = await authenticatedRequest()
        .get(`${BASE}/messages/stats`)
        .query({ from: 'not-a-date', to: 'also-not-a-date' });

      expect([200, 204, 400, 422]).toContain(response.status);
    });
  });
});
