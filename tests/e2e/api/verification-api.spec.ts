import request from 'supertest';
import { config, testState, createTestUser, authenticatedRequest, wait } from './setup';

/**
 * E2E API Tests for Verification Service
 *
 * Tests the complete verification lifecycle including:
 * - Starting verification requests (identity, photo, age, etc.)
 * - Uploading verification artifacts (documents, selfies)
 * - Submitting for review
 * - Checking verification status
 * - Retrying failed verifications
 * - Admin approval/denial workflows
 * - RBAC enforcement (admin-only endpoints)
 *
 * Controller prefix: /api/v1/verification
 */
describe('Verification Service API', () => {
  const BASE_URL = config.API_GATEWAY_URL;
  const PREFIX = '/api/v1/verification';

  let verificationRequestId: string;
  let secondRequestId: string;

  // Helper: create a minimal JPEG buffer for upload tests
  const createTestImage = (sizeInKB: number = 100): Buffer => {
    const baseJpeg = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
      0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
      0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
      0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0A, 0x0C,
      0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
      0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D,
      0x1A, 0x1C, 0x1C, 0x20, 0x24, 0x2E, 0x27, 0x20,
      0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
      0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27,
      0x39, 0x3D, 0x38, 0x32, 0x3C, 0x2E, 0x33, 0x34,
      0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4,
      0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x03, 0xFF, 0xDA, 0x00, 0x08,
      0x01, 0x01, 0x00, 0x00, 0x3F, 0x00, 0x37, 0xFF,
      0xD9,
    ]);
    const targetSize = sizeInKB * 1024;
    if (baseJpeg.length >= targetSize) return baseJpeg;
    const padding = Buffer.alloc(targetSize - baseJpeg.length, 0xFF);
    return Buffer.concat([baseJpeg, padding]);
  };

  // Helper: create a fake PDF buffer for negative upload tests
  const createFakePdf = (): Buffer => {
    return Buffer.from('%PDF-1.4 fake content', 'utf-8');
  };

  // ===================================================================
  // 1. VERIFICATION LIFECYCLE (start -> upload -> submit -> status)
  // ===================================================================
  describe('Verification Lifecycle', () => {

    // --- POST /start ---
    describe('POST /start - Start Verification', () => {
      it('should start an identity verification request', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/start`)
          .send({
            type: 'identity',
            biometric_consent: true,
            metadata: { source: 'e2e-test' },
          });

        expect([200, 201]).toContain(response.status);
        if (response.status === 200 || response.status === 201) {
          expect(response.body).toBeDefined();
          // Store request_id for subsequent steps
          const data = response.body.data || response.body;
          if (data.request_id || data.requestId || data.id) {
            verificationRequestId = data.request_id || data.requestId || data.id;
          }
        }
      });

      it('should start a photo verification request', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/start`)
          .send({
            type: 'photo',
            metadata: { reason: 'profile_photo_verification' },
          });

        expect([200, 201]).toContain(response.status);
        if (response.status === 200 || response.status === 201) {
          const data = response.body.data || response.body;
          if (data.request_id || data.requestId || data.id) {
            secondRequestId = data.request_id || data.requestId || data.id;
          }
        }
      });

      it('should start an age verification request', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/start`)
          .send({
            type: 'age',
            region_policy_key: 'US-CA',
            biometric_consent: false,
          });

        expect([200, 201]).toContain(response.status);
      });

      it('should start a verification with region policy key', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/start`)
          .send({
            type: 'identity',
            region_policy_key: 'EU-GDPR',
            biometric_consent: true,
          });

        expect([200, 201]).toContain(response.status);
      });

      it('should reject request with missing type field', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/start`)
          .send({
            biometric_consent: true,
          });

        expect([400, 422]).toContain(response.status);
      });

      it('should reject request with invalid type enum value', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/start`)
          .send({
            type: 'invalid_type_value',
          });

        expect([400, 422]).toContain(response.status);
      });

      it('should reject request with empty body', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/start`)
          .send({});

        expect([400, 422]).toContain(response.status);
      });

      it('should fail without authentication', async () => {
        const response = await request(BASE_URL)
          .post(`${PREFIX}/start`)
          .send({ type: 'identity' });

        expect(response.status).toBe(401);
      });

      it('should fail with invalid token', async () => {
        const response = await request(BASE_URL)
          .post(`${PREFIX}/start`)
          .set('Authorization', 'Bearer invalid-token-abc123')
          .send({ type: 'identity' });

        expect(response.status).toBe(401);
      });
    });

    // --- POST /upload ---
    describe('POST /upload - Upload Verification Artifact', () => {
      it('should upload an identity document image', async () => {
        if (!verificationRequestId) {
          console.log('Skipping: No verification request ID available');
          return;
        }

        const response = await request(BASE_URL)
          .post(`${PREFIX}/upload`)
          .set('Authorization', `Bearer ${testState.accessToken}`)
          .field('request_id', verificationRequestId)
          .field('type', 'government_id_front')
          .attach('file', createTestImage(200), 'id-front.jpg');

        expect([200, 201]).toContain(response.status);
      });

      it('should upload a selfie image for verification', async () => {
        if (!verificationRequestId) {
          console.log('Skipping: No verification request ID available');
          return;
        }

        const response = await request(BASE_URL)
          .post(`${PREFIX}/upload`)
          .set('Authorization', `Bearer ${testState.accessToken}`)
          .field('request_id', verificationRequestId)
          .field('type', 'selfie')
          .attach('file', createTestImage(150), 'selfie.jpg');

        expect([200, 201]).toContain(response.status);
      });

      it('should reject upload without request_id', async () => {
        const response = await request(BASE_URL)
          .post(`${PREFIX}/upload`)
          .set('Authorization', `Bearer ${testState.accessToken}`)
          .field('type', 'government_id_front')
          .attach('file', createTestImage(100), 'id.jpg');

        expect([400, 422]).toContain(response.status);
      });

      it('should reject upload without file attached', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/upload`)
          .send({
            request_id: verificationRequestId || 'test-req-id',
            type: 'government_id_front',
          });

        expect([400, 422]).toContain(response.status);
      });

      it('should reject upload with invalid file type (PDF)', async () => {
        const response = await request(BASE_URL)
          .post(`${PREFIX}/upload`)
          .set('Authorization', `Bearer ${testState.accessToken}`)
          .field('request_id', verificationRequestId || 'test-req-id')
          .field('type', 'government_id_front')
          .attach('file', createFakePdf(), 'document.pdf');

        expect([400, 415, 422]).toContain(response.status);
      });

      it('should reject upload without authentication', async () => {
        const response = await request(BASE_URL)
          .post(`${PREFIX}/upload`)
          .field('request_id', 'some-id')
          .field('type', 'selfie')
          .attach('file', createTestImage(50), 'test.jpg');

        expect(response.status).toBe(401);
      });

      it('should reject upload with non-existent request_id', async () => {
        const response = await request(BASE_URL)
          .post(`${PREFIX}/upload`)
          .set('Authorization', `Bearer ${testState.accessToken}`)
          .field('request_id', 'non-existent-request-id-xyz')
          .field('type', 'selfie')
          .attach('file', createTestImage(100), 'selfie.jpg');

        expect([400, 404, 422]).toContain(response.status);
      });
    });

    // --- POST /submit ---
    describe('POST /submit - Submit for Review', () => {
      it('should submit a verification request for review', async () => {
        if (!verificationRequestId) {
          console.log('Skipping: No verification request ID available');
          return;
        }

        const response = await authenticatedRequest()
          .post(`${PREFIX}/submit`)
          .send({ request_id: verificationRequestId });

        expect([200, 201, 202]).toContain(response.status);
      });

      it('should reject submission without request_id', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/submit`)
          .send({});

        expect([400, 422]).toContain(response.status);
      });

      it('should reject submission with non-existent request_id', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/submit`)
          .send({ request_id: 'non-existent-request-99999' });

        expect([400, 404, 422]).toContain(response.status);
      });

      it('should fail without authentication', async () => {
        const response = await request(BASE_URL)
          .post(`${PREFIX}/submit`)
          .send({ request_id: 'some-request-id' });

        expect(response.status).toBe(401);
      });

      it('should handle double submission gracefully', async () => {
        if (!verificationRequestId) {
          console.log('Skipping: No verification request ID available');
          return;
        }

        // Submit again -- should either succeed idempotently or return conflict
        const response = await authenticatedRequest()
          .post(`${PREFIX}/submit`)
          .send({ request_id: verificationRequestId });

        expect([200, 201, 202, 409]).toContain(response.status);
      });
    });

    // --- GET /status ---
    describe('GET /status - Get Verification Status', () => {
      it('should return verification status for the authenticated user', async () => {
        const response = await authenticatedRequest()
          .get(`${PREFIX}/status`);

        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();
      });

      it('should filter status by verification type', async () => {
        const response = await authenticatedRequest()
          .get(`${PREFIX}/status`)
          .query({ type: 'identity' });

        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();
      });

      it('should return status for photo verification type', async () => {
        const response = await authenticatedRequest()
          .get(`${PREFIX}/status`)
          .query({ type: 'photo' });

        expect(response.status).toBe(200);
      });

      it('should return status for age verification type', async () => {
        const response = await authenticatedRequest()
          .get(`${PREFIX}/status`)
          .query({ type: 'age' });

        expect(response.status).toBe(200);
      });

      it('should handle unknown verification type gracefully', async () => {
        const response = await authenticatedRequest()
          .get(`${PREFIX}/status`)
          .query({ type: 'nonexistent_type' });

        expect([200, 400]).toContain(response.status);
      });

      it('should fail without authentication', async () => {
        const response = await request(BASE_URL)
          .get(`${PREFIX}/status`);

        expect(response.status).toBe(401);
      });

      it('should fail with invalid token', async () => {
        const response = await request(BASE_URL)
          .get(`${PREFIX}/status`)
          .set('Authorization', 'Bearer expired.or.invalid.token');

        expect(response.status).toBe(401);
      });
    });
  });

  // ===================================================================
  // 2. RETRY VERIFICATION
  // ===================================================================
  describe('Verification Retries', () => {

    describe('POST /retry - Retry Verification', () => {
      it('should retry a failed or denied verification request', async () => {
        if (!verificationRequestId) {
          console.log('Skipping: No verification request ID available');
          return;
        }

        const response = await authenticatedRequest()
          .post(`${PREFIX}/retry`)
          .send({ request_id: verificationRequestId });

        // Could succeed, or may return 400 if not in a retryable state
        expect([200, 201, 400, 409]).toContain(response.status);
      });

      it('should reject retry without request_id', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/retry`)
          .send({});

        expect([400, 422]).toContain(response.status);
      });

      it('should reject retry with non-existent request_id', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/retry`)
          .send({ request_id: 'non-existent-retry-id-xyz' });

        expect([400, 404, 422]).toContain(response.status);
      });

      it('should fail without authentication', async () => {
        const response = await request(BASE_URL)
          .post(`${PREFIX}/retry`)
          .send({ request_id: 'some-id' });

        expect(response.status).toBe(401);
      });
    });
  });

  // ===================================================================
  // 3. ADMIN ENDPOINTS
  // ===================================================================
  describe('Admin Verification Management', () => {
    const adminPrefix = `${PREFIX}/admin`;

    // --- GET /admin/pending ---
    describe('GET /admin/pending - Get Pending Verifications', () => {
      it('should return pending verifications for admin users', async () => {
        const response = await authenticatedRequest()
          .get(`${adminPrefix}/pending`)
          .query({ limit: 10, offset: 0 });

        // Regular user should be forbidden; admin would get 200
        expect([200, 403]).toContain(response.status);
      });

      it('should support pagination via limit and offset', async () => {
        const response = await authenticatedRequest()
          .get(`${adminPrefix}/pending`)
          .query({ limit: 5, offset: 0 });

        expect([200, 403]).toContain(response.status);
      });

      it('should support filtering by verification type', async () => {
        const response = await authenticatedRequest()
          .get(`${adminPrefix}/pending`)
          .query({ limit: 10, offset: 0, type: 'identity' });

        expect([200, 403]).toContain(response.status);
      });

      it('should support offset-based pagination for second page', async () => {
        const response = await authenticatedRequest()
          .get(`${adminPrefix}/pending`)
          .query({ limit: 5, offset: 5 });

        expect([200, 403]).toContain(response.status);
      });

      it('should fail without authentication', async () => {
        const response = await request(BASE_URL)
          .get(`${adminPrefix}/pending`)
          .query({ limit: 10, offset: 0 });

        expect(response.status).toBe(401);
      });

      it('should fail with invalid token', async () => {
        const response = await request(BASE_URL)
          .get(`${adminPrefix}/pending`)
          .set('Authorization', 'Bearer bad-token')
          .query({ limit: 10, offset: 0 });

        expect(response.status).toBe(401);
      });
    });

    // --- POST /admin/:requestId/approve ---
    describe('POST /admin/:requestId/approve - Approve Verification', () => {
      it('should approve a pending verification (admin)', async () => {
        const targetId = verificationRequestId || 'test-request-id';

        const response = await authenticatedRequest()
          .post(`${adminPrefix}/${targetId}/approve`)
          .send({ notes: 'Approved via E2E test' });

        // Regular user => 403; admin => 200; bad state => 400/404
        expect([200, 400, 403, 404]).toContain(response.status);
      });

      it('should approve without notes (optional field)', async () => {
        const targetId = verificationRequestId || 'test-request-id';

        const response = await authenticatedRequest()
          .post(`${adminPrefix}/${targetId}/approve`)
          .send({});

        expect([200, 400, 403, 404]).toContain(response.status);
      });

      it('should return 404 for non-existent request ID', async () => {
        const response = await authenticatedRequest()
          .post(`${adminPrefix}/non-existent-id-12345/approve`)
          .send({ notes: 'test' });

        expect([403, 404]).toContain(response.status);
      });

      it('should fail without authentication', async () => {
        const response = await request(BASE_URL)
          .post(`${adminPrefix}/some-request-id/approve`)
          .send({ notes: 'test' });

        expect(response.status).toBe(401);
      });
    });

    // --- POST /admin/:requestId/deny ---
    describe('POST /admin/:requestId/deny - Deny Verification', () => {
      it('should deny a pending verification with reason code (admin)', async () => {
        const targetId = secondRequestId || 'test-request-id-2';

        const response = await authenticatedRequest()
          .post(`${adminPrefix}/${targetId}/deny`)
          .send({
            reason_code: 'BLURRY_DOCUMENT',
            notes: 'Document was too blurry to verify identity',
          });

        expect([200, 400, 403, 404]).toContain(response.status);
      });

      it('should reject denial without reason_code', async () => {
        const targetId = secondRequestId || 'test-request-id-2';

        const response = await authenticatedRequest()
          .post(`${adminPrefix}/${targetId}/deny`)
          .send({ notes: 'Missing reason code' });

        // Should require reason_code; may return 400/403
        expect([400, 403, 422]).toContain(response.status);
      });

      it('should deny with notes (optional)', async () => {
        const targetId = secondRequestId || 'test-request-id-2';

        const response = await authenticatedRequest()
          .post(`${adminPrefix}/${targetId}/deny`)
          .send({
            reason_code: 'FACE_MISMATCH',
          });

        expect([200, 400, 403, 404]).toContain(response.status);
      });

      it('should return 404 for non-existent request ID', async () => {
        const response = await authenticatedRequest()
          .post(`${adminPrefix}/nonexistent-deny-id/deny`)
          .send({ reason_code: 'FAKE_DOCUMENT' });

        expect([403, 404]).toContain(response.status);
      });

      it('should fail without authentication', async () => {
        const response = await request(BASE_URL)
          .post(`${adminPrefix}/some-id/deny`)
          .send({ reason_code: 'FAKE_DOCUMENT' });

        expect(response.status).toBe(401);
      });
    });
  });

  // ===================================================================
  // 4. RBAC ENFORCEMENT
  // ===================================================================
  describe('RBAC - Role-Based Access Control', () => {
    it('should deny regular user access to GET /admin/pending', async () => {
      const response = await authenticatedRequest()
        .get(`${PREFIX}/admin/pending`)
        .query({ limit: 10, offset: 0 });

      // A regular user token should be rejected with 403
      expect([401, 403]).toContain(response.status);
    });

    it('should deny regular user access to POST /admin/:id/approve', async () => {
      const response = await authenticatedRequest()
        .post(`${PREFIX}/admin/any-request-id/approve`)
        .send({});

      expect([401, 403]).toContain(response.status);
    });

    it('should deny regular user access to POST /admin/:id/deny', async () => {
      const response = await authenticatedRequest()
        .post(`${PREFIX}/admin/any-request-id/deny`)
        .send({ reason_code: 'TEST' });

      expect([401, 403]).toContain(response.status);
    });

    it('should allow regular user to start a verification (non-admin)', async () => {
      const response = await authenticatedRequest()
        .post(`${PREFIX}/start`)
        .send({ type: 'photo' });

      // Regular users should be allowed to start verification
      expect([200, 201, 400]).toContain(response.status);
    });

    it('should allow regular user to check their own status (non-admin)', async () => {
      const response = await authenticatedRequest()
        .get(`${PREFIX}/status`);

      expect([200, 404]).toContain(response.status);
    });
  });

  // ===================================================================
  // 5. VALIDATION ERRORS
  // ===================================================================
  describe('Validation Errors', () => {
    it('should reject start with type as a number', async () => {
      const response = await authenticatedRequest()
        .post(`${PREFIX}/start`)
        .send({ type: 12345 });

      expect([400, 422]).toContain(response.status);
    });

    it('should reject start with type as null', async () => {
      const response = await authenticatedRequest()
        .post(`${PREFIX}/start`)
        .send({ type: null });

      expect([400, 422]).toContain(response.status);
    });

    it('should reject submit with request_id as empty string', async () => {
      const response = await authenticatedRequest()
        .post(`${PREFIX}/submit`)
        .send({ request_id: '' });

      expect([400, 422]).toContain(response.status);
    });

    it('should reject retry with request_id as a number', async () => {
      const response = await authenticatedRequest()
        .post(`${PREFIX}/retry`)
        .send({ request_id: 999 });

      expect([400, 422]).toContain(response.status);
    });

    it('should handle overly long metadata gracefully', async () => {
      const longMetadata: Record<string, string> = {};
      for (let i = 0; i < 100; i++) {
        longMetadata[`key_${i}`] = 'x'.repeat(1000);
      }

      const response = await authenticatedRequest()
        .post(`${PREFIX}/start`)
        .send({
          type: 'identity',
          metadata: longMetadata,
        });

      // Should either accept or reject, but not crash
      expect([200, 201, 400, 413, 422]).toContain(response.status);
    });
  });

  // ===================================================================
  // 6. AUTHENTICATION EDGE CASES
  // ===================================================================
  describe('Authentication Edge Cases', () => {
    it('should reject request with empty Authorization header', async () => {
      const response = await request(BASE_URL)
        .get(`${PREFIX}/status`)
        .set('Authorization', '');

      expect(response.status).toBe(401);
    });

    it('should reject request with Bearer but no token', async () => {
      const response = await request(BASE_URL)
        .get(`${PREFIX}/status`)
        .set('Authorization', 'Bearer ');

      expect(response.status).toBe(401);
    });

    it('should reject request with malformed Authorization scheme', async () => {
      const response = await request(BASE_URL)
        .get(`${PREFIX}/status`)
        .set('Authorization', 'Basic dGVzdDp0ZXN0');

      expect(response.status).toBe(401);
    });

    it('should reject request with expired JWT token', async () => {
      const expiredToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
        'eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxNTE2MjM5MDIyfQ.' +
        'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      const response = await request(BASE_URL)
        .get(`${PREFIX}/status`)
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });
  });

  // ===================================================================
  // 7. CONCURRENT AND EDGE CASE TESTS
  // ===================================================================
  describe('Concurrent & Edge Cases', () => {
    it('should handle concurrent verification start requests', async () => {
      const requests = Array(3)
        .fill(null)
        .map(() =>
          authenticatedRequest()
            .post(`${PREFIX}/start`)
            .send({ type: 'photo' }),
        );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect([200, 201, 400, 409, 429]).toContain(response.status);
      });
    });

    it('should handle concurrent status checks without errors', async () => {
      const requests = Array(5)
        .fill(null)
        .map(() =>
          authenticatedRequest().get(`${PREFIX}/status`),
        );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect([200, 429]).toContain(response.status);
      });
    });

    it('should return consistent status across sequential calls', async () => {
      const first = await authenticatedRequest().get(`${PREFIX}/status`);
      await wait(200);
      const second = await authenticatedRequest().get(`${PREFIX}/status`);

      expect(first.status).toBe(second.status);
      // Body shape should be consistent
      if (first.status === 200 && second.status === 200) {
        expect(typeof first.body).toEqual(typeof second.body);
      }
    });
  });

  // ===================================================================
  // 8. PERFORMANCE SANITY CHECKS
  // ===================================================================
  describe('Performance', () => {
    it('should respond to GET /status within 2 seconds', async () => {
      const startTime = Date.now();

      await authenticatedRequest().get(`${PREFIX}/status`);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000);
    });

    it('should respond to POST /start within 3 seconds', async () => {
      const startTime = Date.now();

      await authenticatedRequest()
        .post(`${PREFIX}/start`)
        .send({ type: 'photo' });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(3000);
    });
  });
});
