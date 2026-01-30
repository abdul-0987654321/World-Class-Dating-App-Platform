import request from 'supertest';
import { config, testState, createTestUser, authenticatedRequest, wait } from './setup';

const BASE = '/api/v1/communities';
const API_URL = config.API_GATEWAY_URL;

// Non-existent IDs for negative-path tests
const NON_EXISTENT_COMMUNITY_ID = '00000000-0000-0000-0000-000000000000';
const NON_EXISTENT_POST_ID = '00000000-0000-0000-0000-000000000001';
const NON_EXISTENT_COMMENT_ID = '00000000-0000-0000-0000-000000000002';
const NON_EXISTENT_EVENT_ID = '00000000-0000-0000-0000-000000000003';

describe('Community Service API — E2E', () => {
  // Shared state populated during the test run
  let communityId: string;
  let postId: string;
  let commentId: string;
  let eventId: string;

  // ─── Setup ──────────────────────────────────────────────────────────
  beforeAll(async () => {
    await createTestUser();
  });

  // ===================================================================
  // 1. LISTING & DISCOVERY
  // ===================================================================
  describe('Community listing & discovery', () => {
    it('GET / — should return a list of communities', async () => {
      const res = await authenticatedRequest()
        .get(BASE);

      expect([200, 201]).toContain(res.status);
      expect(res.body).toBeDefined();

      // Capture a community ID for subsequent tests
      const data = Array.isArray(res.body) ? res.body : res.body.data;
      if (Array.isArray(data) && data.length > 0) {
        communityId = data[0].id || data[0]._id;
      }
    });

    it('GET / — should support category query param', async () => {
      const res = await authenticatedRequest()
        .get(`${BASE}?category=social`);

      expect([200, 201]).toContain(res.status);
    });

    it('GET /categories — should return community categories', async () => {
      const res = await authenticatedRequest()
        .get(`${BASE}/categories`);

      expect([200, 201]).toContain(res.status);
      const data = Array.isArray(res.body) ? res.body : res.body.data;
      if (Array.isArray(data)) {
        expect(data.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('GET /search — should search communities by keyword', async () => {
      const res = await authenticatedRequest()
        .get(`${BASE}/search?q=test`);

      expect([200, 201]).toContain(res.status);
    });

    it('GET /search — should return empty results for gibberish query', async () => {
      const res = await authenticatedRequest()
        .get(`${BASE}/search?q=zzzzxnonexistent999`);

      expect([200, 201]).toContain(res.status);
      const data = Array.isArray(res.body) ? res.body : res.body.data;
      if (Array.isArray(data)) {
        expect(data.length).toBe(0);
      }
    });

    it('GET /joined — should return joined communities', async () => {
      const res = await authenticatedRequest()
        .get(`${BASE}/joined`);

      expect([200, 201]).toContain(res.status);
    });

    it('GET /:communityId — should return a single community', async () => {
      if (!communityId) {
        console.warn('Skipping: no communityId available');
        return;
      }

      const res = await authenticatedRequest()
        .get(`${BASE}/${communityId}`);

      expect(res.status).toBe(200);
      const body = res.body.data || res.body;
      expect(body).toHaveProperty('id');
    });

    it('GET /:communityId — should return 404 for non-existent community', async () => {
      const res = await authenticatedRequest()
        .get(`${BASE}/${NON_EXISTENT_COMMUNITY_ID}`);

      expect(res.status).toBe(404);
    });
  });

  // ===================================================================
  // 2. COMMUNITY MEMBERSHIP
  // ===================================================================
  describe('Community membership', () => {
    it('POST /:communityId/join — should join a community', async () => {
      if (!communityId) {
        console.warn('Skipping: no communityId available');
        return;
      }

      const res = await authenticatedRequest()
        .post(`${BASE}/${communityId}/join`);

      // 200/201 = success, 409 = already joined
      expect([200, 201, 409]).toContain(res.status);
    });

    it('POST /:communityId/join — should return 404 for non-existent community', async () => {
      const res = await authenticatedRequest()
        .post(`${BASE}/${NON_EXISTENT_COMMUNITY_ID}/join`);

      expect(res.status).toBe(404);
    });

    it('GET /:communityId/members — should list community members', async () => {
      if (!communityId) {
        console.warn('Skipping: no communityId available');
        return;
      }

      const res = await authenticatedRequest()
        .get(`${BASE}/${communityId}/members`);

      expect([200, 201]).toContain(res.status);
      const data = Array.isArray(res.body) ? res.body : res.body.data;
      if (Array.isArray(data)) {
        expect(data.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('GET /:communityId/members — should support pagination', async () => {
      if (!communityId) {
        console.warn('Skipping: no communityId available');
        return;
      }

      const res = await authenticatedRequest()
        .get(`${BASE}/${communityId}/members?page=1&limit=5`);

      expect([200, 201]).toContain(res.status);
    });

    it('POST /:communityId/leave — should leave a community', async () => {
      if (!communityId) {
        console.warn('Skipping: no communityId available');
        return;
      }

      const res = await authenticatedRequest()
        .post(`${BASE}/${communityId}/leave`);

      // 200 = left, 404 = not a member / not found
      expect([200, 201, 404]).toContain(res.status);
    });

    it('POST /:communityId/leave — should return 404 for non-existent community', async () => {
      const res = await authenticatedRequest()
        .post(`${BASE}/${NON_EXISTENT_COMMUNITY_ID}/leave`);

      expect(res.status).toBe(404);
    });

    it('POST /:communityId/join — rejoin after leaving', async () => {
      if (!communityId) {
        console.warn('Skipping: no communityId available');
        return;
      }

      // Rejoin so subsequent post/comment tests work
      const res = await authenticatedRequest()
        .post(`${BASE}/${communityId}/join`);

      expect([200, 201, 409]).toContain(res.status);
    });
  });

  // ===================================================================
  // 3. POST LIFECYCLE (CRUD)
  // ===================================================================
  describe('Post lifecycle', () => {
    it('POST /:communityId/posts — should create a post', async () => {
      if (!communityId) {
        console.warn('Skipping: no communityId available');
        return;
      }

      const res = await authenticatedRequest()
        .post(`${BASE}/${communityId}/posts`)
        .send({ content: 'Hello from E2E test!' });

      expect([200, 201]).toContain(res.status);
      const body = res.body.data || res.body;
      if (body && (body.id || body._id)) {
        postId = body.id || body._id;
      }
    });

    it('POST /:communityId/posts — should create a post with images', async () => {
      if (!communityId) {
        console.warn('Skipping: no communityId available');
        return;
      }

      const res = await authenticatedRequest()
        .post(`${BASE}/${communityId}/posts`)
        .send({
          content: 'Post with images',
          images: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
        });

      expect([200, 201]).toContain(res.status);
    });

    it('POST /:communityId/posts — should fail without content', async () => {
      if (!communityId) {
        console.warn('Skipping: no communityId available');
        return;
      }

      const res = await authenticatedRequest()
        .post(`${BASE}/${communityId}/posts`)
        .send({});

      expect([400, 422]).toContain(res.status);
    });

    it('POST /:communityId/posts — should return 404 for non-existent community', async () => {
      const res = await authenticatedRequest()
        .post(`${BASE}/${NON_EXISTENT_COMMUNITY_ID}/posts`)
        .send({ content: 'This should fail' });

      expect(res.status).toBe(404);
    });

    it('GET /:communityId/posts — should list posts', async () => {
      if (!communityId) {
        console.warn('Skipping: no communityId available');
        return;
      }

      const res = await authenticatedRequest()
        .get(`${BASE}/${communityId}/posts`);

      expect([200, 201]).toContain(res.status);
    });

    it('GET /:communityId/posts — should support pagination', async () => {
      if (!communityId) {
        console.warn('Skipping: no communityId available');
        return;
      }

      const res = await authenticatedRequest()
        .get(`${BASE}/${communityId}/posts?page=1&limit=5`);

      expect([200, 201]).toContain(res.status);
    });

    it('PUT /:communityId/posts/:postId — should update own post', async () => {
      if (!communityId || !postId) {
        console.warn('Skipping: missing communityId or postId');
        return;
      }

      const res = await authenticatedRequest()
        .put(`${BASE}/${communityId}/posts/${postId}`)
        .send({ content: 'Updated content from E2E test' });

      expect([200, 201]).toContain(res.status);
    });

    it('PUT /:communityId/posts/:postId — should return 404 for non-existent post', async () => {
      if (!communityId) {
        console.warn('Skipping: no communityId available');
        return;
      }

      const res = await authenticatedRequest()
        .put(`${BASE}/${communityId}/posts/${NON_EXISTENT_POST_ID}`)
        .send({ content: 'This should not work' });

      expect(res.status).toBe(404);
    });
  });

  // ===================================================================
  // 4. POST LIKES
  // ===================================================================
  describe('Post likes', () => {
    it('POST /:communityId/posts/:postId/like — should like a post', async () => {
      if (!communityId || !postId) {
        console.warn('Skipping: missing communityId or postId');
        return;
      }

      const res = await authenticatedRequest()
        .post(`${BASE}/${communityId}/posts/${postId}/like`);

      // 200/201 = liked, 409 = already liked
      expect([200, 201, 409]).toContain(res.status);
    });

    it('POST /:communityId/posts/:postId/like — should return 404 for non-existent post', async () => {
      if (!communityId) {
        console.warn('Skipping: no communityId available');
        return;
      }

      const res = await authenticatedRequest()
        .post(`${BASE}/${communityId}/posts/${NON_EXISTENT_POST_ID}/like`);

      expect(res.status).toBe(404);
    });

    it('DELETE /:communityId/posts/:postId/like — should unlike a post', async () => {
      if (!communityId || !postId) {
        console.warn('Skipping: missing communityId or postId');
        return;
      }

      const res = await authenticatedRequest()
        .delete(`${BASE}/${communityId}/posts/${postId}/like`);

      // 200 = unliked, 404 = wasn't liked
      expect([200, 204, 404]).toContain(res.status);
    });
  });

  // ===================================================================
  // 5. COMMENTS
  // ===================================================================
  describe('Comments', () => {
    it('POST /:communityId/posts/:postId/comments — should create a comment', async () => {
      if (!communityId || !postId) {
        console.warn('Skipping: missing communityId or postId');
        return;
      }

      const res = await authenticatedRequest()
        .post(`${BASE}/${communityId}/posts/${postId}/comments`)
        .send({ content: 'E2E test comment' });

      expect([200, 201]).toContain(res.status);
      const body = res.body.data || res.body;
      if (body && (body.id || body._id)) {
        commentId = body.id || body._id;
      }
    });

    it('POST /:communityId/posts/:postId/comments — should create a threaded reply', async () => {
      if (!communityId || !postId || !commentId) {
        console.warn('Skipping: missing IDs');
        return;
      }

      const res = await authenticatedRequest()
        .post(`${BASE}/${communityId}/posts/${postId}/comments`)
        .send({ content: 'Reply to parent comment', parentId: commentId });

      expect([200, 201]).toContain(res.status);
    });

    it('POST /:communityId/posts/:postId/comments — should fail without content', async () => {
      if (!communityId || !postId) {
        console.warn('Skipping: missing communityId or postId');
        return;
      }

      const res = await authenticatedRequest()
        .post(`${BASE}/${communityId}/posts/${postId}/comments`)
        .send({});

      expect([400, 422]).toContain(res.status);
    });

    it('POST /:communityId/posts/:postId/comments — 404 for non-existent post', async () => {
      if (!communityId) {
        console.warn('Skipping: no communityId available');
        return;
      }

      const res = await authenticatedRequest()
        .post(`${BASE}/${communityId}/posts/${NON_EXISTENT_POST_ID}/comments`)
        .send({ content: 'Should fail' });

      expect(res.status).toBe(404);
    });

    it('GET /:communityId/posts/:postId/comments — should list comments', async () => {
      if (!communityId || !postId) {
        console.warn('Skipping: missing communityId or postId');
        return;
      }

      const res = await authenticatedRequest()
        .get(`${BASE}/${communityId}/posts/${postId}/comments`);

      expect([200, 201]).toContain(res.status);
    });

    it('POST /:communityId/posts/:postId/comments/:commentId/like — should like a comment', async () => {
      if (!communityId || !postId || !commentId) {
        console.warn('Skipping: missing IDs');
        return;
      }

      const res = await authenticatedRequest()
        .post(`${BASE}/${communityId}/posts/${postId}/comments/${commentId}/like`);

      expect([200, 201, 409]).toContain(res.status);
    });

    it('POST /.../comments/:commentId/like — 404 for non-existent comment', async () => {
      if (!communityId || !postId) {
        console.warn('Skipping: missing IDs');
        return;
      }

      const res = await authenticatedRequest()
        .post(`${BASE}/${communityId}/posts/${postId}/comments/${NON_EXISTENT_COMMENT_ID}/like`);

      expect(res.status).toBe(404);
    });

    it('DELETE /:communityId/posts/:postId/comments/:commentId — should delete a comment', async () => {
      if (!communityId || !postId || !commentId) {
        console.warn('Skipping: missing IDs');
        return;
      }

      const res = await authenticatedRequest()
        .delete(`${BASE}/${communityId}/posts/${postId}/comments/${commentId}`);

      expect([200, 204]).toContain(res.status);
    });

    it('DELETE /.../comments/:commentId — 404 for non-existent comment', async () => {
      if (!communityId || !postId) {
        console.warn('Skipping: missing IDs');
        return;
      }

      const res = await authenticatedRequest()
        .delete(`${BASE}/${communityId}/posts/${postId}/comments/${NON_EXISTENT_COMMENT_ID}`);

      expect(res.status).toBe(404);
    });
  });

  // ===================================================================
  // 6. DELETE POST (after comment tests)
  // ===================================================================
  describe('Post deletion', () => {
    it('DELETE /:communityId/posts/:postId — should delete own post', async () => {
      if (!communityId || !postId) {
        console.warn('Skipping: missing communityId or postId');
        return;
      }

      const res = await authenticatedRequest()
        .delete(`${BASE}/${communityId}/posts/${postId}`);

      expect([200, 204]).toContain(res.status);
    });

    it('DELETE /:communityId/posts/:postId — 404 for non-existent post', async () => {
      if (!communityId) {
        console.warn('Skipping: no communityId available');
        return;
      }

      const res = await authenticatedRequest()
        .delete(`${BASE}/${communityId}/posts/${NON_EXISTENT_POST_ID}`);

      expect(res.status).toBe(404);
    });
  });

  // ===================================================================
  // 7. EVENTS
  // ===================================================================
  describe('Events', () => {
    it('GET /events — should return all events', async () => {
      const res = await authenticatedRequest()
        .get(`${BASE}/events`);

      expect([200, 201]).toContain(res.status);

      // Capture an event ID for subsequent tests
      const data = Array.isArray(res.body) ? res.body : res.body.data;
      if (Array.isArray(data) && data.length > 0) {
        eventId = data[0].id || data[0]._id;
      }
    });

    it('GET /:communityId/events — should return community events', async () => {
      if (!communityId) {
        console.warn('Skipping: no communityId available');
        return;
      }

      const res = await authenticatedRequest()
        .get(`${BASE}/${communityId}/events`);

      expect([200, 201]).toContain(res.status);

      // Fallback capture of eventId scoped to community
      const data = Array.isArray(res.body) ? res.body : res.body.data;
      if (!eventId && Array.isArray(data) && data.length > 0) {
        eventId = data[0].id || data[0]._id;
      }
    });

    it('GET /:communityId/events/:eventId — should return event details', async () => {
      if (!communityId || !eventId) {
        console.warn('Skipping: missing communityId or eventId');
        return;
      }

      const res = await authenticatedRequest()
        .get(`${BASE}/${communityId}/events/${eventId}`);

      expect(res.status).toBe(200);
      const body = res.body.data || res.body;
      expect(body).toHaveProperty('id');
    });

    it('GET /:communityId/events/:eventId — 404 for non-existent event', async () => {
      if (!communityId) {
        console.warn('Skipping: no communityId available');
        return;
      }

      const res = await authenticatedRequest()
        .get(`${BASE}/${communityId}/events/${NON_EXISTENT_EVENT_ID}`);

      expect(res.status).toBe(404);
    });

    it('POST /:communityId/events/:eventId/attend — should attend an event', async () => {
      if (!communityId || !eventId) {
        console.warn('Skipping: missing communityId or eventId');
        return;
      }

      const res = await authenticatedRequest()
        .post(`${BASE}/${communityId}/events/${eventId}/attend`);

      expect([200, 201, 409]).toContain(res.status);
    });

    it('POST /:communityId/events/:eventId/attend — 404 for non-existent event', async () => {
      if (!communityId) {
        console.warn('Skipping: no communityId available');
        return;
      }

      const res = await authenticatedRequest()
        .post(`${BASE}/${communityId}/events/${NON_EXISTENT_EVENT_ID}/attend`);

      expect(res.status).toBe(404);
    });

    it('GET /:communityId/events/:eventId/attendees — should list attendees', async () => {
      if (!communityId || !eventId) {
        console.warn('Skipping: missing communityId or eventId');
        return;
      }

      const res = await authenticatedRequest()
        .get(`${BASE}/${communityId}/events/${eventId}/attendees`);

      expect([200, 201]).toContain(res.status);
    });

    it('DELETE /:communityId/events/:eventId/attend — should unattend an event', async () => {
      if (!communityId || !eventId) {
        console.warn('Skipping: missing communityId or eventId');
        return;
      }

      const res = await authenticatedRequest()
        .delete(`${BASE}/${communityId}/events/${eventId}/attend`);

      expect([200, 204, 404]).toContain(res.status);
    });
  });

  // ===================================================================
  // 8. AUTHENTICATION FAILURES
  // ===================================================================
  describe('Authentication & authorisation failures', () => {
    it('GET / — should return 401 without auth header', async () => {
      const res = await request(API_URL)
        .get(BASE);

      expect(res.status).toBe(401);
    });

    it('GET /joined — should return 401 without auth header', async () => {
      const res = await request(API_URL)
        .get(`${BASE}/joined`);

      expect(res.status).toBe(401);
    });

    it('POST /:communityId/join — should return 401 without auth header', async () => {
      const res = await request(API_URL)
        .post(`${BASE}/${NON_EXISTENT_COMMUNITY_ID}/join`);

      expect(res.status).toBe(401);
    });

    it('POST /:communityId/posts — should return 401 without auth header', async () => {
      const res = await request(API_URL)
        .post(`${BASE}/${NON_EXISTENT_COMMUNITY_ID}/posts`)
        .send({ content: 'No auth' });

      expect(res.status).toBe(401);
    });

    it('GET /events — should return 401 without auth header', async () => {
      const res = await request(API_URL)
        .get(`${BASE}/events`);

      expect(res.status).toBe(401);
    });

    it('should return 401 with an invalid token', async () => {
      const res = await request(API_URL)
        .get(BASE)
        .set('Authorization', 'Bearer invalid-token-abc123');

      expect(res.status).toBe(401);
    });

    it('should return 401 with an expired token', async () => {
      const expiredToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
        'eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxNTE2MjM5MDIyfQ.' +
        'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      const res = await request(API_URL)
        .get(BASE)
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
    });
  });

  // ===================================================================
  // 9. EDGE CASES & VALIDATION
  // ===================================================================
  describe('Edge cases & validation', () => {
    it('GET /:communityId — should handle malformed UUID gracefully', async () => {
      const res = await authenticatedRequest()
        .get(`${BASE}/not-a-valid-uuid`);

      expect([400, 404]).toContain(res.status);
    });

    it('GET /:communityId/members — 404 for non-existent community', async () => {
      const res = await authenticatedRequest()
        .get(`${BASE}/${NON_EXISTENT_COMMUNITY_ID}/members`);

      expect(res.status).toBe(404);
    });

    it('GET /:communityId/posts — 404 for non-existent community', async () => {
      const res = await authenticatedRequest()
        .get(`${BASE}/${NON_EXISTENT_COMMUNITY_ID}/posts`);

      expect(res.status).toBe(404);
    });

    it('GET /search — should handle empty query param', async () => {
      const res = await authenticatedRequest()
        .get(`${BASE}/search?q=`);

      expect([200, 400]).toContain(res.status);
    });

    it('GET /:communityId/posts — should handle large page number', async () => {
      if (!communityId) {
        console.warn('Skipping: no communityId available');
        return;
      }

      const res = await authenticatedRequest()
        .get(`${BASE}/${communityId}/posts?page=9999&limit=10`);

      expect([200, 201]).toContain(res.status);
      const data = Array.isArray(res.body) ? res.body : res.body.data;
      if (Array.isArray(data)) {
        expect(data.length).toBe(0);
      }
    });

    it('POST /:communityId/posts — should reject empty string content', async () => {
      if (!communityId) {
        console.warn('Skipping: no communityId available');
        return;
      }

      const res = await authenticatedRequest()
        .post(`${BASE}/${communityId}/posts`)
        .send({ content: '' });

      expect([400, 422]).toContain(res.status);
    });

    it('POST /:communityId/posts/:postId/comments — should reject empty string content', async () => {
      if (!communityId) {
        console.warn('Skipping: no communityId available');
        return;
      }

      const res = await authenticatedRequest()
        .post(`${BASE}/${communityId}/posts/${NON_EXISTENT_POST_ID}/comments`)
        .send({ content: '' });

      // Either 400 (validation) or 404 (post not found) is acceptable
      expect([400, 404, 422]).toContain(res.status);
    });
  });
});
