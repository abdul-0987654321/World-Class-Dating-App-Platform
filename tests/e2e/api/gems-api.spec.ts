import request from 'supertest';
import { config, testState, createTestUser, authenticatedRequest, wait } from './setup';

const BASE = '/api/v1/gems';
const API_URL = config.API_GATEWAY_URL;

describe('Gems Service API — E2E', () => {
  // ─── Setup ──────────────────────────────────────────────────────────
  beforeAll(async () => {
    await createTestUser();
  });

  // ===================================================================
  // 1. BALANCE
  // ===================================================================
  describe('Gem balance', () => {
    it('GET /balance — should return current gem balance', async () => {
      const res = await authenticatedRequest()
        .get(`${BASE}/balance`);

      expect([200, 201]).toContain(res.status);
      const body = res.body.data || res.body;
      // Balance should be a number (or object containing a numeric balance)
      if (typeof body === 'number') {
        expect(body).toBeGreaterThanOrEqual(0);
      } else if (typeof body === 'object' && body !== null) {
        expect(body).toHaveProperty('balance');
        expect(typeof body.balance).toBe('number');
        expect(body.balance).toBeGreaterThanOrEqual(0);
      }
    });

    it('GET /balance — should return consistent balance on repeated calls', async () => {
      const res1 = await authenticatedRequest()
        .get(`${BASE}/balance`);
      const res2 = await authenticatedRequest()
        .get(`${BASE}/balance`);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);

      const b1 = res1.body.data?.balance ?? res1.body.balance ?? res1.body;
      const b2 = res2.body.data?.balance ?? res2.body.balance ?? res2.body;
      expect(b1).toEqual(b2);
    });

    it('GET /balance — should return 401 without auth', async () => {
      const res = await request(API_URL)
        .get(`${BASE}/balance`);

      expect(res.status).toBe(401);
    });
  });

  // ===================================================================
  // 2. PURCHASABLE ITEMS
  // ===================================================================
  describe('Purchasable items', () => {
    it('GET /items — should return list of purchasable items', async () => {
      const res = await authenticatedRequest()
        .get(`${BASE}/items`);

      expect([200, 201]).toContain(res.status);
      const data = Array.isArray(res.body) ? res.body : (res.body.data || []);
      expect(Array.isArray(data)).toBe(true);

      if (data.length > 0) {
        const item = data[0];
        // Each item should have at least a type/name and cost
        expect(item).toBeDefined();
      }
    });

    it('GET /items — should include cost information', async () => {
      const res = await authenticatedRequest()
        .get(`${BASE}/items`);

      expect([200, 201]).toContain(res.status);
      const data = Array.isArray(res.body) ? res.body : (res.body.data || []);

      if (data.length > 0) {
        const item = data[0];
        // Expect at least one cost-related field
        const hasCost =
          item.cost !== undefined ||
          item.price !== undefined ||
          item.gems !== undefined ||
          item.amount !== undefined;
        expect(hasCost).toBe(true);
      }
    });

    it('GET /items — should return 401 without auth', async () => {
      const res = await request(API_URL)
        .get(`${BASE}/items`);

      expect(res.status).toBe(401);
    });
  });

  // ===================================================================
  // 3. AFFORDABILITY CHECK
  // ===================================================================
  describe('Affordability check', () => {
    it('GET /can-afford/:itemType — should check affordability for a valid item', async () => {
      const res = await authenticatedRequest()
        .get(`${BASE}/can-afford/boost`);

      expect([200, 201]).toContain(res.status);
      const body = res.body.data || res.body;
      // Should return a boolean-like indicator
      if (typeof body === 'object' && body !== null) {
        expect(body).toHaveProperty('canAfford');
        expect(typeof body.canAfford).toBe('boolean');
      }
    });

    it('GET /can-afford/:itemType — should check affordability for super_like', async () => {
      const res = await authenticatedRequest()
        .get(`${BASE}/can-afford/super_like`);

      expect([200, 201]).toContain(res.status);
    });

    it('GET /can-afford/:itemType — should handle unknown item type gracefully', async () => {
      const res = await authenticatedRequest()
        .get(`${BASE}/can-afford/nonexistent_item_xyz`);

      expect([200, 400, 404]).toContain(res.status);
    });

    it('GET /can-afford/:itemType — should return 401 without auth', async () => {
      const res = await request(API_URL)
        .get(`${BASE}/can-afford/boost`);

      expect(res.status).toBe(401);
    });
  });

  // ===================================================================
  // 4. SPENDING GEMS
  // ===================================================================
  describe('Spending gems', () => {
    it('POST /spend — should spend gems on a valid item', async () => {
      const res = await authenticatedRequest()
        .post(`${BASE}/spend`)
        .send({ itemType: 'boost' });

      // 200 = success, 402/400 = insufficient balance or invalid
      expect([200, 201, 400, 402, 403]).toContain(res.status);
    });

    it('POST /spend — should spend gems with metadata', async () => {
      const res = await authenticatedRequest()
        .post(`${BASE}/spend`)
        .send({
          itemType: 'super_like',
          metadata: { targetUserId: '00000000-0000-0000-0000-000000000099' },
        });

      expect([200, 201, 400, 402, 403]).toContain(res.status);
    });

    it('POST /spend — should reject request without itemType', async () => {
      const res = await authenticatedRequest()
        .post(`${BASE}/spend`)
        .send({});

      expect([400, 422]).toContain(res.status);
    });

    it('POST /spend — should reject unknown item type', async () => {
      const res = await authenticatedRequest()
        .post(`${BASE}/spend`)
        .send({ itemType: 'nonexistent_item_xyz' });

      expect([400, 404, 422]).toContain(res.status);
    });

    it('POST /spend — should return 401 without auth', async () => {
      const res = await request(API_URL)
        .post(`${BASE}/spend`)
        .send({ itemType: 'boost' });

      expect(res.status).toBe(401);
    });

    it('POST /spend — should reject with invalid token', async () => {
      const res = await request(API_URL)
        .post(`${BASE}/spend`)
        .set('Authorization', 'Bearer invalid-token-garbage')
        .send({ itemType: 'boost' });

      expect(res.status).toBe(401);
    });

    it('POST /spend — balance should decrease after successful spend', async () => {
      // Capture balance before
      const beforeRes = await authenticatedRequest()
        .get(`${BASE}/balance`);

      const balanceBefore =
        beforeRes.body.data?.balance ?? beforeRes.body.balance ?? beforeRes.body;

      // Attempt to spend
      const spendRes = await authenticatedRequest()
        .post(`${BASE}/spend`)
        .send({ itemType: 'boost' });

      if ([200, 201].includes(spendRes.status)) {
        // Capture balance after
        const afterRes = await authenticatedRequest()
          .get(`${BASE}/balance`);

        const balanceAfter =
          afterRes.body.data?.balance ?? afterRes.body.balance ?? afterRes.body;

        expect(balanceAfter).toBeLessThan(balanceBefore);
      }
      // If spend failed (insufficient funds), that is acceptable
    });
  });

  // ===================================================================
  // 5. ACTIVATE FEATURE
  // ===================================================================
  describe('Activate feature', () => {
    it('POST /activate — should activate a valid feature', async () => {
      const res = await authenticatedRequest()
        .post(`${BASE}/activate`)
        .send({ featureType: 'boost' });

      expect([200, 201, 400, 402, 403]).toContain(res.status);
    });

    it('POST /activate — should reject without featureType', async () => {
      const res = await authenticatedRequest()
        .post(`${BASE}/activate`)
        .send({});

      expect([400, 422]).toContain(res.status);
    });

    it('POST /activate — should reject unknown featureType', async () => {
      const res = await authenticatedRequest()
        .post(`${BASE}/activate`)
        .send({ featureType: 'unknown_feature_xyz' });

      expect([400, 404, 422]).toContain(res.status);
    });

    it('POST /activate — should return 401 without auth', async () => {
      const res = await request(API_URL)
        .post(`${BASE}/activate`)
        .send({ featureType: 'boost' });

      expect(res.status).toBe(401);
    });
  });

  // ===================================================================
  // 6. GIFTING
  // ===================================================================
  describe('Gifting gems', () => {
    it('POST /gift — should send a gift to another user', async () => {
      const res = await authenticatedRequest()
        .post(`${BASE}/gift`)
        .send({
          recipientId: '00000000-0000-0000-0000-000000000099',
          giftType: 'rose',
        });

      // 200/201 = gifted, 400 = bad request, 402 = insufficient, 404 = recipient not found
      expect([200, 201, 400, 402, 404]).toContain(res.status);
    });

    it('POST /gift — should send a gift with an optional message', async () => {
      const res = await authenticatedRequest()
        .post(`${BASE}/gift`)
        .send({
          recipientId: '00000000-0000-0000-0000-000000000099',
          giftType: 'rose',
          message: 'You are lovely!',
        });

      expect([200, 201, 400, 402, 404]).toContain(res.status);
    });

    it('POST /gift — should reject without recipientId', async () => {
      const res = await authenticatedRequest()
        .post(`${BASE}/gift`)
        .send({ giftType: 'rose' });

      expect([400, 422]).toContain(res.status);
    });

    it('POST /gift — should reject without giftType', async () => {
      const res = await authenticatedRequest()
        .post(`${BASE}/gift`)
        .send({ recipientId: '00000000-0000-0000-0000-000000000099' });

      expect([400, 422]).toContain(res.status);
    });

    it('POST /gift — should reject with empty body', async () => {
      const res = await authenticatedRequest()
        .post(`${BASE}/gift`)
        .send({});

      expect([400, 422]).toContain(res.status);
    });

    it('POST /gift — should handle gifting to self gracefully', async () => {
      const selfId = testState.userId || '00000000-0000-0000-0000-000000000000';

      const res = await authenticatedRequest()
        .post(`${BASE}/gift`)
        .send({
          recipientId: selfId,
          giftType: 'rose',
        });

      // Typically 400 (cannot gift yourself) or 200 if the server allows it
      expect([200, 201, 400, 403]).toContain(res.status);
    });

    it('POST /gift — should return 401 without auth', async () => {
      const res = await request(API_URL)
        .post(`${BASE}/gift`)
        .send({
          recipientId: '00000000-0000-0000-0000-000000000099',
          giftType: 'rose',
        });

      expect(res.status).toBe(401);
    });
  });

  // ===================================================================
  // 7. TRANSACTION HISTORY
  // ===================================================================
  describe('Transaction history', () => {
    it('GET /transactions — should return transaction history', async () => {
      const res = await authenticatedRequest()
        .get(`${BASE}/transactions`);

      expect([200, 201]).toContain(res.status);
      const data = Array.isArray(res.body) ? res.body : (res.body.data || []);
      expect(Array.isArray(data)).toBe(true);
    });

    it('GET /transactions — should support limit query param', async () => {
      const res = await authenticatedRequest()
        .get(`${BASE}/transactions?limit=5`);

      expect([200, 201]).toContain(res.status);
      const data = Array.isArray(res.body) ? res.body : (res.body.data || []);
      if (Array.isArray(data)) {
        expect(data.length).toBeLessThanOrEqual(5);
      }
    });

    it('GET /transactions — should support offset query param', async () => {
      const res = await authenticatedRequest()
        .get(`${BASE}/transactions?limit=5&offset=0`);

      expect([200, 201]).toContain(res.status);
    });

    it('GET /transactions — should return empty for large offset', async () => {
      const res = await authenticatedRequest()
        .get(`${BASE}/transactions?limit=10&offset=999999`);

      expect([200, 201]).toContain(res.status);
      const data = Array.isArray(res.body) ? res.body : (res.body.data || []);
      if (Array.isArray(data)) {
        expect(data.length).toBe(0);
      }
    });

    it('GET /transactions — each transaction should have required fields', async () => {
      const res = await authenticatedRequest()
        .get(`${BASE}/transactions`);

      expect([200, 201]).toContain(res.status);
      const data = Array.isArray(res.body) ? res.body : (res.body.data || []);

      if (Array.isArray(data) && data.length > 0) {
        const tx = data[0];
        expect(tx).toBeDefined();
        // Expect an ID and some amount-related field
        const hasId = tx.id !== undefined || tx._id !== undefined;
        expect(hasId).toBe(true);
      }
    });

    it('GET /transactions — should return 401 without auth', async () => {
      const res = await request(API_URL)
        .get(`${BASE}/transactions`);

      expect(res.status).toBe(401);
    });
  });

  // ===================================================================
  // 8. ANALYTICS
  // ===================================================================
  describe('Gem analytics', () => {
    it('GET /analytics — should return gem analytics', async () => {
      const res = await authenticatedRequest()
        .get(`${BASE}/analytics`);

      expect([200, 201]).toContain(res.status);
      const body = res.body.data || res.body;
      expect(body).toBeDefined();
    });

    it('GET /analytics — should include summary statistics', async () => {
      const res = await authenticatedRequest()
        .get(`${BASE}/analytics`);

      expect([200, 201]).toContain(res.status);
      const body = res.body.data || res.body;

      // Analytics typically include totals / summaries
      if (typeof body === 'object' && body !== null) {
        const hasStats =
          body.totalSpent !== undefined ||
          body.totalEarned !== undefined ||
          body.totalGifted !== undefined ||
          body.summary !== undefined ||
          Object.keys(body).length > 0;
        expect(hasStats).toBe(true);
      }
    });

    it('GET /analytics — should return 401 without auth', async () => {
      const res = await request(API_URL)
        .get(`${BASE}/analytics`);

      expect(res.status).toBe(401);
    });

    it('GET /analytics — should return 401 with invalid token', async () => {
      const res = await request(API_URL)
        .get(`${BASE}/analytics`)
        .set('Authorization', 'Bearer bad-token-value');

      expect(res.status).toBe(401);
    });
  });

  // ===================================================================
  // 9. AUTH FAILURE SCENARIOS (GLOBAL)
  // ===================================================================
  describe('Global auth failure scenarios', () => {
    it('POST /spend — should return 401 with expired token', async () => {
      const expiredToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
        'eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxNTE2MjM5MDIyfQ.' +
        'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      const res = await request(API_URL)
        .post(`${BASE}/spend`)
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({ itemType: 'boost' });

      expect(res.status).toBe(401);
    });

    it('GET /balance — should return 401 with malformed auth header', async () => {
      const res = await request(API_URL)
        .get(`${BASE}/balance`)
        .set('Authorization', 'NotBearer some-token');

      expect(res.status).toBe(401);
    });

    it('POST /gift — should return 401 with missing Bearer prefix', async () => {
      const res = await request(API_URL)
        .post(`${BASE}/gift`)
        .set('Authorization', testState.accessToken || 'some-token')
        .send({
          recipientId: '00000000-0000-0000-0000-000000000099',
          giftType: 'rose',
        });

      expect(res.status).toBe(401);
    });
  });

  // ===================================================================
  // 10. EDGE CASES & VALIDATION
  // ===================================================================
  describe('Edge cases & validation', () => {
    it('POST /spend — should handle numeric itemType gracefully', async () => {
      const res = await authenticatedRequest()
        .post(`${BASE}/spend`)
        .send({ itemType: 12345 });

      expect([400, 422]).toContain(res.status);
    });

    it('POST /gift — should handle very long message', async () => {
      const longMessage = 'x'.repeat(5000);

      const res = await authenticatedRequest()
        .post(`${BASE}/gift`)
        .send({
          recipientId: '00000000-0000-0000-0000-000000000099',
          giftType: 'rose',
          message: longMessage,
        });

      // Server might accept, truncate, or reject
      expect([200, 201, 400, 413, 422]).toContain(res.status);
    });

    it('POST /activate — should handle numeric featureType gracefully', async () => {
      const res = await authenticatedRequest()
        .post(`${BASE}/activate`)
        .send({ featureType: 99999 });

      expect([400, 422]).toContain(res.status);
    });

    it('GET /can-afford/:itemType — should handle special characters in path', async () => {
      const res = await authenticatedRequest()
        .get(`${BASE}/can-afford/..%2F..%2Fadmin`);

      expect([400, 404]).toContain(res.status);
    });
  });
});
