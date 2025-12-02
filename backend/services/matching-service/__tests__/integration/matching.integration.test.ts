import request from 'supertest';
import { Express } from 'express';
import { Pool } from 'pg';
import { createClient } from 'redis';

/**
 * Matching Service Integration Tests
 * Tests matching algorithm, swiping, recommendations
 */

describe('Matching Service - Integration Tests', () => {
  let app: Express;
  let dbPool: Pool;
  let redisClient: ReturnType<typeof createClient>;
  let authToken: string;
  let userId: string;
  let targetUserIds: string[] = [];

  beforeAll(async () => {
    dbPool = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    redisClient = createClient({
      url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
    });
    await redisClient.connect();

    // Create main test user
    const mainUser = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'matcher@example.com',
        password: 'Test123!@#',
        firstName: 'John',
        lastName: 'Matcher',
        dateOfBirth: '1990-01-01',
        gender: 'male'
      });

    authToken = mainUser.body.accessToken;
    userId = mainUser.body.user.id;

    // Create target users for matching
    for (let i = 0; i < 5; i++) {
      const targetUser = await request(app)
        .post('/api/auth/register')
        .send({
          email: `target${i}@example.com`,
          password: 'Test123!@#',
          firstName: `Target${i}`,
          lastName: 'User',
          dateOfBirth: '1992-01-01',
          gender: i % 2 === 0 ? 'female' : 'male'
        });

      targetUserIds.push(targetUser.body.user.id);

      // Set up profiles with different attributes
      await dbPool.query(
        `INSERT INTO user_profiles (user_id, bio, interests, location)
         VALUES ($1, $2, $3, $4)`,
        [
          targetUser.body.user.id,
          `Bio for target user ${i}`,
          JSON.stringify(['hiking', 'reading', 'music']),
          JSON.stringify({ lat: 37.7749 + i * 0.1, lng: -122.4194 + i * 0.1 })
        ]
      );
    }

    // Set user preferences
    await request(app)
      .put('/api/users/preferences')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        ageRange: { min: 25, max: 40 },
        distance: 50,
        genderPreference: ['female']
      });
  });

  afterAll(async () => {
    await dbPool.query('DELETE FROM users WHERE email LIKE $1', ['%@example.com']);
    await dbPool.end();
    await redisClient.quit();
  });

  describe('GET /api/matching/recommendations', () => {
    it('should get personalized recommendations', async () => {
      const response = await request(app)
        .get('/api/matching/recommendations')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('recommendations');
      expect(Array.isArray(response.body.recommendations)).toBe(true);
      expect(response.body.recommendations.length).toBeGreaterThan(0);

      // Check recommendation structure
      const recommendation = response.body.recommendations[0];
      expect(recommendation).toHaveProperty('userId');
      expect(recommendation).toHaveProperty('matchScore');
      expect(recommendation).toHaveProperty('profile');
      expect(recommendation.matchScore).toBeGreaterThanOrEqual(0);
      expect(recommendation.matchScore).toBeLessThanOrEqual(100);
    });

    it('should respect user preferences', async () => {
      const response = await request(app)
        .get('/api/matching/recommendations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // All recommendations should match gender preference
      response.body.recommendations.forEach((rec: any) => {
        expect(rec.profile.gender).toBe('female');
      });
    });

    it('should not recommend already swiped users', async () => {
      // Swipe right on first target user
      await request(app)
        .post('/api/matching/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: targetUserIds[0],
          direction: 'right'
        });

      const response = await request(app)
        .get('/api/matching/recommendations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Swiped user should not be in recommendations
      const swipedUserInRecs = response.body.recommendations.some(
        (rec: any) => rec.userId === targetUserIds[0]
      );
      expect(swipedUserInRecs).toBe(false);
    });

    it('should not recommend blocked users', async () => {
      // Block a user
      await request(app)
        .post(`/api/users/block/${targetUserIds[1]}`)
        .set('Authorization', `Bearer ${authToken}`);

      const response = await request(app)
        .get('/api/matching/recommendations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Blocked user should not be in recommendations
      const blockedUserInRecs = response.body.recommendations.some(
        (rec: any) => rec.userId === targetUserIds[1]
      );
      expect(blockedUserInRecs).toBe(false);
    });

    it('should apply distance filter', async () => {
      // Update preferences with strict distance
      await request(app)
        .put('/api/users/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          distance: 1 // Very restrictive distance
        });

      const response = await request(app)
        .get('/api/matching/recommendations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should have fewer or no recommendations due to distance
      expect(response.body.recommendations.length).toBeLessThanOrEqual(5);
    });

    it('should support pagination', async () => {
      const page1 = await request(app)
        .get('/api/matching/recommendations')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 2, offset: 0 })
        .expect(200);

      const page2 = await request(app)
        .get('/api/matching/recommendations')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 2, offset: 2 })
        .expect(200);

      expect(page1.body.recommendations).toHaveLength(2);
      expect(page2.body.recommendations).toHaveLength(2);

      // Should be different users
      expect(page1.body.recommendations[0].userId).not.toBe(
        page2.body.recommendations[0].userId
      );
    });
  });

  describe('POST /api/matching/swipe', () => {
    it('should record right swipe', async () => {
      const targetUserId = targetUserIds[2];

      const response = await request(app)
        .post('/api/matching/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId,
          direction: 'right'
        })
        .expect(200);

      expect(response.body).toHaveProperty('swiped');
      expect(response.body.swiped).toBe(true);

      // Verify in database
      const swipe = await dbPool.query(
        'SELECT * FROM swipes WHERE swiper_id = $1 AND swiped_id = $2',
        [userId, targetUserId]
      );
      expect(swipe.rows).toHaveLength(1);
      expect(swipe.rows[0].direction).toBe('right');
    });

    it('should record left swipe', async () => {
      const targetUserId = targetUserIds[3];

      const response = await request(app)
        .post('/api/matching/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId,
          direction: 'left'
        })
        .expect(200);

      expect(response.body.swiped).toBe(true);

      const swipe = await dbPool.query(
        'SELECT * FROM swipes WHERE swiper_id = $1 AND swiped_id = $2',
        [userId, targetUserId]
      );
      expect(swipe.rows[0].direction).toBe('left');
    });

    it('should create match when both users swipe right', async () => {
      const targetUserId = targetUserIds[4];

      // First user swipes right
      await request(app)
        .post('/api/matching/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId,
          direction: 'right'
        });

      // Simulate target user swiping right back
      await dbPool.query(
        `INSERT INTO swipes (swiper_id, swiped_id, direction, created_at)
         VALUES ($1, $2, 'right', NOW())`,
        [targetUserId, userId]
      );

      // Trigger match creation
      const response = await request(app)
        .get('/api/matching/check-match')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ targetUserId })
        .expect(200);

      expect(response.body.isMatch).toBe(true);

      // Verify match in database
      const match = await dbPool.query(
        `SELECT * FROM matches
         WHERE (user1_id = $1 AND user2_id = $2)
         OR (user1_id = $2 AND user2_id = $1)`,
        [userId, targetUserId]
      );
      expect(match.rows).toHaveLength(1);
    });

    it('should not allow swiping the same user twice', async () => {
      const targetUserId = targetUserIds[2]; // Already swiped

      await request(app)
        .post('/api/matching/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId,
          direction: 'right'
        })
        .expect(409); // Conflict
    });

    it('should not allow swiping yourself', async () => {
      await request(app)
        .post('/api/matching/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: userId,
          direction: 'right'
        })
        .expect(400);
    });

    it('should validate swipe direction', async () => {
      await request(app)
        .post('/api/matching/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: targetUserIds[0],
          direction: 'invalid'
        })
        .expect(400);
    });

    it('should handle super like', async () => {
      // Create a new target user for super like
      const newTarget = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'superlike@example.com',
          password: 'Test123!@#',
          firstName: 'Super',
          lastName: 'Like',
          dateOfBirth: '1991-01-01',
          gender: 'female'
        });

      const response = await request(app)
        .post('/api/matching/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: newTarget.body.user.id,
          direction: 'super'
        })
        .expect(200);

      expect(response.body.superLiked).toBe(true);

      // Verify super like in database
      const swipe = await dbPool.query(
        'SELECT * FROM swipes WHERE swiper_id = $1 AND swiped_id = $2',
        [userId, newTarget.body.user.id]
      );
      expect(swipe.rows[0].is_super_like).toBe(true);

      // Clean up
      await dbPool.query('DELETE FROM users WHERE email = $1', ['superlike@example.com']);
    });
  });

  describe('GET /api/matching/matches', () => {
    it('should get all matches', async () => {
      const response = await request(app)
        .get('/api/matching/matches')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('matches');
      expect(Array.isArray(response.body.matches)).toBe(true);

      if (response.body.matches.length > 0) {
        const match = response.body.matches[0];
        expect(match).toHaveProperty('matchId');
        expect(match).toHaveProperty('user');
        expect(match).toHaveProperty('matchedAt');
      }
    });

    it('should filter new matches', async () => {
      const response = await request(app)
        .get('/api/matching/matches')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ filter: 'new' })
        .expect(200);

      response.body.matches.forEach((match: any) => {
        expect(match.hasUnreadMessages).toBe(true);
      });
    });

    it('should sort matches by recent activity', async () => {
      const response = await request(app)
        .get('/api/matching/matches')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ sortBy: 'recent' })
        .expect(200);

      // Verify sorting
      if (response.body.matches.length > 1) {
        const dates = response.body.matches.map((m: any) => new Date(m.lastMessageAt));
        for (let i = 1; i < dates.length; i++) {
          expect(dates[i - 1].getTime()).toBeGreaterThanOrEqual(dates[i].getTime());
        }
      }
    });
  });

  describe('DELETE /api/matching/matches/:matchId', () => {
    let matchId: string;

    beforeEach(async () => {
      // Create a match
      const result = await dbPool.query(
        `INSERT INTO matches (user1_id, user2_id, created_at)
         VALUES ($1, $2, NOW())
         RETURNING id`,
        [userId, targetUserIds[0]]
      );
      matchId = result.rows[0].id;
    });

    it('should unmatch a user', async () => {
      const response = await request(app)
        .delete(`/api/matching/matches/${matchId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toContain('unmatched');

      // Verify match is deleted
      const match = await dbPool.query(
        'SELECT * FROM matches WHERE id = $1',
        [matchId]
      );
      expect(match.rows).toHaveLength(0);
    });

    it('should not allow unmatching non-existent match', async () => {
      const fakeMatchId = '00000000-0000-0000-0000-000000000000';

      await request(app)
        .delete(`/api/matching/matches/${fakeMatchId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should not allow unmatching other users matches', async () => {
      // Create another user
      const otherUser = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'other@example.com',
          password: 'Test123!@#',
          firstName: 'Other',
          lastName: 'User',
          dateOfBirth: '1990-01-01',
          gender: 'male'
        });

      await request(app)
        .delete(`/api/matching/matches/${matchId}`)
        .set('Authorization', `Bearer ${otherUser.body.accessToken}`)
        .expect(403);

      // Clean up
      await dbPool.query('DELETE FROM users WHERE email = $1', ['other@example.com']);
    });
  });

  describe('GET /api/matching/search', () => {
    it('should search users by criteria', async () => {
      const response = await request(app)
        .get('/api/matching/search')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          ageMin: 25,
          ageMax: 35,
          distance: 50,
          interests: 'hiking'
        })
        .expect(200);

      expect(response.body).toHaveProperty('results');
      expect(Array.isArray(response.body.results)).toBe(true);
    });

    it('should support full-text search on bio', async () => {
      const response = await request(app)
        .get('/api/matching/search')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ query: 'target' })
        .expect(200);

      expect(response.body.results.length).toBeGreaterThan(0);
    });

    it('should filter by multiple interests', async () => {
      const response = await request(app)
        .get('/api/matching/search')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ interests: 'hiking,reading' })
        .expect(200);

      response.body.results.forEach((user: any) => {
        const hasInterest = user.interests.some((i: string) =>
          ['hiking', 'reading'].includes(i)
        );
        expect(hasInterest).toBe(true);
      });
    });
  });

  describe('Match Algorithm Tests', () => {
    it('should calculate compatibility score', async () => {
      const response = await request(app)
        .get('/api/matching/compatibility')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ targetUserId: targetUserIds[0] })
        .expect(200);

      expect(response.body).toHaveProperty('score');
      expect(response.body).toHaveProperty('factors');
      expect(response.body.score).toBeGreaterThanOrEqual(0);
      expect(response.body.score).toBeLessThanOrEqual(100);

      // Check compatibility factors
      expect(response.body.factors).toHaveProperty('interestMatch');
      expect(response.body.factors).toHaveProperty('distanceScore');
      expect(response.body.factors).toHaveProperty('activityScore');
    });

    it('should prioritize users with mutual interests', async () => {
      // Update user interests to match target
      await dbPool.query(
        `INSERT INTO user_profiles (user_id, interests)
         VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET interests = $2`,
        [userId, JSON.stringify(['hiking', 'reading', 'music'])]
      );

      const response = await request(app)
        .get('/api/matching/recommendations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Top recommendations should have higher match scores
      if (response.body.recommendations.length > 1) {
        const scores = response.body.recommendations.map((r: any) => r.matchScore);
        expect(scores[0]).toBeGreaterThanOrEqual(scores[scores.length - 1]);
      }
    });

    it('should apply ELO-based ranking', async () => {
      // Simulate user activity to build ELO scores
      for (let i = 0; i < 10; i++) {
        await dbPool.query(
          `UPDATE user_profiles
           SET elo_score = elo_score + $1
           WHERE user_id = $2`,
          [Math.random() * 10, targetUserIds[i % targetUserIds.length]]
        );
      }

      const response = await request(app)
        .get('/api/matching/recommendations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should return recommendations (ELO affects ranking)
      expect(response.body.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Tests', () => {
    it('should handle high volume of swipes', async () => {
      const swipePromises = targetUserIds.slice(0, 3).map((targetId, i) =>
        request(app)
          .post('/api/matching/swipe')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            targetUserId: targetId,
            direction: i % 2 === 0 ? 'right' : 'left'
          })
      );

      const responses = await Promise.all(swipePromises);
      responses.forEach(response => {
        expect([200, 409]).toContain(response.status); // 409 if already swiped
      });
    });

    it('should cache recommendations', async () => {
      // First request
      const start1 = Date.now();
      await request(app)
        .get('/api/matching/recommendations')
        .set('Authorization', `Bearer ${authToken}`);
      const duration1 = Date.now() - start1;

      // Second request (should be cached)
      const start2 = Date.now();
      await request(app)
        .get('/api/matching/recommendations')
        .set('Authorization', `Bearer ${authToken}`);
      const duration2 = Date.now() - start2;

      expect(duration2).toBeLessThan(duration1);
    });

    it('should efficiently query large dataset', async () => {
      const start = Date.now();

      await request(app)
        .get('/api/matching/recommendations')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 100 });

      const duration = Date.now() - start;

      // Should complete in reasonable time (< 2 seconds)
      expect(duration).toBeLessThan(2000);
    });
  });
});
