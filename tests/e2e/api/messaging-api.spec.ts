import request from 'supertest';

const GATEWAY_URL = process.env.API_GATEWAY_URL || 'https://api-gateway-production-1957.up.railway.app';
const API_URL = process.env.API_URL || GATEWAY_URL;
const AUTH_URL = process.env.AUTH_URL || GATEWAY_URL;

describe('Messaging Service API', () => {
  let accessToken: string;
  let conversationId: string;
  let messageId: string;

  beforeAll(async () => {
    // Login to get access token
    const loginResponse = await request(AUTH_URL)
      .post('/api/v1/auth/login')
      .send({
        email: process.env.TEST_USER_EMAIL || 'test@example.com',
        password: process.env.TEST_USER_PASSWORD || 'TestPassword123!'
      });

    accessToken = loginResponse.body.accessToken;
  });

  describe('GET /api/v1/conversations', () => {
    it('should return list of conversations', async () => {
      const response = await request(API_URL)
        .get('/api/v1/conversations')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);

      if (response.body.data.length > 0) {
        conversationId = response.body.data[0].id;
        const conversation = response.body.data[0];
        expect(conversation).toHaveProperty('id');
        expect(conversation).toHaveProperty('participant');
      }
    });

    it('should support pagination', async () => {
      const response = await request(API_URL)
        .get('/api/v1/conversations?page=1&limit=5')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    it('should fail without authentication', async () => {
      const response = await request(API_URL)
        .get('/api/v1/conversations');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/conversations/:id', () => {
    it('should return conversation details', async () => {
      if (!conversationId) {
        console.log('Skipping: No conversations available');
        return;
      }

      const response = await request(API_URL)
        .get(`/api/v1/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(conversationId);
    });

    it('should return 404 for non-existent conversation', async () => {
      const response = await request(API_URL)
        .get('/api/v1/conversations/nonexistent-id')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/v1/conversations/:id/messages', () => {
    it('should return messages for conversation', async () => {
      if (!conversationId) {
        console.log('Skipping: No conversations available');
        return;
      }

      const response = await request(API_URL)
        .get(`/api/v1/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should support pagination', async () => {
      if (!conversationId) return;

      const response = await request(API_URL)
        .get(`/api/v1/conversations/${conversationId}/messages?page=1&limit=20`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(20);
    });
  });

  describe('POST /api/v1/messages', () => {
    it('should send a text message', async () => {
      if (!conversationId) {
        console.log('Skipping: No conversations available');
        return;
      }

      const response = await request(API_URL)
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          conversationId,
          content: 'Hello, this is a test message!',
          type: 'text'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.content).toBe('Hello, this is a test message!');
      messageId = response.body.id;
    });

    it('should fail with empty content', async () => {
      if (!conversationId) return;

      const response = await request(API_URL)
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          conversationId,
          content: '',
          type: 'text'
        });

      expect(response.status).toBe(400);
    });

    it('should fail without conversationId', async () => {
      const response = await request(API_URL)
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          content: 'Test message',
          type: 'text'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/messages/unread-count', () => {
    it('should return unread message count', async () => {
      const response = await request(API_URL)
        .get('/api/v1/messages/unread-count')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('count');
      expect(typeof response.body.count).toBe('number');
    });
  });

  describe('GET /api/v1/messages/:messageId', () => {
    it('should return message details', async () => {
      if (!messageId) {
        console.log('Skipping: No message created');
        return;
      }

      const response = await request(API_URL)
        .get(`/api/v1/messages/${messageId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(messageId);
    });
  });

  describe('PUT /api/v1/messages/:messageId', () => {
    it('should update message content', async () => {
      if (!messageId) return;

      const response = await request(API_URL)
        .put(`/api/v1/messages/${messageId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          content: 'Updated message content'
        });

      // May be 200 or 403 if editing is not allowed
      expect([200, 403]).toContain(response.status);
    });
  });

  describe('PUT /api/v1/messages/:messageId/status', () => {
    it('should update message status to delivered', async () => {
      if (!messageId) return;

      const response = await request(API_URL)
        .put(`/api/v1/messages/${messageId}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          status: 'delivered'
        });

      expect([200, 400]).toContain(response.status);
    });
  });

  describe('PUT /api/v1/conversations/:id/read', () => {
    it('should mark conversation as read', async () => {
      if (!conversationId) return;

      const response = await request(API_URL)
        .put(`/api/v1/conversations/${conversationId}/read`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('PUT /api/v1/conversations/:id/archive', () => {
    it('should archive conversation', async () => {
      if (!conversationId) return;

      const response = await request(API_URL)
        .put(`/api/v1/conversations/${conversationId}/archive`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /api/v1/messages/:messageId', () => {
    it('should delete a message', async () => {
      if (!messageId) return;

      const response = await request(API_URL)
        .delete(`/api/v1/messages/${messageId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 403]).toContain(response.status);
    });
  });
});
