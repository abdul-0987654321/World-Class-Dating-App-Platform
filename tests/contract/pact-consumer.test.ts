import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import path from 'path';
import axios from 'axios';

const { like, eachLike, iso8601DateTime, regex } = MatchersV3;

// Consumer: Web App
// Provider: User Service
describe('User Service Contract Tests', () => {
  const provider = new PactV3({
    consumer: 'WebApp',
    provider: 'UserService',
    dir: path.resolve(process.cwd(), 'pacts'),
    logLevel: 'info',
  });

  describe('GET /api/v1/users/:id', () => {
    it('should return user profile', async () => {
      await provider
        .given('user exists with id 123')
        .uponReceiving('a request for user profile')
        .withRequest({
          method: 'GET',
          path: '/api/v1/users/123',
          headers: {
            Authorization: regex({
              generate: 'Bearer token123',
              matcher: '^Bearer .+$',
            }),
          },
        })
        .willRespondWith({
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: like({
            id: '123',
            email: 'user@flamoral.com',
            name: 'John Doe',
            age: 28,
            bio: 'Adventure enthusiast',
            photos: eachLike('https://example.com/photo.jpg', { min: 1 }),
            interests: eachLike('Hiking', { min: 1 }),
            verified: true,
            createdAt: iso8601DateTime(),
            updatedAt: iso8601DateTime(),
          }),
        })
        .executeTest(async (mockServer) => {
          const response = await axios.get(`${mockServer.url}/api/v1/users/123`, {
            headers: { Authorization: 'Bearer token123' },
          });

          expect(response.status).toBe(200);
          expect(response.data).toHaveProperty('id');
          expect(response.data).toHaveProperty('email');
          expect(response.data).toHaveProperty('name');
          expect(response.data.photos).toBeInstanceOf(Array);
        });
    });

    it('should return 404 for non-existent user', async () => {
      await provider
        .given('user does not exist with id 999')
        .uponReceiving('a request for non-existent user')
        .withRequest({
          method: 'GET',
          path: '/api/v1/users/999',
          headers: {
            Authorization: regex({
              generate: 'Bearer token123',
              matcher: '^Bearer .+$',
            }),
          },
        })
        .willRespondWith({
          status: 404,
          headers: { 'Content-Type': 'application/json' },
          body: {
            error: 'User not found',
          },
        })
        .executeTest(async (mockServer) => {
          try {
            await axios.get(`${mockServer.url}/api/v1/users/999`, {
              headers: { Authorization: 'Bearer token123' },
            });
            fail('Should have thrown 404');
          } catch (error: any) {
            expect(error.response.status).toBe(404);
          }
        });
    });
  });

  describe('PUT /api/v1/users/:id', () => {
    it('should update user profile', async () => {
      await provider
        .given('user exists with id 123')
        .uponReceiving('a request to update user profile')
        .withRequest({
          method: 'PUT',
          path: '/api/v1/users/123',
          headers: {
            'Content-Type': 'application/json',
            Authorization: regex({
              generate: 'Bearer token123',
              matcher: '^Bearer .+$',
            }),
          },
          body: {
            bio: 'Updated bio',
            interests: ['Hiking', 'Photography'],
          },
        })
        .willRespondWith({
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: like({
            id: '123',
            bio: 'Updated bio',
            interests: ['Hiking', 'Photography'],
            updatedAt: iso8601DateTime(),
          }),
        })
        .executeTest(async (mockServer) => {
          const response = await axios.put(
            `${mockServer.url}/api/v1/users/123`,
            {
              bio: 'Updated bio',
              interests: ['Hiking', 'Photography'],
            },
            {
              headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer token123',
              },
            }
          );

          expect(response.status).toBe(200);
          expect(response.data.bio).toBe('Updated bio');
        });
    });
  });
});

