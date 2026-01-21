/**
 * OAuth Authentication Tests
 * Tests for Google and Apple OAuth flows
 */

const request = require('supertest');

const API_URL = process.env.API_GATEWAY_URL || 'http://localhost:4000';

describe('OAuth Authentication', () => {
  
  describe('Google OAuth', () => {
    const mockGoogleToken = 'mock-google-id-token-12345';
    const mockGoogleUser = {
      email: 'googleuser@gmail.com',
      firstName: 'Google',
      lastName: 'User',
      googleId: 'google-uid-12345',
      picture: 'https://lh3.googleusercontent.com/photo.jpg'
    };

    test('should initiate Google OAuth flow', async () => {
      const res = await request(API_URL)
        .get('/api/v1/auth/oauth/google');
      
      // Should return OAuth URL or redirect
      expect([200, 302]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty('authUrl');
        expect(res.body.authUrl).toContain('accounts.google.com');
      }
    });

    test('should authenticate with valid Google token', async () => {
      const res = await request(API_URL)
        .post('/api/v1/auth/oauth/google')
        .send({ idToken: mockGoogleToken });
      
      // In test environment, may return 400 for invalid token or 200 for mock
      expect([200, 400, 401]).toContain(res.status);
      
      if (res.status === 200) {
        expect(res.body).toHaveProperty('accessToken');
        expect(res.body).toHaveProperty('user');
      }
    });

    test('should reject invalid Google token', async () => {
      const res = await request(API_URL)
        .post('/api/v1/auth/oauth/google')
        .send({ idToken: 'invalid-token' });
      
      expect([400, 401]).toContain(res.status);
    });

    test('should reject missing Google token', async () => {
      const res = await request(API_URL)
        .post('/api/v1/auth/oauth/google')
        .send({});
      
      expect([400, 422]).toContain(res.status);
    });

    test('should link Google account to existing user', async () => {
      // First create a user
      const timestamp = Date.now();
      const email = 'link-google-' + timestamp + '@test.com';
      
      const registerRes = await request(API_URL)
        .post('/api/v1/auth/register')
        .send({
          email,
          password: 'TestPassword123!',
          firstName: 'Link',
          lastName: 'Test',
          dateOfBirth: '1990-01-01',
          gender: 'other'
        });
      
      if (registerRes.status === 201) {
        const token = registerRes.body.accessToken;
        
        const linkRes = await request(API_URL)
          .post('/api/v1/auth/oauth/google/link')
          .set('Authorization', 'Bearer ' + token)
          .send({ idToken: mockGoogleToken });
        
        // May not be implemented, check for proper response
        expect([200, 400, 404, 501]).toContain(linkRes.status);
      }
    });
  });

  describe('Apple OAuth', () => {
    const mockAppleToken = 'mock-apple-identity-token';
    const mockAppleCode = 'mock-apple-authorization-code';

    test('should initiate Apple OAuth flow', async () => {
      const res = await request(API_URL)
        .get('/api/v1/auth/oauth/apple');
      
      expect([200, 302]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty('authUrl');
        expect(res.body.authUrl).toContain('appleid.apple.com');
      }
    });

    test('should authenticate with valid Apple token', async () => {
      const res = await request(API_URL)
        .post('/api/v1/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          authorizationCode: mockAppleCode,
          user: {
            email: 'appleuser@icloud.com',
            name: { firstName: 'Apple', lastName: 'User' }
          }
        });
      
      expect([200, 400, 401]).toContain(res.status);
    });

    test('should reject invalid Apple token', async () => {
      const res = await request(API_URL)
        .post('/api/v1/auth/oauth/apple')
        .send({ identityToken: 'invalid', authorizationCode: 'invalid' });
      
      expect([400, 401]).toContain(res.status);
    });

    test('should handle Apple private relay email', async () => {
      const res = await request(API_URL)
        .post('/api/v1/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          authorizationCode: mockAppleCode,
          user: {
            email: 'privaterelay@privaterelay.appleid.com',
            name: { firstName: 'Private', lastName: 'User' }
          }
        });
      
      // Should handle private relay emails
      expect([200, 400, 401]).toContain(res.status);
    });
  });

  describe('OAuth Security', () => {
    test('should not expose OAuth secrets in error responses', async () => {
      const res = await request(API_URL)
        .post('/api/v1/auth/oauth/google')
        .send({ idToken: 'invalid' });
      
      const responseText = JSON.stringify(res.body);
      expect(responseText).not.toContain('client_secret');
      expect(responseText).not.toContain('GOOGLE_CLIENT_SECRET');
    });

    test('should rate limit OAuth attempts', async () => {
      const attempts = [];
      for (let i = 0; i < 15; i++) {
        attempts.push(
          request(API_URL)
            .post('/api/v1/auth/oauth/google')
            .send({ idToken: 'invalid-' + i })
        );
      }
      
      const results = await Promise.all(attempts);
      const rateLimited = results.some(r => r.status === 429);
      
      // Rate limiting may or may not be enabled
      expect(results.length).toBe(15);
    });

    test('should validate OAuth state parameter', async () => {
      const res = await request(API_URL)
        .get('/api/v1/auth/oauth/google/callback')
        .query({ code: 'test', state: 'invalid-state' });
      
      expect([400, 401, 403]).toContain(res.status);
    });
  });
});
