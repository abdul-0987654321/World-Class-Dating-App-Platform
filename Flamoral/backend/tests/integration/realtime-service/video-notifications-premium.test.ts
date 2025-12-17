/**
 * Integration tests for Video Calling, Push Notifications, and Premium Features
 * Tests Agora video integration, notification delivery, and premium subscription features
 */

import { ApiClient, createApiClient } from '../helpers/api-client';
import { DatabaseHelper, getDatabaseHelper } from '../helpers/database';
import { faker } from '@faker-js/faker';

describe('Video, Notifications, and Premium Features Integration Tests', () => {
  let realtimeApiClient: ApiClient;
  let notificationApiClient: ApiClient;
  let authApiClient: ApiClient;
  let userApiClient: ApiClient;
  let dbHelper: DatabaseHelper;

  const REALTIME_SERVICE_URL = process.env.REALTIME_SERVICE_URL || 'http://localhost:3009';
  const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3010';
  const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
  const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3002';

  beforeAll(async () => {
    realtimeApiClient = createApiClient(REALTIME_SERVICE_URL);
    notificationApiClient = createApiClient(NOTIFICATION_SERVICE_URL);
    authApiClient = createApiClient(AUTH_SERVICE_URL);
    userApiClient = createApiClient(USER_SERVICE_URL);
    dbHelper = getDatabaseHelper();
  });

  beforeEach(async () => {
    await dbHelper.clearAll();
  });

  const createUser = async () => {
    const userData = {
      email: faker.internet.email().toLowerCase(),
      password: 'SecurePass123!',
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      dateOfBirth: '1995-05-15',
      gender: 'male',
    };

    const response = await authApiClient.post('/api/v1/auth/register', userData);
    return response.body.data;
  };

  describe('Video Calling (Agora Integration)', () => {
    it('should initiate video call', async () => {
      const { user: caller, accessToken: callerToken } = await createUser();
      const { user: receiver } = await createUser();

      realtimeApiClient.setAuthToken(callerToken);
      const response = await realtimeApiClient.post('/api/v1/video/call/initiate', {
        receiverId: receiver.id,
      });

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        callId: expect.any(String),
        agoraToken: expect.any(String),
        channelName: expect.any(String),
        appId: expect.any(String),
      });
    });

    it('should generate Agora token for video call', async () => {
      const { accessToken } = await createUser();

      realtimeApiClient.setAuthToken(accessToken);
      const response = await realtimeApiClient.post('/api/v1/video/token', {
        channelName: 'test_channel_123',
      });

      expect(response.status).toBe(200);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.uid).toBeDefined();
    });

    it('should answer video call', async () => {
      const { user: caller, accessToken: callerToken } = await createUser();
      const { user: receiver, accessToken: receiverToken } = await createUser();

      // Initiate call
      realtimeApiClient.setAuthToken(callerToken);
      const initiateResponse = await realtimeApiClient.post('/api/v1/video/call/initiate', {
        receiverId: receiver.id,
      });

      const callId = initiateResponse.body.data.callId;

      // Answer call
      realtimeApiClient.setAuthToken(receiverToken);
      const response = await realtimeApiClient.post(`/api/v1/video/call/${callId}/answer`, {});

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        callId,
        status: 'active',
        agoraToken: expect.any(String),
      });
    });

    it('should reject video call', async () => {
      const { user: caller, accessToken: callerToken } = await createUser();
      const { user: receiver, accessToken: receiverToken } = await createUser();

      // Initiate call
      realtimeApiClient.setAuthToken(callerToken);
      const initiateResponse = await realtimeApiClient.post('/api/v1/video/call/initiate', {
        receiverId: receiver.id,
      });

      const callId = initiateResponse.body.data.callId;

      // Reject call
      realtimeApiClient.setAuthToken(receiverToken);
      const response = await realtimeApiClient.post(`/api/v1/video/call/${callId}/reject`, {});

      expect(response.status).toBe(200);

      // Verify call status
      const knex = dbHelper.getKnex();
      const call = await knex('video_calls').where('id', callId).first();
      expect(call.status).toBe('rejected');
    });

    it('should end video call', async () => {
      const { user: caller, accessToken: callerToken } = await createUser();
      const { user: receiver } = await createUser();

      // Initiate call
      realtimeApiClient.setAuthToken(callerToken);
      const initiateResponse = await realtimeApiClient.post('/api/v1/video/call/initiate', {
        receiverId: receiver.id,
      });

      const callId = initiateResponse.body.data.callId;

      // End call
      const response = await realtimeApiClient.post(`/api/v1/video/call/${callId}/end`, {});

      expect(response.status).toBe(200);

      // Verify call ended
      const knex = dbHelper.getKnex();
      const call = await knex('video_calls').where('id', callId).first();
      expect(call.status).toBe('ended');
      expect(call.ended_at).not.toBeNull();
    });

    it('should track video call duration', async () => {
      const { user: caller, accessToken: callerToken } = await createUser();
      const { user: receiver } = await createUser();

      realtimeApiClient.setAuthToken(callerToken);
      const initiateResponse = await realtimeApiClient.post('/api/v1/video/call/initiate', {
        receiverId: receiver.id,
      });

      const callId = initiateResponse.body.data.callId;

      // Simulate call duration
      await new Promise(resolve => setTimeout(resolve, 2000));

      // End call
      await realtimeApiClient.post(`/api/v1/video/call/${callId}/end`, {});

      // Check duration
      const knex = dbHelper.getKnex();
      const call = await knex('video_calls').where('id', callId).first();
      expect(call.duration_seconds).toBeGreaterThan(0);
    });

    it('should not allow video call without match', async () => {
      const { user: caller, accessToken: callerToken } = await createUser();
      const { user: randomUser } = await createUser();

      realtimeApiClient.setAuthToken(callerToken);
      const response = await realtimeApiClient.post('/api/v1/video/call/initiate', {
        receiverId: randomUser.id,
      });

      expect(response.status).toBe(403);
      expect(response.body.error).toMatch(/not matched|no match/i);
    });
  });

  describe('Push Notifications', () => {
    it('should register device for push notifications', async () => {
      const { accessToken } = await createUser();

      notificationApiClient.setAuthToken(accessToken);
      const response = await notificationApiClient.post('/api/v1/notifications/devices/register', {
        deviceToken: 'fcm_token_123',
        platform: 'ios',
        deviceId: 'device_123',
      });

      expect(response.status).toBe(200);

      // Verify device registered
      const knex = dbHelper.getKnex();
      const device = await knex('push_devices')
        .where({ device_token: 'fcm_token_123' })
        .first();
      expect(device).toBeDefined();
    });

    it('should send push notification on new match', async () => {
      const { user: user1, accessToken: token1 } = await createUser();
      const { user: user2 } = await createUser();

      // Register device
      notificationApiClient.setAuthToken(token1);
      await notificationApiClient.post('/api/v1/notifications/devices/register', {
        deviceToken: 'fcm_token_123',
        platform: 'ios',
      });

      // Trigger match notification
      const response = await notificationApiClient.post('/api/v1/notifications/send', {
        userId: user1.id,
        type: 'new_match',
        data: {
          matchedUserId: user2.id,
          matchedUserName: user2.firstName,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.data.sent).toBe(true);
    });

    it('should send notification on new message', async () => {
      const { user, accessToken } = await createUser();

      notificationApiClient.setAuthToken(accessToken);
      await notificationApiClient.post('/api/v1/notifications/devices/register', {
        deviceToken: 'fcm_token_123',
        platform: 'android',
      });

      // Send message notification
      const response = await notificationApiClient.post('/api/v1/notifications/send', {
        userId: user.id,
        type: 'new_message',
        data: {
          senderId: 'other_user_id',
          senderName: 'John Doe',
          messagePreview: 'Hey! How are you?',
        },
      });

      expect(response.status).toBe(200);
    });

    it('should get notification preferences', async () => {
      const { accessToken } = await createUser();

      notificationApiClient.setAuthToken(accessToken);
      const response = await notificationApiClient.get('/api/v1/notifications/preferences');

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        pushEnabled: expect.any(Boolean),
        emailEnabled: expect.any(Boolean),
        preferences: expect.any(Object),
      });
    });

    it('should update notification preferences', async () => {
      const { accessToken } = await createUser();

      notificationApiClient.setAuthToken(accessToken);
      const response = await notificationApiClient.put('/api/v1/notifications/preferences', {
        pushEnabled: true,
        emailEnabled: false,
        notifyOnMatch: true,
        notifyOnMessage: true,
        notifyOnLike: false,
      });

      expect(response.status).toBe(200);
    });

    it('should unregister device', async () => {
      const { user, accessToken } = await createUser();

      notificationApiClient.setAuthToken(accessToken);

      // Register device
      await notificationApiClient.post('/api/v1/notifications/devices/register', {
        deviceToken: 'fcm_token_123',
        platform: 'ios',
      });

      // Unregister device
      const response = await notificationApiClient.delete('/api/v1/notifications/devices/fcm_token_123');

      expect(response.status).toBe(200);

      // Verify device removed
      const knex = dbHelper.getKnex();
      const device = await knex('push_devices')
        .where({ device_token: 'fcm_token_123' })
        .first();
      expect(device).toBeUndefined();
    });

    it('should batch send notifications', async () => {
      const users = [];
      for (let i = 0; i < 5; i++) {
        const { user } = await createUser();
        users.push(user);
      }

      // Admin sends batch notification
      const response = await notificationApiClient.post('/api/v1/notifications/batch', {
        userIds: users.map(u => u.id),
        type: 'announcement',
        title: 'New Feature Available!',
        body: 'Check out our latest update',
      });

      expect(response.status).toBe(200);
      expect(response.body.data.sent).toBe(5);
    });
  });

  describe('Premium Features', () => {
    it('should access unlimited swipes with premium', async () => {
      const { user, accessToken } = await createUser();

      // Activate premium
      const knex = dbHelper.getKnex();
      await knex('users').where('id', user.id).update({ is_premium: true });
      await knex('subscriptions').insert({
        user_id: user.id,
        plan: 'premium_monthly',
        status: 'active',
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      userApiClient.setAuthToken(accessToken);
      const response = await userApiClient.get('/api/v1/users/premium/features');

      expect(response.status).toBe(200);
      expect(response.body.data.features).toContainEqual(
        expect.objectContaining({ name: 'unlimited_swipes' })
      );
    });

    it('should allow seeing who liked you (premium feature)', async () => {
      const { user: premiumUser, accessToken: premiumToken } = await createUser();
      const { user: otherUser } = await createUser();

      // Make user premium
      const knex = dbHelper.getKnex();
      await knex('users').where('id', premiumUser.id).update({ is_premium: true });

      // Other user likes premium user
      await knex('swipes').insert({
        swiper_id: otherUser.id,
        swiped_id: premiumUser.id,
        direction: 'right',
      });

      // Premium user can see who liked them
      userApiClient.setAuthToken(premiumToken);
      const response = await userApiClient.get('/api/v1/users/premium/likes');

      expect(response.status).toBe(200);
      expect(response.body.data.likes).toBeDefined();
      expect(response.body.data.likes.length).toBeGreaterThan(0);
    });

    it('should not allow free users to see who liked them', async () => {
      const { accessToken } = await createUser();

      userApiClient.setAuthToken(accessToken);
      const response = await userApiClient.get('/api/v1/users/premium/likes');

      expect(response.status).toBe(403);
      expect(response.body.error).toMatch(/premium|subscription/i);
    });

    it('should allow passport feature (location change)', async () => {
      const { user, accessToken } = await createUser();

      // Activate premium
      const knex = dbHelper.getKnex();
      await knex('users').where('id', user.id).update({ is_premium: true });

      // Use passport feature
      userApiClient.setAuthToken(accessToken);
      const response = await userApiClient.post('/api/v1/users/premium/passport', {
        latitude: 51.5074,
        longitude: -0.1278,
        city: 'London',
      });

      expect(response.status).toBe(200);

      // Verify location changed
      const profile = await knex('profiles').where('user_id', user.id).first();
      expect(profile.travel_mode_location).toBe('London');
    });

    it('should allow unlimited rewinds (premium feature)', async () => {
      const { user, accessToken } = await createUser();
      const { user: swipedUser } = await createUser();

      // Activate premium
      const knex = dbHelper.getKnex();
      await knex('users').where('id', user.id).update({ is_premium: true });

      // Swipe on user
      const matchingApiClient = createApiClient('http://localhost:3004');
      matchingApiClient.setAuthToken(accessToken);
      await matchingApiClient.post('/api/v1/matching/swipe', {
        targetUserId: swipedUser.id,
        direction: 'left',
      });

      // Undo multiple times (unlimited for premium)
      for (let i = 0; i < 5; i++) {
        const response = await matchingApiClient.post('/api/v1/matching/undo', {});
        expect(response.status).toBe(200);

        // Re-swipe for next undo
        if (i < 4) {
          await matchingApiClient.post('/api/v1/matching/swipe', {
            targetUserId: swipedUser.id,
            direction: 'left',
          });
        }
      }
    });

    it('should provide advanced filters (premium feature)', async () => {
      const { accessToken } = await createUser();
      const knex = dbHelper.getKnex();

      // Activate premium
      await knex('users').where('id', (await createUser()).user.id).update({ is_premium: true });

      const matchingApiClient = createApiClient('http://localhost:3004');
      matchingApiClient.setAuthToken(accessToken);

      const response = await matchingApiClient.get('/api/v1/matching/discovery', {
        query: {
          minHeight: 170,
          maxHeight: 190,
          education: 'Bachelor',
          smoking: 'Never',
        },
      });

      expect(response.status).toBe(200);
    });

    it('should hide ads for premium users', async () => {
      const { user, accessToken } = await createUser();

      const knex = dbHelper.getKnex();
      await knex('users').where('id', user.id).update({ is_premium: true });

      userApiClient.setAuthToken(accessToken);
      const response = await userApiClient.get('/api/v1/users/premium/features');

      expect(response.body.data.features).toContainEqual(
        expect.objectContaining({ name: 'ad_free' })
      );
    });
  });
});
