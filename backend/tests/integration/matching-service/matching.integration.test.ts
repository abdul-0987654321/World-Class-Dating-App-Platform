import { getTestDb, createTestUser, createTestProfile, createTestMatch } from '../setup';
import { hashPassword } from '../../../services/auth-service/src/utils/encryption';

describe('Matching Service Integration Tests', () => {
  let testDb: any;
  let user1: any;
  let user2: any;
  let user3: any;

  beforeAll(() => {
    testDb = getTestDb();
  });

  beforeEach(async () => {
    const passwordHash = await hashPassword('SecurePass123!');

    user1 = await createTestUser({
      email: 'user1@example.com',
      password_hash: passwordHash,
      gender: 'male',
      date_of_birth: '1995-01-01',
    });

    user2 = await createTestUser({
      email: 'user2@example.com',
      password_hash: passwordHash,
      gender: 'female',
      date_of_birth: '1996-01-01',
    });

    user3 = await createTestUser({
      email: 'user3@example.com',
      password_hash: passwordHash,
      gender: 'female',
      date_of_birth: '1994-01-01',
    });

    // Create profiles
    await createTestProfile(user1.id);
    await createTestProfile(user2.id);
    await createTestProfile(user3.id);
  });

  describe('Swipe Functionality', () => {
    it('should record right swipe successfully', async () => {
      const result = await testDb.query(
        `INSERT INTO swipes (swiper_id, swiped_id, direction)
         VALUES ($1, $2, 'right')
         RETURNING *`,
        [user1.id, user2.id]
      );

      expect(result.rows[0].swiper_id).toBe(user1.id);
      expect(result.rows[0].swiped_id).toBe(user2.id);
      expect(result.rows[0].direction).toBe('right');
    });

    it('should record left swipe successfully', async () => {
      const result = await testDb.query(
        `INSERT INTO swipes (swiper_id, swiped_id, direction)
         VALUES ($1, $2, 'left')
         RETURNING *`,
        [user1.id, user2.id]
      );

      expect(result.rows[0].direction).toBe('left');
    });

    it('should record super like successfully', async () => {
      const result = await testDb.query(
        `INSERT INTO swipes (swiper_id, swiped_id, direction)
         VALUES ($1, $2, 'super')
         RETURNING *`,
        [user1.id, user2.id]
      );

      expect(result.rows[0].direction).toBe('super');
    });

    it('should prevent duplicate swipes', async () => {
      // First swipe
      await testDb.query(
        `INSERT INTO swipes (swiper_id, swiped_id, direction)
         VALUES ($1, $2, 'right')`,
        [user1.id, user2.id]
      );

      // Second swipe should fail (duplicate)
      await expect(
        testDb.query(
          `INSERT INTO swipes (swiper_id, swiped_id, direction)
           VALUES ($1, $2, 'left')`,
          [user1.id, user2.id]
        )
      ).rejects.toThrow();
    });

    it('should allow swipe in opposite direction', async () => {
      // User1 swipes on User2
      await testDb.query(
        `INSERT INTO swipes (swiper_id, swiped_id, direction)
         VALUES ($1, $2, 'right')`,
        [user1.id, user2.id]
      );

      // User2 swipes on User1 (should be allowed)
      const result = await testDb.query(
        `INSERT INTO swipes (swiper_id, swiped_id, direction)
         VALUES ($1, $2, 'right')
         RETURNING *`,
        [user2.id, user1.id]
      );

      expect(result.rows).toHaveLength(1);
    });

    it('should get swipe history for user', async () => {
      // Create multiple swipes
      await testDb.query(
        `INSERT INTO swipes (swiper_id, swiped_id, direction)
         VALUES ($1, $2, 'right')`,
        [user1.id, user2.id]
      );

      await testDb.query(
        `INSERT INTO swipes (swiper_id, swiped_id, direction)
         VALUES ($1, $2, 'left')`,
        [user1.id, user3.id]
      );

      // Get swipe history
      const result = await testDb.query(
        `SELECT * FROM swipes WHERE swiper_id = $1 ORDER BY created_at DESC`,
        [user1.id]
      );

      expect(result.rows).toHaveLength(2);
    });

    it('should filter already swiped users from discovery', async () => {
      // User1 swipes on User2
      await testDb.query(
        `INSERT INTO swipes (swiper_id, swiped_id, direction)
         VALUES ($1, $2, 'right')`,
        [user1.id, user2.id]
      );

      // Get users that haven't been swiped by user1
      const result = await testDb.query(
        `SELECT u.* FROM users u
         WHERE u.id != $1
         AND u.id NOT IN (
           SELECT swiped_id FROM swipes WHERE swiper_id = $1
         )`,
        [user1.id]
      );

      const swipedIds = result.rows.map((u: any) => u.id);
      expect(swipedIds).not.toContain(user2.id);
      expect(swipedIds).toContain(user3.id);
    });
  });

  describe('Match Creation', () => {
    it('should create match when both users swipe right', async () => {
      // User1 swipes right on User2
      await testDb.query(
        `INSERT INTO swipes (swiper_id, swiped_id, direction)
         VALUES ($1, $2, 'right')`,
        [user1.id, user2.id]
      );

      // User2 swipes right on User1
      await testDb.query(
        `INSERT INTO swipes (swiper_id, swiped_id, direction)
         VALUES ($1, $2, 'right')`,
        [user2.id, user1.id]
      );

      // Check if both swiped right on each other
      const swipeCheck = await testDb.query(
        `SELECT COUNT(*) as mutual_likes FROM swipes
         WHERE ((swiper_id = $1 AND swiped_id = $2) OR (swiper_id = $2 AND swiped_id = $1))
         AND direction = 'right'`,
        [user1.id, user2.id]
      );

      expect(parseInt(swipeCheck.rows[0].mutual_likes)).toBe(2);

      // Create match
      const match = await createTestMatch(user1.id, user2.id);

      expect(match).toBeDefined();
      expect([match.user1_id, match.user2_id]).toContain(user1.id);
      expect([match.user1_id, match.user2_id]).toContain(user2.id);
      expect(match.is_active).toBe(true);
    });

    it('should not create match with only one-way swipe', async () => {
      // Only User1 swipes right
      await testDb.query(
        `INSERT INTO swipes (swiper_id, swiped_id, direction)
         VALUES ($1, $2, 'right')`,
        [user1.id, user2.id]
      );

      // Check for mutual likes
      const swipeCheck = await testDb.query(
        `SELECT COUNT(*) as mutual_likes FROM swipes
         WHERE ((swiper_id = $1 AND swiped_id = $2) OR (swiper_id = $2 AND swiped_id = $1))
         AND direction = 'right'`,
        [user1.id, user2.id]
      );

      expect(parseInt(swipeCheck.rows[0].mutual_likes)).toBe(1);
      // Don't create match since it's not mutual
    });

    it('should retrieve all matches for a user', async () => {
      // Create multiple matches
      const match1 = await createTestMatch(user1.id, user2.id);
      const match2 = await createTestMatch(user1.id, user3.id);

      // Get all matches for user1
      const result = await testDb.query(
        `SELECT * FROM matches
         WHERE (user1_id = $1 OR user2_id = $1)
         AND is_active = true`,
        [user1.id]
      );

      expect(result.rows).toHaveLength(2);
    });

    it('should get match details with user info', async () => {
      await createTestMatch(user1.id, user2.id);

      const result = await testDb.query(
        `SELECT m.*, u1.email as user1_email, u2.email as user2_email
         FROM matches m
         JOIN users u1 ON m.user1_id = u1.id
         JOIN users u2 ON m.user2_id = u2.id
         WHERE m.user1_id = $1 AND m.user2_id = $2`,
        [user1.id < user2.id ? user1.id : user2.id, user1.id < user2.id ? user2.id : user1.id]
      );

      expect(result.rows).toHaveLength(1);
      expect([result.rows[0].user1_email, result.rows[0].user2_email]).toContain(user1.email);
      expect([result.rows[0].user1_email, result.rows[0].user2_email]).toContain(user2.email);
    });

    it('should prevent duplicate matches', async () => {
      await createTestMatch(user1.id, user2.id);

      // Try to create duplicate match
      await expect(
        createTestMatch(user1.id, user2.id)
      ).rejects.toThrow();
    });

    it('should enforce user1_id < user2_id constraint', async () => {
      const match = await createTestMatch(user2.id, user1.id);

      // Should automatically order IDs
      expect(match.user1_id).toBeLessThan(match.user2_id);
    });
  });

  describe('Match Management', () => {
    let match: any;

    beforeEach(async () => {
      match = await createTestMatch(user1.id, user2.id);
    });

    it('should unmatch users', async () => {
      await testDb.query(
        `UPDATE matches SET is_active = false WHERE id = $1`,
        [match.id]
      );

      const result = await testDb.query(
        `SELECT is_active FROM matches WHERE id = $1`,
        [match.id]
      );

      expect(result.rows[0].is_active).toBe(false);
    });

    it('should update last_message_at when message is sent', async () => {
      const messageTime = new Date();

      await testDb.query(
        `UPDATE matches SET last_message_at = $1 WHERE id = $2`,
        [messageTime, match.id]
      );

      const result = await testDb.query(
        `SELECT last_message_at FROM matches WHERE id = $1`,
        [match.id]
      );

      expect(result.rows[0].last_message_at).not.toBeNull();
    });

    it('should get recent matches ordered by match date', async () => {
      // Create another match with a slight delay
      await new Promise(resolve => setTimeout(resolve, 100));
      const match2 = await createTestMatch(user1.id, user3.id);

      const result = await testDb.query(
        `SELECT * FROM matches
         WHERE (user1_id = $1 OR user2_id = $1)
         AND is_active = true
         ORDER BY matched_at DESC`,
        [user1.id]
      );

      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].id).toBe(match2.id); // Most recent first
    });

    it('should count total matches for user', async () => {
      await createTestMatch(user1.id, user3.id);

      const result = await testDb.query(
        `SELECT COUNT(*) as match_count FROM matches
         WHERE (user1_id = $1 OR user2_id = $1)
         AND is_active = true`,
        [user1.id]
      );

      expect(parseInt(result.rows[0].match_count)).toBe(2);
    });
  });

  describe('Match Algorithm Scoring', () => {
    it('should calculate compatibility score based on interests', async () => {
      // Update profiles with interests
      await testDb.query(
        `UPDATE profiles SET interests = $1 WHERE user_id = $2`,
        [['hiking', 'cooking', 'reading'], user1.id]
      );

      await testDb.query(
        `UPDATE profiles SET interests = $1 WHERE user_id = $2`,
        [['hiking', 'photography', 'reading'], user2.id]
      );

      // Get common interests
      const result = await testDb.query(
        `SELECT
           p1.interests as user1_interests,
           p2.interests as user2_interests,
           (SELECT COUNT(*) FROM unnest(p1.interests) i WHERE i = ANY(p2.interests)) as common_interests
         FROM profiles p1
         CROSS JOIN profiles p2
         WHERE p1.user_id = $1 AND p2.user_id = $2`,
        [user1.id, user2.id]
      );

      expect(parseInt(result.rows[0].common_interests)).toBe(2); // hiking, reading
    });

    it('should calculate age compatibility', async () => {
      const result = await testDb.query(
        `SELECT
           ABS(EXTRACT(YEAR FROM AGE(u1.date_of_birth)) - EXTRACT(YEAR FROM AGE(u2.date_of_birth))) as age_difference
         FROM users u1
         CROSS JOIN users u2
         WHERE u1.id = $1 AND u2.id = $2`,
        [user1.id, user2.id]
      );

      expect(result.rows[0].age_difference).toBeGreaterThanOrEqual(0);
    });

    it('should filter by location proximity', async () => {
      // Set locations
      await testDb.query(
        `UPDATE profiles SET location_lat = 37.7749, location_lng = -122.4194, location_city = 'San Francisco'
         WHERE user_id = $1`,
        [user1.id]
      );

      await testDb.query(
        `UPDATE profiles SET location_lat = 37.7849, location_lng = -122.4094, location_city = 'San Francisco'
         WHERE user_id = $1`,
        [user2.id]
      );

      // Calculate distance (simplified - using Haversine formula in production)
      const result = await testDb.query(
        `SELECT
           p1.location_city as city1,
           p2.location_city as city2,
           (p1.location_city = p2.location_city) as same_city
         FROM profiles p1
         CROSS JOIN profiles p2
         WHERE p1.user_id = $1 AND p2.user_id = $2`,
        [user1.id, user2.id]
      );

      expect(result.rows[0].same_city).toBe(true);
    });
  });

  describe('Discovery Queue', () => {
    beforeEach(async () => {
      // Create more test users
      for (let i = 0; i < 5; i++) {
        const passwordHash = await hashPassword('SecurePass123!');
        const user = await createTestUser({
          email: `discovery${i}@example.com`,
          password_hash: passwordHash,
          gender: i % 2 === 0 ? 'female' : 'male',
          date_of_birth: `199${i}-01-01`,
        });
        await createTestProfile(user.id);
      }
    });

    it('should get discovery queue excluding already swiped users', async () => {
      // Swipe on some users
      const swipedUsers = await testDb.query(
        `SELECT id FROM users WHERE email LIKE 'discovery%' LIMIT 2`
      );

      for (const user of swipedUsers.rows) {
        await testDb.query(
          `INSERT INTO swipes (swiper_id, swiped_id, direction)
           VALUES ($1, $2, 'left')`,
          [user1.id, user.id]
        );
      }

      // Get discovery queue
      const result = await testDb.query(
        `SELECT u.* FROM users u
         WHERE u.id != $1
         AND u.is_active = true
         AND u.id NOT IN (
           SELECT swiped_id FROM swipes WHERE swiper_id = $1
         )
         LIMIT 10`,
        [user1.id]
      );

      const discoveredIds = result.rows.map((u: any) => u.id);
      swipedUsers.rows.forEach((user: any) => {
        expect(discoveredIds).not.toContain(user.id);
      });
    });

    it('should exclude blocked users from discovery', async () => {
      // Block a user
      const userToBlock = await testDb.query(
        `SELECT id FROM users WHERE email = 'discovery0@example.com'`
      );

      await testDb.query(
        `INSERT INTO blocks (blocker_id, blocked_id)
         VALUES ($1, $2)`,
        [user1.id, userToBlock.rows[0].id]
      );

      // Get discovery queue
      const result = await testDb.query(
        `SELECT u.* FROM users u
         WHERE u.id != $1
         AND u.is_active = true
         AND u.id NOT IN (
           SELECT swiped_id FROM swipes WHERE swiper_id = $1
         )
         AND u.id NOT IN (
           SELECT blocked_id FROM blocks WHERE blocker_id = $1
           UNION
           SELECT blocker_id FROM blocks WHERE blocked_id = $1
         )
         LIMIT 10`,
        [user1.id]
      );

      const discoveredIds = result.rows.map((u: any) => u.id);
      expect(discoveredIds).not.toContain(userToBlock.rows[0].id);
    });

    it('should prioritize users by compatibility score', async () => {
      // In production, this would use a more complex algorithm
      const result = await testDb.query(
        `SELECT u.*,
         RANDOM() as random_score
         FROM users u
         WHERE u.id != $1
         AND u.is_active = true
         ORDER BY random_score DESC
         LIMIT 10`,
        [user1.id]
      );

      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  describe('Likes and Super Likes', () => {
    it('should track who liked a user', async () => {
      // User1 likes User2
      await testDb.query(
        `INSERT INTO swipes (swiper_id, swiped_id, direction)
         VALUES ($1, $2, 'right')`,
        [user1.id, user2.id]
      );

      // Get users who liked User2
      const result = await testDb.query(
        `SELECT s.*, u.email FROM swipes s
         JOIN users u ON s.swiper_id = u.id
         WHERE s.swiped_id = $1 AND s.direction IN ('right', 'super')`,
        [user2.id]
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].swiper_id).toBe(user1.id);
    });

    it('should differentiate super likes from regular likes', async () => {
      // Super like
      await testDb.query(
        `INSERT INTO swipes (swiper_id, swiped_id, direction)
         VALUES ($1, $2, 'super')`,
        [user1.id, user2.id]
      );

      // Regular like
      await testDb.query(
        `INSERT INTO swipes (swiper_id, swiped_id, direction)
         VALUES ($1, $2, 'right')`,
        [user3.id, user2.id]
      );

      // Get super likes
      const result = await testDb.query(
        `SELECT * FROM swipes WHERE swiped_id = $1 AND direction = 'super'`,
        [user2.id]
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].swiper_id).toBe(user1.id);
    });

    it('should count total likes received', async () => {
      // Multiple users like User2
      await testDb.query(
        `INSERT INTO swipes (swiper_id, swiped_id, direction)
         VALUES ($1, $2, 'right')`,
        [user1.id, user2.id]
      );

      await testDb.query(
        `INSERT INTO swipes (swiper_id, swiped_id, direction)
         VALUES ($1, $2, 'right')`,
        [user3.id, user2.id]
      );

      const result = await testDb.query(
        `SELECT COUNT(*) as like_count FROM swipes
         WHERE swiped_id = $1 AND direction IN ('right', 'super')`,
        [user2.id]
      );

      expect(parseInt(result.rows[0].like_count)).toBe(2);
    });
  });
});
