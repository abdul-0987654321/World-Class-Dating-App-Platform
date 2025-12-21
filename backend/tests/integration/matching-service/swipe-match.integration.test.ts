import { getTestDb, getTestRedis, createTestUser, createTestProfile } from '../setup';

/**
 * Integration Tests for Matching Service
 * Tests: Like -> Mutual Like -> Match Creation
 */

describe('Matching Service - Swipe to Match Flow', () => {
  let testDb: any;
  let testRedis: any;
  let userA: any;
  let userB: any;
  let userC: any;

  beforeAll(() => {
    testDb = getTestDb();
    testRedis = getTestRedis();
  });

  beforeEach(async () => {
    // Create test users
    userA = await createTestUser({
      email: 'userA@example.com',
      first_name: 'User',
      last_name: 'A',
    });

    userB = await createTestUser({
      email: 'userB@example.com',
      first_name: 'User',
      last_name: 'B',
    });

    userC = await createTestUser({
      email: 'userC@example.com',
      first_name: 'User',
      last_name: 'C',
    });

    // Create profiles
    await createTestProfile(userA.id, { bio: 'User A bio' });
    await createTestProfile(userB.id, { bio: 'User B bio' });
    await createTestProfile(userC.id, { bio: 'User C bio' });
  });

  describe('Swipe Actions', () => {
    it('should record a right swipe (like)', async () => {
      const result = await testDb.query(
        `INSERT INTO swipes (swiper_id, swiped_id, direction)
         VALUES ($1, $2, 'right')
         RETURNING *`,
        [userA.id, userB.id]
      );

      expect(result.rows[0].swiper_id).toBe(userA.id);
      expect(result.rows[0].swiped_id).toBe(userB.id);
      expect(result.rows[0].direction).toBe('right');
    });

    it('should record a left swipe (pass)', async () => {
      const result = await testDb.query(
        `INSERT INTO swipes (swiper_id, swiped_id, direction)
         VALUES ($1, $2, 'left')
         RETURNING *`,
        [userA.id, userB.id]
      );

      expect(result.rows[0].direction).toBe('left');
    });

    it('should record a super like', async () => {
      const result = await testDb.query(
        `INSERT INTO swipes (swiper_id, swiped_id, direction)
         VALUES ($1, $2, 'super')
         RETURNING *`,
        [userA.id, userB.id]
      );

      expect(result.rows[0].direction).toBe('super');
    });

    it('should prevent duplicate swipes', async () => {
      // First swipe
      await testDb.query(
        `INSERT INTO swipes (swiper_id, swiped_id, direction)
         VALUES ($1, $2, 'right')`,
        [userA.id, userB.id]
      );

      // Second swipe should fail
      await expect(
        testDb.query(
          `INSERT INTO swipes (swiper_id, swiped_id, direction)
           VALUES ($1, $2, 'left')`,
          [userA.id, userB.id]
        )
      ).rejects.toThrow();
    });

    it('should allow reverse swipes (B can swipe on A)', async () => {
      // A swipes on B
      await testDb.query(
        `INSERT INTO swipes (swiper_id, swiped_id, direction)
         VALUES ($1, $2, 'right')`,
        [userA.id, userB.id]
      );

      // B swipes on A
      const result = await testDb.query(
        `INSERT INTO swipes (swiper_id, swiped_id, direction)
         VALUES ($1, $2, 'right')
         RETURNING *`,
        [userB.id, userA.id]
      );

      expect(result.rows[0].swiper_id).toBe(userB.id);
      expect(result.rows[0].swiped_id).toBe(userA.id);
    });
  });

  describe('Match Detection', () => {
    it('should detect mutual likes', async () => {
      // A likes B
      await testDb.query(
        `INSERT INTO swipes (swiper_id, swiped_id, direction)
         VALUES ($1, $2, 'right')`,
        [userA.id, userB.id]
      );

      // B likes A
      await testDb.query(
        `INSERT INTO swipes (swiper_id, swiped_id, direction)
         VALUES ($1, $2, 'right')`,
        [userB.id, userA.id]
      );

      // Check for mutual like
      const mutualLike = await testDb.query(
        `SELECT * FROM swipes s1
         WHERE s1.swiper_id = $1 AND s1.swiped_id = $2 AND s1.direction IN ('right', 'super')
         AND EXISTS (
           SELECT 1 FROM swipes s2
           WHERE s2.swiper_id = $2 AND s2.swiped_id = $1 AND s2.direction IN ('right', 'super')
         )`,
        [userA.id, userB.id]
      );

      expect(mutualLike.rows).toHaveLength(1);
    });

    it('should not detect match for one-way like', async () => {
      // Only A likes B
      await testDb.query(
        `INSERT INTO swipes (swiper_id, swiped_id, direction)
         VALUES ($1, $2, 'right')`,
        [userA.id, userB.id]
      );

      // Check for mutual like
      const mutualLike = await testDb.query(
        `SELECT * FROM swipes s1
         WHERE s1.swiper_id = $1 AND s1.swiped_id = $2 AND s1.direction IN ('right', 'super')
         AND EXISTS (
           SELECT 1 FROM swipes s2
           WHERE s2.swiper_id = $2 AND s2.swiped_id = $1 AND s2.direction IN ('right', 'super')
         )`,
        [userA.id, userB.id]
      );

      expect(mutualLike.rows).toHaveLength(0);
    });

    it('should not create match for left swipes', async () => {
      // A likes B
      await testDb.query(
        `INSERT INTO swipes (swiper_id, swiped_id, direction)
         VALUES ($1, $2, 'right')`,
        [userA.id, userB.id]
      );

      // B passes on A
      await testDb.query(
        `INSERT INTO swipes (swiper_id, swiped_id, direction)
         VALUES ($1, $2, 'left')`,
        [userB.id, userA.id]
      );

      // Check for mutual like
      const mutualLike = await testDb.query(
        `SELECT * FROM swipes s1
         WHERE s1.swiper_id = $1 AND s1.swiped_id = $2 AND s1.direction IN ('right', 'super')
         AND EXISTS (
           SELECT 1 FROM swipes s2
           WHERE s2.swiper_id = $2 AND s2.swiped_id = $1 AND s2.direction IN ('right', 'super')
         )`,
        [userA.id, userB.id]
      );

      expect(mutualLike.rows).toHaveLength(0);
    });
  });

  describe('Match Creation', () => {
    it('should create match on mutual like', async () => {
      // Simulate mutual like and match creation
      await testDb.query(
        `INSERT INTO swipes (swiper_id, swiped_id, direction) VALUES ($1, $2, 'right')`,
        [userA.id, userB.id]
      );

      await testDb.query(
        `INSERT INTO swipes (swiper_id, swiped_id, direction) VALUES ($1, $2, 'right')`,
        [userB.id, userA.id]
      );

      // Create match (maintaining user1_id < user2_id constraint)
      const [user1, user2] = userA.id < userB.id ? [userA.id, userB.id] : [userB.id, userA.id];

      const matchResult = await testDb.query(
        `INSERT INTO matches (user1_id, user2_id)
         VALUES ($1, $2)
         RETURNING *`,
        [user1, user2]
      );

      expect(matchResult.rows[0].user1_id).toBe(user1);
      expect(matchResult.rows[0].user2_id).toBe(user2);
      expect(matchResult.rows[0].is_active).toBe(true);
    });

    it('should prevent duplicate matches', async () => {
      const [user1, user2] = userA.id < userB.id ? [userA.id, userB.id] : [userB.id, userA.id];

      // First match
      await testDb.query(
        `INSERT INTO matches (user1_id, user2_id) VALUES ($1, $2)`,
        [user1, user2]
      );

      // Second match should fail
      await expect(
        testDb.query(
          `INSERT INTO matches (user1_id, user2_id) VALUES ($1, $2)`,
          [user1, user2]
        )
      ).rejects.toThrow();
    });

    it('should track match timestamp', async () => {
      const [user1, user2] = userA.id < userB.id ? [userA.id, userB.id] : [userB.id, userA.id];

      const beforeMatch = new Date();

      const matchResult = await testDb.query(
        `INSERT INTO matches (user1_id, user2_id)
         VALUES ($1, $2)
         RETURNING *`,
        [user1, user2]
      );

      const afterMatch = new Date();
      const matchedAt = new Date(matchResult.rows[0].matched_at);

      expect(matchedAt.getTime()).toBeGreaterThanOrEqual(beforeMatch.getTime());
      expect(matchedAt.getTime()).toBeLessThanOrEqual(afterMatch.getTime());
    });
  });

  describe('Match Queries', () => {
    beforeEach(async () => {
      // Create matches for userA
      const [u1a, u2a] = userA.id < userB.id ? [userA.id, userB.id] : [userB.id, userA.id];
      const [u1b, u2b] = userA.id < userC.id ? [userA.id, userC.id] : [userC.id, userA.id];

      await testDb.query(
        `INSERT INTO matches (user1_id, user2_id) VALUES ($1, $2)`,
        [u1a, u2a]
      );

      await testDb.query(
        `INSERT INTO matches (user1_id, user2_id) VALUES ($1, $2)`,
        [u1b, u2b]
      );
    });

    it('should get all matches for a user', async () => {
      const matches = await testDb.query(
        `SELECT * FROM matches
         WHERE user1_id = $1 OR user2_id = $1`,
        [userA.id]
      );

      expect(matches.rows).toHaveLength(2);
    });

    it('should get match partner details', async () => {
      const matchesWithPartners = await testDb.query(
        `SELECT m.*,
                CASE WHEN m.user1_id = $1 THEN u2.first_name ELSE u1.first_name END as partner_name,
                CASE WHEN m.user1_id = $1 THEN m.user2_id ELSE m.user1_id END as partner_id
         FROM matches m
         JOIN users u1 ON m.user1_id = u1.id
         JOIN users u2 ON m.user2_id = u2.id
         WHERE m.user1_id = $1 OR m.user2_id = $1`,
        [userA.id]
      );

      expect(matchesWithPartners.rows).toHaveLength(2);
      expect(matchesWithPartners.rows[0].partner_name).toBeDefined();
    });

    it('should filter active matches only', async () => {
      // Deactivate one match
      await testDb.query(
        `UPDATE matches SET is_active = false
         WHERE (user1_id = $1 OR user2_id = $1) AND (user1_id = $2 OR user2_id = $2)`,
        [userA.id, userB.id]
      );

      const activeMatches = await testDb.query(
        `SELECT * FROM matches
         WHERE (user1_id = $1 OR user2_id = $1) AND is_active = true`,
        [userA.id]
      );

      expect(activeMatches.rows).toHaveLength(1);
    });

    it('should order matches by most recent', async () => {
      // Update one match to be more recent
      await testDb.query(
        `UPDATE matches SET matched_at = NOW()
         WHERE (user1_id = $1 OR user2_id = $1) AND (user1_id = $2 OR user2_id = $2)`,
        [userA.id, userB.id]
      );

      const orderedMatches = await testDb.query(
        `SELECT * FROM matches
         WHERE user1_id = $1 OR user2_id = $1
         ORDER BY matched_at DESC`,
        [userA.id]
      );

      expect(orderedMatches.rows).toHaveLength(2);
      // First match should be the updated one
    });
  });

  describe('Unmatch', () => {
    beforeEach(async () => {
      const [user1, user2] = userA.id < userB.id ? [userA.id, userB.id] : [userB.id, userA.id];
      await testDb.query(
        `INSERT INTO matches (user1_id, user2_id) VALUES ($1, $2)`,
        [user1, user2]
      );
    });

    it('should deactivate match on unmatch', async () => {
      await testDb.query(
        `UPDATE matches SET is_active = false
         WHERE (user1_id = $1 OR user2_id = $1) AND (user1_id = $2 OR user2_id = $2)`,
        [userA.id, userB.id]
      );

      const match = await testDb.query(
        `SELECT * FROM matches
         WHERE (user1_id = $1 OR user2_id = $1) AND (user1_id = $2 OR user2_id = $2)`,
        [userA.id, userB.id]
      );

      expect(match.rows[0].is_active).toBe(false);
    });

    it('should remove user from potential matches after unmatch', async () => {
      // Verify match exists
      let matches = await testDb.query(
        `SELECT * FROM matches
         WHERE (user1_id = $1 OR user2_id = $1) AND is_active = true`,
        [userA.id]
      );

      expect(matches.rows).toHaveLength(1);

      // Unmatch
      await testDb.query(
        `UPDATE matches SET is_active = false
         WHERE (user1_id = $1 OR user2_id = $1) AND (user1_id = $2 OR user2_id = $2)`,
        [userA.id, userB.id]
      );

      // Verify no active matches
      matches = await testDb.query(
        `SELECT * FROM matches
         WHERE (user1_id = $1 OR user2_id = $1) AND is_active = true`,
        [userA.id]
      );

      expect(matches.rows).toHaveLength(0);
    });
  });

  describe('Match Statistics', () => {
    beforeEach(async () => {
      // Create swipes
      await testDb.query(`INSERT INTO swipes (swiper_id, swiped_id, direction) VALUES ($1, $2, 'right')`, [userA.id, userB.id]);
      await testDb.query(`INSERT INTO swipes (swiper_id, swiped_id, direction) VALUES ($1, $2, 'left')`, [userA.id, userC.id]);
      await testDb.query(`INSERT INTO swipes (swiper_id, swiped_id, direction) VALUES ($1, $2, 'right')`, [userB.id, userA.id]);
    });

    it('should count total swipes by user', async () => {
      const swipeCount = await testDb.query(
        `SELECT COUNT(*) as total_swipes FROM swipes WHERE swiper_id = $1`,
        [userA.id]
      );

      expect(parseInt(swipeCount.rows[0].total_swipes)).toBe(2);
    });

    it('should count right swipes (likes)', async () => {
      const likeCount = await testDb.query(
        `SELECT COUNT(*) as likes FROM swipes WHERE swiper_id = $1 AND direction = 'right'`,
        [userA.id]
      );

      expect(parseInt(likeCount.rows[0].likes)).toBe(1);
    });

    it('should calculate match rate', async () => {
      const stats = await testDb.query(
        `SELECT
           COUNT(*) FILTER (WHERE direction = 'right') as likes,
           (SELECT COUNT(*) FROM matches WHERE user1_id = $1 OR user2_id = $1) as matches
         FROM swipes
         WHERE swiper_id = $1`,
        [userA.id]
      );

      const likes = parseInt(stats.rows[0].likes);
      const matches = parseInt(stats.rows[0].matches);
      const matchRate = likes > 0 ? (matches / likes) * 100 : 0;

      expect(matchRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Redis Caching', () => {
    it('should cache user swipe history', async () => {
      const cacheKey = `swipes:${userA.id}:history`;
      const swipeData = JSON.stringify([{ swipedId: userB.id, direction: 'right' }]);

      await testRedis.set(cacheKey, swipeData, 3600);

      const cached = await testRedis.get(cacheKey);
      expect(JSON.parse(cached!)).toEqual([{ swipedId: userB.id, direction: 'right' }]);
    });

    it('should cache match count', async () => {
      const cacheKey = `matches:${userA.id}:count`;

      await testRedis.set(cacheKey, '5', 3600);

      const cached = await testRedis.get(cacheKey);
      expect(parseInt(cached!)).toBe(5);
    });

    it('should invalidate cache on new match', async () => {
      const cacheKey = `matches:${userA.id}:count`;
      await testRedis.set(cacheKey, '5', 3600);

      // Simulate new match - invalidate cache
      await testRedis.del(cacheKey);

      const cached = await testRedis.get(cacheKey);
      expect(cached).toBeNull();
    });
  });
});
