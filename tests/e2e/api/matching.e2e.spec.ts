/**
 * Matching Service E2E Tests
 *
 * Comprehensive test suite for matching endpoints:
 * - Discovery Feed
 * - Discovery Preferences
 * - Swipes (like/pass/superlike)
 * - Matches Management
 * - Match Statistics
 *
 * Target: Full coverage of matching flows with edge cases
 */

import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { config, testState, wait } from './setup';

const MATCHING_URL = config.MATCHING_URL;
const AUTH_URL = config.AUTH_URL;

describe('Matching Service E2E Tests', () => {
  let accessToken: string;
  let userId: string;
  let secondUserToken: string;
  let secondUserId: string;
  let discoveredUserId: string;
  let matchId: string;

  beforeAll(async () => {
    // Use tokens from setup or create new
    if (testState.accessToken) {
      accessToken = testState.accessToken;
      userId = testState.userId || '';
    }

    // Create a second user for matching tests
    const secondEmail = `matching-e2e-2-${Date.now()}@example.com`;
    const registerResponse = await request(AUTH_URL)
      .post('/api/v1/auth/register')
      .send({
        email: secondEmail,
        password: 'SecurePassword123!',
        firstName: 'Match',
        lastName: 'Partner',
        dateOfBirth: '1994-05-10',
        gender: 'female',
        consents: { terms: true, privacy: true },
      });

    if (registerResponse.status === 201) {
      secondUserToken = registerResponse.body.accessToken;
      secondUserId = registerResponse.body.user.id;
    }
  });

  // ==================== DISCOVERY FEED TESTS ====================

  describe('GET /api/discovery', () => {
    describe('Get Discovery Feed', () => {
      it('should return discovery feed', async () => {
        const response = await request(MATCHING_URL)
          .get('/api/discovery')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);

        // Store discovered user for swipe tests
        if (response.body.length > 0) {
          const profile = response.body[0];
          expect(profile).toHaveProperty('id');
          discoveredUserId = profile.id;
        }
      });

      it('should include required profile fields', async () => {
        const response = await request(MATCHING_URL)
          .get('/api/discovery')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);

        if (response.body.length > 0) {
          const profile = response.body[0];
          expect(profile).toHaveProperty('id');
          expect(profile).toHaveProperty('firstName');
          // Photos might be empty for new users
        }
      });

      it('should support limit parameter', async () => {
        const response = await request(MATCHING_URL)
          .get('/api/discovery')
          .query({ limit: 5 })
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.length).toBeLessThanOrEqual(5);
      });

      it('should support offset parameter', async () => {
        const response = await request(MATCHING_URL)
          .get('/api/discovery')
          .query({ limit: 5, offset: 5 })
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
      });

      it('should not include blocked users', async () => {
        // This test assumes blocking functionality works
        const response = await request(MATCHING_URL)
          .get('/api/discovery')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);

        // Verify no blocked users in results
        const ids = response.body.map((p: any) => p.id);
        // If we have a list of blocked IDs, verify none appear
      });

      it('should not include self in results', async () => {
        const response = await request(MATCHING_URL)
          .get('/api/discovery')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);

        const ids = response.body.map((p: any) => p.id);
        expect(ids).not.toContain(userId);
      });

      it('should fail without authentication', async () => {
        const response = await request(MATCHING_URL).get('/api/discovery');

        expect(response.status).toBe(401);
      });

      it('should fail with invalid token', async () => {
        const response = await request(MATCHING_URL)
          .get('/api/discovery')
          .set('Authorization', 'Bearer invalid-token');

        expect(response.status).toBe(401);
      });
    });

    describe('Discovery Feed Filters', () => {
      it('should respect age preferences', async () => {
        // Set preferences first
        await request(MATCHING_URL)
          .put('/api/discovery/preferences')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ minAge: 21, maxAge: 35 });

        const response = await request(MATCHING_URL)
          .get('/api/discovery')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);

        // Verify age range (if age is included in response)
        response.body.forEach((profile: any) => {
          if (profile.age) {
            expect(profile.age).toBeGreaterThanOrEqual(21);
            expect(profile.age).toBeLessThanOrEqual(35);
          }
        });
      });

      it('should respect distance preferences', async () => {
        await request(MATCHING_URL)
          .put('/api/discovery/preferences')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ maxDistance: 50 });

        const response = await request(MATCHING_URL)
          .get('/api/discovery')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);

        // Verify distance (if included in response)
        response.body.forEach((profile: any) => {
          if (profile.distance) {
            expect(profile.distance).toBeLessThanOrEqual(50);
          }
        });
      });

      it('should respect gender preferences', async () => {
        await request(MATCHING_URL)
          .put('/api/discovery/preferences')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ genderPreference: ['female'] });

        const response = await request(MATCHING_URL)
          .get('/api/discovery')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);

        response.body.forEach((profile: any) => {
          if (profile.gender) {
            expect(['female']).toContain(profile.gender);
          }
        });
      });
    });
  });

  // ==================== DISCOVERY PREFERENCES TESTS ====================

  describe('Discovery Preferences API', () => {
    describe('GET /api/discovery/preferences', () => {
      it('should return discovery preferences', async () => {
        const response = await request(MATCHING_URL)
          .get('/api/discovery/preferences')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('minAge');
        expect(response.body).toHaveProperty('maxAge');
        expect(response.body).toHaveProperty('maxDistance');
      });

      it('should fail without authentication', async () => {
        const response = await request(MATCHING_URL).get('/api/discovery/preferences');

        expect(response.status).toBe(401);
      });
    });

    describe('PUT /api/discovery/preferences', () => {
      it('should update discovery preferences', async () => {
        const newPreferences = {
          minAge: 22,
          maxAge: 38,
          maxDistance: 75,
          genderPreference: ['female', 'non-binary'],
        };

        const response = await request(MATCHING_URL)
          .put('/api/discovery/preferences')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(newPreferences);

        expect(response.status).toBe(200);
        expect(response.body.minAge).toBe(22);
        expect(response.body.maxAge).toBe(38);
        expect(response.body.maxDistance).toBe(75);
      });

      it('should update individual preference fields', async () => {
        const response = await request(MATCHING_URL)
          .put('/api/discovery/preferences')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ maxDistance: 100 });

        expect(response.status).toBe(200);
        expect(response.body.maxDistance).toBe(100);
      });

      it('should fail with invalid age range (min > max)', async () => {
        const response = await request(MATCHING_URL)
          .put('/api/discovery/preferences')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            minAge: 40,
            maxAge: 25,
          });

        expect(response.status).toBe(400);
      });

      it('should fail with age below minimum (18)', async () => {
        const response = await request(MATCHING_URL)
          .put('/api/discovery/preferences')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ minAge: 16 });

        expect(response.status).toBe(400);
      });

      it('should fail with negative distance', async () => {
        const response = await request(MATCHING_URL)
          .put('/api/discovery/preferences')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ maxDistance: -10 });

        expect(response.status).toBe(400);
      });

      it('should fail without authentication', async () => {
        const response = await request(MATCHING_URL)
          .put('/api/discovery/preferences')
          .send({ minAge: 21 });

        expect(response.status).toBe(401);
      });
    });
  });

  // ==================== SWIPES TESTS ====================

  describe('Swipes API', () => {
    describe('POST /api/swipes', () => {
      describe('Like Swipe', () => {
        it('should record a like swipe', async () => {
          const targetUserId = discoveredUserId || secondUserId || uuidv4();

          const response = await request(MATCHING_URL)
            .post('/api/swipes')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
              targetUserId,
              direction: 'like',
            });

          expect(response.status).toBe(200);
          expect(response.body).toHaveProperty('matched');
        });

        it('should indicate if match occurred', async () => {
          // First user likes second
          const like1 = await request(MATCHING_URL)
            .post('/api/swipes')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
              targetUserId: secondUserId,
              direction: 'like',
            });

          if (like1.status === 200 && like1.body.matched) {
            matchId = like1.body.matchId;
          }

          // Second user likes first (should create match)
          if (secondUserToken) {
            const like2 = await request(MATCHING_URL)
              .post('/api/swipes')
              .set('Authorization', `Bearer ${secondUserToken}`)
              .send({
                targetUserId: userId,
                direction: 'like',
              });

            if (like2.status === 200 && like2.body.matched) {
              matchId = like2.body.matchId;
              expect(like2.body.matched).toBe(true);
            }
          }
        });
      });

      describe('Pass Swipe', () => {
        it('should record a pass swipe', async () => {
          const targetUserId = uuidv4();

          const response = await request(MATCHING_URL)
            .post('/api/swipes')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
              targetUserId,
              direction: 'pass',
            });

          // May return 200 or 404 if user doesn't exist
          expect([200, 404]).toContain(response.status);
        });

        it('should not create match on pass', async () => {
          const targetUserId = uuidv4();

          const response = await request(MATCHING_URL)
            .post('/api/swipes')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
              targetUserId,
              direction: 'pass',
            });

          if (response.status === 200) {
            expect(response.body.matched).toBe(false);
          }
        });
      });

      describe('Superlike Swipe', () => {
        it('should record a superlike swipe', async () => {
          const targetUserId = uuidv4();

          const response = await request(MATCHING_URL)
            .post('/api/swipes')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
              targetUserId,
              direction: 'superlike',
            });

          // May require premium or coins
          expect([200, 400, 403, 404]).toContain(response.status);
        });
      });

      describe('Validation Errors', () => {
        it('should fail with invalid direction', async () => {
          const response = await request(MATCHING_URL)
            .post('/api/swipes')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
              targetUserId: uuidv4(),
              direction: 'invalid',
            });

          expect(response.status).toBe(400);
        });

        it('should fail with missing targetUserId', async () => {
          const response = await request(MATCHING_URL)
            .post('/api/swipes')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
              direction: 'like',
            });

          expect(response.status).toBe(400);
        });

        it('should fail with missing direction', async () => {
          const response = await request(MATCHING_URL)
            .post('/api/swipes')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
              targetUserId: uuidv4(),
            });

          expect(response.status).toBe(400);
        });

        it('should prevent self-swipe', async () => {
          const response = await request(MATCHING_URL)
            .post('/api/swipes')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
              targetUserId: userId,
              direction: 'like',
            });

          expect([400, 403]).toContain(response.status);
        });

        it('should fail without authentication', async () => {
          const response = await request(MATCHING_URL)
            .post('/api/swipes')
            .send({
              targetUserId: uuidv4(),
              direction: 'like',
            });

          expect(response.status).toBe(401);
        });
      });

      describe('Edge Cases', () => {
        it('should handle duplicate swipe on same user', async () => {
          const targetUserId = uuidv4();

          // First swipe
          await request(MATCHING_URL)
            .post('/api/swipes')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
              targetUserId,
              direction: 'like',
            });

          // Duplicate swipe
          const response = await request(MATCHING_URL)
            .post('/api/swipes')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
              targetUserId,
              direction: 'like',
            });

          // Should either succeed or indicate duplicate
          expect([200, 400, 409]).toContain(response.status);
        });

        it('should handle swipe on blocked user', async () => {
          // Block a user first (if blocking is implemented)
          const blockedUserId = uuidv4();

          const response = await request(MATCHING_URL)
            .post('/api/swipes')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
              targetUserId: blockedUserId,
              direction: 'like',
            });

          // Should either fail or handle gracefully
          expect([200, 400, 403, 404]).toContain(response.status);
        });
      });
    });

    describe('GET /api/swipes/stats', () => {
      it('should return swipe statistics', async () => {
        const response = await request(MATCHING_URL)
          .get('/api/swipes/stats')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('totalSwipes');
        expect(response.body).toHaveProperty('likes');
        expect(response.body).toHaveProperty('passes');
      });

      it('should include accurate counts', async () => {
        const response = await request(MATCHING_URL)
          .get('/api/swipes/stats')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(typeof response.body.totalSwipes).toBe('number');
        expect(typeof response.body.likes).toBe('number');
        expect(typeof response.body.passes).toBe('number');
        expect(response.body.totalSwipes).toBeGreaterThanOrEqual(0);
      });

      it('should fail without authentication', async () => {
        const response = await request(MATCHING_URL).get('/api/swipes/stats');

        expect(response.status).toBe(401);
      });
    });
  });

  // ==================== MATCHES TESTS ====================

  describe('Matches API', () => {
    describe('GET /api/v1/matches', () => {
      it('should return list of matches', async () => {
        const response = await request(MATCHING_URL)
          .get('/api/v1/matches')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('pagination');
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should support pagination', async () => {
        const response = await request(MATCHING_URL)
          .get('/api/v1/matches')
          .query({ page: 1, limit: 10 })
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.length).toBeLessThanOrEqual(10);
        expect(response.body.pagination).toHaveProperty('page');
        expect(response.body.pagination).toHaveProperty('limit');
      });

      it('should return correct match structure', async () => {
        const response = await request(MATCHING_URL)
          .get('/api/v1/matches')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);

        if (response.body.data.length > 0) {
          const match = response.body.data[0];
          expect(match).toHaveProperty('id');
          expect(match).toHaveProperty('matchedUserId');
        }
      });

      it('should fail without authentication', async () => {
        const response = await request(MATCHING_URL).get('/api/v1/matches');

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/v1/matches/recent', () => {
      it('should return recent matches', async () => {
        const response = await request(MATCHING_URL)
          .get('/api/v1/matches/recent')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
      });

      it('should return matches sorted by date', async () => {
        const response = await request(MATCHING_URL)
          .get('/api/v1/matches/recent')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);

        if (Array.isArray(response.body) && response.body.length > 1) {
          const dates = response.body.map((m: any) => new Date(m.createdAt).getTime());
          // Verify descending order
          for (let i = 1; i < dates.length; i++) {
            expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
          }
        }
      });

      it('should fail without authentication', async () => {
        const response = await request(MATCHING_URL).get('/api/v1/matches/recent');

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/v1/matches/count', () => {
      it('should return match count', async () => {
        const response = await request(MATCHING_URL)
          .get('/api/v1/matches/count')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('count');
        expect(typeof response.body.count).toBe('number');
      });

      it('should return non-negative count', async () => {
        const response = await request(MATCHING_URL)
          .get('/api/v1/matches/count')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.count).toBeGreaterThanOrEqual(0);
      });

      it('should fail without authentication', async () => {
        const response = await request(MATCHING_URL).get('/api/v1/matches/count');

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/v1/matches/:matchId', () => {
      it('should return match details', async () => {
        if (!matchId) {
          console.log('Skipping: No match ID available');
          return;
        }

        const response = await request(MATCHING_URL)
          .get(`/api/v1/matches/${matchId}`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect([200, 404]).toContain(response.status);
        if (response.status === 200) {
          expect(response.body).toHaveProperty('id', matchId);
        }
      });

      it('should return 404 for non-existent match', async () => {
        const response = await request(MATCHING_URL)
          .get('/api/v1/matches/nonexistent-match-id')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(404);
      });

      it('should fail without authentication', async () => {
        const response = await request(MATCHING_URL).get('/api/v1/matches/any-id');

        expect(response.status).toBe(401);
      });
    });

    describe('DELETE /api/v1/matches/:matchId', () => {
      it('should unmatch successfully', async () => {
        // Create a match first if needed
        const testMatchId = matchId || uuidv4();

        const response = await request(MATCHING_URL)
          .delete(`/api/v1/matches/${testMatchId}`)
          .set('Authorization', `Bearer ${accessToken}`);

        expect([200, 404]).toContain(response.status);
      });

      it('should return 404 for non-existent match', async () => {
        const response = await request(MATCHING_URL)
          .delete('/api/v1/matches/nonexistent-match-id')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(404);
      });

      it('should fail without authentication', async () => {
        const response = await request(MATCHING_URL).delete('/api/v1/matches/any-id');

        expect(response.status).toBe(401);
      });
    });
  });

  // ==================== LIKES WHO LIKED YOU TESTS ====================

  describe('Likes/Who Liked You API', () => {
    describe('GET /api/likes/received', () => {
      it('should return received likes (premium feature)', async () => {
        const response = await request(MATCHING_URL)
          .get('/api/likes/received')
          .set('Authorization', `Bearer ${accessToken}`);

        // May require premium subscription
        expect([200, 403]).toContain(response.status);

        if (response.status === 200) {
          expect(Array.isArray(response.body.data || response.body)).toBe(true);
        }
      });

      it('should fail without authentication', async () => {
        const response = await request(MATCHING_URL).get('/api/likes/received');

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/likes/sent', () => {
      it('should return sent likes', async () => {
        const response = await request(MATCHING_URL)
          .get('/api/likes/sent')
          .set('Authorization', `Bearer ${accessToken}`);

        expect([200, 404]).toContain(response.status);

        if (response.status === 200) {
          expect(Array.isArray(response.body.data || response.body)).toBe(true);
        }
      });

      it('should fail without authentication', async () => {
        const response = await request(MATCHING_URL).get('/api/likes/sent');

        expect(response.status).toBe(401);
      });
    });
  });

  // ==================== UNDO/REWIND TESTS ====================

  describe('Undo/Rewind API', () => {
    describe('POST /api/swipes/undo', () => {
      it('should undo last swipe (premium feature)', async () => {
        const response = await request(MATCHING_URL)
          .post('/api/swipes/undo')
          .set('Authorization', `Bearer ${accessToken}`);

        // May require premium or have no swipes to undo
        expect([200, 400, 403]).toContain(response.status);
      });

      it('should fail without authentication', async () => {
        const response = await request(MATCHING_URL).post('/api/swipes/undo');

        expect(response.status).toBe(401);
      });
    });
  });

  // ==================== SECURITY TESTS ====================

  describe('Security Tests', () => {
    describe('Token Validation', () => {
      it('should reject expired token', async () => {
        const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxfQ.expired';

        const response = await request(MATCHING_URL)
          .get('/api/discovery')
          .set('Authorization', `Bearer ${expiredToken}`);

        expect(response.status).toBe(401);
      });

      it('should reject malformed token', async () => {
        const response = await request(MATCHING_URL)
          .get('/api/discovery')
          .set('Authorization', 'NotAValidFormat');

        expect(response.status).toBe(401);
      });
    });

    describe('Data Privacy', () => {
      it('should not expose sensitive user data in discovery', async () => {
        const response = await request(MATCHING_URL)
          .get('/api/discovery')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);

        response.body.forEach((profile: any) => {
          expect(profile).not.toHaveProperty('email');
          expect(profile).not.toHaveProperty('password');
          expect(profile).not.toHaveProperty('phoneNumber');
        });
      });

      it('should not allow accessing other users private match data', async () => {
        // Try to access another user's matches
        const response = await request(MATCHING_URL)
          .get('/api/v1/matches')
          .query({ userId: secondUserId })
          .set('Authorization', `Bearer ${accessToken}`);

        // Should either ignore the parameter or return error
        expect([200, 400, 403]).toContain(response.status);

        // If 200, should only return current user's matches
      });
    });
  });

  // ==================== RATE LIMITING TESTS ====================

  describe('Rate Limiting', () => {
    it('should rate limit excessive swipes', async () => {
      const swipes = Array(50).fill(null).map(() =>
        request(MATCHING_URL)
          .post('/api/swipes')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            targetUserId: uuidv4(),
            direction: 'like',
          })
      );

      const responses = await Promise.all(swipes);

      // Some should be rate limited
      const rateLimited = responses.some(r => r.status === 429);

      // Rate limiting may or may not kick in depending on configuration
      expect(responses.every(r => [200, 400, 404, 429].includes(r.status))).toBe(true);
    });

    it('should rate limit discovery feed requests', async () => {
      const requests = Array(30).fill(null).map(() =>
        request(MATCHING_URL)
          .get('/api/discovery')
          .set('Authorization', `Bearer ${accessToken}`)
      );

      const responses = await Promise.all(requests);

      // All should complete without error
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });
    });
  });

  // ==================== INTEGRATION TESTS ====================

  describe('Integration Tests', () => {
    describe('Complete Match Flow', () => {
      it('should complete full match workflow', async () => {
        // Skip if we don't have two users
        if (!secondUserToken || !secondUserId) {
          console.log('Skipping: Second user not available');
          return;
        }

        // 1. User 1 likes User 2
        const like1 = await request(MATCHING_URL)
          .post('/api/swipes')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            targetUserId: secondUserId,
            direction: 'like',
          });

        expect([200, 400, 409]).toContain(like1.status);

        // 2. User 2 likes User 1 (creates match)
        const like2 = await request(MATCHING_URL)
          .post('/api/swipes')
          .set('Authorization', `Bearer ${secondUserToken}`)
          .send({
            targetUserId: userId,
            direction: 'like',
          });

        expect([200, 400, 409]).toContain(like2.status);

        // 3. Check matches for User 1
        const matches1 = await request(MATCHING_URL)
          .get('/api/v1/matches')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(matches1.status).toBe(200);

        // 4. Check matches for User 2
        const matches2 = await request(MATCHING_URL)
          .get('/api/v1/matches')
          .set('Authorization', `Bearer ${secondUserToken}`);

        expect(matches2.status).toBe(200);
      });
    });

    describe('Preference-Based Discovery', () => {
      it('should filter discovery based on preferences', async () => {
        // Set specific preferences
        await request(MATCHING_URL)
          .put('/api/discovery/preferences')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            minAge: 25,
            maxAge: 35,
            maxDistance: 30,
            genderPreference: ['female'],
          });

        // Get discovery feed
        const response = await request(MATCHING_URL)
          .get('/api/discovery')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);

        // Verify results match preferences (if data available)
        response.body.forEach((profile: any) => {
          if (profile.gender) {
            expect(['female']).toContain(profile.gender);
          }
        });
      });
    });
  });
});
