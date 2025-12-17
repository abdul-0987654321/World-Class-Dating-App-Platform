/**
 * Integration tests for Phone Verification Flow
 * Tests SMS verification, phone number validation, and verification status
 */

import { ApiClient, createApiClient } from '../helpers/api-client';
import { DatabaseHelper, getDatabaseHelper } from '../helpers/database';
import { createUserFixture } from '../helpers/fixtures';
import { faker } from '@faker-js/faker';

describe('Phone Verification Flow Integration Tests', () => {
  let apiClient: ApiClient;
  let authApiClient: ApiClient;
  let dbHelper: DatabaseHelper;
  const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3002';
  const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

  beforeAll(async () => {
    apiClient = createApiClient(USER_SERVICE_URL);
    authApiClient = createApiClient(AUTH_SERVICE_URL);
    dbHelper = getDatabaseHelper();
  });

  beforeEach(async () => {
    await dbHelper.clearAll();
  });

  /**
   * Helper to create authenticated user
   */
  const createAuthenticatedUser = async () => {
    const userData = {
      email: faker.internet.email().toLowerCase(),
      password: 'SecurePass123!',
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      dateOfBirth: '1995-05-15',
      gender: 'male',
    };

    const response = await authApiClient.post('/api/v1/auth/register', userData);
    const { user, accessToken } = response.body.data;

    return { user, accessToken };
  };

  describe('Send Verification Code', () => {
    it('should send verification code to valid phone number', async () => {
      const { user, accessToken } = await createAuthenticatedUser();
      apiClient.setAuthToken(accessToken);

      const phoneNumber = '+1234567890';
      const response = await apiClient.post('/api/v1/users/phone/send-code', {
        phoneNumber,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('verificationId');
      expect(response.body.data).toHaveProperty('expiresAt');

      // Verify code was stored in database
      const knex = dbHelper.getKnex();
      const verification = await knex('phone_verifications')
        .where({ user_id: user.id, phone_number: phoneNumber })
        .orderBy('created_at', 'desc')
        .first();

      expect(verification).toBeDefined();
      expect(verification.code).toBeDefined();
      expect(verification.is_used).toBe(false);
    });

    it('should fail with invalid phone number format', async () => {
      const { user, accessToken } = await createAuthenticatedUser();
      apiClient.setAuthToken(accessToken);

      const response = await apiClient.post('/api/v1/users/phone/send-code', {
        phoneNumber: 'invalid-phone',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/phone number|invalid format/i);
    });

    it('should fail if phone number already verified by another user', async () => {
      const phoneNumber = '+1234567890';

      // User 1 verifies phone
      const { accessToken: token1 } = await createAuthenticatedUser();
      apiClient.setAuthToken(token1);
      const sendResponse1 = await apiClient.post('/api/v1/users/phone/send-code', {
        phoneNumber,
      });
      const { verificationId } = sendResponse1.body.data;

      // Get verification code from database
      const knex = dbHelper.getKnex();
      const verification = await knex('phone_verifications')
        .where('id', verificationId)
        .first();

      // Verify phone for user 1
      await apiClient.post('/api/v1/users/phone/verify', {
        verificationId,
        code: verification.code,
      });

      // User 2 tries to use same phone number
      const { accessToken: token2 } = await createAuthenticatedUser();
      apiClient.setAuthToken(token2);
      const response = await apiClient.post('/api/v1/users/phone/send-code', {
        phoneNumber,
      });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/already in use|already verified/i);
    });

    it('should rate limit verification code requests', async () => {
      const { user, accessToken } = await createAuthenticatedUser();
      apiClient.setAuthToken(accessToken);

      const phoneNumber = '+1234567890';

      // Send multiple codes rapidly
      const attempts = Array(6).fill(null);
      const responses = [];

      for (let i = 0; i < attempts.length; i++) {
        const response = await apiClient.post('/api/v1/users/phone/send-code', {
          phoneNumber,
        });
        responses.push(response.status);
      }

      // Should eventually get rate limited
      const rateLimited = responses.some(status => status === 429);
      expect(rateLimited).toBe(true);
    });

    it('should support international phone numbers', async () => {
      const { accessToken } = await createAuthenticatedUser();
      apiClient.setAuthToken(accessToken);

      const internationalNumbers = [
        '+442071234567', // UK
        '+33123456789', // France
        '+61412345678', // Australia
        '+81312345678', // Japan
      ];

      for (const phoneNumber of internationalNumbers) {
        const response = await apiClient.post('/api/v1/users/phone/send-code', {
          phoneNumber,
        });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      }
    });
  });

  describe('Verify Phone Number', () => {
    it('should verify phone number with correct code', async () => {
      const { user, accessToken } = await createAuthenticatedUser();
      apiClient.setAuthToken(accessToken);

      const phoneNumber = '+1234567890';

      // Send code
      const sendResponse = await apiClient.post('/api/v1/users/phone/send-code', {
        phoneNumber,
      });
      const { verificationId } = sendResponse.body.data;

      // Get code from database (in real app, user receives via SMS)
      const knex = dbHelper.getKnex();
      const verification = await knex('phone_verifications')
        .where('id', verificationId)
        .first();

      // Verify with correct code
      const verifyResponse = await apiClient.post('/api/v1/users/phone/verify', {
        verificationId,
        code: verification.code,
      });

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body.success).toBe(true);
      expect(verifyResponse.body.data.verified).toBe(true);

      // Check user's phone is verified in database
      const updatedUser = await knex('users').where('id', user.id).first();
      expect(updatedUser.phone_number).toBe(phoneNumber);
      expect(updatedUser.is_phone_verified).toBe(true);

      // Check verification is marked as used
      const usedVerification = await knex('phone_verifications')
        .where('id', verificationId)
        .first();
      expect(usedVerification.is_used).toBe(true);
      expect(usedVerification.verified_at).not.toBeNull();
    });

    it('should fail with incorrect code', async () => {
      const { accessToken } = await createAuthenticatedUser();
      apiClient.setAuthToken(accessToken);

      const phoneNumber = '+1234567890';

      // Send code
      const sendResponse = await apiClient.post('/api/v1/users/phone/send-code', {
        phoneNumber,
      });
      const { verificationId } = sendResponse.body.data;

      // Try wrong code
      const verifyResponse = await apiClient.post('/api/v1/users/phone/verify', {
        verificationId,
        code: '000000',
      });

      expect(verifyResponse.status).toBe(400);
      expect(verifyResponse.body.success).toBe(false);
      expect(verifyResponse.body.error).toMatch(/invalid|incorrect|code/i);
    });

    it('should fail with expired verification code', async () => {
      const { user, accessToken } = await createAuthenticatedUser();
      apiClient.setAuthToken(accessToken);

      const phoneNumber = '+1234567890';

      // Send code
      const sendResponse = await apiClient.post('/api/v1/users/phone/send-code', {
        phoneNumber,
      });
      const { verificationId } = sendResponse.body.data;

      // Manually expire the code in database
      const knex = dbHelper.getKnex();
      const verification = await knex('phone_verifications')
        .where('id', verificationId)
        .first();

      await knex('phone_verifications')
        .where('id', verificationId)
        .update({ expires_at: new Date(Date.now() - 1000) }); // Expired 1 second ago

      // Try to verify with expired code
      const verifyResponse = await apiClient.post('/api/v1/users/phone/verify', {
        verificationId,
        code: verification.code,
      });

      expect(verifyResponse.status).toBe(400);
      expect(verifyResponse.body.success).toBe(false);
      expect(verifyResponse.body.error).toMatch(/expired/i);
    });

    it('should fail when verification code already used', async () => {
      const { accessToken } = await createAuthenticatedUser();
      apiClient.setAuthToken(accessToken);

      const phoneNumber = '+1234567890';

      // Send and verify code
      const sendResponse = await apiClient.post('/api/v1/users/phone/send-code', {
        phoneNumber,
      });
      const { verificationId } = sendResponse.body.data;

      const knex = dbHelper.getKnex();
      const verification = await knex('phone_verifications')
        .where('id', verificationId)
        .first();

      // First verification (success)
      await apiClient.post('/api/v1/users/phone/verify', {
        verificationId,
        code: verification.code,
      });

      // Try to use same code again
      const secondVerifyResponse = await apiClient.post('/api/v1/users/phone/verify', {
        verificationId,
        code: verification.code,
      });

      expect(secondVerifyResponse.status).toBe(400);
      expect(secondVerifyResponse.body.success).toBe(false);
      expect(secondVerifyResponse.body.error).toMatch(/already used|invalid/i);
    });

    it('should lock account after too many failed attempts', async () => {
      const { accessToken } = await createAuthenticatedUser();
      apiClient.setAuthToken(accessToken);

      const phoneNumber = '+1234567890';

      // Send code
      const sendResponse = await apiClient.post('/api/v1/users/phone/send-code', {
        phoneNumber,
      });
      const { verificationId } = sendResponse.body.data;

      // Make multiple failed attempts
      const maxAttempts = 5;
      for (let i = 0; i < maxAttempts; i++) {
        await apiClient.post('/api/v1/users/phone/verify', {
          verificationId,
          code: '000000',
        });
      }

      // Next attempt should be locked
      const response = await apiClient.post('/api/v1/users/phone/verify', {
        verificationId,
        code: '000000',
      });

      expect(response.status).toBe(429);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/too many attempts|locked/i);
    });
  });

  describe('Resend Verification Code', () => {
    it('should resend verification code to same number', async () => {
      const { accessToken } = await createAuthenticatedUser();
      apiClient.setAuthToken(accessToken);

      const phoneNumber = '+1234567890';

      // Send initial code
      const firstResponse = await apiClient.post('/api/v1/users/phone/send-code', {
        phoneNumber,
      });
      const firstVerificationId = firstResponse.body.data.verificationId;

      // Wait a bit (or mock time)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Resend code
      const resendResponse = await apiClient.post('/api/v1/users/phone/resend-code', {
        phoneNumber,
      });

      expect(resendResponse.status).toBe(200);
      expect(resendResponse.body.success).toBe(true);
      expect(resendResponse.body.data.verificationId).not.toBe(firstVerificationId);

      // Verify old code is invalidated
      const knex = dbHelper.getKnex();
      const oldVerification = await knex('phone_verifications')
        .where('id', firstVerificationId)
        .first();
      expect(oldVerification.is_used).toBe(true);
    });

    it('should enforce cooldown between resend attempts', async () => {
      const { accessToken } = await createAuthenticatedUser();
      apiClient.setAuthToken(accessToken);

      const phoneNumber = '+1234567890';

      // Send initial code
      await apiClient.post('/api/v1/users/phone/send-code', {
        phoneNumber,
      });

      // Try to resend immediately (should fail)
      const resendResponse = await apiClient.post('/api/v1/users/phone/resend-code', {
        phoneNumber,
      });

      expect(resendResponse.status).toBe(429);
      expect(resendResponse.body.success).toBe(false);
      expect(resendResponse.body.error).toMatch(/wait|cooldown|too soon/i);
    });
  });

  describe('Phone Verification Status', () => {
    it('should get phone verification status', async () => {
      const { accessToken } = await createAuthenticatedUser();
      apiClient.setAuthToken(accessToken);

      const response = await apiClient.get('/api/v1/users/phone/status');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        isPhoneVerified: false,
        phoneNumber: null,
      });
    });

    it('should show verified status after successful verification', async () => {
      const { accessToken } = await createAuthenticatedUser();
      apiClient.setAuthToken(accessToken);

      const phoneNumber = '+1234567890';

      // Verify phone
      const sendResponse = await apiClient.post('/api/v1/users/phone/send-code', {
        phoneNumber,
      });
      const { verificationId } = sendResponse.body.data;

      const knex = dbHelper.getKnex();
      const verification = await knex('phone_verifications')
        .where('id', verificationId)
        .first();

      await apiClient.post('/api/v1/users/phone/verify', {
        verificationId,
        code: verification.code,
      });

      // Check status
      const statusResponse = await apiClient.get('/api/v1/users/phone/status');

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.data).toMatchObject({
        isPhoneVerified: true,
        phoneNumber: phoneNumber,
      });
    });
  });

  describe('Update Phone Number', () => {
    it('should allow changing phone number after verification', async () => {
      const { user, accessToken } = await createAuthenticatedUser();
      apiClient.setAuthToken(accessToken);

      const firstPhone = '+1234567890';
      const secondPhone = '+0987654321';

      // Verify first phone
      const send1 = await apiClient.post('/api/v1/users/phone/send-code', {
        phoneNumber: firstPhone,
      });
      const knex = dbHelper.getKnex();
      const ver1 = await knex('phone_verifications')
        .where('id', send1.body.data.verificationId)
        .first();
      await apiClient.post('/api/v1/users/phone/verify', {
        verificationId: send1.body.data.verificationId,
        code: ver1.code,
      });

      // Change to second phone
      const send2 = await apiClient.post('/api/v1/users/phone/send-code', {
        phoneNumber: secondPhone,
      });
      const ver2 = await knex('phone_verifications')
        .where('id', send2.body.data.verificationId)
        .first();
      const verify2 = await apiClient.post('/api/v1/users/phone/verify', {
        verificationId: send2.body.data.verificationId,
        code: ver2.code,
      });

      expect(verify2.status).toBe(200);

      // Check updated phone number
      const updatedUser = await knex('users').where('id', user.id).first();
      expect(updatedUser.phone_number).toBe(secondPhone);
    });

    it('should require re-verification when changing phone number', async () => {
      const { user, accessToken } = await createAuthenticatedUser();
      apiClient.setAuthToken(accessToken);

      const firstPhone = '+1234567890';

      // Verify first phone
      const send1 = await apiClient.post('/api/v1/users/phone/send-code', {
        phoneNumber: firstPhone,
      });
      const knex = dbHelper.getKnex();
      const ver1 = await knex('phone_verifications')
        .where('id', send1.body.data.verificationId)
        .first();
      await apiClient.post('/api/v1/users/phone/verify', {
        verificationId: send1.body.data.verificationId,
        code: ver1.code,
      });

      // Start process to change phone (sends code to new number)
      const secondPhone = '+0987654321';
      const send2 = await apiClient.post('/api/v1/users/phone/send-code', {
        phoneNumber: secondPhone,
      });

      expect(send2.status).toBe(200);

      // Phone should not be updated until verification
      const userBeforeVerify = await knex('users').where('id', user.id).first();
      expect(userBeforeVerify.phone_number).toBe(firstPhone);
    });
  });

  describe('Remove Phone Number', () => {
    it('should allow removing verified phone number', async () => {
      const { user, accessToken } = await createAuthenticatedUser();
      apiClient.setAuthToken(accessToken);

      const phoneNumber = '+1234567890';

      // Verify phone
      const sendResponse = await apiClient.post('/api/v1/users/phone/send-code', {
        phoneNumber,
      });
      const knex = dbHelper.getKnex();
      const verification = await knex('phone_verifications')
        .where('id', sendResponse.body.data.verificationId)
        .first();
      await apiClient.post('/api/v1/users/phone/verify', {
        verificationId: sendResponse.body.data.verificationId,
        code: verification.code,
      });

      // Remove phone
      const removeResponse = await apiClient.delete('/api/v1/users/phone');

      expect(removeResponse.status).toBe(200);
      expect(removeResponse.body.success).toBe(true);

      // Verify phone was removed
      const updatedUser = await knex('users').where('id', user.id).first();
      expect(updatedUser.phone_number).toBeNull();
      expect(updatedUser.is_phone_verified).toBe(false);
    });
  });

  describe('Phone Verification Premium Features', () => {
    it('should unlock features after phone verification', async () => {
      const { accessToken } = await createAuthenticatedUser();
      apiClient.setAuthToken(accessToken);

      const phoneNumber = '+1234567890';

      // Verify phone
      const sendResponse = await apiClient.post('/api/v1/users/phone/send-code', {
        phoneNumber,
      });
      const knex = dbHelper.getKnex();
      const verification = await knex('phone_verifications')
        .where('id', sendResponse.body.data.verificationId)
        .first();
      await apiClient.post('/api/v1/users/phone/verify', {
        verificationId: sendResponse.body.data.verificationId,
        code: verification.code,
      });

      // Check that verified badge is awarded
      const statusResponse = await apiClient.get('/api/v1/users/phone/status');
      expect(statusResponse.body.data.hasVerifiedBadge).toBe(true);
    });

    it('should increase trust score after phone verification', async () => {
      const { user, accessToken } = await createAuthenticatedUser();
      apiClient.setAuthToken(accessToken);

      const knex = dbHelper.getKnex();
      const userBefore = await knex('users').where('id', user.id).first();
      const trustScoreBefore = userBefore.trust_score || 0;

      const phoneNumber = '+1234567890';

      // Verify phone
      const sendResponse = await apiClient.post('/api/v1/users/phone/send-code', {
        phoneNumber,
      });
      const verification = await knex('phone_verifications')
        .where('id', sendResponse.body.data.verificationId)
        .first();
      await apiClient.post('/api/v1/users/phone/verify', {
        verificationId: sendResponse.body.data.verificationId,
        code: verification.code,
      });

      // Check trust score increased
      const userAfter = await knex('users').where('id', user.id).first();
      const trustScoreAfter = userAfter.trust_score || 0;
      expect(trustScoreAfter).toBeGreaterThan(trustScoreBefore);
    });
  });
});
