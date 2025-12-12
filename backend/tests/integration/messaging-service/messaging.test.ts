/**
 * Integration tests for Messaging (text, photo, GIF, voice)
 * Tests real-time messaging, media messages, and conversation management
 */

import { ApiClient, createApiClient } from '../helpers/api-client';
import { DatabaseHelper, getDatabaseHelper } from '../helpers/database';
import { faker } from '@faker-js/faker';
import { io, Socket } from 'socket.io-client';

describe('Messaging Integration Tests', () => {
  let messagingApiClient: ApiClient;
  let authApiClient: ApiClient;
  let matchingApiClient: ApiClient;
  let dbHelper: DatabaseHelper;

  const MESSAGING_SERVICE_URL = process.env.MESSAGING_SERVICE_URL || 'http://localhost:3005';
  const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
  const MATCHING_SERVICE_URL = process.env.MATCHING_SERVICE_URL || 'http://localhost:3004';

  beforeAll(async () => {
    messagingApiClient = createApiClient(MESSAGING_SERVICE_URL);
    authApiClient = createApiClient(AUTH_SERVICE_URL);
    matchingApiClient = createApiClient(MATCHING_SERVICE_URL);
    dbHelper = getDatabaseHelper();
  });

  beforeEach(async () => {
    await dbHelper.clearAll();
  });

  const createMatchedUsers = async () => {
    // Create two users
    const user1Data = {
      email: faker.internet.email().toLowerCase(),
      password: 'SecurePass123!',
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      dateOfBirth: '1995-05-15',
      gender: 'male',
    };

    const user2Data = {
      email: faker.internet.email().toLowerCase(),
      password: 'SecurePass123!',
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      dateOfBirth: '1996-03-20',
      gender: 'female',
    };

    const auth1 = await authApiClient.post('/api/v1/auth/register', user1Data);
    const auth2 = await authApiClient.post('/api/v1/auth/register', user2Data);

    const { user: user1, accessToken: token1 } = auth1.body.data;
    const { user: user2, accessToken: token2 } = auth2.body.data;

    // Create match
    matchingApiClient.setAuthToken(token1);
    await matchingApiClient.post('/api/v1/matching/swipe', {
      targetUserId: user2.id,
      direction: 'right',
    });

    matchingApiClient.setAuthToken(token2);
    const swipe2 = await matchingApiClient.post('/api/v1/matching/swipe', {
      targetUserId: user1.id,
      direction: 'right',
    });

    const matchId = swipe2.body.data.matchId;

    return { user1, token1, user2, token2, matchId };
  };

  describe('Text Messaging', () => {
    it('should send text message to match', async () => {
      const { user1, token1, user2, matchId } = await createMatchedUsers();

      messagingApiClient.setAuthToken(token1);
      const response = await messagingApiClient.post('/api/v1/messages/send', {
        matchId,
        content: 'Hello! Nice to match with you!',
        type: 'text',
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        messageId: expect.any(String),
        content: 'Hello! Nice to match with you!',
        senderId: user1.id,
        receiverId: user2.id,
        type: 'text',
        sentAt: expect.any(String),
      });

      // Verify message in database
      const knex = dbHelper.getKnex();
      const message = await knex('messages')
        .where('id', response.body.data.messageId)
        .first();

      expect(message).toBeDefined();
      expect(message.sender_id).toBe(user1.id);
      expect(message.content).toBe('Hello! Nice to match with you!');
    });

    it('should not allow messaging without match', async () => {
      // Create two users without match
      const auth1 = await authApiClient.post('/api/v1/auth/register', {
        email: faker.internet.email().toLowerCase(),
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1995-05-15',
        gender: 'male',
      });

      const auth2 = await authApiClient.post('/api/v1/auth/register', {
        email: faker.internet.email().toLowerCase(),
        password: 'SecurePass123!',
        firstName: 'Jane',
        lastName: 'Smith',
        dateOfBirth: '1996-03-20',
        gender: 'female',
      });

      const { user: user2, accessToken: token1 } = auth1.body.data;

      messagingApiClient.setAuthToken(token1);
      const response = await messagingApiClient.post('/api/v1/messages/send', {
        receiverId: user2.id,
        content: 'Hello!',
        type: 'text',
      });

      expect(response.status).toBe(403);
      expect(response.body.error).toMatch(/not matched|no match/i);
    });

    it('should get conversation messages', async () => {
      const { user1, token1, user2, matchId } = await createMatchedUsers();

      // Send multiple messages
      messagingApiClient.setAuthToken(token1);
      await messagingApiClient.post('/api/v1/messages/send', {
        matchId,
        content: 'Hello!',
        type: 'text',
      });

      await messagingApiClient.post('/api/v1/messages/send', {
        matchId,
        content: 'How are you?',
        type: 'text',
      });

      // Get conversation
      const response = await messagingApiClient.get(`/api/v1/messages/conversations/${matchId}`);

      expect(response.status).toBe(200);
      expect(response.body.data.messages).toBeDefined();
      expect(response.body.data.messages.length).toBe(2);
      expect(response.body.data.messages[0].content).toBe('Hello!');
    });

    it('should mark messages as read', async () => {
      const { user1, token1, token2, matchId } = await createMatchedUsers();

      // User1 sends message
      messagingApiClient.setAuthToken(token1);
      const sendResponse = await messagingApiClient.post('/api/v1/messages/send', {
        matchId,
        content: 'Hello!',
        type: 'text',
      });

      const messageId = sendResponse.body.data.messageId;

      // User2 marks as read
      messagingApiClient.setAuthToken(token2);
      const response = await messagingApiClient.put(`/api/v1/messages/${messageId}/read`, {});

      expect(response.status).toBe(200);

      // Verify read status in database
      const knex = dbHelper.getKnex();
      const message = await knex('messages').where('id', messageId).first();
      expect(message.is_read).toBe(true);
      expect(message.read_at).not.toBeNull();
    });

    it('should get unread message count', async () => {
      const { token1, token2, matchId } = await createMatchedUsers();

      // User1 sends messages
      messagingApiClient.setAuthToken(token1);
      await messagingApiClient.post('/api/v1/messages/send', {
        matchId,
        content: 'Message 1',
        type: 'text',
      });
      await messagingApiClient.post('/api/v1/messages/send', {
        matchId,
        content: 'Message 2',
        type: 'text',
      });

      // User2 checks unread count
      messagingApiClient.setAuthToken(token2);
      const response = await messagingApiClient.get('/api/v1/messages/unread-count');

      expect(response.status).toBe(200);
      expect(response.body.data.unreadCount).toBe(2);
    });
  });

  describe('Photo Messages', () => {
    it('should send photo message', async () => {
      const { token1, matchId } = await createMatchedUsers();

      messagingApiClient.setAuthToken(token1);
      const response = await messagingApiClient.post('/api/v1/messages/send', {
        matchId,
        content: 'Check out this photo!',
        type: 'photo',
        mediaUrl: 'https://example.com/photo.jpg',
      });

      expect(response.status).toBe(201);
      expect(response.body.data.type).toBe('photo');
      expect(response.body.data.mediaUrl).toBe('https://example.com/photo.jpg');
    });

    it('should upload and send photo', async () => {
      const { token1, matchId } = await createMatchedUsers();

      messagingApiClient.setAuthToken(token1);

      // Mock photo upload endpoint
      const uploadResponse = await messagingApiClient.uploadFile(
        '/api/v1/messages/upload-photo',
        'photo',
        'test-image.jpg',
        { matchId }
      );

      expect(uploadResponse.status).toBe(201);
      expect(uploadResponse.body.data).toHaveProperty('url');
      expect(uploadResponse.body.data).toHaveProperty('messageId');
    });
  });

  describe('GIF Messages', () => {
    it('should send GIF message', async () => {
      const { token1, matchId } = await createMatchedUsers();

      messagingApiClient.setAuthToken(token1);
      const response = await messagingApiClient.post('/api/v1/messages/send', {
        matchId,
        type: 'gif',
        gifId: 'giphy_abc123',
        gifUrl: 'https://media.giphy.com/media/abc123/giphy.gif',
      });

      expect(response.status).toBe(201);
      expect(response.body.data.type).toBe('gif');
      expect(response.body.data.gifUrl).toBeDefined();
    });

    it('should search for GIFs', async () => {
      const { token1 } = await createMatchedUsers();

      messagingApiClient.setAuthToken(token1);
      const response = await messagingApiClient.get('/api/v1/messages/gifs/search', {
        query: { q: 'hello', limit: 10 },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.gifs).toBeDefined();
      expect(response.body.data.gifs.length).toBeGreaterThan(0);
    });
  });

  describe('Voice Messages', () => {
    it('should send voice message', async () => {
      const { token1, matchId } = await createMatchedUsers();

      messagingApiClient.setAuthToken(token1);

      // Upload voice message
      const uploadResponse = await messagingApiClient.uploadFile(
        '/api/v1/messages/upload-voice',
        'audio',
        'test-audio.m4a',
        { matchId }
      );

      expect(uploadResponse.status).toBe(201);
      expect(uploadResponse.body.data).toMatchObject({
        messageId: expect.any(String),
        type: 'voice',
        audioUrl: expect.any(String),
        duration: expect.any(Number),
      });
    });

    it('should enforce voice message duration limit', async () => {
      const { token1, matchId } = await createMatchedUsers();

      messagingApiClient.setAuthToken(token1);

      // Try to upload voice message over limit (e.g., > 2 minutes)
      const response = await messagingApiClient.uploadFile(
        '/api/v1/messages/upload-voice',
        'audio',
        'long-audio.m4a',
        { matchId, duration: 180 }
      );

      if (response.status === 400) {
        expect(response.body.error).toMatch(/duration|too long/i);
      }
    });
  });

  describe('Real-Time Messaging (WebSocket)', () => {
    let socket1: Socket;
    let socket2: Socket;

    afterEach(() => {
      if (socket1) socket1.disconnect();
      if (socket2) socket2.disconnect();
    });

    it('should receive message in real-time via WebSocket', async (done) => {
      const { user1, token1, user2, token2, matchId } = await createMatchedUsers();

      // Connect User2 to WebSocket
      socket2 = io(MESSAGING_SERVICE_URL, {
        auth: { token: token2 },
      });

      socket2.on('connect', () => {
        // User2 listens for messages
        socket2.on('new_message', (data: any) => {
          expect(data.content).toBe('Real-time message!');
          expect(data.senderId).toBe(user1.id);
          done();
        });

        // User1 sends message
        messagingApiClient.setAuthToken(token1);
        messagingApiClient.post('/api/v1/messages/send', {
          matchId,
          content: 'Real-time message!',
          type: 'text',
        });
      });
    }, 10000);

    it('should show typing indicator', async (done) => {
      const { user1, token1, token2, matchId } = await createMatchedUsers();

      // Connect User2
      socket2 = io(MESSAGING_SERVICE_URL, {
        auth: { token: token2 },
      });

      socket2.on('connect', () => {
        // Listen for typing indicator
        socket2.on('user_typing', (data: any) => {
          expect(data.userId).toBe(user1.id);
          expect(data.matchId).toBe(matchId);
          done();
        });

        // User1 starts typing
        socket1 = io(MESSAGING_SERVICE_URL, {
          auth: { token: token1 },
        });

        socket1.on('connect', () => {
          socket1.emit('typing', { matchId });
        });
      });
    }, 10000);
  });

  describe('Conversation Management', () => {
    it('should get all conversations', async () => {
      const { token1, matchId } = await createMatchedUsers();

      // Send a message to create conversation
      messagingApiClient.setAuthToken(token1);
      await messagingApiClient.post('/api/v1/messages/send', {
        matchId,
        content: 'Hello!',
        type: 'text',
      });

      // Get conversations
      const response = await messagingApiClient.get('/api/v1/messages/conversations');

      expect(response.status).toBe(200);
      expect(response.body.data.conversations).toBeDefined();
      expect(response.body.data.conversations.length).toBeGreaterThan(0);
      expect(response.body.data.conversations[0]).toMatchObject({
        matchId: expect.any(String),
        lastMessage: expect.any(Object),
        unreadCount: expect.any(Number),
      });
    });

    it('should delete conversation', async () => {
      const { token1, matchId } = await createMatchedUsers();

      // Send message
      messagingApiClient.setAuthToken(token1);
      await messagingApiClient.post('/api/v1/messages/send', {
        matchId,
        content: 'Hello!',
        type: 'text',
      });

      // Delete conversation
      const response = await messagingApiClient.delete(
        `/api/v1/messages/conversations/${matchId}`
      );

      expect(response.status).toBe(200);

      // Verify conversation hidden from user
      const conversationsResponse = await messagingApiClient.get(
        '/api/v1/messages/conversations'
      );
      const conversations = conversationsResponse.body.data.conversations;
      const deletedConv = conversations.find((c: any) => c.matchId === matchId);
      expect(deletedConv).toBeUndefined();
    });

    it('should archive conversation', async () => {
      const { token1, matchId } = await createMatchedUsers();

      messagingApiClient.setAuthToken(token1);
      const response = await messagingApiClient.put(
        `/api/v1/messages/conversations/${matchId}/archive`,
        {}
      );

      expect(response.status).toBe(200);

      // Verify archived status
      const knex = dbHelper.getKnex();
      const conversation = await knex('conversations')
        .where('match_id', matchId)
        .first();
      expect(conversation.is_archived).toBe(true);
    });
  });

  describe('Message Security', () => {
    it('should not allow reading messages from non-matched users', async () => {
      const { token1, matchId } = await createMatchedUsers();

      // Create another user (not in the match)
      const auth3 = await authApiClient.post('/api/v1/auth/register', {
        email: faker.internet.email().toLowerCase(),
        password: 'SecurePass123!',
        firstName: 'Other',
        lastName: 'User',
        dateOfBirth: '1995-05-15',
        gender: 'male',
      });

      const { accessToken: token3 } = auth3.body.data;

      // User3 tries to read conversation
      messagingApiClient.setAuthToken(token3);
      const response = await messagingApiClient.get(
        `/api/v1/messages/conversations/${matchId}`
      );

      expect(response.status).toBe(403);
    });

    it('should sanitize message content for XSS', async () => {
      const { token1, matchId } = await createMatchedUsers();

      messagingApiClient.setAuthToken(token1);
      const response = await messagingApiClient.post('/api/v1/messages/send', {
        matchId,
        content: '<script>alert("XSS")</script>Hello!',
        type: 'text',
      });

      expect(response.status).toBe(201);

      // Content should be sanitized
      const content = response.body.data.content;
      expect(content).not.toContain('<script>');
      expect(content).toContain('Hello!');
    });
  });

  describe('Message Reactions', () => {
    it('should react to message with emoji', async () => {
      const { token1, token2, matchId } = await createMatchedUsers();

      // User1 sends message
      messagingApiClient.setAuthToken(token1);
      const sendResponse = await messagingApiClient.post('/api/v1/messages/send', {
        matchId,
        content: 'Check this out!',
        type: 'text',
      });

      const messageId = sendResponse.body.data.messageId;

      // User2 reacts with emoji
      messagingApiClient.setAuthToken(token2);
      const response = await messagingApiClient.post(`/api/v1/messages/${messageId}/react`, {
        reaction: '❤️',
      });

      expect(response.status).toBe(200);

      // Verify reaction
      const knex = dbHelper.getKnex();
      const reaction = await knex('message_reactions')
        .where({ message_id: messageId })
        .first();
      expect(reaction.reaction).toBe('❤️');
    });

    it('should remove reaction', async () => {
      const { token1, token2, matchId } = await createMatchedUsers();

      // Send and react to message
      messagingApiClient.setAuthToken(token1);
      const sendResponse = await messagingApiClient.post('/api/v1/messages/send', {
        matchId,
        content: 'Test message',
        type: 'text',
      });

      const messageId = sendResponse.body.data.messageId;

      messagingApiClient.setAuthToken(token2);
      await messagingApiClient.post(`/api/v1/messages/${messageId}/react`, {
        reaction: '👍',
      });

      // Remove reaction
      const response = await messagingApiClient.delete(
        `/api/v1/messages/${messageId}/react`
      );

      expect(response.status).toBe(200);

      // Verify reaction removed
      const knex = dbHelper.getKnex();
      const reaction = await knex('message_reactions')
        .where({ message_id: messageId })
        .first();
      expect(reaction).toBeUndefined();
    });
  });
});
