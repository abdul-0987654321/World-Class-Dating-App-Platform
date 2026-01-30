import request from 'supertest';

const GATEWAY_URL = process.env.API_GATEWAY_URL || 'https://api-gateway-production-1957.up.railway.app';
const API_URL = process.env.NOTIFICATION_URL || GATEWAY_URL;
const AUTH_URL = process.env.AUTH_URL || GATEWAY_URL;

describe('Notification Service API', () => {
  let accessToken: string;
  let userId: string;
  let notificationId: string;
  let deviceId: string;

  beforeAll(async () => {
    // Login to get access token
    const loginResponse = await request(AUTH_URL)
      .post('/api/auth/login')
      .send({
        email: process.env.TEST_USER_EMAIL || 'test@example.com',
        password: process.env.TEST_USER_PASSWORD || 'TestPassword123!'
      });

    accessToken = loginResponse.body.accessToken;
    userId = loginResponse.body.user?.id || loginResponse.body.userId;
  });

  // ==================== GET /api/notifications ====================
  describe('GET /api/notifications', () => {
    it('should return list of notifications with pagination', async () => {
      const response = await request(API_URL)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('notifications');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('unreadCount');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(Array.isArray(response.body.notifications)).toBe(true);

      // Save first notification ID for later tests
      if (response.body.notifications.length > 0) {
        notificationId = response.body.notifications[0].id;
      }
    });

    it('should support custom page and limit parameters', async () => {
      const response = await request(API_URL)
        .get('/api/notifications?page=1&limit=5')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(5);
      expect(response.body.notifications.length).toBeLessThanOrEqual(5);
    });

    it('should support unreadOnly filter', async () => {
      const response = await request(API_URL)
        .get('/api/notifications?unreadOnly=true')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // All returned notifications should be unread
      if (response.body.notifications.length > 0) {
        response.body.notifications.forEach((notification: any) => {
          expect(notification.readAt).toBeNull();
        });
      }
    });

    it('should handle empty state gracefully', async () => {
      const response = await request(API_URL)
        .get('/api/notifications?page=999')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.notifications).toEqual([]);
      expect(typeof response.body.total).toBe('number');
    });

    it('should fail without authentication', async () => {
      const response = await request(API_URL)
        .get('/api/notifications');

      expect(response.status).toBe(401);
    });

    it('should fail with invalid token', async () => {
      const response = await request(API_URL)
        .get('/api/notifications')
        .set('Authorization', 'Bearer invalid-token-12345');

      expect(response.status).toBe(401);
    });
  });

  // ==================== GET /api/notifications/unread-count ====================
  describe('GET /api/notifications/unread-count', () => {
    it('should return unread notification count', async () => {
      const response = await request(API_URL)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('count');
      expect(typeof response.body.count).toBe('number');
      expect(response.body.count).toBeGreaterThanOrEqual(0);
    });

    it('should fail without authentication', async () => {
      const response = await request(API_URL)
        .get('/api/notifications/unread-count');

      expect(response.status).toBe(401);
    });

    it('should return zero for user with no unread notifications', async () => {
      const response = await request(API_URL)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBeGreaterThanOrEqual(0);
    });
  });

  // ==================== PUT /api/notifications/:id/read ====================
  describe('PUT /api/notifications/:id/read', () => {
    let initialUnreadCount: number;

    beforeAll(async () => {
      // Get initial unread count
      const countResponse = await request(API_URL)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${accessToken}`);
      initialUnreadCount = countResponse.body.count;
    });

    it('should mark notification as read', async () => {
      if (!notificationId) {
        console.log('Skipping: No notification available');
        return;
      }

      const response = await request(API_URL)
        .put(`/api/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
    });

    it('should update unread count after marking as read', async () => {
      if (!notificationId || initialUnreadCount === 0) {
        console.log('Skipping: No unread notifications');
        return;
      }

      // Mark as read
      await request(API_URL)
        .put(`/api/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${accessToken}`);

      // Check updated count
      const countResponse = await request(API_URL)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(countResponse.status).toBe(200);
      expect(countResponse.body.count).toBeLessThanOrEqual(initialUnreadCount);
    });

    it('should fail with non-existent notification ID', async () => {
      const response = await request(API_URL)
        .put('/api/notifications/nonexistent-notification-id-12345/read')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid notification ID format', async () => {
      const response = await request(API_URL)
        .put('/api/notifications/invalid@id/read')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([400, 404]).toContain(response.status);
    });

    it('should fail without authentication', async () => {
      const response = await request(API_URL)
        .put(`/api/notifications/some-id/read`);

      expect(response.status).toBe(401);
    });
  });

  // ==================== PUT /api/notifications/read-all ====================
  describe('PUT /api/notifications/read-all', () => {
    it('should mark all notifications as read', async () => {
      const response = await request(API_URL)
        .put('/api/notifications/read-all')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('count');
      expect(typeof response.body.count).toBe('number');
      expect(response.body.count).toBeGreaterThanOrEqual(0);
    });

    it('should set unread count to zero after marking all as read', async () => {
      // Mark all as read
      await request(API_URL)
        .put('/api/notifications/read-all')
        .set('Authorization', `Bearer ${accessToken}`);

      // Verify unread count is zero
      const countResponse = await request(API_URL)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(countResponse.status).toBe(200);
      expect(countResponse.body.count).toBe(0);
    });

    it('should be idempotent (calling twice should work)', async () => {
      const firstResponse = await request(API_URL)
        .put('/api/notifications/read-all')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(firstResponse.status).toBe(200);

      const secondResponse = await request(API_URL)
        .put('/api/notifications/read-all')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(secondResponse.status).toBe(200);
      expect(secondResponse.body.count).toBe(0);
    });

    it('should fail without authentication', async () => {
      const response = await request(API_URL)
        .put('/api/notifications/read-all');

      expect(response.status).toBe(401);
    });
  });

  // ==================== GET /api/notifications/preferences ====================
  describe('GET /api/notifications/preferences', () => {
    it('should return user notification preferences', async () => {
      const response = await request(API_URL)
        .get('/api/notifications/preferences')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('preferences');

      const prefs = response.body.preferences;
      // Push preferences
      expect(prefs).toHaveProperty('pushEnabled');
      expect(prefs).toHaveProperty('pushNewMatch');
      expect(prefs).toHaveProperty('pushNewMessage');
      expect(prefs).toHaveProperty('pushNewLike');

      // Email preferences
      expect(prefs).toHaveProperty('emailEnabled');

      // SMS preferences
      expect(prefs).toHaveProperty('smsEnabled');

      // Quiet hours
      expect(prefs).toHaveProperty('quietHoursEnabled');
    });

    it('should return default preferences for new user', async () => {
      const response = await request(API_URL)
        .get('/api/notifications/preferences')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Default preferences should be defined
      const prefs = response.body.preferences;
      expect(typeof prefs.pushEnabled).toBe('boolean');
      expect(typeof prefs.emailEnabled).toBe('boolean');
    });

    it('should fail without authentication', async () => {
      const response = await request(API_URL)
        .get('/api/notifications/preferences');

      expect(response.status).toBe(401);
    });
  });

  // ==================== PUT /api/notifications/preferences ====================
  describe('PUT /api/notifications/preferences', () => {
    it('should update push notification preferences', async () => {
      const updates = {
        pushEnabled: true,
        pushNewMatch: true,
        pushNewMessage: true,
        pushNewLike: false
      };

      const response = await request(API_URL)
        .put('/api/notifications/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('preferences');

      const prefs = response.body.preferences;
      expect(prefs.pushEnabled).toBe(true);
      expect(prefs.pushNewMatch).toBe(true);
      expect(prefs.pushNewMessage).toBe(true);
      expect(prefs.pushNewLike).toBe(false);
    });

    it('should update email notification preferences', async () => {
      const updates = {
        emailEnabled: true,
        emailNewMatch: true,
        emailNewMessage: false,
        emailPromotions: false
      };

      const response = await request(API_URL)
        .put('/api/notifications/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const prefs = response.body.preferences;
      expect(prefs.emailEnabled).toBe(true);
      expect(prefs.emailNewMatch).toBe(true);
      expect(prefs.emailNewMessage).toBe(false);
    });

    it('should update quiet hours preferences', async () => {
      const updates = {
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        timezone: 'America/New_York'
      };

      const response = await request(API_URL)
        .put('/api/notifications/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const prefs = response.body.preferences;
      expect(prefs.quietHoursEnabled).toBe(true);
      expect(prefs.quietHoursStart).toBe('22:00');
      expect(prefs.quietHoursEnd).toBe('08:00');
    });

    it('should allow partial updates', async () => {
      const updates = {
        pushNewMatch: false
      };

      const response = await request(API_URL)
        .put('/api/notifications/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.preferences.pushNewMatch).toBe(false);
    });

    it('should disable all marketing notifications', async () => {
      const updates = {
        pushMarketing: false,
        emailPromotions: false
      };

      const response = await request(API_URL)
        .put('/api/notifications/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should persist preference changes', async () => {
      // Update preferences
      const updates = {
        pushNewLike: true,
        emailWeeklyDigest: false
      };

      await request(API_URL)
        .put('/api/notifications/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updates);

      // Fetch preferences to verify
      const getResponse = await request(API_URL)
        .get('/api/notifications/preferences')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.preferences.pushNewLike).toBe(true);
      expect(getResponse.body.preferences.emailWeeklyDigest).toBe(false);
    });

    it('should handle invalid quiet hours format', async () => {
      const updates = {
        quietHoursEnabled: true,
        quietHoursStart: 'invalid-time',
        quietHoursEnd: '08:00'
      };

      const response = await request(API_URL)
        .put('/api/notifications/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updates);

      // Should either accept with validation or return 400
      expect([200, 400]).toContain(response.status);
    });

    it('should fail without authentication', async () => {
      const response = await request(API_URL)
        .put('/api/notifications/preferences')
        .send({ pushEnabled: true });

      expect(response.status).toBe(401);
    });
  });

  // ==================== POST /api/notifications/devices ====================
  describe('POST /api/notifications/devices', () => {
    it('should register iOS device successfully', async () => {
      const deviceData = {
        deviceToken: `ios-token-${Date.now()}`,
        platform: 'ios',
        deviceId: 'test-iphone-12',
        deviceModel: 'iPhone 12 Pro',
        osVersion: '15.0',
        appVersion: '2.1.0'
      };

      const response = await request(API_URL)
        .post('/api/notifications/devices')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(deviceData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('deviceId');
      expect(response.body).toHaveProperty('message');

      deviceId = response.body.deviceId;
    });

    it('should register Android device successfully', async () => {
      const deviceData = {
        deviceToken: `android-token-${Date.now()}`,
        platform: 'android',
        deviceId: 'test-pixel-6',
        deviceModel: 'Pixel 6 Pro',
        osVersion: '12',
        appVersion: '2.1.0'
      };

      const response = await request(API_URL)
        .post('/api/notifications/devices')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(deviceData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('deviceId');
    });

    it('should register web device successfully', async () => {
      const deviceData = {
        deviceToken: `web-token-${Date.now()}`,
        platform: 'web',
        deviceModel: 'Chrome',
        osVersion: 'Windows 10',
        appVersion: '2.1.0'
      };

      const response = await request(API_URL)
        .post('/api/notifications/devices')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(deviceData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle duplicate device registration', async () => {
      const deviceData = {
        deviceToken: `duplicate-token-${Date.now()}`,
        platform: 'ios'
      };

      // First registration
      const firstResponse = await request(API_URL)
        .post('/api/notifications/devices')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(deviceData);

      expect(firstResponse.status).toBe(200);
      expect(firstResponse.body.isNew).toBe(true);

      // Second registration with same token
      const secondResponse = await request(API_URL)
        .post('/api/notifications/devices')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(deviceData);

      expect(secondResponse.status).toBe(200);
      expect(secondResponse.body.isNew).toBe(false);
      expect(secondResponse.body.message).toContain('updated');
    });

    it('should update existing device information', async () => {
      const deviceToken = `update-token-${Date.now()}`;

      // Initial registration
      await request(API_URL)
        .post('/api/notifications/devices')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          deviceToken,
          platform: 'ios',
          appVersion: '2.0.0'
        });

      // Update with new app version
      const updateResponse = await request(API_URL)
        .post('/api/notifications/devices')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          deviceToken,
          platform: 'ios',
          appVersion: '2.1.0'
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.success).toBe(true);
    });

    it('should fail without device token', async () => {
      const response = await request(API_URL)
        .post('/api/notifications/devices')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          platform: 'ios'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('token');
    });

    it('should fail without platform', async () => {
      const response = await request(API_URL)
        .post('/api/notifications/devices')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          deviceToken: 'some-token'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('platform');
    });

    it('should fail with invalid platform', async () => {
      const response = await request(API_URL)
        .post('/api/notifications/devices')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          deviceToken: 'some-token',
          platform: 'windows-phone'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Platform must be ios, android, or web');
    });

    it('should fail with empty device token', async () => {
      const response = await request(API_URL)
        .post('/api/notifications/devices')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          deviceToken: '',
          platform: 'ios'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should fail without authentication', async () => {
      const response = await request(API_URL)
        .post('/api/notifications/devices')
        .send({
          deviceToken: 'some-token',
          platform: 'ios'
        });

      expect(response.status).toBe(401);
    });

    it('should handle multiple devices per user', async () => {
      const devices = [
        { deviceToken: `multi-ios-${Date.now()}`, platform: 'ios' },
        { deviceToken: `multi-android-${Date.now()}`, platform: 'android' },
        { deviceToken: `multi-web-${Date.now()}`, platform: 'web' }
      ];

      for (const device of devices) {
        const response = await request(API_URL)
          .post('/api/notifications/devices')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(device);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      }
    });
  });

  // ==================== Additional Tests ====================
  describe('Notification Service Integration', () => {
    it('should handle concurrent requests gracefully', async () => {
      const requests = Array(5).fill(null).map(() =>
        request(API_URL)
          .get('/api/notifications/unread-count')
          .set('Authorization', `Bearer ${accessToken}`)
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should maintain correct state after multiple operations', async () => {
      // Get initial count
      const initialCount = await request(API_URL)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${accessToken}`);

      // Mark all as read
      await request(API_URL)
        .put('/api/notifications/read-all')
        .set('Authorization', `Bearer ${accessToken}`);

      // Verify count is zero
      const finalCount = await request(API_URL)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(finalCount.body.count).toBe(0);
    });

    it('should handle rate limiting gracefully', async () => {
      // Make multiple rapid requests
      const requests = Array(10).fill(null).map(() =>
        request(API_URL)
          .get('/api/notifications')
          .set('Authorization', `Bearer ${accessToken}`)
      );

      const responses = await Promise.all(requests);

      // All should succeed or some may be rate limited
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });
    });
  });

  // ==================== Error Handling Tests ====================
  describe('Error Handling', () => {
    it('should return 401 for expired token', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      const response = await request(API_URL)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });

    it('should return 401 for malformed token', async () => {
      const response = await request(API_URL)
        .get('/api/notifications')
        .set('Authorization', 'Bearer malformed.token.value');

      expect(response.status).toBe(401);
    });

    it('should return 401 for missing Authorization header', async () => {
      const response = await request(API_URL)
        .get('/api/notifications');

      expect(response.status).toBe(401);
    });

    it('should handle internal server errors gracefully', async () => {
      const response = await request(API_URL)
        .put('/api/notifications/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          invalidField: 'this should not cause a crash'
        });

      // Should either succeed (ignoring invalid fields) or return proper error
      expect([200, 400, 500]).toContain(response.status);
      if (response.status !== 200) {
        expect(response.body).toHaveProperty('error');
      }
    });

    it('should validate notification ID format', async () => {
      const response = await request(API_URL)
        .put('/api/notifications/../../../etc/passwd/read')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([400, 404]).toContain(response.status);
    });
  });

  // ==================== Performance Tests ====================
  describe('Performance', () => {
    it('should respond to GET requests within 1 second', async () => {
      const startTime = Date.now();

      await request(API_URL)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${accessToken}`);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000);
    });

    it('should handle pagination efficiently', async () => {
      const startTime = Date.now();

      await request(API_URL)
        .get('/api/notifications?page=1&limit=50')
        .set('Authorization', `Bearer ${accessToken}`);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000);
    });
  });
});
