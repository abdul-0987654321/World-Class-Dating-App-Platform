/**
 * Integration tests for Social Login (Google, Apple, Facebook)
 * Tests OAuth integration, social account linking, and social login flows
 */

import { ApiClient, createApiClient } from '../helpers/api-client';
import { DatabaseHelper, getDatabaseHelper } from '../helpers/database';
import { faker } from '@faker-js/faker';
import { sign } from 'jsonwebtoken';

describe('Social Login Integration Tests', () => {
  let apiClient: ApiClient;
  let dbHelper: DatabaseHelper;
  const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

  beforeAll(async () => {
    apiClient = createApiClient(AUTH_SERVICE_URL);
    dbHelper = getDatabaseHelper();
  });

  beforeEach(async () => {
    await dbHelper.clearAll();
  });

  /**
   * Helper to create a mock OAuth token for testing
   */
  const createMockOAuthToken = (provider: string, email: string, providerId: string) => {
    return sign(
      {
        email,
        provider,
        providerId,
        name: faker.person.fullName(),
        picture: faker.image.avatar(),
        email_verified: true,
      },
      'mock_oauth_secret',
      { expiresIn: '1h' }
    );
  };

  describe('Google OAuth Login', () => {
    it('should register and login new user with Google OAuth', async () => {
      const googleEmail = faker.internet.email().toLowerCase();
      const googleId = faker.string.uuid();
      const mockGoogleToken = createMockOAuthToken('google', googleEmail, googleId);

      const response = await apiClient.post('/api/v1/auth/social/google', {
        token: mockGoogleToken,
        dateOfBirth: '1995-05-15',
        gender: 'male',
      });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            email: googleEmail,
            provider: 'google',
          },
          isNewUser: true,
        },
      });
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');

      // Verify user and social account in database
      const knex = dbHelper.getKnex();
      const user = await knex('users').where('email', googleEmail).first();
      expect(user).toBeDefined();

      const socialAccount = await knex('social_accounts')
        .where({ user_id: user.id, provider: 'google' })
        .first();
      expect(socialAccount).toBeDefined();
      expect(socialAccount.provider_user_id).toBe(googleId);
    });

    it('should login existing user with Google OAuth', async () => {
      const googleEmail = faker.internet.email().toLowerCase();
      const googleId = faker.string.uuid();
      const mockGoogleToken = createMockOAuthToken('google', googleEmail, googleId);

      // First registration
      const firstResponse = await apiClient.post('/api/v1/auth/social/google', {
        token: mockGoogleToken,
        dateOfBirth: '1995-05-15',
        gender: 'male',
      });
      expect(firstResponse.status).toBe(201);
      expect(firstResponse.body.data.isNewUser).toBe(true);

      // Second login with same Google account
      const secondResponse = await apiClient.post('/api/v1/auth/social/google', {
        token: mockGoogleToken,
      });

      expect(secondResponse.status).toBe(200);
      expect(secondResponse.body).toMatchObject({
        success: true,
        data: {
          user: {
            email: googleEmail,
          },
          isNewUser: false,
        },
      });
      expect(secondResponse.body.data).toHaveProperty('accessToken');
    });

    it('should fail with invalid Google token', async () => {
      const response = await apiClient.post('/api/v1/auth/social/google', {
        token: 'invalid_token_123',
        dateOfBirth: '1995-05-15',
        gender: 'male',
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/invalid|token/i);
    });

    it('should require age verification for new Google users', async () => {
      const googleEmail = faker.internet.email().toLowerCase();
      const googleId = faker.string.uuid();
      const mockGoogleToken = createMockOAuthToken('google', googleEmail, googleId);

      const response = await apiClient.post('/api/v1/auth/social/google', {
        token: mockGoogleToken,
        // Missing dateOfBirth
        gender: 'male',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/date of birth|age/i);
    });

    it('should link Google account to existing email user', async () => {
      const email = faker.internet.email().toLowerCase();

      // First, create user with email/password
      const userData = {
        email,
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1995-05-15',
        gender: 'male',
      };
      const registerResponse = await apiClient.post('/api/v1/auth/register', userData);
      const { accessToken } = registerResponse.body.data;

      // Now link Google account
      apiClient.setAuthToken(accessToken);
      const googleId = faker.string.uuid();
      const mockGoogleToken = createMockOAuthToken('google', email, googleId);

      const linkResponse = await apiClient.post('/api/v1/auth/social/link/google', {
        token: mockGoogleToken,
      });

      expect(linkResponse.status).toBe(200);
      expect(linkResponse.body.success).toBe(true);

      // Verify social account was linked
      const knex = dbHelper.getKnex();
      const user = await knex('users').where('email', email).first();
      const socialAccount = await knex('social_accounts')
        .where({ user_id: user.id, provider: 'google' })
        .first();
      expect(socialAccount).toBeDefined();
    });
  });

  describe('Apple Sign In', () => {
    it('should register and login new user with Apple Sign In', async () => {
      const appleEmail = faker.internet.email().toLowerCase();
      const appleId = faker.string.uuid();
      const mockAppleToken = createMockOAuthToken('apple', appleEmail, appleId);

      const response = await apiClient.post('/api/v1/auth/social/apple', {
        token: mockAppleToken,
        dateOfBirth: '1995-05-15',
        gender: 'female',
      });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            email: appleEmail,
            provider: 'apple',
          },
          isNewUser: true,
        },
      });
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
    });

    it('should handle Apple private relay email', async () => {
      const privateEmail = 'abc123@privaterelay.appleid.com';
      const appleId = faker.string.uuid();
      const mockAppleToken = createMockOAuthToken('apple', privateEmail, appleId);

      const response = await apiClient.post('/api/v1/auth/social/apple', {
        token: mockAppleToken,
        dateOfBirth: '1995-05-15',
        gender: 'male',
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(privateEmail);

      // Verify user with private relay email
      const knex = dbHelper.getKnex();
      const user = await knex('users').where('email', privateEmail).first();
      expect(user).toBeDefined();
    });

    it('should login existing Apple user', async () => {
      const appleEmail = faker.internet.email().toLowerCase();
      const appleId = faker.string.uuid();
      const mockAppleToken = createMockOAuthToken('apple', appleEmail, appleId);

      // First registration
      await apiClient.post('/api/v1/auth/social/apple', {
        token: mockAppleToken,
        dateOfBirth: '1995-05-15',
        gender: 'male',
      });

      // Second login
      const response = await apiClient.post('/api/v1/auth/social/apple', {
        token: mockAppleToken,
      });

      expect(response.status).toBe(200);
      expect(response.body.data.isNewUser).toBe(false);
    });

    it('should link Apple account to existing user', async () => {
      const email = faker.internet.email().toLowerCase();

      // Register with email
      const registerResponse = await apiClient.post('/api/v1/auth/register', {
        email,
        password: 'SecurePass123!',
        firstName: 'Jane',
        lastName: 'Doe',
        dateOfBirth: '1995-05-15',
        gender: 'female',
      });
      const { accessToken } = registerResponse.body.data;

      // Link Apple account
      apiClient.setAuthToken(accessToken);
      const appleId = faker.string.uuid();
      const mockAppleToken = createMockOAuthToken('apple', email, appleId);

      const linkResponse = await apiClient.post('/api/v1/auth/social/link/apple', {
        token: mockAppleToken,
      });

      expect(linkResponse.status).toBe(200);
      expect(linkResponse.body.success).toBe(true);
    });
  });

  describe('Facebook Login', () => {
    it('should register and login new user with Facebook', async () => {
      const fbEmail = faker.internet.email().toLowerCase();
      const fbId = faker.string.alphanumeric(15);
      const mockFbToken = createMockOAuthToken('facebook', fbEmail, fbId);

      const response = await apiClient.post('/api/v1/auth/social/facebook', {
        token: mockFbToken,
        dateOfBirth: '1995-05-15',
        gender: 'male',
      });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            email: fbEmail,
            provider: 'facebook',
          },
          isNewUser: true,
        },
      });
      expect(response.body.data).toHaveProperty('accessToken');
    });

    it('should login existing Facebook user', async () => {
      const fbEmail = faker.internet.email().toLowerCase();
      const fbId = faker.string.alphanumeric(15);
      const mockFbToken = createMockOAuthToken('facebook', fbEmail, fbId);

      // First registration
      await apiClient.post('/api/v1/auth/social/facebook', {
        token: mockFbToken,
        dateOfBirth: '1995-05-15',
        gender: 'female',
      });

      // Second login
      const response = await apiClient.post('/api/v1/auth/social/facebook', {
        token: mockFbToken,
      });

      expect(response.status).toBe(200);
      expect(response.body.data.isNewUser).toBe(false);
    });

    it('should extract profile data from Facebook', async () => {
      const fbEmail = faker.internet.email().toLowerCase();
      const fbId = faker.string.alphanumeric(15);
      const name = 'John Doe';
      const picture = faker.image.avatar();

      const fbToken = sign(
        {
          email: fbEmail,
          provider: 'facebook',
          providerId: fbId,
          name,
          picture,
          email_verified: true,
        },
        'mock_oauth_secret',
        { expiresIn: '1h' }
      );

      const response = await apiClient.post('/api/v1/auth/social/facebook', {
        token: fbToken,
        dateOfBirth: '1995-05-15',
        gender: 'male',
      });

      expect(response.status).toBe(201);
      expect(response.body.data.user.firstName).toBe('John');
      expect(response.body.data.user.lastName).toBe('Doe');
    });

    it('should link Facebook account to existing user', async () => {
      const email = faker.internet.email().toLowerCase();

      // Register with email
      const registerResponse = await apiClient.post('/api/v1/auth/register', {
        email,
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User',
        dateOfBirth: '1995-05-15',
        gender: 'male',
      });
      const { accessToken } = registerResponse.body.data;

      // Link Facebook account
      apiClient.setAuthToken(accessToken);
      const fbId = faker.string.alphanumeric(15);
      const mockFbToken = createMockOAuthToken('facebook', email, fbId);

      const linkResponse = await apiClient.post('/api/v1/auth/social/link/facebook', {
        token: mockFbToken,
      });

      expect(linkResponse.status).toBe(200);
      expect(linkResponse.body.success).toBe(true);
    });
  });

  describe('Multi-Provider Account Linking', () => {
    it('should link multiple social providers to one account', async () => {
      const email = faker.internet.email().toLowerCase();

      // Register with email
      const registerResponse = await apiClient.post('/api/v1/auth/register', {
        email,
        password: 'SecurePass123!',
        firstName: 'Multi',
        lastName: 'User',
        dateOfBirth: '1995-05-15',
        gender: 'male',
      });
      const { accessToken, user } = registerResponse.body.data;
      apiClient.setAuthToken(accessToken);

      // Link Google
      const googleToken = createMockOAuthToken('google', email, faker.string.uuid());
      await apiClient.post('/api/v1/auth/social/link/google', { token: googleToken });

      // Link Apple
      const appleToken = createMockOAuthToken('apple', email, faker.string.uuid());
      await apiClient.post('/api/v1/auth/social/link/apple', { token: appleToken });

      // Link Facebook
      const fbToken = createMockOAuthToken('facebook', email, faker.string.alphanumeric(15));
      await apiClient.post('/api/v1/auth/social/link/facebook', { token: fbToken });

      // Verify all providers are linked
      const knex = dbHelper.getKnex();
      const socialAccounts = await knex('social_accounts')
        .where('user_id', user.id)
        .select('provider');

      expect(socialAccounts.length).toBe(3);
      const providers = socialAccounts.map(acc => acc.provider);
      expect(providers).toContain('google');
      expect(providers).toContain('apple');
      expect(providers).toContain('facebook');
    });

    it('should get linked social accounts', async () => {
      const email = faker.internet.email().toLowerCase();

      // Register and link Google
      const googleToken = createMockOAuthToken('google', email, faker.string.uuid());
      const registerResponse = await apiClient.post('/api/v1/auth/social/google', {
        token: googleToken,
        dateOfBirth: '1995-05-15',
        gender: 'male',
      });
      const { accessToken } = registerResponse.body.data;

      apiClient.setAuthToken(accessToken);
      const response = await apiClient.get('/api/v1/auth/social/accounts');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.socialAccounts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ provider: 'google' })
        ])
      );
    });

    it('should unlink social account', async () => {
      const email = faker.internet.email().toLowerCase();

      // Register with email and link Google
      const registerResponse = await apiClient.post('/api/v1/auth/register', {
        email,
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User',
        dateOfBirth: '1995-05-15',
        gender: 'male',
      });
      const { accessToken, user } = registerResponse.body.data;
      apiClient.setAuthToken(accessToken);

      const googleToken = createMockOAuthToken('google', email, faker.string.uuid());
      await apiClient.post('/api/v1/auth/social/link/google', { token: googleToken });

      // Unlink Google
      const unlinkResponse = await apiClient.delete('/api/v1/auth/social/unlink/google');

      expect(unlinkResponse.status).toBe(200);
      expect(unlinkResponse.body.success).toBe(true);

      // Verify Google account was unlinked
      const knex = dbHelper.getKnex();
      const socialAccount = await knex('social_accounts')
        .where({ user_id: user.id, provider: 'google' })
        .first();
      expect(socialAccount).toBeUndefined();
    });

    it('should not allow unlinking last authentication method', async () => {
      const email = faker.internet.email().toLowerCase();

      // Register only with Google (no password)
      const googleToken = createMockOAuthToken('google', email, faker.string.uuid());
      const registerResponse = await apiClient.post('/api/v1/auth/social/google', {
        token: googleToken,
        dateOfBirth: '1995-05-15',
        gender: 'male',
      });
      const { accessToken } = registerResponse.body.data;

      apiClient.setAuthToken(accessToken);

      // Try to unlink Google (should fail as it's the only auth method)
      const unlinkResponse = await apiClient.delete('/api/v1/auth/social/unlink/google');

      expect(unlinkResponse.status).toBe(400);
      expect(unlinkResponse.body.success).toBe(false);
      expect(unlinkResponse.body.error).toMatch(/last authentication method|cannot unlink/i);
    });
  });

  describe('Social Login Security', () => {
    it('should not allow social account hijacking', async () => {
      const email = faker.internet.email().toLowerCase();
      const googleId = faker.string.uuid();

      // User 1 registers with Google
      const googleToken1 = createMockOAuthToken('google', email, googleId);
      await apiClient.post('/api/v1/auth/social/google', {
        token: googleToken1,
        dateOfBirth: '1995-05-15',
        gender: 'male',
      });

      // User 2 tries to register with same Google ID (should fail)
      const googleToken2 = createMockOAuthToken('google', email, googleId);
      const response = await apiClient.post('/api/v1/auth/social/google', {
        token: googleToken2,
      });

      // Should login as existing user, not create new account
      expect(response.status).toBe(200);
      expect(response.body.data.isNewUser).toBe(false);
    });

    it('should validate OAuth token signature', async () => {
      const invalidToken = sign(
        {
          email: faker.internet.email(),
          provider: 'google',
          providerId: faker.string.uuid(),
        },
        'wrong_secret',
        { expiresIn: '1h' }
      );

      const response = await apiClient.post('/api/v1/auth/social/google', {
        token: invalidToken,
        dateOfBirth: '1995-05-15',
        gender: 'male',
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should handle email conflicts between providers', async () => {
      const email = faker.internet.email().toLowerCase();

      // Register with Google
      const googleToken = createMockOAuthToken('google', email, faker.string.uuid());
      await apiClient.post('/api/v1/auth/social/google', {
        token: googleToken,
        dateOfBirth: '1995-05-15',
        gender: 'male',
      });

      // Try to register with same email via Facebook
      const fbToken = createMockOAuthToken('facebook', email, faker.string.alphanumeric(15));
      const response = await apiClient.post('/api/v1/auth/social/facebook', {
        token: fbToken,
      });

      // Should link to existing account or prompt to login
      expect([200, 409]).toContain(response.status);
    });
  });

  describe('Social Profile Data Sync', () => {
    it('should update profile picture from social provider', async () => {
      const email = faker.internet.email().toLowerCase();
      const profilePicture = faker.image.avatar();

      const googleToken = sign(
        {
          email,
          provider: 'google',
          providerId: faker.string.uuid(),
          picture: profilePicture,
          email_verified: true,
        },
        'mock_oauth_secret',
        { expiresIn: '1h' }
      );

      const response = await apiClient.post('/api/v1/auth/social/google', {
        token: googleToken,
        dateOfBirth: '1995-05-15',
        gender: 'male',
      });

      expect(response.status).toBe(201);
      // Profile picture should be imported
      const knex = dbHelper.getKnex();
      const user = await knex('users').where('email', email).first();
      const profile = await knex('profiles').where('user_id', user.id).first();

      if (profile) {
        expect(profile.profile_picture_url).toBe(profilePicture);
      }
    });

    it('should mark email as verified for social logins', async () => {
      const email = faker.internet.email().toLowerCase();
      const googleToken = createMockOAuthToken('google', email, faker.string.uuid());

      await apiClient.post('/api/v1/auth/social/google', {
        token: googleToken,
        dateOfBirth: '1995-05-15',
        gender: 'male',
      });

      const knex = dbHelper.getKnex();
      const user = await knex('users').where('email', email).first();
      expect(user.is_email_verified).toBe(true);
    });
  });
});
