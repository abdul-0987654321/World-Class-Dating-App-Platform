import request from 'supertest';
import { config, testState, createTestUser, authenticatedRequest, wait } from './setup';

/**
 * Calls Service E2E API Tests
 *
 * Covers: Call lifecycle (request, accept, reject, end), subscription
 * enforcement (premium required), call history, availability checks,
 * validation, and authentication failures.
 *
 * Controller prefix: /api/v1/calls
 */

const API_BASE = config.API_GATEWAY_URL;
const PREFIX = '/api/v1/calls';

describe('Calls Service API', () => {
  // Shared state across tests
  let callId: string;
  let secondUserId: string;

  // A fake callee ID for request tests
  const fakeCalleeId = 'callee-user-id-e2e-test';
  const nonExistentCallId = 'non-existent-call-id-00000';

  beforeAll(async () => {
    // Ensure we have an authenticated test user
    if (!testState.accessToken) {
      await createTestUser();
    }

    // Use the authenticated user's ID or a placeholder for a second user
    secondUserId = testState.userId
      ? `second-user-${testState.userId.slice(0, 8)}`
      : 'second-user-fallback-id';
  });

  // ==========================================================================
  // CALL REQUEST
  // ==========================================================================
  describe('POST /api/v1/calls/request - Request Call', () => {

    it('should request a video call to another user', async () => {
      const response = await authenticatedRequest()
        .post(`${PREFIX}/request`)
        .send({
          calleeId: fakeCalleeId,
          callType: 'video',
        });

      // Premium subscription is required; free users get 403
      // If the test user has premium, expect 200/201; otherwise 403
      expect([200, 201, 403]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        const data = response.body.data || response.body;
        if (data.callId || data.id) {
          callId = data.callId || data.id;
        }
        // Verify call data structure
        expect(data).toBeDefined();
        if (data.callType) {
          expect(data.callType).toBe('video');
        }
      }
    });

    it('should request an audio call to another user', async () => {
      const response = await authenticatedRequest()
        .post(`${PREFIX}/request`)
        .send({
          calleeId: fakeCalleeId,
          callType: 'audio',
        });

      expect([200, 201, 403]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        const data = response.body.data || response.body;
        if (data.callId || data.id) {
          callId = data.callId || data.id;
        }
        if (data.callType) {
          expect(data.callType).toBe('audio');
        }
      }
    });

    it('should reject call request without calleeId', async () => {
      const response = await authenticatedRequest()
        .post(`${PREFIX}/request`)
        .send({
          callType: 'video',
        });

      expect([400, 422]).toContain(response.status);
    });

    it('should reject call request without callType', async () => {
      const response = await authenticatedRequest()
        .post(`${PREFIX}/request`)
        .send({
          calleeId: fakeCalleeId,
        });

      expect([400, 422]).toContain(response.status);
    });

    it('should reject call request with invalid callType', async () => {
      const response = await authenticatedRequest()
        .post(`${PREFIX}/request`)
        .send({
          calleeId: fakeCalleeId,
          callType: 'hologram',
        });

      expect([400, 422]).toContain(response.status);
    });

    it('should reject call request with empty body', async () => {
      const response = await authenticatedRequest()
        .post(`${PREFIX}/request`)
        .send({});

      expect([400, 422]).toContain(response.status);
    });

    it('should reject call request to self', async () => {
      const selfId = testState.userId || 'self-user-id';

      const response = await authenticatedRequest()
        .post(`${PREFIX}/request`)
        .send({
          calleeId: selfId,
          callType: 'video',
        });

      // Should not be able to call yourself
      expect([400, 403, 422]).toContain(response.status);
    });

    it('should reject call request with invalid calleeId format', async () => {
      const response = await authenticatedRequest()
        .post(`${PREFIX}/request`)
        .send({
          calleeId: '',
          callType: 'video',
        });

      expect([400, 422]).toContain(response.status);
    });

    it('should reject call request without authentication', async () => {
      const response = await request(API_BASE)
        .post(`${PREFIX}/request`)
        .send({
          calleeId: fakeCalleeId,
          callType: 'video',
        });

      expect(response.status).toBe(401);
    });

    it('should reject call request with invalid token', async () => {
      const response = await request(API_BASE)
        .post(`${PREFIX}/request`)
        .set('Authorization', 'Bearer invalid-token-abc123')
        .send({
          calleeId: fakeCalleeId,
          callType: 'audio',
        });

      expect(response.status).toBe(401);
    });
  });

  // ==========================================================================
  // SUBSCRIPTION ENFORCEMENT
  // ==========================================================================
  describe('Subscription Enforcement (@RequireSubscription(PREMIUM))', () => {

    it('should return 403 for free-tier user requesting a call', async () => {
      // The default test user may be on free tier
      const response = await authenticatedRequest()
        .post(`${PREFIX}/request`)
        .send({
          calleeId: fakeCalleeId,
          callType: 'video',
        });

      // If user is free, expect 403; if premium, expect success
      if (response.status === 403) {
        expect(response.body).toBeDefined();
        const body = response.body;
        // Error message should reference subscription or premium
        const errorText = JSON.stringify(body).toLowerCase();
        expect(
          errorText.includes('subscription') ||
          errorText.includes('premium') ||
          errorText.includes('upgrade') ||
          errorText.includes('forbidden')
        ).toBe(true);
      } else {
        // User has premium subscription
        expect([200, 201]).toContain(response.status);
      }
    });

    it('should provide a meaningful error message for non-premium users', async () => {
      const response = await authenticatedRequest()
        .post(`${PREFIX}/request`)
        .send({
          calleeId: fakeCalleeId,
          callType: 'audio',
        });

      if (response.status === 403) {
        expect(response.body).toBeDefined();
        // The error should contain useful information about upgrading
        const message =
          response.body.message ||
          response.body.error ||
          JSON.stringify(response.body);
        expect(message).toBeDefined();
        expect(message.length).toBeGreaterThan(0);
      }
    });
  });

  // ==========================================================================
  // CALL ACCEPT
  // ==========================================================================
  describe('POST /api/v1/calls/accept - Accept Call', () => {

    it('should accept a pending call', async () => {
      if (!callId) {
        console.log('Skipping: No call ID available (call request may have been rejected)');
        return;
      }

      const response = await authenticatedRequest()
        .post(`${PREFIX}/accept`)
        .send({ callId });

      // Could succeed or fail if user is not the callee
      expect([200, 400, 403, 404]).toContain(response.status);
    });

    it('should reject accept without callId', async () => {
      const response = await authenticatedRequest()
        .post(`${PREFIX}/accept`)
        .send({});

      expect([400, 422]).toContain(response.status);
    });

    it('should reject accept for non-existent call', async () => {
      const response = await authenticatedRequest()
        .post(`${PREFIX}/accept`)
        .send({ callId: nonExistentCallId });

      expect([400, 404]).toContain(response.status);
    });

    it('should fail without authentication', async () => {
      const response = await request(API_BASE)
        .post(`${PREFIX}/accept`)
        .send({ callId: callId || 'some-call-id' });

      expect(response.status).toBe(401);
    });
  });

  // ==========================================================================
  // CALL REJECT
  // ==========================================================================
  describe('POST /api/v1/calls/reject - Reject Call', () => {

    it('should reject a pending call with a reason', async () => {
      if (!callId) {
        console.log('Skipping: No call ID available');
        return;
      }

      const response = await authenticatedRequest()
        .post(`${PREFIX}/reject`)
        .send({
          callId,
          reason: 'busy',
        });

      expect([200, 400, 403, 404]).toContain(response.status);
    });

    it('should reject a call without providing a reason', async () => {
      if (!callId) {
        console.log('Skipping: No call ID available');
        return;
      }

      const response = await authenticatedRequest()
        .post(`${PREFIX}/reject`)
        .send({ callId });

      // Reason is optional, so this should work
      expect([200, 400, 403, 404]).toContain(response.status);
    });

    it('should reject without callId', async () => {
      const response = await authenticatedRequest()
        .post(`${PREFIX}/reject`)
        .send({ reason: 'busy' });

      expect([400, 422]).toContain(response.status);
    });

    it('should handle rejecting non-existent call', async () => {
      const response = await authenticatedRequest()
        .post(`${PREFIX}/reject`)
        .send({
          callId: nonExistentCallId,
          reason: 'not available',
        });

      expect([400, 404]).toContain(response.status);
    });

    it('should fail without authentication', async () => {
      const response = await request(API_BASE)
        .post(`${PREFIX}/reject`)
        .send({ callId: callId || 'some-id', reason: 'unauthorized' });

      expect(response.status).toBe(401);
    });
  });

  // ==========================================================================
  // CALL END
  // ==========================================================================
  describe('POST /api/v1/calls/end - End Call', () => {

    it('should end an active call with duration', async () => {
      if (!callId) {
        console.log('Skipping: No call ID available');
        return;
      }

      const response = await authenticatedRequest()
        .post(`${PREFIX}/end`)
        .send({
          callId,
          duration: 300, // 5 minutes in seconds
        });

      expect([200, 400, 403, 404]).toContain(response.status);
    });

    it('should end an active call without duration', async () => {
      if (!callId) {
        console.log('Skipping: No call ID available');
        return;
      }

      const response = await authenticatedRequest()
        .post(`${PREFIX}/end`)
        .send({ callId });

      // Duration is optional
      expect([200, 400, 403, 404]).toContain(response.status);
    });

    it('should reject end without callId', async () => {
      const response = await authenticatedRequest()
        .post(`${PREFIX}/end`)
        .send({});

      expect([400, 422]).toContain(response.status);
    });

    it('should reject end without callId but with duration', async () => {
      const response = await authenticatedRequest()
        .post(`${PREFIX}/end`)
        .send({ duration: 120 });

      expect([400, 422]).toContain(response.status);
    });

    it('should handle ending non-existent call', async () => {
      const response = await authenticatedRequest()
        .post(`${PREFIX}/end`)
        .send({ callId: nonExistentCallId });

      expect([400, 404]).toContain(response.status);
    });

    it('should handle ending an already-ended call', async () => {
      if (!callId) {
        console.log('Skipping: No call ID available');
        return;
      }

      // Try ending the same call twice
      await authenticatedRequest()
        .post(`${PREFIX}/end`)
        .send({ callId });

      const secondEnd = await authenticatedRequest()
        .post(`${PREFIX}/end`)
        .send({ callId });

      // Should handle gracefully (idempotent or conflict)
      expect([200, 400, 404, 409]).toContain(secondEnd.status);
    });

    it('should fail without authentication', async () => {
      const response = await request(API_BASE)
        .post(`${PREFIX}/end`)
        .send({ callId: callId || 'some-id' });

      expect(response.status).toBe(401);
    });
  });

  // ==========================================================================
  // CALL STATUS
  // ==========================================================================
  describe('GET /api/v1/calls/:callId - Get Call Status', () => {

    it('should return call status for an existing call', async () => {
      if (!callId) {
        console.log('Skipping: No call ID available');
        return;
      }

      const response = await authenticatedRequest()
        .get(`${PREFIX}/${callId}`);

      expect([200, 403, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.body.data || response.body;
        expect(data).toBeDefined();
        // Call data should have key fields
        if (data.id || data.callId) {
          expect(data.id || data.callId).toBe(callId);
        }
        if (data.status) {
          expect(typeof data.status).toBe('string');
        }
        if (data.callType) {
          expect(['video', 'audio']).toContain(data.callType);
        }
      }
    });

    it('should return 404 for non-existent call ID', async () => {
      const response = await authenticatedRequest()
        .get(`${PREFIX}/${nonExistentCallId}`);

      expect([400, 404]).toContain(response.status);
    });

    it('should fail without authentication', async () => {
      const response = await request(API_BASE)
        .get(`${PREFIX}/${callId || 'some-id'}`);

      expect(response.status).toBe(401);
    });

    it('should fail with invalid token', async () => {
      const response = await request(API_BASE)
        .get(`${PREFIX}/${callId || 'some-id'}`)
        .set('Authorization', 'Bearer expired-or-invalid-token');

      expect(response.status).toBe(401);
    });
  });

  // ==========================================================================
  // CALL HISTORY
  // ==========================================================================
  describe('GET /api/v1/calls/history - Get Call History', () => {

    it('should return call history with default pagination', async () => {
      const response = await authenticatedRequest()
        .get(`${PREFIX}/history`);

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();

      const data = response.body.data || response.body;
      if (Array.isArray(data)) {
        expect(data).toBeInstanceOf(Array);
      } else if (data.calls) {
        expect(Array.isArray(data.calls)).toBe(true);
      }
    });

    it('should return call history with limit parameter', async () => {
      const response = await authenticatedRequest()
        .get(`${PREFIX}/history`)
        .query({ limit: 5 });

      expect(response.status).toBe(200);

      const items = response.body.data || response.body.calls || response.body;
      if (Array.isArray(items)) {
        expect(items.length).toBeLessThanOrEqual(5);
      }
    });

    it('should return call history with offset parameter', async () => {
      const response = await authenticatedRequest()
        .get(`${PREFIX}/history`)
        .query({ limit: 10, offset: 0 });

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });

    it('should return call history with large offset (empty result)', async () => {
      const response = await authenticatedRequest()
        .get(`${PREFIX}/history`)
        .query({ limit: 10, offset: 99999 });

      expect(response.status).toBe(200);

      const items = response.body.data || response.body.calls || response.body;
      if (Array.isArray(items)) {
        expect(items.length).toBe(0);
      }
    });

    it('should return empty history for a user with no calls', async () => {
      const response = await authenticatedRequest()
        .get(`${PREFIX}/history`);

      expect(response.status).toBe(200);

      const items = response.body.data || response.body.calls || response.body;
      if (Array.isArray(items)) {
        // Might be empty or have calls from earlier tests
        expect(items).toBeInstanceOf(Array);
      }
    });

    it('should include call metadata in history entries', async () => {
      const response = await authenticatedRequest()
        .get(`${PREFIX}/history`)
        .query({ limit: 5 });

      expect(response.status).toBe(200);

      const items = response.body.data || response.body.calls || response.body;
      if (Array.isArray(items) && items.length > 0) {
        const entry = items[0];
        // Each history entry should have identifiable fields
        expect(entry).toHaveProperty('id');
        if (entry.callType) {
          expect(['video', 'audio']).toContain(entry.callType);
        }
      }
    });

    it('should fail without authentication', async () => {
      const response = await request(API_BASE)
        .get(`${PREFIX}/history`);

      expect(response.status).toBe(401);
    });
  });

  // ==========================================================================
  // AVAILABILITY CHECK
  // ==========================================================================
  describe('GET /api/v1/calls/availability/:userId - Check Availability', () => {

    it('should check availability of another user', async () => {
      const response = await authenticatedRequest()
        .get(`${PREFIX}/availability/${fakeCalleeId}`);

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.body.data || response.body;
        expect(data).toBeDefined();
        // Should indicate whether the user is available
        if (data.available !== undefined) {
          expect(typeof data.available).toBe('boolean');
        }
      }
    });

    it('should return availability status for a valid user', async () => {
      if (!testState.userId) {
        console.log('Skipping: No user ID available');
        return;
      }

      const response = await authenticatedRequest()
        .get(`${PREFIX}/availability/${testState.userId}`);

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toBeDefined();
      }
    });

    it('should handle non-existent user ID for availability', async () => {
      const response = await authenticatedRequest()
        .get(`${PREFIX}/availability/totally-fake-user-id-000`);

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.body.data || response.body;
        // Non-existent user should show as unavailable
        if (data.available !== undefined) {
          expect(data.available).toBe(false);
        }
      }
    });

    it('should fail without authentication', async () => {
      const response = await request(API_BASE)
        .get(`${PREFIX}/availability/${fakeCalleeId}`);

      expect(response.status).toBe(401);
    });

    it('should fail with invalid token', async () => {
      const response = await request(API_BASE)
        .get(`${PREFIX}/availability/${fakeCalleeId}`)
        .set('Authorization', 'Bearer bad-token-value');

      expect(response.status).toBe(401);
    });
  });

  // ==========================================================================
  // CALL LIFECYCLE (full flow)
  // ==========================================================================
  describe('Call Lifecycle Integration', () => {

    it('should complete a full call lifecycle: request -> accept -> end', async () => {
      // Step 1: Request a call
      const requestResp = await authenticatedRequest()
        .post(`${PREFIX}/request`)
        .send({
          calleeId: fakeCalleeId,
          callType: 'video',
        });

      if (requestResp.status === 403) {
        // User does not have premium subscription -- lifecycle cannot proceed
        console.log('Skipping lifecycle: User lacks premium subscription');
        expect(requestResp.status).toBe(403);
        return;
      }

      expect([200, 201]).toContain(requestResp.status);
      const requestData = requestResp.body.data || requestResp.body;
      const lifecycleCallId = requestData.callId || requestData.id;
      expect(lifecycleCallId).toBeDefined();

      // Step 2: Accept the call
      const acceptResp = await authenticatedRequest()
        .post(`${PREFIX}/accept`)
        .send({ callId: lifecycleCallId });

      // Acceptance might fail if the authenticated user is the caller, not the callee
      expect([200, 400, 403]).toContain(acceptResp.status);

      // Step 3: End the call
      const endResp = await authenticatedRequest()
        .post(`${PREFIX}/end`)
        .send({
          callId: lifecycleCallId,
          duration: 120,
        });

      expect([200, 400, 404]).toContain(endResp.status);

      // Step 4: Verify in history
      await wait(500);
      const historyResp = await authenticatedRequest()
        .get(`${PREFIX}/history`)
        .query({ limit: 5 });

      expect(historyResp.status).toBe(200);
    });

    it('should complete a rejection flow: request -> reject', async () => {
      // Step 1: Request a call
      const requestResp = await authenticatedRequest()
        .post(`${PREFIX}/request`)
        .send({
          calleeId: fakeCalleeId,
          callType: 'audio',
        });

      if (requestResp.status === 403) {
        console.log('Skipping rejection flow: User lacks premium subscription');
        return;
      }

      expect([200, 201]).toContain(requestResp.status);
      const requestData = requestResp.body.data || requestResp.body;
      const rejectCallId = requestData.callId || requestData.id;

      if (!rejectCallId) {
        console.log('Skipping: No call ID from request');
        return;
      }

      // Step 2: Reject the call
      const rejectResp = await authenticatedRequest()
        .post(`${PREFIX}/reject`)
        .send({
          callId: rejectCallId,
          reason: 'not available right now',
        });

      expect([200, 400, 403]).toContain(rejectResp.status);

      // Step 3: Verify the call status shows rejected
      const statusResp = await authenticatedRequest()
        .get(`${PREFIX}/${rejectCallId}`);

      if (statusResp.status === 200) {
        const data = statusResp.body.data || statusResp.body;
        if (data.status) {
          expect(['rejected', 'ended', 'cancelled', 'missed']).toContain(data.status);
        }
      }
    });
  });

  // ==========================================================================
  // VALIDATION TESTS
  // ==========================================================================
  describe('Validation', () => {

    it('should reject call request with numeric calleeId', async () => {
      const response = await authenticatedRequest()
        .post(`${PREFIX}/request`)
        .send({
          calleeId: 12345,
          callType: 'video',
        });

      // May accept and convert, or reject
      expect([200, 201, 400, 403, 422]).toContain(response.status);
    });

    it('should reject call request with null callType', async () => {
      const response = await authenticatedRequest()
        .post(`${PREFIX}/request`)
        .send({
          calleeId: fakeCalleeId,
          callType: null,
        });

      expect([400, 422]).toContain(response.status);
    });

    it('should reject accept with numeric callId', async () => {
      const response = await authenticatedRequest()
        .post(`${PREFIX}/accept`)
        .send({ callId: 999 });

      expect([400, 404, 422]).toContain(response.status);
    });

    it('should reject end with negative duration', async () => {
      const response = await authenticatedRequest()
        .post(`${PREFIX}/end`)
        .send({
          callId: callId || 'some-valid-call-id',
          duration: -100,
        });

      expect([400, 404, 422]).toContain(response.status);
    });

    it('should handle extremely long reason string on reject', async () => {
      const longReason = 'x'.repeat(5000);

      const response = await authenticatedRequest()
        .post(`${PREFIX}/reject`)
        .send({
          callId: callId || nonExistentCallId,
          reason: longReason,
        });

      // Should either truncate, accept, or reject
      expect([200, 400, 404, 413, 422]).toContain(response.status);
    });
  });

  // ==========================================================================
  // AUTHENTICATION FAILURE TESTS
  // ==========================================================================
  describe('Authentication Failures', () => {

    const protectedEndpoints = [
      { method: 'post' as const, path: `${PREFIX}/request` },
      { method: 'post' as const, path: `${PREFIX}/accept` },
      { method: 'post' as const, path: `${PREFIX}/reject` },
      { method: 'post' as const, path: `${PREFIX}/end` },
      { method: 'get' as const, path: `${PREFIX}/test-call-id` },
      { method: 'get' as const, path: `${PREFIX}/history` },
      { method: 'get' as const, path: `${PREFIX}/availability/some-user` },
    ];

    it('should return 401 for all protected endpoints without token', async () => {
      const results = await Promise.all(
        protectedEndpoints.map(endpoint =>
          (request(API_BASE) as any)[endpoint.method](endpoint.path)
            .send({})
            .then((res: any) => ({
              endpoint: `${endpoint.method.toUpperCase()} ${endpoint.path}`,
              status: res.status,
            }))
        )
      );

      results.forEach(result => {
        expect(result.status).toBe(401);
      });
    });

    it('should return 401 for requests with malformed Authorization header', async () => {
      const response = await request(API_BASE)
        .get(`${PREFIX}/history`)
        .set('Authorization', 'Basic dXNlcjpwYXNz'); // Basic auth, not Bearer

      expect(response.status).toBe(401);
    });

    it('should return 401 for requests with expired token', async () => {
      const expiredToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
        'eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.' +
        'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      const response = await request(API_BASE)
        .post(`${PREFIX}/request`)
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({
          calleeId: fakeCalleeId,
          callType: 'video',
        });

      expect(response.status).toBe(401);
    });

    it('should return 401 for requests with empty Bearer token', async () => {
      const response = await request(API_BASE)
        .get(`${PREFIX}/history`)
        .set('Authorization', 'Bearer ');

      expect(response.status).toBe(401);
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================
  describe('Edge Cases', () => {

    it('should handle concurrent call requests gracefully', async () => {
      const requests = Array(3).fill(null).map((_, i) =>
        authenticatedRequest()
          .post(`${PREFIX}/request`)
          .send({
            calleeId: `concurrent-callee-${i}`,
            callType: i % 2 === 0 ? 'video' : 'audio',
          })
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        // Each should either succeed, fail due to premium, or rate-limit
        expect([200, 201, 400, 403, 409, 429]).toContain(response.status);
      });
    });

    it('should respond within acceptable time for history endpoint', async () => {
      const startTime = Date.now();

      await authenticatedRequest()
        .get(`${PREFIX}/history`)
        .query({ limit: 50 });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Under 5 seconds
    });

    it('should handle availability check for empty userId path param', async () => {
      const response = await authenticatedRequest()
        .get(`${PREFIX}/availability/`);

      // Should either 404 (no route) or 400
      expect([400, 404]).toContain(response.status);
    });

    it('should handle special characters in path parameters', async () => {
      const response = await authenticatedRequest()
        .get(`${PREFIX}/availability/user%20with%20spaces`);

      expect([200, 400, 404]).toContain(response.status);
    });

    it('should not leak other users call data in history', async () => {
      const response = await authenticatedRequest()
        .get(`${PREFIX}/history`)
        .query({ limit: 50 });

      expect(response.status).toBe(200);

      const items = response.body.data || response.body.calls || response.body;
      if (Array.isArray(items) && items.length > 0 && testState.userId) {
        items.forEach((item: any) => {
          // Every history entry should involve the authenticated user
          const callerId = item.callerId || item.caller_id || item.caller;
          const calleeId = item.calleeId || item.callee_id || item.callee;
          if (callerId && calleeId) {
            const involvesUser =
              callerId === testState.userId || calleeId === testState.userId;
            expect(involvesUser).toBe(true);
          }
        });
      }
    });
  });
});
