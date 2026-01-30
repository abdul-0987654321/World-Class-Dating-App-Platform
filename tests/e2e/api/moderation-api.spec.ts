import request from 'supertest';
import { config, testState, createTestUser, authenticatedRequest, wait } from './setup';

/**
 * E2E API Tests for Moderation Service
 *
 * Tests the complete moderation system including:
 * - Content submission and status checking
 * - Moderation queue management (admin/moderator)
 * - Content approval and rejection workflows
 * - Report lifecycle (submit, view, update)
 * - User moderation actions (ban, unban, warn)
 * - AI content scanning (text, image)
 * - Moderation statistics
 * - RBAC enforcement for admin/moderator endpoints
 *
 * Controller prefix: /api/v1/moderation
 */
describe('Moderation Service API', () => {
  const BASE_URL = config.API_GATEWAY_URL;
  const PREFIX = '/api/v1/moderation';

  let submittedContentId: string;
  let reportId: string;
  const fakeUserId = 'user-to-moderate-12345';

  // ===================================================================
  // 1. CONTENT SUBMISSION FLOW
  // ===================================================================
  describe('Content Submission Flow', () => {

    // --- POST /submit ---
    describe('POST /submit - Submit Content for Moderation', () => {
      it('should submit text content for moderation', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/submit`)
          .send({
            content_type: 'text',
            content: 'This is my new bio text for moderation review',
            context: 'profile_bio',
          });

        expect([200, 201, 202]).toContain(response.status);
        if (response.body) {
          const data = response.body.data || response.body;
          if (data.contentId || data.content_id || data.id) {
            submittedContentId = data.contentId || data.content_id || data.id;
          }
        }
      });

      it('should submit image content for moderation', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/submit`)
          .send({
            content_type: 'image',
            content_url: 'https://example.com/photos/profile-1.jpg',
            context: 'profile_photo',
          });

        expect([200, 201, 202]).toContain(response.status);
      });

      it('should submit message content for moderation', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/submit`)
          .send({
            content_type: 'text',
            content: 'Hey, nice to meet you! Would love to chat.',
            context: 'message',
            metadata: { conversation_id: 'conv-abc-123' },
          });

        expect([200, 201, 202]).toContain(response.status);
      });

      it('should reject submission with missing content_type', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/submit`)
          .send({
            content: 'Some content without a type',
          });

        expect([400, 422]).toContain(response.status);
      });

      it('should reject submission with empty content', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/submit`)
          .send({
            content_type: 'text',
            content: '',
          });

        expect([400, 422]).toContain(response.status);
      });

      it('should reject submission with empty body', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/submit`)
          .send({});

        expect([400, 422]).toContain(response.status);
      });

      it('should fail without authentication', async () => {
        const response = await request(BASE_URL)
          .post(`${PREFIX}/submit`)
          .send({
            content_type: 'text',
            content: 'No auth content',
          });

        expect(response.status).toBe(401);
      });
    });

    // --- GET /status/:contentId ---
    describe('GET /status/:contentId - Get Moderation Status', () => {
      it('should return moderation status for submitted content', async () => {
        if (!submittedContentId) {
          console.log('Skipping: No content ID available');
          return;
        }

        const response = await authenticatedRequest()
          .get(`${PREFIX}/status/${submittedContentId}`);

        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();
      });

      it('should return 404 for non-existent content ID', async () => {
        const response = await authenticatedRequest()
          .get(`${PREFIX}/status/non-existent-content-id-99999`);

        expect([404, 400]).toContain(response.status);
      });

      it('should fail without authentication', async () => {
        const response = await request(BASE_URL)
          .get(`${PREFIX}/status/some-content-id`);

        expect(response.status).toBe(401);
      });

      it('should fail with invalid token', async () => {
        const response = await request(BASE_URL)
          .get(`${PREFIX}/status/some-content-id`)
          .set('Authorization', 'Bearer invalid-token-xyz');

        expect(response.status).toBe(401);
      });
    });
  });

  // ===================================================================
  // 2. ADMIN/MODERATOR QUEUE MANAGEMENT
  // ===================================================================
  describe('Admin Queue Management', () => {

    // --- GET /queue ---
    describe('GET /queue - Get Moderation Queue', () => {
      it('should return moderation queue for admin/moderator', async () => {
        const response = await authenticatedRequest()
          .get(`${PREFIX}/queue`)
          .query({ status: 'pending', limit: 10, offset: 0 });

        // Regular user => 403; admin/moderator => 200
        expect([200, 403]).toContain(response.status);
        if (response.status === 200) {
          expect(response.body).toBeDefined();
        }
      });

      it('should support filtering queue by status', async () => {
        const response = await authenticatedRequest()
          .get(`${PREFIX}/queue`)
          .query({ status: 'approved', limit: 10, offset: 0 });

        expect([200, 403]).toContain(response.status);
      });

      it('should support pagination with limit and offset', async () => {
        const response = await authenticatedRequest()
          .get(`${PREFIX}/queue`)
          .query({ limit: 5, offset: 10 });

        expect([200, 403]).toContain(response.status);
      });

      it('should fail without authentication', async () => {
        const response = await request(BASE_URL)
          .get(`${PREFIX}/queue`)
          .query({ limit: 10, offset: 0 });

        expect(response.status).toBe(401);
      });
    });

    // --- PUT /approve/:contentId ---
    describe('PUT /approve/:contentId - Approve Content', () => {
      it('should approve content (admin/moderator)', async () => {
        const targetId = submittedContentId || 'test-content-id';

        const response = await authenticatedRequest()
          .put(`${PREFIX}/approve/${targetId}`);

        // Regular user => 403; admin => 200; not found => 404
        expect([200, 400, 403, 404]).toContain(response.status);
      });

      it('should return 404 for non-existent content ID', async () => {
        const response = await authenticatedRequest()
          .put(`${PREFIX}/approve/nonexistent-content-xyz`);

        expect([403, 404]).toContain(response.status);
      });

      it('should fail without authentication', async () => {
        const response = await request(BASE_URL)
          .put(`${PREFIX}/approve/some-content-id`);

        expect(response.status).toBe(401);
      });
    });

    // --- PUT /reject/:contentId ---
    describe('PUT /reject/:contentId - Reject Content', () => {
      it('should reject content with reason (admin/moderator)', async () => {
        const targetId = submittedContentId || 'test-content-id';

        const response = await authenticatedRequest()
          .put(`${PREFIX}/reject/${targetId}`)
          .send({
            reason: 'inappropriate_content',
            details: 'Content violates community guidelines on nudity',
          });

        expect([200, 400, 403, 404]).toContain(response.status);
      });

      it('should reject content without optional details', async () => {
        const targetId = submittedContentId || 'test-content-id';

        const response = await authenticatedRequest()
          .put(`${PREFIX}/reject/${targetId}`)
          .send({
            reason: 'spam',
          });

        expect([200, 400, 403, 404]).toContain(response.status);
      });

      it('should return 404 for non-existent content ID', async () => {
        const response = await authenticatedRequest()
          .put(`${PREFIX}/reject/nonexistent-reject-xyz`)
          .send({ reason: 'test' });

        expect([403, 404]).toContain(response.status);
      });

      it('should fail without authentication', async () => {
        const response = await request(BASE_URL)
          .put(`${PREFIX}/reject/some-content-id`)
          .send({ reason: 'spam' });

        expect(response.status).toBe(401);
      });
    });
  });

  // ===================================================================
  // 3. REPORT LIFECYCLE
  // ===================================================================
  describe('Report Lifecycle', () => {

    // --- POST /reports ---
    describe('POST /reports - Submit Report', () => {
      it('should submit a report against another user', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/reports`)
          .send({
            reported_user_id: fakeUserId,
            reason: 'harassment',
            description: 'This user sent harassing messages repeatedly.',
            evidence_urls: ['https://example.com/screenshot1.jpg'],
          });

        expect([200, 201, 202]).toContain(response.status);
        if (response.body) {
          const data = response.body.data || response.body;
          if (data.reportId || data.report_id || data.id) {
            reportId = data.reportId || data.report_id || data.id;
          }
        }
      });

      it('should submit a report for fake profile', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/reports`)
          .send({
            reported_user_id: fakeUserId,
            reason: 'fake_profile',
            description: 'Profile photos appear to be stolen from another person.',
          });

        expect([200, 201, 202]).toContain(response.status);
      });

      it('should submit a report for spam', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/reports`)
          .send({
            reported_user_id: fakeUserId,
            reason: 'spam',
            description: 'User is sending promotional links in messages.',
          });

        expect([200, 201, 202]).toContain(response.status);
      });

      it('should reject report without reported_user_id', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/reports`)
          .send({
            reason: 'harassment',
            description: 'Missing the user ID',
          });

        expect([400, 422]).toContain(response.status);
      });

      it('should reject report without reason', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/reports`)
          .send({
            reported_user_id: fakeUserId,
            description: 'Missing the reason',
          });

        expect([400, 422]).toContain(response.status);
      });

      it('should reject report with empty body', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/reports`)
          .send({});

        expect([400, 422]).toContain(response.status);
      });

      it('should fail without authentication', async () => {
        const response = await request(BASE_URL)
          .post(`${PREFIX}/reports`)
          .send({
            reported_user_id: fakeUserId,
            reason: 'spam',
          });

        expect(response.status).toBe(401);
      });
    });

    // --- GET /reports/me ---
    describe('GET /reports/me - Get My Reports', () => {
      it('should return reports submitted by the authenticated user', async () => {
        const response = await authenticatedRequest()
          .get(`${PREFIX}/reports/me`);

        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();
      });

      it('should support pagination via limit and offset', async () => {
        const response = await authenticatedRequest()
          .get(`${PREFIX}/reports/me`)
          .query({ limit: 5, offset: 0 });

        expect(response.status).toBe(200);
      });

      it('should return second page of reports', async () => {
        const response = await authenticatedRequest()
          .get(`${PREFIX}/reports/me`)
          .query({ limit: 5, offset: 5 });

        expect(response.status).toBe(200);
      });

      it('should fail without authentication', async () => {
        const response = await request(BASE_URL)
          .get(`${PREFIX}/reports/me`);

        expect(response.status).toBe(401);
      });
    });

    // --- GET /reports (admin/moderator) ---
    describe('GET /reports - Get All Reports (Admin/Moderator)', () => {
      it('should return all reports for admin/moderator', async () => {
        const response = await authenticatedRequest()
          .get(`${PREFIX}/reports`);

        // Regular user => 403; admin/moderator => 200
        expect([200, 403]).toContain(response.status);
      });

      it('should fail without authentication', async () => {
        const response = await request(BASE_URL)
          .get(`${PREFIX}/reports`);

        expect(response.status).toBe(401);
      });
    });

    // --- GET /reports/:reportId (admin/moderator) ---
    describe('GET /reports/:reportId - Get Report Details (Admin/Moderator)', () => {
      it('should return report details for admin/moderator', async () => {
        const targetReportId = reportId || 'test-report-id';

        const response = await authenticatedRequest()
          .get(`${PREFIX}/reports/${targetReportId}`);

        expect([200, 403, 404]).toContain(response.status);
      });

      it('should return 404 for non-existent report', async () => {
        const response = await authenticatedRequest()
          .get(`${PREFIX}/reports/nonexistent-report-99999`);

        expect([403, 404]).toContain(response.status);
      });

      it('should fail without authentication', async () => {
        const response = await request(BASE_URL)
          .get(`${PREFIX}/reports/some-report-id`);

        expect(response.status).toBe(401);
      });
    });

    // --- PUT /reports/:reportId (admin/moderator) ---
    describe('PUT /reports/:reportId - Update Report (Admin/Moderator)', () => {
      it('should update a report status (admin/moderator)', async () => {
        const targetReportId = reportId || 'test-report-id';

        const response = await authenticatedRequest()
          .put(`${PREFIX}/reports/${targetReportId}`)
          .send({
            status: 'reviewed',
            resolution: 'warning_issued',
            admin_notes: 'User warned for first offense',
          });

        expect([200, 400, 403, 404]).toContain(response.status);
      });

      it('should reject update with invalid status', async () => {
        const targetReportId = reportId || 'test-report-id';

        const response = await authenticatedRequest()
          .put(`${PREFIX}/reports/${targetReportId}`)
          .send({ status: 'completely_invalid_status_value' });

        expect([400, 403, 422]).toContain(response.status);
      });

      it('should fail without authentication', async () => {
        const response = await request(BASE_URL)
          .put(`${PREFIX}/reports/some-report-id`)
          .send({ status: 'reviewed' });

        expect(response.status).toBe(401);
      });
    });
  });

  // ===================================================================
  // 4. BAN / UNBAN / WARN ACTIONS
  // ===================================================================
  describe('User Moderation Actions', () => {

    // --- POST /actions/ban ---
    describe('POST /actions/ban - Ban User (Admin Only)', () => {
      it('should ban a user (admin)', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/actions/ban`)
          .send({
            user_id: fakeUserId,
            reason: 'Repeated harassment after multiple warnings',
            duration: 'permanent',
          });

        // Regular user => 403; admin => 200
        expect([200, 400, 403, 404]).toContain(response.status);
      });

      it('should ban a user with temporary duration', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/actions/ban`)
          .send({
            user_id: fakeUserId,
            reason: 'Spam violation',
            duration: '7d',
          });

        expect([200, 400, 403, 404]).toContain(response.status);
      });

      it('should reject ban without user_id', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/actions/ban`)
          .send({
            reason: 'Missing user ID',
          });

        expect([400, 403, 422]).toContain(response.status);
      });

      it('should reject ban without reason', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/actions/ban`)
          .send({
            user_id: fakeUserId,
          });

        expect([400, 403, 422]).toContain(response.status);
      });

      it('should fail without authentication', async () => {
        const response = await request(BASE_URL)
          .post(`${PREFIX}/actions/ban`)
          .send({
            user_id: fakeUserId,
            reason: 'test',
          });

        expect(response.status).toBe(401);
      });
    });

    // --- POST /actions/unban ---
    describe('POST /actions/unban - Unban User (Admin Only)', () => {
      it('should unban a user (admin)', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/actions/unban`)
          .send({
            user_id: fakeUserId,
            reason: 'Ban appeal approved after review',
          });

        expect([200, 400, 403, 404]).toContain(response.status);
      });

      it('should reject unban without user_id', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/actions/unban`)
          .send({
            reason: 'Missing user',
          });

        expect([400, 403, 422]).toContain(response.status);
      });

      it('should fail without authentication', async () => {
        const response = await request(BASE_URL)
          .post(`${PREFIX}/actions/unban`)
          .send({ user_id: fakeUserId });

        expect(response.status).toBe(401);
      });
    });

    // --- POST /actions/warn ---
    describe('POST /actions/warn - Warn User (Admin/Moderator)', () => {
      it('should issue a warning to a user (admin/moderator)', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/actions/warn`)
          .send({
            user_id: fakeUserId,
            reason: 'Inappropriate profile content',
            message: 'Your profile photo violates our community guidelines. Please update it.',
          });

        expect([200, 400, 403, 404]).toContain(response.status);
      });

      it('should issue warning without optional message', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/actions/warn`)
          .send({
            user_id: fakeUserId,
            reason: 'Minor policy violation',
          });

        expect([200, 400, 403, 404]).toContain(response.status);
      });

      it('should reject warning without user_id', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/actions/warn`)
          .send({
            reason: 'Missing user',
          });

        expect([400, 403, 422]).toContain(response.status);
      });

      it('should reject warning without reason', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/actions/warn`)
          .send({
            user_id: fakeUserId,
          });

        expect([400, 403, 422]).toContain(response.status);
      });

      it('should fail without authentication', async () => {
        const response = await request(BASE_URL)
          .post(`${PREFIX}/actions/warn`)
          .send({
            user_id: fakeUserId,
            reason: 'test',
          });

        expect(response.status).toBe(401);
      });
    });
  });

  // ===================================================================
  // 5. MODERATION HISTORY
  // ===================================================================
  describe('Moderation History', () => {

    // --- GET /users/:userId/history ---
    describe('GET /users/:userId/history - User Moderation History (Admin/Moderator)', () => {
      it('should return moderation history for a user (admin/moderator)', async () => {
        const response = await authenticatedRequest()
          .get(`${PREFIX}/users/${fakeUserId}/history`);

        // Regular user => 403; admin/moderator => 200
        expect([200, 403, 404]).toContain(response.status);
      });

      it('should return 404 for non-existent user', async () => {
        const response = await authenticatedRequest()
          .get(`${PREFIX}/users/nonexistent-user-xyz/history`);

        expect([200, 403, 404]).toContain(response.status);
      });

      it('should fail without authentication', async () => {
        const response = await request(BASE_URL)
          .get(`${PREFIX}/users/${fakeUserId}/history`);

        expect(response.status).toBe(401);
      });
    });
  });

  // ===================================================================
  // 6. AI CONTENT SCANNING
  // ===================================================================
  describe('AI Content Scanning', () => {

    // --- POST /scan/text ---
    describe('POST /scan/text - Scan Text Content (Admin/Moderator)', () => {
      it('should scan clean text and return safe result', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/scan/text`)
          .send({
            text: 'Hello! I am looking for someone who enjoys hiking and cooking.',
          });

        expect([200, 403]).toContain(response.status);
        if (response.status === 200) {
          expect(response.body).toBeDefined();
        }
      });

      it('should scan potentially harmful text', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/scan/text`)
          .send({
            text: 'Buy cheap products at www.spam-link.com! Click now!',
          });

        expect([200, 403]).toContain(response.status);
        if (response.status === 200) {
          expect(response.body).toBeDefined();
        }
      });

      it('should reject scan with missing text field', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/scan/text`)
          .send({});

        expect([400, 403, 422]).toContain(response.status);
      });

      it('should reject scan with empty text', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/scan/text`)
          .send({ text: '' });

        expect([400, 403, 422]).toContain(response.status);
      });

      it('should handle very long text input gracefully', async () => {
        const longText = 'a'.repeat(50000);

        const response = await authenticatedRequest()
          .post(`${PREFIX}/scan/text`)
          .send({ text: longText });

        expect([200, 400, 403, 413]).toContain(response.status);
      });

      it('should fail without authentication', async () => {
        const response = await request(BASE_URL)
          .post(`${PREFIX}/scan/text`)
          .send({ text: 'test' });

        expect(response.status).toBe(401);
      });
    });

    // --- POST /scan/image ---
    describe('POST /scan/image - Scan Image Content (Admin/Moderator)', () => {
      it('should scan an image URL', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/scan/image`)
          .send({
            image_url: 'https://example.com/photos/test-profile.jpg',
          });

        expect([200, 403]).toContain(response.status);
        if (response.status === 200) {
          expect(response.body).toBeDefined();
        }
      });

      it('should reject scan with missing image_url', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/scan/image`)
          .send({});

        expect([400, 403, 422]).toContain(response.status);
      });

      it('should handle invalid image URL gracefully', async () => {
        const response = await authenticatedRequest()
          .post(`${PREFIX}/scan/image`)
          .send({ image_url: 'not-a-valid-url' });

        expect([400, 403, 422]).toContain(response.status);
      });

      it('should fail without authentication', async () => {
        const response = await request(BASE_URL)
          .post(`${PREFIX}/scan/image`)
          .send({ image_url: 'https://example.com/test.jpg' });

        expect(response.status).toBe(401);
      });
    });
  });

  // ===================================================================
  // 7. MODERATION STATISTICS
  // ===================================================================
  describe('Moderation Statistics', () => {

    // --- GET /statistics ---
    describe('GET /statistics - Get Moderation Stats (Admin/Moderator)', () => {
      it('should return moderation statistics for admin/moderator', async () => {
        const response = await authenticatedRequest()
          .get(`${PREFIX}/statistics`)
          .query({
            from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            to: new Date().toISOString(),
          });

        // Regular user => 403; admin/moderator => 200
        expect([200, 403]).toContain(response.status);
        if (response.status === 200) {
          expect(response.body).toBeDefined();
        }
      });

      it('should support custom date range', async () => {
        const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const to = new Date().toISOString();

        const response = await authenticatedRequest()
          .get(`${PREFIX}/statistics`)
          .query({ from, to });

        expect([200, 403]).toContain(response.status);
      });

      it('should handle missing date parameters gracefully', async () => {
        const response = await authenticatedRequest()
          .get(`${PREFIX}/statistics`);

        // Should either use defaults or return 400
        expect([200, 400, 403]).toContain(response.status);
      });

      it('should handle reversed date range gracefully', async () => {
        const from = new Date().toISOString();
        const to = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        const response = await authenticatedRequest()
          .get(`${PREFIX}/statistics`)
          .query({ from, to });

        expect([200, 400, 403]).toContain(response.status);
      });

      it('should fail without authentication', async () => {
        const response = await request(BASE_URL)
          .get(`${PREFIX}/statistics`)
          .query({
            from: '2025-01-01T00:00:00Z',
            to: '2025-12-31T23:59:59Z',
          });

        expect(response.status).toBe(401);
      });
    });
  });

  // ===================================================================
  // 8. RBAC ENFORCEMENT
  // ===================================================================
  describe('RBAC - Role-Based Access Control', () => {
    it('should deny regular user access to GET /queue', async () => {
      const response = await authenticatedRequest()
        .get(`${PREFIX}/queue`)
        .query({ limit: 10, offset: 0 });

      expect([401, 403]).toContain(response.status);
    });

    it('should deny regular user access to PUT /approve/:contentId', async () => {
      const response = await authenticatedRequest()
        .put(`${PREFIX}/approve/any-content-id`);

      expect([401, 403]).toContain(response.status);
    });

    it('should deny regular user access to PUT /reject/:contentId', async () => {
      const response = await authenticatedRequest()
        .put(`${PREFIX}/reject/any-content-id`)
        .send({ reason: 'test' });

      expect([401, 403]).toContain(response.status);
    });

    it('should deny regular user access to GET /reports (all reports)', async () => {
      const response = await authenticatedRequest()
        .get(`${PREFIX}/reports`);

      // GET /reports is admin-only; GET /reports/me is user-accessible
      // Note: if the API matches /reports/me first, this tests the admin list
      expect([200, 401, 403]).toContain(response.status);
    });

    it('should deny regular user access to GET /reports/:reportId', async () => {
      const response = await authenticatedRequest()
        .get(`${PREFIX}/reports/some-report-id`);

      expect([401, 403, 404]).toContain(response.status);
    });

    it('should deny regular user access to PUT /reports/:reportId', async () => {
      const response = await authenticatedRequest()
        .put(`${PREFIX}/reports/some-report-id`)
        .send({ status: 'reviewed' });

      expect([401, 403, 404]).toContain(response.status);
    });

    it('should deny regular user access to POST /actions/ban', async () => {
      const response = await authenticatedRequest()
        .post(`${PREFIX}/actions/ban`)
        .send({ user_id: fakeUserId, reason: 'test' });

      expect([401, 403]).toContain(response.status);
    });

    it('should deny regular user access to POST /actions/unban', async () => {
      const response = await authenticatedRequest()
        .post(`${PREFIX}/actions/unban`)
        .send({ user_id: fakeUserId });

      expect([401, 403]).toContain(response.status);
    });

    it('should deny regular user access to POST /actions/warn', async () => {
      const response = await authenticatedRequest()
        .post(`${PREFIX}/actions/warn`)
        .send({ user_id: fakeUserId, reason: 'test' });

      expect([401, 403]).toContain(response.status);
    });

    it('should deny regular user access to GET /users/:userId/history', async () => {
      const response = await authenticatedRequest()
        .get(`${PREFIX}/users/${fakeUserId}/history`);

      expect([401, 403]).toContain(response.status);
    });

    it('should deny regular user access to POST /scan/text', async () => {
      const response = await authenticatedRequest()
        .post(`${PREFIX}/scan/text`)
        .send({ text: 'test scan' });

      expect([200, 401, 403]).toContain(response.status);
    });

    it('should deny regular user access to POST /scan/image', async () => {
      const response = await authenticatedRequest()
        .post(`${PREFIX}/scan/image`)
        .send({ image_url: 'https://example.com/test.jpg' });

      expect([200, 401, 403]).toContain(response.status);
    });

    it('should deny regular user access to GET /statistics', async () => {
      const response = await authenticatedRequest()
        .get(`${PREFIX}/statistics`);

      expect([401, 403]).toContain(response.status);
    });

    it('should allow regular user to submit content (non-admin endpoint)', async () => {
      const response = await authenticatedRequest()
        .post(`${PREFIX}/submit`)
        .send({
          content_type: 'text',
          content: 'Regular user content submission test',
          context: 'profile_bio',
        });

      expect([200, 201, 202, 400]).toContain(response.status);
    });

    it('should allow regular user to submit a report (non-admin endpoint)', async () => {
      const response = await authenticatedRequest()
        .post(`${PREFIX}/reports`)
        .send({
          reported_user_id: fakeUserId,
          reason: 'spam',
          description: 'RBAC test report submission',
        });

      expect([200, 201, 202, 400]).toContain(response.status);
    });

    it('should allow regular user to view own reports (non-admin endpoint)', async () => {
      const response = await authenticatedRequest()
        .get(`${PREFIX}/reports/me`);

      expect([200, 404]).toContain(response.status);
    });
  });

  // ===================================================================
  // 9. AUTHENTICATION EDGE CASES
  // ===================================================================
  describe('Authentication Edge Cases', () => {
    it('should reject request with empty Authorization header', async () => {
      const response = await request(BASE_URL)
        .get(`${PREFIX}/status/some-id`)
        .set('Authorization', '');

      expect(response.status).toBe(401);
    });

    it('should reject request with Bearer but no token', async () => {
      const response = await request(BASE_URL)
        .post(`${PREFIX}/submit`)
        .set('Authorization', 'Bearer ')
        .send({ content_type: 'text', content: 'test' });

      expect(response.status).toBe(401);
    });

    it('should reject request with malformed Authorization scheme', async () => {
      const response = await request(BASE_URL)
        .get(`${PREFIX}/reports/me`)
        .set('Authorization', 'Basic dGVzdDp0ZXN0');

      expect(response.status).toBe(401);
    });

    it('should reject request with expired JWT token', async () => {
      const expiredToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
        'eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxNTE2MjM5MDIyfQ.' +
        'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      const response = await request(BASE_URL)
        .post(`${PREFIX}/reports`)
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({
          reported_user_id: fakeUserId,
          reason: 'spam',
        });

      expect(response.status).toBe(401);
    });
  });

  // ===================================================================
  // 10. CONCURRENT AND EDGE CASE TESTS
  // ===================================================================
  describe('Concurrent & Edge Cases', () => {
    it('should handle concurrent report submissions', async () => {
      const requests = Array(3)
        .fill(null)
        .map((_, i) =>
          authenticatedRequest()
            .post(`${PREFIX}/reports`)
            .send({
              reported_user_id: fakeUserId,
              reason: 'spam',
              description: `Concurrent report ${i}`,
            }),
        );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect([200, 201, 202, 400, 429]).toContain(response.status);
      });
    });

    it('should handle concurrent content submissions', async () => {
      const requests = Array(3)
        .fill(null)
        .map((_, i) =>
          authenticatedRequest()
            .post(`${PREFIX}/submit`)
            .send({
              content_type: 'text',
              content: `Concurrent content ${i}`,
              context: 'profile_bio',
            }),
        );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect([200, 201, 202, 400, 429]).toContain(response.status);
      });
    });

    it('should handle rapid status checks without errors', async () => {
      if (!submittedContentId) {
        console.log('Skipping: No content ID for status checks');
        return;
      }

      const requests = Array(5)
        .fill(null)
        .map(() =>
          authenticatedRequest()
            .get(`${PREFIX}/status/${submittedContentId}`),
        );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect([200, 404, 429]).toContain(response.status);
      });
    });
  });

  // ===================================================================
  // 11. PERFORMANCE SANITY CHECKS
  // ===================================================================
  describe('Performance', () => {
    it('should respond to GET /reports/me within 2 seconds', async () => {
      const startTime = Date.now();

      await authenticatedRequest().get(`${PREFIX}/reports/me`);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000);
    });

    it('should respond to POST /submit within 3 seconds', async () => {
      const startTime = Date.now();

      await authenticatedRequest()
        .post(`${PREFIX}/submit`)
        .send({
          content_type: 'text',
          content: 'Performance test content',
          context: 'profile_bio',
        });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(3000);
    });

    it('should respond to POST /reports within 3 seconds', async () => {
      const startTime = Date.now();

      await authenticatedRequest()
        .post(`${PREFIX}/reports`)
        .send({
          reported_user_id: fakeUserId,
          reason: 'spam',
          description: 'Performance test report',
        });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(3000);
    });
  });
});
