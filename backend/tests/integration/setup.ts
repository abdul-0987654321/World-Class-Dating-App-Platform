import { Pool } from 'pg';
import Redis from 'ioredis';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Test database connection
let testDb: Pool;
let testRedis: Redis;

// Global setup before all tests
beforeAll(async () => {
  console.log('Setting up integration test environment...');

  // Initialize test database
  testDb = new Pool({
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5432'),
    database: process.env.TEST_DB_NAME || 'flamoral_test',
    user: process.env.TEST_DB_USER || 'postgres',
    password: process.env.TEST_DB_PASSWORD || 'postgres',
  });

  // Initialize test Redis
  testRedis = new Redis({
    host: process.env.TEST_REDIS_HOST || 'localhost',
    port: parseInt(process.env.TEST_REDIS_PORT || '6379'),
    db: parseInt(process.env.TEST_REDIS_DB || '1'), // Use separate DB for tests
  });

  // Run migrations
  await runMigrations();

  console.log('Integration test environment ready');
}, 60000);

// Global teardown after all tests
afterAll(async () => {
  console.log('Tearing down integration test environment...');

  // Clean up database
  await cleanDatabase();

  // Close connections
  await testDb.end();
  await testRedis.quit();

  console.log('Integration test environment cleaned up');
}, 30000);

// Clean database before each test
beforeEach(async () => {
  await cleanDatabase();
  await testRedis.flushdb();
});

async function runMigrations() {
  // Run database migrations
  // This is a simplified version - adapt to your migration tool
  const migrationSql = `
    -- Create users table if not exists
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      date_of_birth DATE NOT NULL,
      gender VARCHAR(50) NOT NULL,
      phone_number VARCHAR(20),
      is_email_verified BOOLEAN DEFAULT FALSE,
      is_phone_verified BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE,
      last_login_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create tokens table
    CREATE TABLE IF NOT EXISTS tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(255) UNIQUE NOT NULL,
      type VARCHAR(50) NOT NULL,
      is_used BOOLEAN DEFAULT FALSE,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create profiles table
    CREATE TABLE IF NOT EXISTS profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      bio TEXT,
      occupation VARCHAR(100),
      education VARCHAR(100),
      height INTEGER,
      looking_for VARCHAR(50)[],
      interests VARCHAR(100)[],
      photos JSONB DEFAULT '[]'::jsonb,
      location_lat DECIMAL(10, 8),
      location_lng DECIMAL(11, 8),
      location_city VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create swipes table
    CREATE TABLE IF NOT EXISTS swipes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      swiper_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      swiped_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      direction VARCHAR(10) NOT NULL CHECK (direction IN ('left', 'right', 'super')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(swiper_id, swiped_id)
    );

    -- Create matches table
    CREATE TABLE IF NOT EXISTS matches (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      matched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT TRUE,
      last_message_at TIMESTAMP,
      CHECK (user1_id < user2_id),
      UNIQUE(user1_id, user2_id)
    );

    -- Create messages table
    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      read_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create subscriptions table
    CREATE TABLE IF NOT EXISTS subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan VARCHAR(50) NOT NULL,
      status VARCHAR(50) NOT NULL,
      start_date TIMESTAMP NOT NULL,
      end_date TIMESTAMP NOT NULL,
      auto_renew BOOLEAN DEFAULT TRUE,
      stripe_subscription_id VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create payments table
    CREATE TABLE IF NOT EXISTS payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount DECIMAL(10, 2) NOT NULL,
      currency VARCHAR(3) DEFAULT 'USD',
      status VARCHAR(50) NOT NULL,
      payment_method VARCHAR(50),
      stripe_payment_intent_id VARCHAR(255),
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await testDb.query(migrationSql);
}

async function cleanDatabase() {
  // Clean all tables in reverse order of dependencies
  const tables = [
    'payments',
    'subscriptions',
    'messages',
    'matches',
    'swipes',
    'profiles',
    'tokens',
    'users',
  ];

  for (const table of tables) {
    await testDb.query(`TRUNCATE TABLE ${table} CASCADE`);
  }
}

// Export test utilities
export const getTestDb = () => testDb;
export const getTestRedis = () => testRedis;

// Test data factories
export const createTestUser = async (overrides: any = {}) => {
  const defaultUser = {
    email: `test${Date.now()}@example.com`,
    password_hash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890',
    first_name: 'Test',
    last_name: 'User',
    date_of_birth: '1995-01-01',
    gender: 'male',
    ...overrides,
  };

  const result = await testDb.query(
    `INSERT INTO users (email, password_hash, first_name, last_name, date_of_birth, gender)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      defaultUser.email,
      defaultUser.password_hash,
      defaultUser.first_name,
      defaultUser.last_name,
      defaultUser.date_of_birth,
      defaultUser.gender,
    ]
  );

  return result.rows[0];
};

export const createTestProfile = async (userId: string, overrides: any = {}) => {
  const defaultProfile = {
    bio: 'Test bio',
    occupation: 'Software Engineer',
    height: 180,
    ...overrides,
  };

  const result = await testDb.query(
    `INSERT INTO profiles (user_id, bio, occupation, height)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, defaultProfile.bio, defaultProfile.occupation, defaultProfile.height]
  );

  return result.rows[0];
};

export const createTestMatch = async (user1Id: string, user2Id: string) => {
  // Ensure user1_id < user2_id for the constraint
  const [userId1, userId2] = user1Id < user2Id ? [user1Id, user2Id] : [user2Id, user1Id];

  const result = await testDb.query(
    `INSERT INTO matches (user1_id, user2_id)
     VALUES ($1, $2)
     RETURNING *`,
    [userId1, userId2]
  );

  return result.rows[0];
};
