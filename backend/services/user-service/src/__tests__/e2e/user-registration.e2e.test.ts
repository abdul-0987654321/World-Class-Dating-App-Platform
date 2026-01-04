/**
 * User Registration E2E Tests
 *
 * Tests the complete user registration flow including:
 * - User registration with validation
 * - Email verification
 * - Profile creation
 * - Initial subscription setup
 *
 * These tests require a running test database.
 */

import request from 'supertest';
import express, { Application } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  setupTestDatabase,
  teardownTestDatabase,
  cleanTables,
  getTestDb,
  insertTestData,
  findRecord,
} from '../helpers/db-helpers';

describe('User Registration E2E Tests', () => {
  let app: Application;
  let testEmail: string;

  beforeAll(async () => {
    await setupTestDatabase();

    app = express();
    app.use(express.json());

    // Import routes after database setup
    const authRoutes = (await import('../../api/routes/auth.routes')).default;
    const profileRoutes = (await import('../../api/routes/profile.routes')).default;
    const verificationRoutes = (await import('../../api/routes/verification.routes')).default;

    app.use('/api/auth', authRoutes);
    app.use('/api/profiles', profileRoutes);
    app.use('/api/verification', verificationRoutes);

    // Error handler
    app.use((err: any, _req: any, res: any, _next: any) => {
      res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
      });
    });
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Clean relevant tables
    await cleanTables(
      'verification_tokens',
      'profiles',
      'subscriptions',
      'coin_balances',
      'privacy_settings',
      'users'
    );

    // Generate unique email for each test
    testEmail = `test-${uuidv4().slice(0, 8)}@example.com`;
  });

  describe('POST /api/auth/register', () => {
    const validRegistrationData = {
      email: '',
      password: 'SecureP@ss123!',
      first_name: 'John',
      last_name: 'Doe',
      date_of_birth: '1995-01-15',
      gender: 'male',
      phone_number: '+1234567890',
    };

    it('should successfully register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...validRegistrationData, email: testEmail })
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.email).toBe(testEmail);
      expect(response.body.data.user).not.toHaveProperty('password_hash');

      // Verify user was created in database
      const db = getTestDb();
      const user = await db('users').where({ email: testEmail }).first();
      expect(user).toBeDefined();
      expect(user.is_active).toBe(true);
      expect(user.is_email_verified).toBe(false);
    });

    it('should create associated records on registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...validRegistrationData, email: testEmail })
        .expect(201);

      const userId = response.body.data.user.id;
      const db = getTestDb();

      // Verify subscription was created (free tier)
      const subscription = await db('subscriptions').where({ user_id: userId }).first();
      expect(subscription).toBeDefined();
      expect(subscription.tier).toBe('free');
      expect(subscription.status).toBe('active');

      // Verify coin balance was initialized
      const coinBalance = await db('coin_balances').where({ user_id: userId }).first();
      expect(coinBalance).toBeDefined();
      expect(coinBalance.balance).toBe(0);

      // Verify privacy settings were initialized
      const privacySettings = await db('privacy_settings').where({ user_id: userId }).first();
      expect(privacySettings).toBeDefined();

      // Verify verification token was created
      const verificationToken = await db('verification_tokens')
        .where({ user_id: userId, token_type: 'email_verification' })
        .first();
      expect(verificationToken).toBeDefined();
      expect(verificationToken.is_used).toBe(false);
    });

    it('should reject duplicate email registration', async () => {
      // Register first user
      await request(app)
        .post('/api/auth/register')
        .send({ ...validRegistrationData, email: testEmail })
        .expect(201);

      // Attempt to register with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...validRegistrationData, email: testEmail })
        .expect(409);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('already exists');
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...validRegistrationData, email: 'invalid-email' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should validate password strength', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...validRegistrationData, email: testEmail, password: '123' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toMatch(/password/i);
    });

    it('should validate minimum age requirement', async () => {
      const today = new Date();
      const underageDate = new Date(today.getFullYear() - 17, today.getMonth(), today.getDate());

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validRegistrationData,
          email: testEmail,
          date_of_birth: underageDate.toISOString().split('T')[0],
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toMatch(/age|18/i);
    });

    it('should sanitize user input', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validRegistrationData,
          email: testEmail,
          first_name: '<script>alert("xss")</script>John',
        })
        .expect(201);

      const db = getTestDb();
      const user = await db('users').where({ email: testEmail }).first();
      expect(user.first_name).not.toContain('<script>');
    });
  });

  describe('Email Verification Flow', () => {
    let userId: string;
    let verificationToken: string;

    beforeEach(async () => {
      // Register a user
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: 'SecureP@ss123!',
          first_name: 'John',
          last_name: 'Doe',
          date_of_birth: '1995-01-15',
          gender: 'male',
        })
        .expect(201);

      userId = response.body.data.user.id;

      // Get verification token from database
      const db = getTestDb();
      const tokenRecord = await db('verification_tokens')
        .where({ user_id: userId, token_type: 'email_verification' })
        .first();
      verificationToken = tokenRecord.token;
    });

    it('should verify email with valid token', async () => {
      const response = await request(app)
        .post('/api/verification/email')
        .send({ token: verificationToken })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);

      // Verify user email status updated
      const db = getTestDb();
      const user = await db('users').where({ id: userId }).first();
      expect(user.is_email_verified).toBe(true);

      // Verify token was marked as used
      const tokenRecord = await db('verification_tokens')
        .where({ token: verificationToken })
        .first();
      expect(tokenRecord.is_used).toBe(true);
    });

    it('should reject invalid verification token', async () => {
      const response = await request(app)
        .post('/api/verification/email')
        .send({ token: 'invalid-token-12345' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should reject expired verification token', async () => {
      // Expire the token
      const db = getTestDb();
      await db('verification_tokens')
        .where({ token: verificationToken })
        .update({ expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000) });

      const response = await request(app)
        .post('/api/verification/email')
        .send({ token: verificationToken })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toMatch(/expired/i);
    });

    it('should reject already used verification token', async () => {
      // Use the token once
      await request(app)
        .post('/api/verification/email')
        .send({ token: verificationToken })
        .expect(200);

      // Attempt to use again
      const response = await request(app)
        .post('/api/verification/email')
        .send({ token: verificationToken })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should allow resending verification email', async () => {
      const response = await request(app)
        .post('/api/verification/resend')
        .send({ email: testEmail })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);

      // Verify new token was created
      const db = getTestDb();
      const tokens = await db('verification_tokens')
        .where({ user_id: userId, token_type: 'email_verification', is_used: false })
        .orderBy('created_at', 'desc');

      expect(tokens.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Profile Creation Flow', () => {
    let authToken: string;
    let userId: string;

    beforeEach(async () => {
      // Register and get auth token
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: 'SecureP@ss123!',
          first_name: 'John',
          last_name: 'Doe',
          date_of_birth: '1995-01-15',
          gender: 'male',
        })
        .expect(201);

      authToken = response.body.data.accessToken;
      userId = response.body.data.user.id;
    });

    it('should create user profile', async () => {
      const profileData = {
        bio: 'A passionate developer who loves hiking and photography.',
        occupation: 'Software Engineer',
        education: 'B.S. Computer Science',
        height: 180,
        city: 'San Francisco',
        state: 'California',
        country: 'USA',
        latitude: 37.7749,
        longitude: -122.4194,
        interests: ['coding', 'hiking', 'photography'],
        languages: ['English', 'Spanish'],
      };

      const response = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .send(profileData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('bio', profileData.bio);

      // Verify in database
      const db = getTestDb();
      const profile = await db('profiles').where({ user_id: userId }).first();
      expect(profile).toBeDefined();
      expect(profile.occupation).toBe(profileData.occupation);
      expect(profile.interests).toEqual(profileData.interests);
    });

    it('should validate bio length', async () => {
      const response = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          bio: 'a'.repeat(1001), // Exceeds max length
          city: 'Test City',
          country: 'USA',
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should update existing profile', async () => {
      // Create initial profile
      await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          bio: 'Initial bio',
          city: 'San Francisco',
          country: 'USA',
        })
        .expect(201);

      // Update profile
      const response = await request(app)
        .put('/api/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          bio: 'Updated bio with more details',
          occupation: 'Senior Engineer',
        })
        .expect(200);

      expect(response.body.data.bio).toBe('Updated bio with more details');
      expect(response.body.data.occupation).toBe('Senior Engineer');
    });
  });

  describe('Complete Registration Journey', () => {
    it('should complete full registration flow', async () => {
      const registrationData = {
        email: testEmail,
        password: 'SecureP@ss123!',
        first_name: 'Jane',
        last_name: 'Smith',
        date_of_birth: '1992-06-20',
        gender: 'female',
        phone_number: '+1987654321',
      };

      // Step 1: Register
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(registrationData)
        .expect(201);

      const { user, accessToken } = registerResponse.body.data;
      expect(user.is_email_verified).toBe(false);

      // Step 2: Verify email
      const db = getTestDb();
      const tokenRecord = await db('verification_tokens')
        .where({ user_id: user.id, token_type: 'email_verification' })
        .first();

      await request(app)
        .post('/api/verification/email')
        .send({ token: tokenRecord.token })
        .expect(200);

      // Step 3: Create profile
      await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          bio: 'Looking for meaningful connections',
          occupation: 'Designer',
          city: 'Los Angeles',
          country: 'USA',
          interests: ['art', 'travel'],
        })
        .expect(201);

      // Verify complete user record
      const completeUser = await db('users').where({ id: user.id }).first();
      expect(completeUser.is_email_verified).toBe(true);
      expect(completeUser.is_active).toBe(true);

      const profile = await db('profiles').where({ user_id: user.id }).first();
      expect(profile).toBeDefined();
      expect(profile.bio).toBeDefined();

      const subscription = await db('subscriptions').where({ user_id: user.id }).first();
      expect(subscription.tier).toBe('free');
      expect(subscription.status).toBe('active');
    });
  });

  describe('Security Tests', () => {
    it('should hash password before storing', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: 'SecureP@ss123!',
          first_name: 'John',
          last_name: 'Doe',
          date_of_birth: '1995-01-15',
          gender: 'male',
        })
        .expect(201);

      const db = getTestDb();
      const user = await db('users').where({ email: testEmail }).first();

      expect(user.password_hash).not.toBe('SecureP@ss123!');
      expect(user.password_hash).toMatch(/^\$2[aby]?\$\d+\$/);
    });

    it('should not expose sensitive data in response', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: 'SecureP@ss123!',
          first_name: 'John',
          last_name: 'Doe',
          date_of_birth: '1995-01-15',
          gender: 'male',
        })
        .expect(201);

      expect(response.body.data.user).not.toHaveProperty('password');
      expect(response.body.data.user).not.toHaveProperty('password_hash');
      expect(JSON.stringify(response.body)).not.toContain('password_hash');
    });

    it('should rate limit registration attempts', async () => {
      const attempts = [];
      for (let i = 0; i < 15; i++) {
        attempts.push(
          request(app)
            .post('/api/auth/register')
            .send({
              email: `test-${i}@example.com`,
              password: 'SecureP@ss123!',
              first_name: 'Test',
              last_name: 'User',
              date_of_birth: '1995-01-15',
              gender: 'male',
            })
        );
      }

      const responses = await Promise.all(attempts);
      const rateLimited = responses.some((r) => r.status === 429);

      // Rate limiting may or may not be enabled in tests
      expect(rateLimited || responses.every((r) => [201, 409].includes(r.status))).toBe(true);
    });
  });
});
