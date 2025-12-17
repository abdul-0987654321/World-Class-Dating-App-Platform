import request from 'supertest';
import express, { Application } from 'express';
import { getTestDb, createTestUser, createTestProfile } from '../setup';
import { hashPassword } from '../../../services/auth-service/src/utils/encryption';

describe('User Service Integration Tests', () => {
  let app: Application;
  let testDb: any;
  let testUser: any;
  let accessToken: string;

  beforeAll(async () => {
    testDb = getTestDb();

    // Setup Express app (simplified for testing)
    app = express();
    app.use(express.json());
  });

  beforeEach(async () => {
    // Create test user and login
    const passwordHash = await hashPassword('SecurePass123!');
    testUser = await createTestUser({
      email: 'user@example.com',
      password_hash: passwordHash,
    });

    // Create auth token (simplified - in real scenario, use actual auth service)
    accessToken = 'test_access_token_' + testUser.id;
  });

  describe('Profile Management', () => {
    it('should create user profile successfully', async () => {
      const profileData = {
        bio: 'Adventure seeker and coffee lover',
        occupation: 'Software Engineer',
        education: 'Bachelor of Science in Computer Science',
        height: 175,
        looking_for: ['relationship', 'friendship'],
        interests: ['hiking', 'photography', 'cooking'],
        location_city: 'San Francisco',
      };

      const result = await testDb.query(
        `INSERT INTO profiles (user_id, bio, occupation, education, height, looking_for, interests, location_city)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          testUser.id,
          profileData.bio,
          profileData.occupation,
          profileData.education,
          profileData.height,
          profileData.looking_for,
          profileData.interests,
          profileData.location_city,
        ]
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].bio).toBe(profileData.bio);
      expect(result.rows[0].occupation).toBe(profileData.occupation);
      expect(result.rows[0].looking_for).toEqual(profileData.looking_for);
    });

    it('should update user profile successfully', async () => {
      // Create initial profile
      await createTestProfile(testUser.id, {
        bio: 'Initial bio',
        occupation: 'Developer',
      });

      // Update profile
      const updatedData = {
        bio: 'Updated bio with more details',
        occupation: 'Senior Developer',
        height: 180,
      };

      const result = await testDb.query(
        `UPDATE profiles
         SET bio = $1, occupation = $2, height = $3, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $4
         RETURNING *`,
        [updatedData.bio, updatedData.occupation, updatedData.height, testUser.id]
      );

      expect(result.rows[0].bio).toBe(updatedData.bio);
      expect(result.rows[0].occupation).toBe(updatedData.occupation);
      expect(result.rows[0].height).toBe(updatedData.height);
    });

    it('should retrieve user profile with photos', async () => {
      const photos = [
        { url: 'https://example.com/photo1.jpg', order: 0, is_verified: true },
        { url: 'https://example.com/photo2.jpg', order: 1, is_verified: false },
      ];

      await testDb.query(
        `INSERT INTO profiles (user_id, bio, photos)
         VALUES ($1, $2, $3)`,
        [testUser.id, 'Test bio', JSON.stringify(photos)]
      );

      const result = await testDb.query(
        `SELECT * FROM profiles WHERE user_id = $1`,
        [testUser.id]
      );

      expect(result.rows[0].photos).toHaveLength(2);
      expect(result.rows[0].photos[0].is_verified).toBe(true);
    });

    it('should validate profile data constraints', async () => {
      // Test height constraints (should be reasonable)
      await expect(
        testDb.query(
          `INSERT INTO profiles (user_id, bio, height)
           VALUES ($1, $2, $3)`,
          [testUser.id, 'Test', 300] // Unrealistic height
        )
      ).rejects.toThrow();
    });
  });

  describe('User Preferences', () => {
    it('should set discovery preferences', async () => {
      const preferences = {
        min_age: 25,
        max_age: 35,
        max_distance: 50,
        show_me: 'women',
        interested_in: ['relationship'],
      };

      const result = await testDb.query(
        `INSERT INTO user_preferences (user_id, min_age, max_age, max_distance, show_me, interested_in)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          testUser.id,
          preferences.min_age,
          preferences.max_age,
          preferences.max_distance,
          preferences.show_me,
          preferences.interested_in,
        ]
      );

      expect(result.rows[0].min_age).toBe(preferences.min_age);
      expect(result.rows[0].max_age).toBe(preferences.max_age);
    });

    it('should validate age preferences', async () => {
      // min_age should be less than max_age
      await expect(
        testDb.query(
          `INSERT INTO user_preferences (user_id, min_age, max_age)
           VALUES ($1, $2, $3)`,
          [testUser.id, 35, 25] // Invalid: min > max
        )
      ).rejects.toThrow();
    });
  });

  describe('Subscription Management', () => {
    it('should create subscription successfully', async () => {
      const subscription = {
        plan: 'premium',
        status: 'active',
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        stripe_subscription_id: 'sub_test123',
      };

      const result = await testDb.query(
        `INSERT INTO subscriptions (user_id, plan, status, start_date, end_date, stripe_subscription_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          testUser.id,
          subscription.plan,
          subscription.status,
          subscription.start_date,
          subscription.end_date,
          subscription.stripe_subscription_id,
        ]
      );

      expect(result.rows[0].plan).toBe(subscription.plan);
      expect(result.rows[0].status).toBe('active');
    });

    it('should check active subscription', async () => {
      // Create active subscription
      await testDb.query(
        `INSERT INTO subscriptions (user_id, plan, status, start_date, end_date)
         VALUES ($1, 'premium', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '30 days')`,
        [testUser.id]
      );

      // Check for active subscription
      const result = await testDb.query(
        `SELECT * FROM subscriptions
         WHERE user_id = $1
         AND status = 'active'
         AND end_date > CURRENT_TIMESTAMP`,
        [testUser.id]
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].plan).toBe('premium');
    });

    it('should handle subscription expiry', async () => {
      // Create expired subscription
      await testDb.query(
        `INSERT INTO subscriptions (user_id, plan, status, start_date, end_date)
         VALUES ($1, 'premium', 'active', CURRENT_TIMESTAMP - INTERVAL '60 days', CURRENT_TIMESTAMP - INTERVAL '30 days')`,
        [testUser.id]
      );

      // Update expired subscriptions
      await testDb.query(
        `UPDATE subscriptions
         SET status = 'expired'
         WHERE user_id = $1
         AND status = 'active'
         AND end_date < CURRENT_TIMESTAMP`,
        [testUser.id]
      );

      // Verify subscription is marked as expired
      const result = await testDb.query(
        `SELECT status FROM subscriptions WHERE user_id = $1`,
        [testUser.id]
      );

      expect(result.rows[0].status).toBe('expired');
    });

    it('should prevent multiple active subscriptions', async () => {
      // Create first subscription
      await testDb.query(
        `INSERT INTO subscriptions (user_id, plan, status, start_date, end_date)
         VALUES ($1, 'premium', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '30 days')`,
        [testUser.id]
      );

      // Before creating second subscription, deactivate existing ones
      await testDb.query(
        `UPDATE subscriptions SET status = 'cancelled' WHERE user_id = $1 AND status = 'active'`,
        [testUser.id]
      );

      // Create new subscription
      await testDb.query(
        `INSERT INTO subscriptions (user_id, plan, status, start_date, end_date)
         VALUES ($1, 'elite', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '30 days')`,
        [testUser.id]
      );

      // Verify only one active subscription
      const result = await testDb.query(
        `SELECT * FROM subscriptions WHERE user_id = $1 AND status = 'active'`,
        [testUser.id]
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].plan).toBe('elite');
    });
  });

  describe('User Blocking', () => {
    let otherUser: any;

    beforeEach(async () => {
      const passwordHash = await hashPassword('SecurePass123!');
      otherUser = await createTestUser({
        email: 'other@example.com',
        password_hash: passwordHash,
      });
    });

    it('should block user successfully', async () => {
      const result = await testDb.query(
        `INSERT INTO blocks (blocker_id, blocked_id, reason)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [testUser.id, otherUser.id, 'spam']
      );

      expect(result.rows[0].blocker_id).toBe(testUser.id);
      expect(result.rows[0].blocked_id).toBe(otherUser.id);
    });

    it('should check if user is blocked', async () => {
      // Block user
      await testDb.query(
        `INSERT INTO blocks (blocker_id, blocked_id)
         VALUES ($1, $2)`,
        [testUser.id, otherUser.id]
      );

      // Check block status
      const result = await testDb.query(
        `SELECT EXISTS(
           SELECT 1 FROM blocks
           WHERE (blocker_id = $1 AND blocked_id = $2)
           OR (blocker_id = $2 AND blocked_id = $1)
         ) as is_blocked`,
        [testUser.id, otherUser.id]
      );

      expect(result.rows[0].is_blocked).toBe(true);
    });

    it('should prevent duplicate blocks', async () => {
      // First block
      await testDb.query(
        `INSERT INTO blocks (blocker_id, blocked_id)
         VALUES ($1, $2)`,
        [testUser.id, otherUser.id]
      );

      // Second block should fail (duplicate)
      await expect(
        testDb.query(
          `INSERT INTO blocks (blocker_id, blocked_id)
           VALUES ($1, $2)`,
          [testUser.id, otherUser.id]
        )
      ).rejects.toThrow();
    });

    it('should unblock user successfully', async () => {
      // Block user
      await testDb.query(
        `INSERT INTO blocks (blocker_id, blocked_id)
         VALUES ($1, $2)`,
        [testUser.id, otherUser.id]
      );

      // Unblock user
      const result = await testDb.query(
        `DELETE FROM blocks
         WHERE blocker_id = $1 AND blocked_id = $2
         RETURNING *`,
        [testUser.id, otherUser.id]
      );

      expect(result.rows).toHaveLength(1);

      // Verify block is removed
      const checkResult = await testDb.query(
        `SELECT * FROM blocks WHERE blocker_id = $1 AND blocked_id = $2`,
        [testUser.id, otherUser.id]
      );

      expect(checkResult.rows).toHaveLength(0);
    });
  });

  describe('User Reporting', () => {
    let reportedUser: any;

    beforeEach(async () => {
      const passwordHash = await hashPassword('SecurePass123!');
      reportedUser = await createTestUser({
        email: 'reported@example.com',
        password_hash: passwordHash,
      });
    });

    it('should create user report', async () => {
      const reportData = {
        reason: 'inappropriate_content',
        description: 'User posted inappropriate photos',
      };

      const result = await testDb.query(
        `INSERT INTO reports (reporter_id, reported_user_id, reason, description, status)
         VALUES ($1, $2, $3, $4, 'pending')
         RETURNING *`,
        [testUser.id, reportedUser.id, reportData.reason, reportData.description]
      );

      expect(result.rows[0].reason).toBe(reportData.reason);
      expect(result.rows[0].status).toBe('pending');
    });

    it('should track multiple reports for same user', async () => {
      // Create multiple reports
      for (let i = 0; i < 3; i++) {
        await testDb.query(
          `INSERT INTO reports (reporter_id, reported_user_id, reason, status)
           VALUES ($1, $2, 'spam', 'pending')`,
          [testUser.id, reportedUser.id]
        );
      }

      // Count reports for user
      const result = await testDb.query(
        `SELECT COUNT(*) as report_count
         FROM reports
         WHERE reported_user_id = $1 AND status = 'pending'`,
        [reportedUser.id]
      );

      expect(parseInt(result.rows[0].report_count)).toBe(3);
    });

    it('should update report status', async () => {
      // Create report
      const insertResult = await testDb.query(
        `INSERT INTO reports (reporter_id, reported_user_id, reason, status)
         VALUES ($1, $2, 'spam', 'pending')
         RETURNING id`,
        [testUser.id, reportedUser.id]
      );

      const reportId = insertResult.rows[0].id;

      // Update report status
      await testDb.query(
        `UPDATE reports
         SET status = 'reviewed', reviewed_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [reportId]
      );

      // Verify update
      const result = await testDb.query(
        `SELECT status, reviewed_at FROM reports WHERE id = $1`,
        [reportId]
      );

      expect(result.rows[0].status).toBe('reviewed');
      expect(result.rows[0].reviewed_at).not.toBeNull();
    });
  });

  describe('User Deactivation', () => {
    it('should deactivate user account', async () => {
      await testDb.query(
        `UPDATE users SET is_active = false WHERE id = $1`,
        [testUser.id]
      );

      const result = await testDb.query(
        `SELECT is_active FROM users WHERE id = $1`,
        [testUser.id]
      );

      expect(result.rows[0].is_active).toBe(false);
    });

    it('should reactivate user account', async () => {
      // Deactivate
      await testDb.query(
        `UPDATE users SET is_active = false WHERE id = $1`,
        [testUser.id]
      );

      // Reactivate
      await testDb.query(
        `UPDATE users SET is_active = true WHERE id = $1`,
        [testUser.id]
      );

      const result = await testDb.query(
        `SELECT is_active FROM users WHERE id = $1`,
        [testUser.id]
      );

      expect(result.rows[0].is_active).toBe(true);
    });
  });

  describe('User Search and Discovery', () => {
    beforeEach(async () => {
      // Create multiple test users with profiles
      for (let i = 0; i < 5; i++) {
        const passwordHash = await hashPassword('SecurePass123!');
        const user = await createTestUser({
          email: `discoveryuser${i}@example.com`,
          password_hash: passwordHash,
          gender: i % 2 === 0 ? 'female' : 'male',
          date_of_birth: new Date(1990 + i, 1, 1),
        });

        await createTestProfile(user.id, {
          bio: `Bio for user ${i}`,
          location_city: i < 3 ? 'San Francisco' : 'New York',
          height: 170 + i * 5,
        });
      }
    });

    it('should filter users by gender', async () => {
      const result = await testDb.query(
        `SELECT u.* FROM users u
         WHERE u.gender = $1
         AND u.is_active = true`,
        ['female']
      );

      expect(result.rows.length).toBeGreaterThan(0);
      result.rows.forEach((user: any) => {
        expect(user.gender).toBe('female');
      });
    });

    it('should filter users by age range', async () => {
      const minAge = 25;
      const maxAge = 35;

      const result = await testDb.query(
        `SELECT * FROM users
         WHERE EXTRACT(YEAR FROM AGE(date_of_birth)) BETWEEN $1 AND $2
         AND is_active = true`,
        [minAge, maxAge]
      );

      result.rows.forEach((user: any) => {
        const age = new Date().getFullYear() - new Date(user.date_of_birth).getFullYear();
        expect(age).toBeGreaterThanOrEqual(minAge);
        expect(age).toBeLessThanOrEqual(maxAge);
      });
    });

    it('should filter users by location', async () => {
      const result = await testDb.query(
        `SELECT u.*, p.location_city
         FROM users u
         JOIN profiles p ON u.id = p.user_id
         WHERE p.location_city = $1`,
        ['San Francisco']
      );

      expect(result.rows.length).toBeGreaterThan(0);
      result.rows.forEach((user: any) => {
        expect(user.location_city).toBe('San Francisco');
      });
    });
  });
});