// Consumer: Web App
// Provider: Matching Service
describe('Matching Service Contract Tests', () => {
  const provider = new PactV3({
    consumer: 'WebApp',
    provider: 'MatchingService',
    dir: path.resolve(process.cwd(), 'pacts'),
    logLevel: 'info',
  });

  describe('GET /api/v1/matches/discover', () => {
    it('should return discovery profiles', async () => {
      await provider
        .given('profiles available for discovery')
        .uponReceiving('a request for discovery profiles')
        .withRequest({
          method: 'GET',
          path: '/api/v1/matches/discover',
          query: { limit: '10' },
          headers: {
            Authorization: regex({
              generate: 'Bearer token123',
              matcher: '^Bearer .+$',
            }),
          },
        })
        .willRespondWith({
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: {
            profiles: eachLike(
              {
                id: like('profile-123'),
                name: like('Jane'),
                age: like(27),
                bio: like('Nature lover'),
                photos: eachLike('https://example.com/photo.jpg', { min: 1 }),
                distance: like(5),
                interests: eachLike('Yoga', { min: 1 }),
              },
              { min: 1, max: 10 }
            ),
            hasMore: like(true),
          },
        })
        .executeTest(async (mockServer) => {
          const response = await axios.get(`${mockServer.url}/api/v1/matches/discover`, {
            params: { limit: '10' },
            headers: { Authorization: 'Bearer token123' },
          });

          expect(response.status).toBe(200);
          expect(response.data).toHaveProperty('profiles');
          expect(response.data.profiles).toBeInstanceOf(Array);
          expect(response.data.profiles.length).toBeGreaterThan(0);
        });
    });
  });

  describe('POST /api/v1/matches/swipe', () => {
    it('should process swipe right and return match status', async () => {
      await provider
        .given('target user exists and has swiped right on current user')
        .uponReceiving('a swipe right request')
        .withRequest({
          method: 'POST',
          path: '/api/v1/matches/swipe',
          headers: {
            'Content-Type': 'application/json',
            Authorization: regex({
              generate: 'Bearer token123',
              matcher: '^Bearer .+$',
            }),
          },
          body: {
            targetUserId: like('user-456'),
            direction: 'right',
          },
        })
        .willRespondWith({
          status: 201,
          headers: { 'Content-Type': 'application/json' },
          body: {
            match: true,
            matchId: like('match-789'),
            conversationId: like('conv-123'),
            createdAt: iso8601DateTime(),
          },
        })
        .executeTest(async (mockServer) => {
          const response = await axios.post(
            `${mockServer.url}/api/v1/matches/swipe`,
            {
              targetUserId: 'user-456',
              direction: 'right',
            },
            {
              headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer token123',
              },
            }
          );

          expect(response.status).toBe(201);
          expect(response.data.match).toBe(true);
          expect(response.data).toHaveProperty('matchId');
        });
    });

    it('should process swipe left without creating match', async () => {
      await provider
        .given('target user exists')
        .uponReceiving('a swipe left request')
        .withRequest({
          method: 'POST',
          path: '/api/v1/matches/swipe',
          headers: {
            'Content-Type': 'application/json',
            Authorization: regex({
              generate: 'Bearer token123',
              matcher: '^Bearer .+$',
            }),
          },
          body: {
            targetUserId: like('user-456'),
            direction: 'left',
          },
        })
        .willRespondWith({
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: {
            match: false,
          },
        })
        .executeTest(async (mockServer) => {
          const response = await axios.post(
            `${mockServer.url}/api/v1/matches/swipe`,
            {
              targetUserId: 'user-456',
              direction: 'left',
            },
            {
              headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer token123',
              },
            }
          );

          expect(response.status).toBe(200);
          expect(response.data.match).toBe(false);
        });
    });
  });
});

