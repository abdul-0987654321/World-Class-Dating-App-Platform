import request from 'supertest';
import { Express } from 'express';
import { Pool } from 'pg';
import { createClient } from 'redis';
import { io as ioClient, Socket } from 'socket.io-client';

/**
 * Messaging Service Integration Tests
 * Tests real-time messaging, conversations, WebSocket connections
 */

describe('Messaging Service - Integration Tests', () => {
  let app: Express;
  let dbPool: Pool;
  let redisClient: ReturnType<typeof createClient>;
  let authToken1: string;
  let authToken2: string;
  let userId1: string;
  let userId2: string;
  let matchId: string;
  let socket1: Socket;
  let socket2: Socket;

  beforeAll(async () => {
    dbPool = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    redisClient = createClient({
      url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
    });
    await redisClient.connect();

    // Create two users
    const user1 = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'msg1@example.com',
        password: 'Test123!@#',
        firstName: 'User',
        lastName: 'One',
        dateOfBirth: '1990-01-01',
        gender: 'male'
      });

    const user2 = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'msg2@example.com',
        password: 'Test123!@#',
        firstName: 'User',
        lastName: 'Two',
        dateOfBirth: '1992-01-01',
        gender: 'female'
      });

    authToken1 = user1.body.accessToken;
    authToken2 = user2.body.accessToken;
    userId1 = user1.body.user.id;
    userId2 = user2.body.user.id;

    // Create a match between users
    const match = await dbPool.query(
      `INSERT INTO matches (user1_id, user2_id, created_at)
       VALUES ($1, $2, NOW())
       RETURNING id`,
      [userId1, userId2]
    );
    matchId = match.rows[0].id;
  });

  afterAll(async () => {
    if (socket1?.connected) socket1.disconnect();
    if (socket2?.connected) socket2.disconnect();

    await dbPool.query('DELETE FROM users WHERE email LIKE $1', ['msg%@example.com']);
    await dbPool.end();
    await redisClient.quit();
  });

  describe('WebSocket Connection', () => {
    it('should establish WebSocket connection with valid token', (done) => {
      socket1 = ioClient(`http://localhost:${process.env.MESSAGING_PORT}`, {
        auth: { token: authToken1 }
      });

      socket1.on('connect', () => {
        expect(socket1.connected).toBe(true);
        done();
      });

      socket1.on('connect_error', (error) => {
        done(error);
      });
    });

    it('should reject WebSocket connection without token', (done) => {
      const invalidSocket = ioClient(`http://localhost:${process.env.MESSAGING_PORT}`);

      invalidSocket.on('connect_error', (error) => {
        expect(error).toBeDefined();
        invalidSocket.disconnect();
        done();
      });

      invalidSocket.on('connect', () => {
        invalidSocket.disconnect();
        done(new Error('Should not connect without token'));
      });
    });

    it('should handle user presence', (done) => {
      socket2 = ioClient(`http://localhost:${process.env.MESSAGING_PORT}`, {
        auth: { token: authToken2 }
      });

      socket1.on('user:online', (data) => {
        expect(data.userId).toBe(userId2);
        done();
      });

      socket2.on('connect', () => {
        // User2 is now online, socket1 should receive notification
      });
    });

    it('should handle user offline', (done) => {
      socket1.on('user:offline', (data) => {
        expect(data.userId).toBe(userId2);
        done();
      });

      socket2.disconnect();
    });
  });

  describe('POST /api/messaging/conversations/:matchId/messages', () => {
    it('should send a message', async () => {
      const message = {
        content: 'Hello! How are you?',
        type: 'text'
      };

      const response = await request(app)
        .post(`/api/messaging/conversations/${matchId}/messages`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send(message)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.content).toBe(message.content);
      expect(response.body.senderId).toBe(userId1);
      expect(response.body.matchId).toBe(matchId);

      // Verify in database
      const dbMessage = await dbPool.query(
        'SELECT * FROM messages WHERE id = $1',
        [response.body.id]
      );
      expect(dbMessage.rows).toHaveLength(1);
    });

    it('should validate message content', async () => {
      const emptyMessage = {
        content: '',
        type: 'text'
      };

      await request(app)
        .post(`/api/messaging/conversations/${matchId}/messages`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send(emptyMessage)
        .expect(400);
    });

    it('should enforce message length limit', async () => {
      const longMessage = {
        content: 'x'.repeat(5001), // Exceeds typical 5000 char limit
        type: 'text'
      };

      await request(app)
        .post(`/api/messaging/conversations/${matchId}/messages`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send(longMessage)
        .expect(400);
    });

    it('should detect and filter profanity', async () => {
      const profaneMessage = {
        content: 'This message contains profanity [PROFANE_WORD]',
        type: 'text'
      };

      const response = await request(app)
        .post(`/api/messaging/conversations/${matchId}/messages`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send(profaneMessage)
        .expect(201);

      // Message should be flagged or filtered
      expect(response.body.flagged || response.body.content !== profaneMessage.content).toBe(true);
    });

    it('should not allow sending to non-matched user', async () => {
      // Create a third user
      const user3 = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'msg3@example.com',
          password: 'Test123!@#',
          firstName: 'User',
          lastName: 'Three',
          dateOfBirth: '1991-01-01',
          gender: 'female'
        });

      // Create fake match ID
      const fakeMatchId = '00000000-0000-0000-0000-000000000000';

      await request(app)
        .post(`/api/messaging/conversations/${fakeMatchId}/messages`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          content: 'Hello',
          type: 'text'
        })
        .expect(403);

      // Clean up
      await dbPool.query('DELETE FROM users WHERE email = $1', ['msg3@example.com']);
    });

    it('should support image messages', async () => {
      const imageMessage = {
        content: 'Check out this photo!',
        type: 'image',
        mediaUrl: 'https://example.com/photos/image.jpg',
        mediaMetadata: {
          width: 1920,
          height: 1080,
          size: 245678
        }
      };

      const response = await request(app)
        .post(`/api/messaging/conversations/${matchId}/messages`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send(imageMessage)
        .expect(201);

      expect(response.body.type).toBe('image');
      expect(response.body.mediaUrl).toBe(imageMessage.mediaUrl);
    });

    it('should support GIF messages', async () => {
      const gifMessage = {
        type: 'gif',
        gifUrl: 'https://media.giphy.com/media/xyz/giphy.gif'
      };

      const response = await request(app)
        .post(`/api/messaging/conversations/${matchId}/messages`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send(gifMessage)
        .expect(201);

      expect(response.body.type).toBe('gif');
    });
  });

  describe('WebSocket Real-time Messaging', () => {
    beforeEach((done) => {
      // Ensure both sockets are connected
      socket1 = ioClient(`http://localhost:${process.env.MESSAGING_PORT}`, {
        auth: { token: authToken1 }
      });

      socket2 = ioClient(`http://localhost:${process.env.MESSAGING_PORT}`, {
        auth: { token: authToken2 }
      });

      let connectedCount = 0;
      const checkBothConnected = () => {
        connectedCount++;
        if (connectedCount === 2) done();
      };

      socket1.on('connect', checkBothConnected);
      socket2.on('connect', checkBothConnected);
    });

    it('should receive message in real-time', (done) => {
      const messageContent = 'Real-time message test';

      socket2.on('message:new', (message) => {
        expect(message.content).toBe(messageContent);
        expect(message.senderId).toBe(userId1);
        done();
      });

      socket1.emit('message:send', {
        matchId,
        content: messageContent,
        type: 'text'
      });
    });

    it('should show typing indicator', (done) => {
      socket2.on('typing:start', (data) => {
        expect(data.userId).toBe(userId1);
        expect(data.matchId).toBe(matchId);
        done();
      });

      socket1.emit('typing:start', { matchId });
    });

    it('should stop typing indicator', (done) => {
      socket2.on('typing:stop', (data) => {
        expect(data.userId).toBe(userId1);
        done();
      });

      socket1.emit('typing:start', { matchId });
      setTimeout(() => {
        socket1.emit('typing:stop', { matchId });
      }, 100);
    });

    it('should mark message as delivered', (done) => {
      socket1.on('message:delivered', (data) => {
        expect(data.messageId).toBeDefined();
        done();
      });

      socket1.emit('message:send', {
        matchId,
        content: 'Delivery test',
        type: 'text'
      });
    });

    it('should mark message as read', (done) => {
      socket1.emit('message:send', {
        matchId,
        content: 'Read receipt test',
        type: 'text'
      });

      socket2.on('message:new', (message) => {
        socket2.emit('message:read', {
          matchId,
          messageId: message.id
        });
      });

      socket1.on('message:read', (data) => {
        expect(data.matchId).toBe(matchId);
        done();
      });
    });
  });

  describe('GET /api/messaging/conversations/:matchId/messages', () => {
    beforeEach(async () => {
      // Create some test messages
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post(`/api/messaging/conversations/${matchId}/messages`)
          .set('Authorization', `Bearer ${authToken1}`)
          .send({
            content: `Test message ${i}`,
            type: 'text'
          });
      }
    });

    it('should get conversation messages', async () => {
      const response = await request(app)
        .get(`/api/messaging/conversations/${matchId}/messages`)
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(response.body).toHaveProperty('messages');
      expect(Array.isArray(response.body.messages)).toBe(true);
      expect(response.body.messages.length).toBeGreaterThan(0);
    });

    it('should support pagination', async () => {
      const page1 = await request(app)
        .get(`/api/messaging/conversations/${matchId}/messages`)
        .set('Authorization', `Bearer ${authToken1}`)
        .query({ limit: 2, offset: 0 })
        .expect(200);

      const page2 = await request(app)
        .get(`/api/messaging/conversations/${matchId}/messages`)
        .set('Authorization', `Bearer ${authToken1}`)
        .query({ limit: 2, offset: 2 })
        .expect(200);

      expect(page1.body.messages).toHaveLength(2);
      expect(page2.body.messages).toHaveLength(2);

      // Should be different messages
      expect(page1.body.messages[0].id).not.toBe(page2.body.messages[0].id);
    });

    it('should order messages by timestamp', async () => {
      const response = await request(app)
        .get(`/api/messaging/conversations/${matchId}/messages`)
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      // Messages should be in chronological order
      const timestamps = response.body.messages.map((m: any) => new Date(m.createdAt).getTime());
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
      }
    });

    it('should only show messages from matched user', async () => {
      const response = await request(app)
        .get(`/api/messaging/conversations/${matchId}/messages`)
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      response.body.messages.forEach((message: any) => {
        expect([userId1, userId2]).toContain(message.senderId);
      });
    });
  });

  describe('GET /api/messaging/conversations', () => {
    it('should get all conversations', async () => {
      const response = await request(app)
        .get('/api/messaging/conversations')
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(response.body).toHaveProperty('conversations');
      expect(Array.isArray(response.body.conversations)).toBe(true);

      if (response.body.conversations.length > 0) {
        const conversation = response.body.conversations[0];
        expect(conversation).toHaveProperty('matchId');
        expect(conversation).toHaveProperty('otherUser');
        expect(conversation).toHaveProperty('lastMessage');
      }
    });

    it('should show unread message count', async () => {
      // Send a message from user2
      await request(app)
        .post(`/api/messaging/conversations/${matchId}/messages`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({
          content: 'Unread message',
          type: 'text'
        });

      const response = await request(app)
        .get('/api/messaging/conversations')
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      const conversation = response.body.conversations.find(
        (c: any) => c.matchId === matchId
      );
      expect(conversation.unreadCount).toBeGreaterThan(0);
    });

    it('should sort by most recent message', async () => {
      const response = await request(app)
        .get('/api/messaging/conversations')
        .set('Authorization', `Bearer ${authToken1}`)
        .query({ sortBy: 'recent' })
        .expect(200);

      if (response.body.conversations.length > 1) {
        const timestamps = response.body.conversations.map(
          (c: any) => new Date(c.lastMessage.createdAt).getTime()
        );
        for (let i = 1; i < timestamps.length; i++) {
          expect(timestamps[i - 1]).toBeGreaterThanOrEqual(timestamps[i]);
        }
      }
    });
  });

  describe('DELETE /api/messaging/messages/:messageId', () => {
    let messageId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post(`/api/messaging/conversations/${matchId}/messages`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          content: 'Message to delete',
          type: 'text'
        });
      messageId = response.body.id;
    });

    it('should delete own message', async () => {
      const response = await request(app)
        .delete(`/api/messaging/messages/${messageId}`)
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(response.body.message).toContain('deleted');

      // Verify soft delete
      const dbMessage = await dbPool.query(
        'SELECT deleted_at FROM messages WHERE id = $1',
        [messageId]
      );
      expect(dbMessage.rows[0].deleted_at).not.toBeNull();
    });

    it('should not allow deleting other users messages', async () => {
      await request(app)
        .delete(`/api/messaging/messages/${messageId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(403);
    });

    it('should notify other user of deleted message', (done) => {
      socket2.on('message:deleted', (data) => {
        expect(data.messageId).toBe(messageId);
        done();
      });

      request(app)
        .delete(`/api/messaging/messages/${messageId}`)
        .set('Authorization', `Bearer ${authToken1}`)
        .then(() => {});
    });
  });

  describe('POST /api/messaging/conversations/:matchId/report', () => {
    it('should report a conversation', async () => {
      const report = {
        reason: 'harassment',
        description: 'User is sending inappropriate messages',
        messageIds: []
      };

      const response = await request(app)
        .post(`/api/messaging/conversations/${matchId}/report`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send(report)
        .expect(200);

      expect(response.body.message).toContain('reported');

      // Verify in database
      const dbReport = await dbPool.query(
        'SELECT * FROM conversation_reports WHERE match_id = $1 AND reporter_id = $2',
        [matchId, userId1]
      );
      expect(dbReport.rows).toHaveLength(1);
    });

    it('should require a reason', async () => {
      await request(app)
        .post(`/api/messaging/conversations/${matchId}/report`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          description: 'Bad behavior'
        })
        .expect(400);
    });
  });

  describe('Message Encryption', () => {
    it('should encrypt messages at rest', async () => {
      const plaintext = 'This is a secret message';

      const response = await request(app)
        .post(`/api/messaging/conversations/${matchId}/messages`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          content: plaintext,
          type: 'text'
        });

      // Check database - content should be encrypted
      const dbMessage = await dbPool.query(
        'SELECT encrypted_content FROM messages WHERE id = $1',
        [response.body.id]
      );

      expect(dbMessage.rows[0].encrypted_content).not.toBe(plaintext);
      expect(dbMessage.rows[0].encrypted_content).toBeTruthy();
    });

    it('should decrypt messages when retrieved', async () => {
      const plaintext = 'Another secret message';

      const sendResponse = await request(app)
        .post(`/api/messaging/conversations/${matchId}/messages`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          content: plaintext,
          type: 'text'
        });

      const getResponse = await request(app)
        .get(`/api/messaging/conversations/${matchId}/messages`)
        .set('Authorization', `Bearer ${authToken1}`);

      const message = getResponse.body.messages.find(
        (m: any) => m.id === sendResponse.body.id
      );

      expect(message.content).toBe(plaintext);
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit message sending', async () => {
      const messages = Array(20).fill(null).map((_, i) =>
        request(app)
          .post(`/api/messaging/conversations/${matchId}/messages`)
          .set('Authorization', `Bearer ${authToken1}`)
          .send({
            content: `Spam message ${i}`,
            type: 'text'
          })
      );

      const responses = await Promise.all(messages);
      const rateLimited = responses.some(r => r.status === 429);

      expect(rateLimited).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent message sends', async () => {
      const messages = Array(5).fill(null).map((_, i) =>
        request(app)
          .post(`/api/messaging/conversations/${matchId}/messages`)
          .set('Authorization', `Bearer ${authToken1}`)
          .send({
            content: `Concurrent message ${i}`,
            type: 'text'
          })
      );

      const responses = await Promise.all(messages);
      responses.forEach(response => {
        expect([201, 429]).toContain(response.status);
      });
    });

    it('should efficiently load message history', async () => {
      const start = Date.now();

      await request(app)
        .get(`/api/messaging/conversations/${matchId}/messages`)
        .set('Authorization', `Bearer ${authToken1}`)
        .query({ limit: 50 });

      const duration = Date.now() - start;

      // Should complete quickly (< 1 second)
      expect(duration).toBeLessThan(1000);
    });
  });
});
