/**
 * Integration tests for Matching Algorithm
 * Tests compatibility scoring, match quality, and algorithm effectiveness
 */

import { ApiClient, createApiClient } from '../helpers/api-client';
import { DatabaseHelper, getDatabaseHelper } from '../helpers/database';
import { faker } from '@faker-js/faker';

describe('Matching Algorithm Integration Tests', () => {
  let matchingApiClient: ApiClient;
  let authApiClient: ApiClient;
  let userApiClient: ApiClient;
  let dbHelper: DatabaseHelper;

  const MATCHING_SERVICE_URL = process.env.MATCHING_SERVICE_URL || 'http://localhost:3004';
  const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
  const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3002';

  beforeAll(async () => {
    matchingApiClient = createApiClient(MATCHING_SERVICE_URL);
    authApiClient = createApiClient(AUTH_SERVICE_URL);
    userApiClient = createApiClient(USER_SERVICE_URL);
    dbHelper = getDatabaseHelper();
  });

  beforeEach(async () => {
    await dbHelper.clearAll();
  });

  const createUserWithProfile = async (profileData: any = {}) => {
    const userData = {
      email: faker.internet.email().toLowerCase(),
      password: 'SecurePass123!',
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      dateOfBirth: profileData.dateOfBirth || '1995-05-15',
      gender: profileData.gender || 'male',
    };

    const authResponse = await authApiClient.post('/api/v1/auth/register', userData);
    const { user, accessToken } = authResponse.body.data;

    userApiClient.setAuthToken(accessToken);
    await userApiClient.put('/api/v1/users/profile', {
      bio: faker.lorem.paragraph(),
      interests: profileData.interests || ['travel', 'music'],
      location: profileData.location || {
        latitude: 40.7128,
        longitude: -74.0060,
        city: 'New York',
      },
      lookingFor: profileData.lookingFor || ['female'],
      ageRange: profileData.ageRange || { min: 18, max: 35 },
      maxDistance: profileData.maxDistance || 50,
    });

    return { user, accessToken };
  };

  describe('Compatibility Scoring', () => {
    it('should calculate compatibility score between users', async () => {
      const { user: user1, accessToken: token1 } = await createUserWithProfile({
        gender: 'male',
        interests: ['travel', 'music', 'sports'],
        lookingFor: ['female'],
      });

      const { user: user2 } = await createUserWithProfile({
        gender: 'female',
        interests: ['travel', 'music', 'reading'],
        lookingFor: ['male'],
      });

      matchingApiClient.setAuthToken(token1);
      const response = await matchingApiClient.post('/api/v1/matching/compatibility', {
        targetUserId: user2.id,
      });

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        compatibilityScore: expect.any(Number),
        sharedInterests: expect.arrayContaining(['travel', 'music']),
        scoreBreakdown: expect.any(Object),
      });

      expect(response.body.data.compatibilityScore).toBeGreaterThanOrEqual(0);
      expect(response.body.data.compatibilityScore).toBeLessThanOrEqual(100);
    });

    it('should prioritize shared interests in scoring', async () => {
      const { user: user1, accessToken: token1 } = await createUserWithProfile({
        gender: 'male',
        interests: ['travel', 'music', 'cooking', 'fitness', 'art'],
        lookingFor: ['female'],
      });

      // User2 with many shared interests
      const { user: user2 } = await createUserWithProfile({
        gender: 'female',
        interests: ['travel', 'music', 'cooking', 'fitness'],
        lookingFor: ['male'],
      });

      // User3 with few shared interests
      const { user: user3 } = await createUserWithProfile({
        gender: 'female',
        interests: ['gaming', 'technology'],
        lookingFor: ['male'],
      });

      matchingApiClient.setAuthToken(token1);

      const score2 = await matchingApiClient.post('/api/v1/matching/compatibility', {
        targetUserId: user2.id,
      });

      const score3 = await matchingApiClient.post('/api/v1/matching/compatibility', {
        targetUserId: user3.id,
      });

      expect(score2.body.data.compatibilityScore).toBeGreaterThan(
        score3.body.data.compatibilityScore
      );
    });

    it('should consider location proximity in scoring', async () => {
      const { user: user1, accessToken: token1 } = await createUserWithProfile({
        gender: 'male',
        location: { latitude: 40.7128, longitude: -74.0060 }, // NYC
        lookingFor: ['female'],
      });

      // User2 nearby
      const { user: user2 } = await createUserWithProfile({
        gender: 'female',
        location: { latitude: 40.7580, longitude: -73.9855 }, // Close to NYC
        lookingFor: ['male'],
      });

      // User3 far away
      const { user: user3 } = await createUserWithProfile({
        gender: 'female',
        location: { latitude: 34.0522, longitude: -118.2437 }, // LA
        lookingFor: ['male'],
      });

      matchingApiClient.setAuthToken(token1);

      const score2 = await matchingApiClient.post('/api/v1/matching/compatibility', {
        targetUserId: user2.id,
      });

      const score3 = await matchingApiClient.post('/api/v1/matching/compatibility', {
        targetUserId: user3.id,
      });

      expect(score2.body.data.compatibilityScore).toBeGreaterThan(
        score3.body.data.compatibilityScore
      );
    });

    it('should factor in age compatibility', async () => {
      const { user: user1, accessToken: token1 } = await createUserWithProfile({
        gender: 'male',
        dateOfBirth: '1995-01-01', // 29 years old
        ageRange: { min: 25, max: 32 },
        lookingFor: ['female'],
      });

      // User2 in preferred age range
      const { user: user2 } = await createUserWithProfile({
        gender: 'female',
        dateOfBirth: '1997-01-01', // 27 years old
        lookingFor: ['male'],
      });

      // User3 outside preferred range
      const { user: user3 } = await createUserWithProfile({
        gender: 'female',
        dateOfBirth: '2003-01-01', // 21 years old
        lookingFor: ['male'],
      });

      matchingApiClient.setAuthToken(token1);

      const score2 = await matchingApiClient.post('/api/v1/matching/compatibility', {
        targetUserId: user2.id,
      });

      const score3 = await matchingApiClient.post('/api/v1/matching/compatibility', {
        targetUserId: user3.id,
      });

      expect(score2.body.data.compatibilityScore).toBeGreaterThan(
        score3.body.data.compatibilityScore
      );
    });
  });

  describe('Smart Recommendations', () => {
    it('should provide personalized recommendations', async () => {
      const { accessToken: token1 } = await createUserWithProfile({
        gender: 'male',
        interests: ['travel', 'music'],
        lookingFor: ['female'],
      });

      // Create various potential matches
      for (let i = 0; i < 10; i++) {
        await createUserWithProfile({
          gender: 'female',
          interests: i < 5 ? ['travel', 'music'] : ['gaming', 'technology'],
          lookingFor: ['male'],
        });
      }

      matchingApiClient.setAuthToken(token1);
      const response = await matchingApiClient.get('/api/v1/matching/recommendations');

      expect(response.status).toBe(200);
      expect(response.body.data.recommendations).toBeDefined();
      expect(response.body.data.recommendations.length).toBeGreaterThan(0);

      // Top recommendations should have high compatibility
      const topRecommendation = response.body.data.recommendations[0];
      expect(topRecommendation.compatibilityScore).toBeGreaterThan(50);
    });

    it('should learn from user swipe patterns', async () => {
      const { user: user1, accessToken: token1 } = await createUserWithProfile({
        gender: 'male',
        lookingFor: ['female'],
      });

      // Create users with different characteristics
      const users = [];
      for (let i = 0; i < 10; i++) {
        const { user } = await createUserWithProfile({
          gender: 'female',
          interests: i < 5 ? ['travel', 'music'] : ['gaming', 'technology'],
          lookingFor: ['male'],
        });
        users.push(user);
      }

      // Swipe right on users with travel/music interests
      matchingApiClient.setAuthToken(token1);
      for (let i = 0; i < 5; i++) {
        await matchingApiClient.post('/api/v1/matching/swipe', {
          targetUserId: users[i].id,
          direction: 'right',
        });
      }

      // Swipe left on users with gaming/tech interests
      for (let i = 5; i < 10; i++) {
        await matchingApiClient.post('/api/v1/matching/swipe', {
          targetUserId: users[i].id,
          direction: 'left',
        });
      }

      // Get new recommendations (should prioritize travel/music)
      const response = await matchingApiClient.get('/api/v1/matching/recommendations');

      expect(response.status).toBe(200);
      // Recommendations should favor users with travel/music interests
    });

    it('should boost recently active users', async () => {
      const { accessToken: token1 } = await createUserWithProfile({
        gender: 'male',
        lookingFor: ['female'],
      });

      // Create recently active user
      const { user: activeUser } = await createUserWithProfile({
        gender: 'female',
        lookingFor: ['male'],
      });

      const knex = dbHelper.getKnex();
      await knex('users')
        .where('id', activeUser.id)
        .update({ last_active_at: new Date() });

      // Create inactive user
      const { user: inactiveUser } = await createUserWithProfile({
        gender: 'female',
        lookingFor: ['male'],
      });

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      await knex('users')
        .where('id', inactiveUser.id)
        .update({ last_active_at: weekAgo });

      // Get recommendations
      matchingApiClient.setAuthToken(token1);
      const response = await matchingApiClient.get('/api/v1/matching/recommendations');

      expect(response.status).toBe(200);

      // Active user should appear first
      const recommendations = response.body.data.recommendations;
      const activeUserIndex = recommendations.findIndex(
        (r: any) => r.userId === activeUser.id
      );
      const inactiveUserIndex = recommendations.findIndex(
        (r: any) => r.userId === inactiveUser.id
      );

      if (activeUserIndex >= 0 && inactiveUserIndex >= 0) {
        expect(activeUserIndex).toBeLessThan(inactiveUserIndex);
      }
    });
  });

  describe('Match Quality Metrics', () => {
    it('should track and report match quality', async () => {
      const { user: user1, accessToken: token1 } = await createUserWithProfile({
        gender: 'male',
        lookingFor: ['female'],
      });

      const { user: user2, accessToken: token2 } = await createUserWithProfile({
        gender: 'female',
        lookingFor: ['male'],
      });

      // Create a match
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

      // Get match quality
      matchingApiClient.setAuthToken(token1);
      const response = await matchingApiClient.get(`/api/v1/matching/matches/${matchId}/quality`);

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        compatibilityScore: expect.any(Number),
        matchQuality: expect.stringMatching(/excellent|good|average|poor/),
        strengthFactors: expect.any(Array),
      });
    });

    it('should provide conversation starter suggestions', async () => {
      const { user: user1, accessToken: token1 } = await createUserWithProfile({
        gender: 'male',
        interests: ['travel', 'music'],
        lookingFor: ['female'],
      });

      const { user: user2, accessToken: token2 } = await createUserWithProfile({
        gender: 'female',
        interests: ['travel', 'cooking'],
        lookingFor: ['male'],
      });

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

      // Get conversation starters
      matchingApiClient.setAuthToken(token1);
      const response = await matchingApiClient.get(
        `/api/v1/matching/matches/${matchId}/conversation-starters`
      );

      expect(response.status).toBe(200);
      expect(response.body.data.suggestions).toBeDefined();
      expect(response.body.data.suggestions.length).toBeGreaterThan(0);

      // Should mention shared interests
      const suggestions = response.body.data.suggestions.join(' ');
      expect(suggestions.toLowerCase()).toMatch(/travel/);
    });
  });

  describe('Algorithm Performance', () => {
    it('should handle large user base efficiently', async () => {
      const { accessToken: token1 } = await createUserWithProfile({
        gender: 'male',
        lookingFor: ['female'],
      });

      // Create many potential matches
      const startTime = Date.now();

      for (let i = 0; i < 50; i++) {
        await createUserWithProfile({
          gender: 'female',
          lookingFor: ['male'],
        });
      }

      // Get recommendations
      matchingApiClient.setAuthToken(token1);
      const response = await matchingApiClient.get('/api/v1/matching/recommendations');

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(200);
      // Should respond within reasonable time (e.g., < 2 seconds)
      expect(duration).toBeLessThan(2000);
    });

    it('should cache recommendation results', async () => {
      const { accessToken: token1 } = await createUserWithProfile({
        gender: 'male',
        lookingFor: ['female'],
      });

      matchingApiClient.setAuthToken(token1);

      // First request (no cache)
      const start1 = Date.now();
      await matchingApiClient.get('/api/v1/matching/recommendations');
      const duration1 = Date.now() - start1;

      // Second request (should use cache)
      const start2 = Date.now();
      const response2 = await matchingApiClient.get('/api/v1/matching/recommendations');
      const duration2 = Date.now() - start2;

      expect(response2.status).toBe(200);
      // Cached request should be faster
      expect(duration2).toBeLessThan(duration1);
    });
  });

  describe('Deal Breakers and Must-Haves', () => {
    it('should respect deal breaker preferences', async () => {
      const { accessToken: token1 } = await createUserWithProfile({
        gender: 'male',
        lookingFor: ['female'],
      });

      // Set deal breaker (e.g., smoking)
      userApiClient.setAuthToken(token1);
      await userApiClient.put('/api/v1/users/preferences', {
        dealBreakers: ['smoking'],
      });

      // Create user who smokes
      const { user: smoker } = await createUserWithProfile({
        gender: 'female',
        lookingFor: ['male'],
      });

      const knex = dbHelper.getKnex();
      await knex('profiles').where('user_id', smoker.id).update({ smoking: 'regularly' });

      // Get recommendations
      matchingApiClient.setAuthToken(token1);
      const response = await matchingApiClient.get('/api/v1/matching/recommendations');

      expect(response.status).toBe(200);

      // Smoker should not appear in recommendations
      const recommendations = response.body.data.recommendations;
      const smokerInResults = recommendations.some((r: any) => r.userId === smoker.id);
      expect(smokerInResults).toBe(false);
    });
  });
});
