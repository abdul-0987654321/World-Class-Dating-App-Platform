import knex, { Knex } from 'knex';
import config from '../../infrastructure/database/knexfile';

let testDb: Knex | null = null;

/**
 * Get or create a test database connection
 */
export const getTestDb = (): Knex => {
  if (!testDb) {
    const testConfig = config.test;
    testDb = knex(testConfig);
  }
  return testDb;
};

/**
 * Close the test database connection
 */
export const closeTestDb = async (): Promise<void> => {
  if (testDb) {
    await testDb.destroy();
    testDb = null;
  }
};

/**
 * Run all migrations on the test database
 */
export const runMigrations = async (): Promise<void> => {
  const db = getTestDb();
  await db.migrate.latest();
};

/**
 * Rollback all migrations on the test database
 */
export const rollbackMigrations = async (): Promise<void> => {
  const db = getTestDb();
  await db.migrate.rollback(undefined, true); // Rollback all
};

/**
 * Run seed files on the test database
 */
export const runSeeds = async (): Promise<void> => {
  const db = getTestDb();
  await db.seed.run();
};

/**
 * Clean all tables in the test database (except migrations table)
 */
export const cleanDatabase = async (): Promise<void> => {
  const db = getTestDb();

  // List of all tables to clean (in order to respect foreign key constraints)
  const tablesToClean = [
    'boost_instances',
    'boost_products',
    'coin_transactions',
    'coin_balances',
    'coin_products',
    'subscription_features',
    'subscriptions',
    'reports',
    'report_categories',
    'blocks',
    'privacy_settings',
    'verification_tokens',
    'profiles',
    'users',
  ];

  // Disable foreign key checks temporarily
  await db.raw('SET CONSTRAINTS ALL DEFERRED');

  // Truncate all tables
  for (const table of tablesToClean) {
    await db(table).del();
  }

  // Re-enable foreign key checks
  await db.raw('SET CONSTRAINTS ALL IMMEDIATE');
};

/**
 * Clean specific tables
 */
export const cleanTables = async (...tables: string[]): Promise<void> => {
  const db = getTestDb();

  await db.raw('SET CONSTRAINTS ALL DEFERRED');

  for (const table of tables) {
    await db(table).del();
  }

  await db.raw('SET CONSTRAINTS ALL IMMEDIATE');
};

/**
 * Reset the test database (rollback, migrate, and seed)
 */
export const resetDatabase = async (): Promise<void> => {
  await rollbackMigrations();
  await runMigrations();
  await runSeeds();
};

/**
 * Setup test database for E2E tests
 * Call this in beforeAll()
 */
export const setupTestDatabase = async (): Promise<void> => {
  const db = getTestDb();

  // Check if database is accessible
  try {
    await db.raw('SELECT 1');
  } catch (error) {
    throw new Error(
      'Test database is not accessible. Make sure PostgreSQL is running and test database exists.'
    );
  }

  // Run migrations
  await runMigrations();

  // Run seeds to populate reference data
  await runSeeds();
};

/**
 * Teardown test database
 * Call this in afterAll()
 */
export const teardownTestDatabase = async (): Promise<void> => {
  await cleanDatabase();
  await closeTestDb();
};

/**
 * Insert test data into a table
 */
export const insertTestData = async <T>(
  table: string,
  data: T | T[]
): Promise<T[]> => {
  const db = getTestDb();
  const records = Array.isArray(data) ? data : [data];
  const inserted = await db(table).insert(records).returning('*');
  return inserted;
};

/**
 * Find records in a table
 */
export const findRecords = async <T>(
  table: string,
  where: Record<string, any>
): Promise<T[]> => {
  const db = getTestDb();
  return await db(table).where(where).select('*');
};

/**
 * Find a single record
 */
export const findRecord = async <T>(
  table: string,
  where: Record<string, any>
): Promise<T | undefined> => {
  const db = getTestDb();
  return await db(table).where(where).first();
};

/**
 * Update records in a table
 */
export const updateRecords = async <T>(
  table: string,
  where: Record<string, any>,
  updates: Partial<T>
): Promise<T[]> => {
  const db = getTestDb();
  return await db(table).where(where).update(updates).returning('*');
};

/**
 * Delete records from a table
 */
export const deleteRecords = async (
  table: string,
  where: Record<string, any>
): Promise<number> => {
  const db = getTestDb();
  return await db(table).where(where).del();
};

/**
 * Count records in a table
 */
export const countRecords = async (
  table: string,
  where?: Record<string, any>
): Promise<number> => {
  const db = getTestDb();
  const query = where ? db(table).where(where) : db(table);
  const result = await query.count('* as count').first();
  return parseInt(result?.count as string, 10);
};

/**
 * Execute raw SQL query
 */
export const executeRawQuery = async <T>(
  sql: string,
  bindings?: any[]
): Promise<T[]> => {
  const db = getTestDb();
  const result = await db.raw(sql, bindings);
  return result.rows;
};

/**
 * Begin a transaction for testing
 */
export const beginTransaction = async (): Promise<Knex.Transaction> => {
  const db = getTestDb();
  return await db.transaction();
};

/**
 * Create a test user with all related data
 */
export const createTestUserWithProfile = async (userData?: any) => {
  const db = getTestDb();

  const [user] = await db('users')
    .insert({
      email: userData?.email || 'testuser@example.com',
      password_hash: userData?.password_hash || '$2b$10$abcdefg',
      first_name: userData?.first_name || 'Test',
      last_name: userData?.last_name || 'User',
      date_of_birth: userData?.date_of_birth || new Date('1995-01-01'),
      gender: userData?.gender || 'male',
      is_active: true,
      ...userData,
    })
    .returning('*');

  const [profile] = await db('profiles')
    .insert({
      user_id: user.id,
      bio: 'Test bio',
      city: 'Test City',
      country: 'Test Country',
      interests: ['test'],
      languages: ['English'],
    })
    .returning('*');

  const [subscription] = await db('subscriptions')
    .insert({
      user_id: user.id,
      tier: 'free',
      status: 'active',
      start_date: new Date(),
    })
    .returning('*');

  const [coinBalance] = await db('coin_balances')
    .insert({
      user_id: user.id,
      balance: 0,
    })
    .returning('*');

  const [privacySettings] = await db('privacy_settings')
    .insert({
      user_id: user.id,
      profile_visibility: 'everyone',
      show_distance: true,
      show_age: true,
      incognito_mode: false,
    })
    .returning('*');

  return {
    user,
    profile,
    subscription,
    coinBalance,
    privacySettings,
  };
};

/**
 * Utility to wait for async operations in tests
 */
export const waitFor = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
