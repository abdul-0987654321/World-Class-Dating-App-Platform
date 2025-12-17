/**
 * Integration tests for Discovery and Swiping Flow
 * Tests profile discovery, swiping mechanics, filters, and preferences
 */

import { ApiClient, createApiClient } from '../helpers/api-client';
import { DatabaseHelper, getDatabaseHelper } from '../helpers/database';
import { createUserFixture, createProfileFixture } from '../helpers/fixtures';
import { faker } from '@faker-js/faker';

describe('Discovery and Swiping Flow Integration Tests', () => {
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

  /**
   * Helper to create authenticated user with profile
   */
  const createUserWithProfile = async (overrides: any = {}) => {
    const userData = {
      email: faker.internet.email().toLowerCase(),
      password: 'SecurePass123!',
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      dateOfBirth: '1995-05-15',
      gender: overrides.gender || 'male',
      ...overrides,
    };

    const authResponse = await authApiClient.post('/api/v1/auth/register', userData);
    const { user, accessToken } = authResponse.body.data;

    // Create profile
    userApiClient.setAuthToken(accessToken);
    const profileData = {
      bio: faker.lorem.paragraph(),
      interests: ['travel', 'music', 'sports'],
      location: {
        latitude: parseFloat(faker.location.latitude()),
        longitude: parseFloat(faker.location.longitude()),
        city: faker.location.city(),
      },
      lookingFor: overrides.lookingFor || ['female'],
      ageRange: { min: 18, max: 35 },
      maxDistance: 50,
    };

    await userApiClient.put('/api/v1/users/profile', profileData);

    return { user, accessToken, profile: profileData };
  };

  describe('Get Discovery Feed', () => {
    it('should get discovery feed with potential matches', async () => {
      // Create main user (male looking for females)
      const { accessToken: mainToken } = await createUserWithProfile({
        gender: 'male',
        lookingFor: ['female'],
      });

      // Create potential matches (females)
      await createUserWithProfile({ gender: 'female', lookingFor: ['male'] });
      await createUserWithProfile({ gender: 'female', lookingFor: ['male'] });
      await createUserWithProfile({ gender: 'female', lookingFor: ['male'] });

      // Get discovery feed
      matchingApiClient.setAuthToken(mainToken);
      const response = await matchingApiClient.get('/api/v1/matching/discovery');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.profiles).toBeDefined();
      expect(response.body.data.profiles.length).toBeGreaterThan(0);
      expect(response.body.data.profiles[0]).toMatchObject({
        userId: expect.any(String),
        firstName: expect.any(String),
        age: expect.any(Number),
        distance: expect.any(Number),
        photos: expect.any(Array),
      });
    });

    it('should respect gender preferences in discovery', async () => {
      // Create main user (male looking for females only)
      const { accessToken: mainToken } = await createUserWithProfile({
        gender: 'male',
        lookingFor: ['female'],
      });

      // Create females
      await createUserWithProfile({ gender: 'female', lookingFor: ['male'] });
      await createUserWithProfile({ gender: 'female', lookingFor: ['male'] });

      // Create males (should not appear)
      await createUserWithProfile({ gender: 'male', lookingFor: ['male'] });

      // Get discovery feed
      matchingApiClient.setAuthToken(mainToken);
      const response = await matchingApiClient.get('/api/v1/matching/discovery');

      expect(response.status).toBe(200);

      // All profiles should be female
      const profiles = response.body.data.profiles;
      profiles.forEach((profile: any) => {
        expect(profile.gender).toBe('female');
      });
    });

    it('should respect age range preferences', async () => {
      // Create main user (25 years old, looking for 23-30)
      const { accessToken: mainToken } = await createUserWithProfile({
        gender: 'male',
        dateOfBirth: '1999-01-01', // 25 years old
        lookingFor: ['female'],
        ageRange: { min: 23, max: 30 },
      });

      // Create users in age range
      await createUserWithProfile({
        gender: 'female',
        dateOfBirth: '2001-01-01', // 23 years old
        lookingFor: ['male'],
      });

      // Create user outside age range
      await createUserWithProfile({
        gender: 'female',
        dateOfBirth: '1990-01-01', // 34 years old
        lookingFor: ['male'],
      });

      // Get discovery feed
      matchingApiClient.setAuthToken(mainToken);
      const response = await matchingApiClient.get('/api/v1/matching/discovery');

      expect(response.status).toBe(200);

      // Check ages are within range
      const profiles = response.body.data.profiles;
      profiles.forEach((profile: any) => {
        expect(profile.age).toBeGreaterThanOrEqual(23);
        expect(profile.age).toBeLessThanOrEqual(30);
      });
    });

    it('should respect distance preferences', async () => {
      // Create main user at specific location with max distance 10km
      const { accessToken: mainToken } = await createUserWithProfile({
        gender: 'male',
        lookingFor: ['female'],
        maxDistance: 10,
        location: { latitude: 40.7128, longitude: -74.0060 }, // NYC
      });

      // Create nearby user
      await createUserWithProfile({
        gender: 'female',
        lookingFor: ['male'],
        location: { latitude: 40.7580, longitude: -73.9855 }, // Close to NYC
      });

      // Create far user
      await createUserWithProfile({
        gender: 'female',
        lookingFor: ['male'],
        location: { latitude: 34.0522, longitude: -118.2437 }, // LA
      });

      // Get discovery feed
      matchingApiClient.setAuthToken(mainToken);
      const response = await matchingApiClient.get('/api/v1/matching/discovery');

      expect(response.status).toBe(200);

      // All profiles should be within distance
      const profiles = response.body.data.profiles;
      profiles.forEach((profile: any) => {
        expect(profile.distance).toBeLessThanOrEqual(10);
      });
    });

    it('should exclude already swiped profiles', async () => {
      // Create main user
      const { user: mainUser, accessToken: mainToken } = await createUserWithProfile({
        gender: 'male',
        lookingFor: ['female'],
      });

      // Create potential matches
      const { user: user1 } = await createUserWithProfile({
        gender: 'female',
        lookingFor: ['male'],
      });
      await createUserWithProfile({ gender: 'female', lookingFor: ['male'] });

      // Swipe on user1
      matchingApiClient.setAuthToken(mainToken);
      await matchingApiClient.post('/api/v1/matching/swipe', {
        targetUserId: user1.id,
        direction: 'right',
      });

      // Get discovery feed
      const response = await matchingApiClient.get('/api/v1/matching/discovery');

      expect(response.status).toBe(200);

      // user1 should not appear in feed
      const profiles = response.body.data.profiles;
      const userIds = profiles.map((p: any) => p.userId);
      expect(userIds).not.toContain(user1.id);
    });

    it('should paginate discovery results', async () => {
      // Create main user
      const { accessToken: mainToken } = await createUserWithProfile({
        gender: 'male',
        lookingFor: ['female'],
      });

      // Create many potential matches
      for (let i = 0; i < 20; i++) {
        await createUserWithProfile({ gender: 'female', lookingFor: ['male'] });
      }

      // Get first page
      matchingApiClient.setAuthToken(mainToken);
      const page1 = await matchingApiClient.get('/api/v1/matching/discovery', {
        query: { limit: 10 },
      });

      expect(page1.status).toBe(200);
      expect(page1.body.data.profiles.length).toBeLessThanOrEqual(10);
      expect(page1.body.data).toHaveProperty('hasMore');

      // Get second page
      const page2 = await matchingApiClient.get('/api/v1/matching/discovery', {
        query: { limit: 10, offset: 10 },
      });

      expect(page2.status).toBe(200);

      // Pages should have different profiles
      const page1Ids = page1.body.data.profiles.map((p: any) => p.userId);
      const page2Ids = page2.body.data.profiles.map((p: any) => p.userId);
      const intersection = page1Ids.filter((id: string) => page2Ids.includes(id));
      expect(intersection.length).toBe(0);
    });
  });

  describe('Swipe Actions', () => {
    it('should swipe right on profile', async () => {
      // Create two users
      const { user: user1, accessToken: token1 } = await createUserWithProfile({
        gender: 'male',
        lookingFor: ['female'],
      });
      const { user: user2 } = await createUserWithProfile({
        gender: 'female',
        lookingFor: ['male'],
      });

      // User1 swipes right on User2
      matchingApiClient.setAuthToken(token1);
      const response = await matchingApiClient.post('/api/v1/matching/swipe', {
        targetUserId: user2.id,
        direction: 'right',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        swiped: true,
        direction: 'right',
        matched: false, // No match yet until user2 swipes back
      });

      // Verify swipe in database
      const knex = dbHelper.getKnex();
      const swipe = await knex('swipes')
        .where({ swiper_id: user1.id, swiped_id: user2.id })
        .first();

      expect(swipe).toBeDefined();
      expect(swipe.direction).toBe('right');
    });

    it('should swipe left (pass) on profile', async () => {
      const { user: user1, accessToken: token1 } = await createUserWithProfile({
        gender: 'male',
        lookingFor: ['female'],
      });
      const { user: user2 } = await createUserWithProfile({
        gender: 'female',
        lookingFor: ['male'],
      });

      // User1 swipes left on User2
      matchingApiClient.setAuthToken(token1);
      const response = await matchingApiClient.post('/api/v1/matching/swipe', {
        targetUserId: user2.id,
        direction: 'left',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.matched).toBe(false);

      // Verify swipe in database
      const knex = dbHelper.getKnex();
      const swipe = await knex('swipes')
        .where({ swiper_id: user1.id, swiped_id: user2.id })
        .first();

      expect(swipe).toBeDefined();
      expect(swipe.direction).toBe('left');
    });

    it('should create match when both users swipe right', async () => {
      // Create two users
      const { user: user1, accessToken: token1 } = await createUserWithProfile({
        gender: 'male',
        lookingFor: ['female'],
      });
      const { user: user2, accessToken: token2 } = await createUserWithProfile({
        gender: 'female',
        lookingFor: ['male'],
      });

      // User1 swipes right on User2
      matchingApiClient.setAuthToken(token1);
      const swipe1 = await matchingApiClient.post('/api/v1/matching/swipe', {
        targetUserId: user2.id,
        direction: 'right',
      });

      expect(swipe1.body.data.matched).toBe(false);

      // User2 swipes right on User1 (creates match)
      matchingApiClient.setAuthToken(token2);
      const swipe2 = await matchingApiClient.post('/api/v1/matching/swipe', {
        targetUserId: user1.id,
        direction: 'right',
      });

      expect(swipe2.status).toBe(200);
      expect(swipe2.body.data.matched).toBe(true);
      expect(swipe2.body.data).toHaveProperty('matchId');

      // Verify match in database
      const knex = dbHelper.getKnex();
      const match = await knex('matches')
        .where(function() {
          this.where({ user1_id: user1.id, user2_id: user2.id })
            .orWhere({ user1_id: user2.id, user2_id: user1.id });
        })
        .first();

      expect(match).toBeDefined();
      expect(match.is_active).toBe(true);
    });

    it('should handle super like', async () => {
      const { user: user1, accessToken: token1 } = await createUserWithProfile({
        gender: 'male',
        lookingFor: ['female'],
      });
      const { user: user2 } = await createUserWithProfile({
        gender: 'female',
        lookingFor: ['male'],
      });

      // User1 super likes User2
      matchingApiClient.setAuthToken(token1);
      const response = await matchingApiClient.post('/api/v1/matching/swipe', {
        targetUserId: user2.id,
        direction: 'super',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify super like in database
      const knex = dbHelper.getKnex();
      const swipe = await knex('swipes')
        .where({ swiper_id: user1.id, swiped_id: user2.id })
        .first();

      expect(swipe.direction).toBe('super');
      expect(swipe.is_super_like).toBe(true);
    });

    it('should enforce daily swipe limit for free users', async () => {
      const { user: user1, accessToken: token1 } = await createUserWithProfile({
        gender: 'male',
        lookingFor: ['female'],
      });

      // Create many potential matches
      const users = [];
      for (let i = 0; i < 150; i++) {
        const { user } = await createUserWithProfile({
          gender: 'female',
          lookingFor: ['male'],
        });
        users.push(user);
      }

      // Make swipes up to limit (typically 100 for free users)
      matchingApiClient.setAuthToken(token1);
      let lastResponse;

      for (let i = 0; i < 105; i++) {
        lastResponse = await matchingApiClient.post('/api/v1/matching/swipe', {
          targetUserId: users[i].id,
          direction: 'right',
        });

        if (lastResponse.status === 429) break;
      }

      // Should eventually hit rate limit
      expect(lastResponse?.status).toBe(429);
      expect(lastResponse?.body.error).toMatch(/limit|quota/i);
    });

    it('should not allow swiping on same user twice', async () => {
      const { user: user1, accessToken: token1 } = await createUserWithProfile({
        gender: 'male',
        lookingFor: ['female'],
      });
      const { user: user2 } = await createUserWithProfile({
        gender: 'female',
        lookingFor: ['male'],
      });

      // First swipe
      matchingApiClient.setAuthToken(token1);
      await matchingApiClient.post('/api/v1/matching/swipe', {
        targetUserId: user2.id,
        direction: 'right',
      });

      // Try to swipe again
      const response = await matchingApiClient.post('/api/v1/matching/swipe', {
        targetUserId: user2.id,
        direction: 'left',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/already swiped|duplicate/i);
    });

    it('should not allow swiping on yourself', async () => {
      const { user, accessToken } = await createUserWithProfile({
        gender: 'male',
        lookingFor: ['female'],
      });

      matchingApiClient.setAuthToken(accessToken);
      const response = await matchingApiClient.post('/api/v1/matching/swipe', {
        targetUserId: user.id,
        direction: 'right',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/yourself|invalid/i);
    });
  });

  describe('Undo Swipe', () => {
    it('should undo last swipe (premium feature)', async () => {
      const { user: user1, accessToken: token1 } = await createUserWithProfile({
        gender: 'male',
        lookingFor: ['female'],
      });
      const { user: user2 } = await createUserWithProfile({
        gender: 'female',
        lookingFor: ['male'],
      });

      // Mark user1 as premium
      const knex = dbHelper.getKnex();
      await knex('users').where('id', user1.id).update({ is_premium: true });

      // Swipe left on user2
      matchingApiClient.setAuthToken(token1);
      await matchingApiClient.post('/api/v1/matching/swipe', {
        targetUserId: user2.id,
        direction: 'left',
      });

      // Undo swipe
      const response = await matchingApiClient.post('/api/v1/matching/undo', {});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify swipe was removed
      const swipe = await knex('swipes')
        .where({ swiper_id: user1.id, swiped_id: user2.id })
        .first();

      expect(swipe).toBeUndefined();
    });

    it('should not allow undo for non-premium users', async () => {
      const { user: user1, accessToken: token1 } = await createUserWithProfile({
        gender: 'male',
        lookingFor: ['female'],
      });
      const { user: user2 } = await createUserWithProfile({
        gender: 'female',
        lookingFor: ['male'],
      });

      // Swipe
      matchingApiClient.setAuthToken(token1);
      await matchingApiClient.post('/api/v1/matching/swipe', {
        targetUserId: user2.id,
        direction: 'left',
      });

      // Try to undo (should fail)
      const response = await matchingApiClient.post('/api/v1/matching/undo', {});

      expect(response.status).toBe(403);
      expect(response.body.error).toMatch(/premium|subscription/i);
    });
  });

  describe('Discovery Filters', () => {
    it('should apply interest-based filters', async () => {
      const { accessToken: mainToken } = await createUserWithProfile({
        gender: 'male',
        lookingFor: ['female'],
        interests: ['travel', 'music'],
      });

      // Create users with matching interests
      await createUserWithProfile({
        gender: 'female',
        lookingFor: ['male'],
        interests: ['travel', 'sports'],
      });

      // Get discovery with interest filter
      matchingApiClient.setAuthToken(mainToken);
      const response = await matchingApiClient.get('/api/v1/matching/discovery', {
        query: { filterByInterests: true },
      });

      expect(response.status).toBe(200);

      // Results should prioritize shared interests
      const profiles = response.body.data.profiles;
      expect(profiles[0]).toHaveProperty('sharedInterests');
    });

    it('should filter by verified profiles only', async () => {
      const { accessToken: mainToken } = await createUserWithProfile({
        gender: 'male',
        lookingFor: ['female'],
      });

      // Create verified user
      const { user: verifiedUser } = await createUserWithProfile({
        gender: 'female',
        lookingFor: ['male'],
      });
      const knex = dbHelper.getKnex();
      await knex('users').where('id', verifiedUser.id).update({ is_verified: true });

      // Create unverified user
      await createUserWithProfile({ gender: 'female', lookingFor: ['male'] });

      // Get discovery with verified filter
      matchingApiClient.setAuthToken(mainToken);
      const response = await matchingApiClient.get('/api/v1/matching/discovery', {
        query: { verifiedOnly: true },
      });

      expect(response.status).toBe(200);

      // All profiles should be verified
      const profiles = response.body.data.profiles;
      profiles.forEach((profile: any) => {
        expect(profile.isVerified).toBe(true);
      });
    });
  });

  describe('Discovery Analytics', () => {
    it('should track profile views', async () => {
      const { user: user1, accessToken: token1 } = await createUserWithProfile({
        gender: 'male',
        lookingFor: ['female'],
      });
      const { user: user2 } = await createUserWithProfile({
        gender: 'female',
        lookingFor: ['male'],
      });

      // Get discovery feed (views user2's profile)
      matchingApiClient.setAuthToken(token1);
      await matchingApiClient.get('/api/v1/matching/discovery');

      // Track explicit view
      await matchingApiClient.post('/api/v1/matching/view', {
        targetUserId: user2.id,
      });

      // Verify view was tracked
      const knex = dbHelper.getKnex();
      const view = await knex('profile_views')
        .where({ viewer_id: user1.id, viewed_id: user2.id })
        .first();

      expect(view).toBeDefined();
    });

    it('should get discovery statistics', async () => {
      const { accessToken: token1 } = await createUserWithProfile({
        gender: 'male',
        lookingFor: ['female'],
      });

      matchingApiClient.setAuthToken(token1);
      const response = await matchingApiClient.get('/api/v1/matching/stats');

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        totalSwipes: expect.any(Number),
        rightSwipes: expect.any(Number),
        leftSwipes: expect.any(Number),
        matches: expect.any(Number),
        profileViews: expect.any(Number),
      });
    });
  });
});
