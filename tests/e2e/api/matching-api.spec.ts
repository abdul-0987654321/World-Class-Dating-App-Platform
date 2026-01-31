import request from 'supertest';

const GATEWAY_URL = process.env.API_GATEWAY_URL || 'https://api-gateway-production-1957.up.railway.app';
const API_URL = process.env.API_URL || GATEWAY_URL;
const AUTH_URL = process.env.AUTH_URL || GATEWAY_URL;

describe('Matching Service API', () => {
  let accessToken: string;
  let userId: string;
  let discoveredUserId: string;

  beforeAll(async () => {
    // Login to get access token
    const loginResponse = await request(AUTH_URL)
      .post('/api/v1/auth/login')
      .send({
        email: process.env.TEST_USER_EMAIL || 'test@example.com',
        password: process.env.TEST_USER_PASSWORD || 'TestPassword123!'
      });

    accessToken = loginResponse.body.accessToken;
    userId = loginResponse.body.user.id;
  });

  describe('GET /api/discovery', () => {
    it('should return discovery feed', async () => {
      const response = await request(API_URL)
        .get('/api/discovery')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      if (response.body.length > 0) {
        const profile = response.body[0];
        expect(profile).toHaveProperty('id');
        expect(profile).toHaveProperty('firstName');
        expect(profile).toHaveProperty('photos');
        discoveredUserId = profile.id;
      }
    });

    it('should support limit parameter', async () => {
      const response = await request(API_URL)
        .get('/api/discovery?limit=5')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBeLessThanOrEqual(5);
    });

    it('should fail without authentication', async () => {
      const response = await request(API_URL)
        .get('/api/discovery');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/discovery/preferences', () => {
    it('should return discovery preferences', async () => {
      const response = await request(API_URL)
        .get('/api/discovery/preferences')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('minAge');
      expect(response.body).toHaveProperty('maxAge');
      expect(response.body).toHaveProperty('maxDistance');
    });
  });

  describe('PUT /api/discovery/preferences', () => {
    it('should update discovery preferences', async () => {
      const newPreferences = {
        minAge: 21,
        maxAge: 35,
        maxDistance: 50,
        genderPreference: ['female']
      };

      const response = await request(API_URL)
        .put('/api/discovery/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(newPreferences);

      expect(response.status).toBe(200);
      expect(response.body.minAge).toBe(21);
      expect(response.body.maxAge).toBe(35);
    });

    it('should fail with invalid age range', async () => {
      const response = await request(API_URL)
        .put('/api/discovery/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          minAge: 40,
          maxAge: 25 // Invalid: min > max
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/swipes', () => {
    it('should record a like swipe', async () => {
      if (!discoveredUserId) {
        console.log('Skipping: No discovered users available');
        return;
      }

      const response = await request(API_URL)
        .post('/api/swipes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          targetUserId: discoveredUserId,
          direction: 'like'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('matched');
    });

    it('should record a pass swipe', async () => {
      const response = await request(API_URL)
        .post('/api/swipes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          targetUserId: 'some-other-user-id',
          direction: 'pass'
        });

      // May return 200 or 404 if user doesn't exist
      expect([200, 404]).toContain(response.status);
    });

    it('should fail with invalid direction', async () => {
      const response = await request(API_URL)
        .post('/api/swipes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          targetUserId: 'some-user-id',
          direction: 'invalid'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/swipes/stats', () => {
    it('should return swipe statistics', async () => {
      const response = await request(API_URL)
        .get('/api/swipes/stats')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalSwipes');
      expect(response.body).toHaveProperty('likes');
      expect(response.body).toHaveProperty('passes');
    });
  });

  describe('GET /api/v1/matches', () => {
    it('should return list of matches', async () => {
      const response = await request(API_URL)
        .get('/api/v1/matches')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(API_URL)
        .get('/api/v1/matches?page=1&limit=10')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(10);
    });
  });

  describe('GET /api/v1/matches/recent', () => {
    it('should return recent matches', async () => {
      const response = await request(API_URL)
        .get('/api/v1/matches/recent')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/v1/matches/count', () => {
    it('should return match count', async () => {
      const response = await request(API_URL)
        .get('/api/v1/matches/count')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('count');
      expect(typeof response.body.count).toBe('number');
    });
  });

  describe('GET /api/v1/matches/:matchId', () => {
    it('should return 404 for non-existent match', async () => {
      const response = await request(API_URL)
        .get('/api/v1/matches/nonexistent-match-id')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/matches/:matchId', () => {
    it('should return 404 for non-existent match', async () => {
      const response = await request(API_URL)
        .delete('/api/v1/matches/nonexistent-match-id')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });
  });
});
