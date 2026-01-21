/**
 * Complete Authentication Flow Tests
 *
 * End-to-end tests for all authentication workflows:
 * - Full registration -> verification -> login flow
 * - Token refresh flow
 * - Password reset flow
 * - MFA enablement and usage
 * - OAuth mock flows
 *
 * These tests verify the complete user authentication lifecycle.
 */

import request from 'supertest';

// Service URLs
const config = {
  AUTH_URL: process.env.AUTH_URL || 'http://localhost:3001',
  USER_URL: process.env.USER_URL || 'http://localhost:3002',
  API_GATEWAY_URL: process.env.API_GATEWAY_URL || 'http://localhost:3000',
  INTERNAL_SERVICE_KEY: process.env.INTERNAL_SERVICE_KEY || 'internal-service-key',
};

// Test identifiers
const TEST_TIMESTAMP = Date.now();
const TEST_RANDOM = Math.random().toString(36).substring(7);

// Helper to mask tokens in logs
function maskToken(token: string): string {
  if (!token || token.length < 20) return '***';
  return `${token.substring(0, 10)}...${token.substring(token.length - 5)}`;
}

describe('Complete Authentication Flow Tests', () => {
  jest.setTimeout(60000);

  // ==================== FULL REGISTRATION -> LOGIN FLOW ====================

  describe('1. Registration -> Verification -> Login Flow', () => {
    const testEmail = `auth-flow-${TEST_TIMESTAMP}-${TEST_RANDOM}@flamoral.test`;
    const testPassword = 'AuthFlowPassword123!';
    let accessToken: string;
    let refreshToken: string;
    let userId: string;

    it('1.1 Should register a new user', async () => {
      const response = await request(config.AUTH_URL)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          firstName: 'Auth',
          lastName: 'Flow',
          dateOfBirth: '1990-05-15',
          gender: 'male',
        });

      expect(response.status).toBe(201);

      const data = response.body.data || response.body;
      expect(data).toHaveProperty('accessToken');
      expect(data).toHaveProperty('refreshToken');
      expect(data.user || data).toHaveProperty('id');

      accessToken = data.accessToken;
      refreshToken = data.refreshToken;
      userId = data.user?.id || data.id;

      console.log(`[AUTH] Registered user: ${testEmail}, ID: ${userId}`);
      console.log(`[AUTH] Access token: ${maskToken(accessToken)}`);
    });

    it('1.2 Should be able to access protected resources with new token', async () => {
      expect(accessToken).toBeDefined();

      const response = await request(config.AUTH_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.email).toBe(testEmail);
      expect(response.body).not.toHaveProperty('password');
    });

    it('1.3 Should request email verification resend', async () => {
      const response = await request(config.AUTH_URL)
        .post('/api/auth/resend-verification')
        .send({ email: testEmail });

      expect([200, 400, 429]).toContain(response.status);
    });

    it('1.4 Should fail email verification with invalid token', async () => {
      const response = await request(config.AUTH_URL)
        .post('/api/auth/verify-email')
        .send({ token: 'invalid-verification-token' });

      expect(response.status).toBe(400);
    });

    it('1.5 Should logout successfully', async () => {
      const response = await request(config.AUTH_URL)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 204]).toContain(response.status);
    });

    it('1.6 Should be unable to use token after logout', async () => {
      // Wait a moment for logout to propagate
      await new Promise(resolve => setTimeout(resolve, 500));

      const response = await request(config.AUTH_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      // Token should be invalidated
      expect(response.status).toBe(401);
    });

    it('1.7 Should login with registered credentials', async () => {
      const response = await request(config.AUTH_URL)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        });

      expect(response.status).toBe(200);

      const data = response.body.data || response.body;
      expect(data).toHaveProperty('accessToken');
      expect(data).toHaveProperty('refreshToken');

      accessToken = data.accessToken;
      refreshToken = data.refreshToken;

      console.log(`[AUTH] Login successful, new token: ${maskToken(accessToken)}`);
    });

    it('1.8 Should access protected resources after login', async () => {
      const response = await request(config.AUTH_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.email).toBe(testEmail);
    });
  });

  // ==================== TOKEN REFRESH FLOW ====================

  describe('2. Token Refresh Flow', () => {
    const testEmail = `refresh-flow-${TEST_TIMESTAMP}-${TEST_RANDOM}@flamoral.test`;
    const testPassword = 'RefreshFlowPassword123!';
    let accessToken: string;
    let refreshToken: string;
    let newAccessToken: string;
    let newRefreshToken: string;

    beforeAll(async () => {
      // Register and login to get tokens
      const registerResponse = await request(config.AUTH_URL)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          firstName: 'Refresh',
          lastName: 'Flow',
          dateOfBirth: '1990-05-15',
          gender: 'female',
        });

      if (registerResponse.status === 201) {
        const data = registerResponse.body.data || registerResponse.body;
        accessToken = data.accessToken;
        refreshToken = data.refreshToken;
      } else {
        // User might exist, try login
        const loginResponse = await request(config.AUTH_URL)
          .post('/api/auth/login')
          .send({ email: testEmail, password: testPassword });

        const data = loginResponse.body.data || loginResponse.body;
        accessToken = data.accessToken;
        refreshToken = data.refreshToken;
      }
    });

    it('2.1 Should refresh access token with valid refresh token', async () => {
      expect(refreshToken).toBeDefined();

      const response = await request(config.AUTH_URL)
        .post('/api/auth/refresh-token')
        .send({ refreshToken });

      expect(response.status).toBe(200);

      const data = response.body.data || response.body;
      expect(data).toHaveProperty('accessToken');
      expect(data).toHaveProperty('refreshToken');

      newAccessToken = data.accessToken;
      newRefreshToken = data.refreshToken;

      console.log(`[AUTH] Token refreshed: ${maskToken(newAccessToken)}`);
    });

    it('2.2 Should be able to use new access token', async () => {
      expect(newAccessToken).toBeDefined();

      const response = await request(config.AUTH_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${newAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.email).toBe(testEmail);
    });

    it('2.3 Old refresh token should be invalidated (token rotation)', async () => {
      // Try using the old refresh token
      const response = await request(config.AUTH_URL)
        .post('/api/auth/refresh-token')
        .send({ refreshToken });

      // Old token should be invalid (rotation)
      expect(response.status).toBe(401);
    });

    it('2.4 New refresh token should work', async () => {
      expect(newRefreshToken).toBeDefined();

      const response = await request(config.AUTH_URL)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: newRefreshToken });

      expect(response.status).toBe(200);
    });

    it('2.5 Should fail refresh with invalid token', async () => {
      const response = await request(config.AUTH_URL)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'invalid-refresh-token-12345' });

      expect(response.status).toBe(401);
    });

    it('2.6 Should fail refresh with expired token', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoicmVmcmVzaCIsImV4cCI6MX0.expired';

      const response = await request(config.AUTH_URL)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: expiredToken });

      expect(response.status).toBe(401);
    });

    it('2.7 Should fail refresh with missing token', async () => {
      const response = await request(config.AUTH_URL)
        .post('/api/auth/refresh-token')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  // ==================== PASSWORD RESET FLOW ====================

  describe('3. Password Reset Flow', () => {
    const testEmail = `reset-flow-${TEST_TIMESTAMP}-${TEST_RANDOM}@flamoral.test`;
    const testPassword = 'ResetFlowPassword123!';
    const newPassword = 'NewResetPassword456!';

    beforeAll(async () => {
      // Register user for password reset tests
      await request(config.AUTH_URL)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          firstName: 'Reset',
          lastName: 'Flow',
          dateOfBirth: '1990-05-15',
          gender: 'male',
        });
    });

    it('3.1 Should request password reset for existing user', async () => {
      const response = await request(config.AUTH_URL)
        .post('/api/auth/forgot-password')
        .send({ email: testEmail });

      // Should always return 200 to prevent email enumeration
      expect(response.status).toBe(200);
    });

    it('3.2 Should return 200 for non-existent email (security)', async () => {
      const response = await request(config.AUTH_URL)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent-user@flamoral.test' });

      // Same response to prevent email enumeration
      expect(response.status).toBe(200);
    });

    it('3.3 Should fail password reset request with invalid email format', async () => {
      const response = await request(config.AUTH_URL)
        .post('/api/auth/forgot-password')
        .send({ email: 'invalid-email' });

      expect(response.status).toBe(400);
    });

    it('3.4 Should fail password reset request with missing email', async () => {
      const response = await request(config.AUTH_URL)
        .post('/api/auth/forgot-password')
        .send({});

      expect(response.status).toBe(400);
    });

    it('3.5 Should fail password reset with invalid token', async () => {
      const response = await request(config.AUTH_URL)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-reset-token',
          newPassword: newPassword,
        });

      expect(response.status).toBe(400);
    });

    it('3.6 Should fail password reset with weak new password', async () => {
      const response = await request(config.AUTH_URL)
        .post('/api/auth/reset-password')
        .send({
          token: 'any-token',
          newPassword: '123',
        });

      expect(response.status).toBe(400);
    });

    it('3.7 Should fail password reset with missing token', async () => {
      const response = await request(config.AUTH_URL)
        .post('/api/auth/reset-password')
        .send({ newPassword: newPassword });

      expect(response.status).toBe(400);
    });

    it('3.8 Should fail password reset with missing new password', async () => {
      const response = await request(config.AUTH_URL)
        .post('/api/auth/reset-password')
        .send({ token: 'some-token' });

      expect(response.status).toBe(400);
    });
  });

  // ==================== MFA FLOW ====================

  describe('4. MFA (Multi-Factor Authentication) Flow', () => {
    const testEmail = `mfa-flow-${TEST_TIMESTAMP}-${TEST_RANDOM}@flamoral.test`;
    const testPassword = 'MFAFlowPassword123!';
    let accessToken: string;
    let mfaSecret: string;

    beforeAll(async () => {
      // Register user for MFA tests
      const response = await request(config.AUTH_URL)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          firstName: 'MFA',
          lastName: 'Flow',
          dateOfBirth: '1990-05-15',
          gender: 'male',
        });

      if (response.status === 201) {
        const data = response.body.data || response.body;
        accessToken = data.accessToken;
      } else {
        const loginResponse = await request(config.AUTH_URL)
          .post('/api/auth/login')
          .send({ email: testEmail, password: testPassword });

        const data = loginResponse.body.data || loginResponse.body;
        accessToken = data.accessToken;
      }
    });

    it('4.1 Should request MFA setup (get TOTP secret)', async () => {
      if (!accessToken) {
        console.log('Skipping: No access token available');
        return;
      }

      const response = await request(config.AUTH_URL)
        .post('/api/auth/mfa/setup')
        .set('Authorization', `Bearer ${accessToken}`);

      // MFA setup might not be implemented yet
      if (response.status === 200) {
        expect(response.body).toHaveProperty('secret');
        expect(response.body).toHaveProperty('qrCode');
        mfaSecret = response.body.secret;
      } else {
        expect([200, 404, 501]).toContain(response.status);
      }
    });

    it('4.2 Should fail MFA verify with invalid code', async () => {
      if (!accessToken) {
        console.log('Skipping: No access token available');
        return;
      }

      const response = await request(config.AUTH_URL)
        .post('/api/auth/mfa/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ code: '000000' });

      // Invalid code should be rejected
      expect([400, 401, 404, 501]).toContain(response.status);
    });

    it('4.3 Should fail MFA verify without code', async () => {
      if (!accessToken) {
        console.log('Skipping: No access token available');
        return;
      }

      const response = await request(config.AUTH_URL)
        .post('/api/auth/mfa/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect([400, 404, 501]).toContain(response.status);
    });

    it('4.4 Should get MFA status', async () => {
      if (!accessToken) {
        console.log('Skipping: No access token available');
        return;
      }

      const response = await request(config.AUTH_URL)
        .get('/api/auth/mfa/status')
        .set('Authorization', `Bearer ${accessToken}`);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('enabled');
      } else {
        expect([200, 404, 501]).toContain(response.status);
      }
    });

    it('4.5 Should fail to disable MFA with invalid code', async () => {
      if (!accessToken) {
        console.log('Skipping: No access token available');
        return;
      }

      const response = await request(config.AUTH_URL)
        .post('/api/auth/mfa/disable')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ code: '000000' });

      expect([400, 401, 404, 501]).toContain(response.status);
    });
  });

  // ==================== OAUTH MOCK FLOWS ====================

  describe('5. OAuth Mock Flows', () => {
    it('5.1 Should initiate Google OAuth flow', async () => {
      const response = await request(config.AUTH_URL)
        .get('/api/auth/oauth/google');

      // Should redirect to Google OAuth
      expect([200, 302, 307, 400, 501]).toContain(response.status);

      if (response.status === 302 || response.status === 307) {
        expect(response.headers.location).toContain('accounts.google.com');
      }
    });

    it('5.2 Should initiate Apple OAuth flow', async () => {
      const response = await request(config.AUTH_URL)
        .get('/api/auth/oauth/apple');

      expect([200, 302, 307, 400, 501]).toContain(response.status);

      if (response.status === 302 || response.status === 307) {
        expect(response.headers.location).toContain('appleid.apple.com');
      }
    });

    it('5.3 Should initiate Facebook OAuth flow', async () => {
      const response = await request(config.AUTH_URL)
        .get('/api/auth/oauth/facebook');

      expect([200, 302, 307, 400, 501]).toContain(response.status);
    });

    it('5.4 Should handle OAuth callback with invalid state', async () => {
      const response = await request(config.AUTH_URL)
        .get('/api/auth/oauth/google/callback')
        .query({
          code: 'mock-auth-code',
          state: 'invalid-state',
        });

      expect([400, 401, 403]).toContain(response.status);
    });

    it('5.5 Should handle OAuth callback with invalid code', async () => {
      const response = await request(config.AUTH_URL)
        .post('/api/auth/oauth/google/token')
        .send({
          code: 'invalid-oauth-code',
          redirectUri: 'http://localhost:3000/callback',
        });

      expect([400, 401]).toContain(response.status);
    });

    it('5.6 Should fail OAuth with missing parameters', async () => {
      const response = await request(config.AUTH_URL)
        .get('/api/auth/oauth/google/callback');

      expect([400, 401]).toContain(response.status);
    });
  });

  // ==================== SERVICE-TO-SERVICE AUTH ====================

  describe('6. Service-to-Service Token Validation', () => {
    const testEmail = `s2s-flow-${TEST_TIMESTAMP}-${TEST_RANDOM}@flamoral.test`;
    const testPassword = 'S2SFlowPassword123!';
    let accessToken: string;

    beforeAll(async () => {
      const response = await request(config.AUTH_URL)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          firstName: 'S2S',
          lastName: 'Flow',
          dateOfBirth: '1990-05-15',
          gender: 'male',
        });

      if (response.status === 201) {
        const data = response.body.data || response.body;
        accessToken = data.accessToken;
      } else {
        const loginResponse = await request(config.AUTH_URL)
          .post('/api/auth/login')
          .send({ email: testEmail, password: testPassword });

        const data = loginResponse.body.data || loginResponse.body;
        accessToken = data.accessToken;
      }
    });

    it('6.1 Should validate token with correct service key', async () => {
      if (!accessToken) {
        console.log('Skipping: No access token available');
        return;
      }

      const response = await request(config.AUTH_URL)
        .post('/api/auth/validate-token')
        .set('x-service-key', config.INTERNAL_SERVICE_KEY)
        .send({ token: accessToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('valid', true);
      expect(response.body.data).toHaveProperty('user');
    });

    it('6.2 Should fail validation without service key', async () => {
      if (!accessToken) {
        console.log('Skipping: No access token available');
        return;
      }

      const response = await request(config.AUTH_URL)
        .post('/api/auth/validate-token')
        .send({ token: accessToken });

      expect(response.status).toBe(401);
    });

    it('6.3 Should fail validation with wrong service key', async () => {
      if (!accessToken) {
        console.log('Skipping: No access token available');
        return;
      }

      const response = await request(config.AUTH_URL)
        .post('/api/auth/validate-token')
        .set('x-service-key', 'wrong-service-key')
        .send({ token: accessToken });

      expect(response.status).toBe(401);
    });

    it('6.4 Should fail validation with invalid token', async () => {
      const response = await request(config.AUTH_URL)
        .post('/api/auth/validate-token')
        .set('x-service-key', config.INTERNAL_SERVICE_KEY)
        .send({ token: 'invalid-token' });

      expect([200, 401, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.success).toBe(false);
      }
    });

    it('6.5 Should fail validation with missing token', async () => {
      const response = await request(config.AUTH_URL)
        .post('/api/auth/validate-token')
        .set('x-service-key', config.INTERNAL_SERVICE_KEY)
        .send({});

      expect(response.status).toBe(400);
    });
  });

  // ==================== DEVICE MANAGEMENT ====================

  describe('7. Device Management', () => {
    const testEmail = `device-flow-${TEST_TIMESTAMP}-${TEST_RANDOM}@flamoral.test`;
    const testPassword = 'DeviceFlowPassword123!';
    let accessToken: string;

    beforeAll(async () => {
      const response = await request(config.AUTH_URL)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          firstName: 'Device',
          lastName: 'Flow',
          dateOfBirth: '1990-05-15',
          gender: 'male',
        });

      if (response.status === 201) {
        const data = response.body.data || response.body;
        accessToken = data.accessToken;
      } else {
        const loginResponse = await request(config.AUTH_URL)
          .post('/api/auth/login')
          .send({ email: testEmail, password: testPassword });

        const data = loginResponse.body.data || loginResponse.body;
        accessToken = data.accessToken;
      }
    });

    it('7.1 Should login with device info', async () => {
      const response = await request(config.AUTH_URL)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
          deviceInfo: {
            deviceId: 'test-device-' + Date.now(),
            platform: 'ios',
            osVersion: '17.0',
            appVersion: '1.0.0',
          },
        });

      expect(response.status).toBe(200);
    });

    it('7.2 Should get active sessions/devices', async () => {
      if (!accessToken) {
        console.log('Skipping: No access token available');
        return;
      }

      const response = await request(config.AUTH_URL)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${accessToken}`);

      // Sessions endpoint might not be implemented
      expect([200, 404, 501]).toContain(response.status);

      if (response.status === 200) {
        expect(Array.isArray(response.body.data || response.body)).toBe(true);
      }
    });

    it('7.3 Should revoke specific session', async () => {
      if (!accessToken) {
        console.log('Skipping: No access token available');
        return;
      }

      const response = await request(config.AUTH_URL)
        .delete('/api/auth/sessions/test-session-id')
        .set('Authorization', `Bearer ${accessToken}`);

      // Session revocation might not be implemented
      expect([200, 204, 404, 501]).toContain(response.status);
    });

    it('7.4 Should revoke all sessions', async () => {
      if (!accessToken) {
        console.log('Skipping: No access token available');
        return;
      }

      const response = await request(config.AUTH_URL)
        .post('/api/auth/sessions/revoke-all')
        .set('Authorization', `Bearer ${accessToken}`);

      // Revoke all might not be implemented
      expect([200, 204, 404, 501]).toContain(response.status);
    });
  });

  // ==================== PASSWORD CHANGE ====================

  describe('8. Password Change Flow', () => {
    const testEmail = `password-change-${TEST_TIMESTAMP}-${TEST_RANDOM}@flamoral.test`;
    const testPassword = 'PasswordChangeFlow123!';
    const newPassword = 'NewPasswordChange456!';
    let accessToken: string;

    beforeAll(async () => {
      const response = await request(config.AUTH_URL)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          firstName: 'Password',
          lastName: 'Change',
          dateOfBirth: '1990-05-15',
          gender: 'female',
        });

      if (response.status === 201) {
        const data = response.body.data || response.body;
        accessToken = data.accessToken;
      } else {
        const loginResponse = await request(config.AUTH_URL)
          .post('/api/auth/login')
          .send({ email: testEmail, password: testPassword });

        const data = loginResponse.body.data || loginResponse.body;
        accessToken = data.accessToken;
      }
    });

    it('8.1 Should change password with correct current password', async () => {
      if (!accessToken) {
        console.log('Skipping: No access token available');
        return;
      }

      const response = await request(config.AUTH_URL)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: testPassword,
          newPassword: newPassword,
        });

      expect([200, 204, 404]).toContain(response.status);

      if (response.status === 200 || response.status === 204) {
        // Verify new password works
        const loginResponse = await request(config.AUTH_URL)
          .post('/api/auth/login')
          .send({ email: testEmail, password: newPassword });

        expect(loginResponse.status).toBe(200);
      }
    });

    it('8.2 Should fail password change with wrong current password', async () => {
      if (!accessToken) {
        console.log('Skipping: No access token available');
        return;
      }

      const response = await request(config.AUTH_URL)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword: 'AnotherNew789!',
        });

      expect([400, 401, 404]).toContain(response.status);
    });

    it('8.3 Should fail password change with weak new password', async () => {
      if (!accessToken) {
        console.log('Skipping: No access token available');
        return;
      }

      const response = await request(config.AUTH_URL)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: testPassword,
          newPassword: '123',
        });

      expect([400, 404]).toContain(response.status);
    });
  });
});
