/// <reference types="jest" />
import request from 'supertest';
import { Application } from 'express';

/**
 * Integration tests for OAuth providers (Google, Apple, Facebook)
 * Tests social login functionality and provider token validation
 */

// Skip these tests until proper test app setup is implemented
// TODO: Set up test Express app with OAuth routes
describe.skip('OAuth Integration Tests', () => {
  let app: Application;

  beforeAll(async () => {
    // Setup test app with OAuth routes
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Google OAuth', () => {
    it('should authenticate with valid Google ID token', async () => {
      const mockGoogleToken = 'mock-google-id-token';
      const mockGoogleUser = {
        sub: 'google-user-123',
        email: 'googleuser@gmail.com',
        email_verified: true,
        name: 'John Doe',
        given_name: 'John',
        family_name: 'Doe',
        picture: 'https://lh3.googleusercontent.com/a/xxx',
      };

      // Mock Google token verification
      // In real implementation, this would call Google's token verification endpoint

      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user.email).toBe(mockGoogleUser.email);
      expect(response.body.data.user.is_email_verified).toBe(true);
    });

    it('should link Google account to existing user if email matches', async () => {
      // First, register a user with email
      const email = 'existing@gmail.com';
      await request(app)
        .post('/api/auth/register')
        .send({
          email,
          password: 'TestPassword123!',
          first_name: 'John',
          last_name: 'Doe',
          date_of_birth: '1995-01-15',
          gender: 'male',
        })
        .expect(201);

      // Then authenticate with Google using same email
      const mockGoogleToken = 'mock-google-token-for-existing-user';

      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(email);
      // Should mark email as verified since Google verified it
      expect(response.body.data.user.is_email_verified).toBe(true);
    });

    it('should reject invalid Google ID token', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid');
    });

    it('should reject missing ID token', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });

    it('should handle Google One Tap signin', async () => {
      const mockGoogleCredential = 'mock-google-credential';

      const response = await request(app)
        .post('/api/auth/oauth/google/one-tap')
        .send({ credential: mockGoogleCredential })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
    });
  });

  describe('Apple Sign In', () => {
    it('should authenticate with valid Apple identity token', async () => {
      const mockAppleToken = 'mock-apple-identity-token';
      const mockAppleUser = {
        sub: 'apple-user-123',
        email: 'appleuser@privaterelay.appleid.com',
        email_verified: true,
      };

      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          user: {
            name: {
              firstName: 'John',
              lastName: 'Doe',
            },
          },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.is_email_verified).toBe(true);
    });

    it('should handle Apple private relay emails', async () => {
      const mockAppleToken = 'mock-apple-token';
      const privateRelayEmail = 'abc123@privaterelay.appleid.com';

      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should store private relay email
      expect(response.body.data.user.email).toContain('@privaterelay.appleid.com');
    });

    it('should handle Apple Sign In without user name (returning user)', async () => {
      // First time: with name
      await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: 'mock-token-1',
          user: {
            name: {
              firstName: 'John',
              lastName: 'Doe',
            },
          },
        })
        .expect(200);

      // Second time: without name (Apple doesn't send it again)
      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: 'mock-token-2',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should use existing name from database
      expect(response.body.data.user.first_name).toBe('John');
    });

    it('should reject invalid Apple identity token', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: 'invalid-token',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Facebook Login', () => {
    it('should authenticate with valid Facebook access token', async () => {
      const mockFacebookToken = 'mock-facebook-access-token';
      const mockFacebookUser = {
        id: 'facebook-user-123',
        email: 'fbuser@example.com',
        first_name: 'John',
        last_name: 'Doe',
        picture: {
          data: {
            url: 'https://graph.facebook.com/123/picture',
          },
        },
      };

      const response = await request(app)
        .post('/api/auth/oauth/facebook')
        .send({ accessToken: mockFacebookToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(mockFacebookUser.email);
    });

    it('should fetch Facebook profile picture', async () => {
      const mockFacebookToken = 'mock-facebook-token';

      const response = await request(app)
        .post('/api/auth/oauth/facebook')
        .send({ accessToken: mockFacebookToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should have profile picture URL
      expect(response.body.data.user).toHaveProperty('profile_picture_url');
    });

    it('should handle Facebook account without email', async () => {
      // Some Facebook accounts don't have email permission granted
      const mockFacebookToken = 'mock-token-no-email';

      const response = await request(app)
        .post('/api/auth/oauth/facebook')
        .send({ accessToken: mockFacebookToken })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('email');
    });

    it('should reject invalid Facebook access token', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/facebook')
        .send({ accessToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('OAuth Account Linking', () => {
    it('should link multiple OAuth providers to same account', async () => {
      const email = 'multi-oauth@example.com';

      // Login with Google
      const googleResponse = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: 'mock-google-token' })
        .expect(200);

      const accessToken = googleResponse.body.data.accessToken;
      const userId = googleResponse.body.data.user.id;

      // Link Facebook to existing account
      const facebookResponse = await request(app)
        .post('/api/auth/oauth/link/facebook')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ accessToken: 'mock-facebook-token' })
        .expect(200);

      expect(facebookResponse.body.success).toBe(true);

      // Get user profile and verify both providers are linked
      const profileResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(profileResponse.body.data.oauth_providers).toContain('google');
      expect(profileResponse.body.data.oauth_providers).toContain('facebook');
    });

    it('should prevent linking OAuth account already linked to another user', async () => {
      // User 1 links Google
      const user1Response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: 'mock-google-token-user1' })
        .expect(200);

      // User 2 tries to link same Google account
      const user2Response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user2@example.com',
          password: 'Password123!',
          first_name: 'User',
          last_name: 'Two',
          date_of_birth: '1995-01-15',
          gender: 'male',
        })
        .expect(201);

      const user2Token = user2Response.body.data.accessToken;

      const linkResponse = await request(app)
        .post('/api/auth/oauth/link/google')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ idToken: 'mock-google-token-user1' })
        .expect(400);

      expect(linkResponse.body.success).toBe(false);
      expect(linkResponse.body.error).toContain('already linked');
    });

    it('should allow unlinking OAuth provider if password exists', async () => {
      // Create user with password and OAuth
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'unlink-test@example.com',
          password: 'Password123!',
          first_name: 'Test',
          last_name: 'User',
          date_of_birth: '1995-01-15',
          gender: 'male',
        })
        .expect(201);

      const accessToken = registerResponse.body.data.accessToken;

      // Link Google
      await request(app)
        .post('/api/auth/oauth/link/google')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ idToken: 'mock-google-token' })
        .expect(200);

      // Unlink Google
      const unlinkResponse = await request(app)
        .delete('/api/auth/oauth/unlink/google')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(unlinkResponse.body.success).toBe(true);
    });

    it('should prevent unlinking last authentication method', async () => {
      // Create user with only Google OAuth (no password)
      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: 'mock-google-token' })
        .expect(200);

      const accessToken = response.body.data.accessToken;

      // Try to unlink Google (should fail as it's the only auth method)
      const unlinkResponse = await request(app)
        .delete('/api/auth/oauth/unlink/google')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);

      expect(unlinkResponse.body.success).toBe(false);
      expect(unlinkResponse.body.error).toContain('last authentication method');
    });
  });

  describe('OAuth Token Refresh', () => {
    it('should refresh tokens for OAuth users', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: 'mock-google-token' })
        .expect(200);

      const refreshToken = loginResponse.body.data.refreshToken;

      const refreshResponse = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken })
        .expect(200);

      expect(refreshResponse.body.success).toBe(true);
      expect(refreshResponse.body.data).toHaveProperty('accessToken');
      expect(refreshResponse.body.data).toHaveProperty('refreshToken');
    });
  });

  describe('OAuth Security', () => {
    it('should validate OAuth token signature', async () => {
      const invalidSignatureToken = 'tampered.jwt.token';

      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: invalidSignatureToken })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid');
    });

    it('should validate OAuth token expiration', async () => {
      const expiredToken = 'expired.jwt.token';

      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: expiredToken })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('expired');
    });

    it('should validate OAuth token audience', async () => {
      // Token issued for different client ID
      const wrongAudienceToken = 'wrong.audience.token';

      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: wrongAudienceToken })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should rate limit OAuth authentication attempts', async () => {
      const promises = Array.from({ length: 20 }, () =>
        request(app)
          .post('/api/auth/oauth/google')
          .send({ idToken: 'invalid-token' })
      );

      const responses = await Promise.all(promises);

      const rateLimited = responses.some((res) => res.status === 429);
      expect(rateLimited).toBe(true);
    });
  });

  describe('OAuth Edge Cases', () => {
    it('should handle email change in OAuth provider', async () => {
      // First login with email A
      await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: 'mock-token-email-a' })
        .expect(200);

      // User changes email in Google, login again with email B but same sub
      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: 'mock-token-email-b-same-sub' })
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should update email in database
    });

    it('should handle concurrent OAuth login attempts', async () => {
      const promises = Array.from({ length: 5 }, () =>
        request(app)
          .post('/api/auth/oauth/google')
          .send({ idToken: 'mock-google-token' })
      );

      const responses = await Promise.all(promises);

      // All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });

    it('should handle OAuth login for deactivated account', async () => {
      // Create and deactivate account
      const registerResponse = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: 'mock-google-token' })
        .expect(200);

      const userId = registerResponse.body.data.user.id;

      // Deactivate account (admin action)
      // await deactivateUser(userId);

      // Try to login again with OAuth
      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: 'mock-google-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('deactivated');
    });
  });
});