// Consumer: Web App
// Provider: Messaging Service
describe('Messaging Service Contract Tests', () => {
  const provider = new PactV3({
    consumer: 'WebApp',
    provider: 'MessagingService',
    dir: path.resolve(process.cwd(), 'pacts'),
    logLevel: 'info',
  });

  describe('GET /api/v1/messages/conversations', () => {
    it('should return list of conversations', async () => {
      await provider
        .given('user has conversations')
        .uponReceiving('a request for conversations')
        .withRequest({
          method: 'GET',
          path: '/api/v1/messages/conversations',
          headers: {
            Authorization: regex({
              generate: 'Bearer token123',
              matcher: '^Bearer .+$',
            }),
          },
        })
        .willRespondWith({
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: {
            conversations: eachLike(
              {
                id: like('conv-123'),
                matchId: like('match-456'),
                participant: like({
                  id: 'user-789',
                  name: 'Jane',
                  photo: 'https://example.com/photo.jpg',
                }),
                lastMessage: like({
                  text: 'Hello!',
                  timestamp: iso8601DateTime(),
                  read: false,
                }),
                unreadCount: like(2),
              },
              { min: 1 }
            ),
          },
        })
        .executeTest(async (mockServer) => {
          const response = await axios.get(`${mockServer.url}/api/v1/messages/conversations`, {
            headers: { Authorization: 'Bearer token123' },
          });

          expect(response.status).toBe(200);
          expect(response.data.conversations).toBeInstanceOf(Array);
        });
    });
  });

  describe('POST /api/v1/messages', () => {
    it('should send a message', async () => {
      await provider
        .given('conversation exists')
        .uponReceiving('a request to send message')
        .withRequest({
          method: 'POST',
          path: '/api/v1/messages',
          headers: {
            'Content-Type': 'application/json',
            Authorization: regex({
              generate: 'Bearer token123',
              matcher: '^Bearer .+$',
            }),
          },
          body: {
            conversationId: like('conv-123'),
            text: like('Hello there!'),
          },
        })
        .willRespondWith({
          status: 201,
          headers: { 'Content-Type': 'application/json' },
          body: {
            id: like('msg-456'),
            conversationId: 'conv-123',
            senderId: like('user-123'),
            text: 'Hello there!',
            timestamp: iso8601DateTime(),
            status: 'sent',
          },
        })
        .executeTest(async (mockServer) => {
          const response = await axios.post(
            `${mockServer.url}/api/v1/messages`,
            {
              conversationId: 'conv-123',
              text: 'Hello there!',
            },
            {
              headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer token123',
              },
            }
          );

          expect(response.status).toBe(201);
          expect(response.data).toHaveProperty('id');
          expect(response.data.text).toBe('Hello there!');
        });
    });
  });

  describe('GET /api/v1/messages', () => {
    it('should return messages for a conversation', async () => {
      await provider
        .given('conversation has messages')
        .uponReceiving('a request for messages')
        .withRequest({
          method: 'GET',
          path: '/api/v1/messages',
          query: { conversationId: 'conv-123' },
          headers: {
            Authorization: regex({
              generate: 'Bearer token123',
              matcher: '^Bearer .+$',
            }),
          },
        })
        .willRespondWith({
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: {
            messages: eachLike(
              {
                id: like('msg-123'),
                conversationId: 'conv-123',
                senderId: like('user-456'),
                text: like('Hey!'),
                timestamp: iso8601DateTime(),
                status: like('read'),
              },
              { min: 1 }
            ),
            hasMore: like(false),
          },
        })
        .executeTest(async (mockServer) => {
          const response = await axios.get(`${mockServer.url}/api/v1/messages`, {
            params: { conversationId: 'conv-123' },
            headers: { Authorization: 'Bearer token123' },
          });

          expect(response.status).toBe(200);
          expect(response.data.messages).toBeInstanceOf(Array);
        });
    });
  });
});

// Consumer: Mobile App
// Provider: Payment Service
describe('Payment Service Contract Tests', () => {
  const provider = new PactV3({
    consumer: 'MobileApp',
    provider: 'PaymentService',
    dir: path.resolve(process.cwd(), 'pacts'),
    logLevel: 'info',
  });

  describe('POST /api/v1/payments/subscribe', () => {
    it('should create a subscription', async () => {
      await provider
        .given('user is authenticated and has payment method')
        .uponReceiving('a request to create subscription')
        .withRequest({
          method: 'POST',
          path: '/api/v1/payments/subscribe',
          headers: {
            'Content-Type': 'application/json',
            Authorization: regex({
              generate: 'Bearer token123',
              matcher: '^Bearer .+$',
            }),
          },
          body: {
            planId: like('premium-monthly'),
            paymentMethodId: like('pm_123'),
          },
        })
        .willRespondWith({
          status: 201,
          headers: { 'Content-Type': 'application/json' },
          body: {
            subscriptionId: like('sub_123'),
            status: 'active',
            planId: 'premium-monthly',
            currentPeriodEnd: iso8601DateTime(),
            cancelAtPeriodEnd: false,
          },
        })
        .executeTest(async (mockServer) => {
          const response = await axios.post(
            `${mockServer.url}/api/v1/payments/subscribe`,
            {
              planId: 'premium-monthly',
              paymentMethodId: 'pm_123',
            },
            {
              headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer token123',
              },
            }
          );

          expect(response.status).toBe(201);
          expect(response.data).toHaveProperty('subscriptionId');
          expect(response.data.status).toBe('active');
        });
    });
  });
});
