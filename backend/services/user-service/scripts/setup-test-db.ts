#!/usr/bin/env ts-node

/**
 * Test Database Setup Script
 *
 * This script sets up the test database by:
 * 1. Creating the test database (if it doesn't exist)
 * 2. Running all migrations
 * 3. Running seed files
 *
 * Usage:
 *   npm run setup:test-db
 *   ts-node scripts/setup-test-db.ts
 */

import knex, { Knex } from 'knex';
import config from '../src/infrastructure/database/knexfile';

const TEST_DB_NAME = 'flamoral_test';

async function setupTestDatabase() {
  console.log('🚀 Starting test database setup...\n');

  let adminDb: Knex | null = null;
  let testDb: Knex | null = null;

  try {
    // Step 1: Connect to postgres database to create test database
    console.log('📡 Connecting to PostgreSQL...');
    const adminConfig = {
      client: 'postgresql',
      connection: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: 'postgres', // Connect to default postgres database
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
      },
    };

    adminDb = knex(adminConfig);

    // Check if test database exists
    console.log(`🔍 Checking if database "${TEST_DB_NAME}" exists...`);
    const result = await adminDb.raw(
      `SELECT 1 FROM pg_database WHERE datname = ?`,
      [TEST_DB_NAME]
    );

    if (result.rows.length === 0) {
      console.log(`📦 Creating test database "${TEST_DB_NAME}"...`);
      await adminDb.raw(`CREATE DATABASE ${TEST_DB_NAME}`);
      console.log('✅ Test database created successfully\n');
    } else {
      console.log(`✅ Test database "${TEST_DB_NAME}" already exists\n`);
    }

    // Close admin connection
    await adminDb.destroy();
    adminDb = null;

    // Step 2: Connect to test database and run migrations
    console.log('📡 Connecting to test database...');
    const testConfig = config.test;
    testDb = knex(testConfig);

    // Test connection
    await testDb.raw('SELECT 1');
    console.log('✅ Connected to test database\n');

    // Step 3: Run migrations
    console.log('🔄 Running migrations...');
    const [batchNo, migrations] = await testDb.migrate.latest();

    if (migrations.length === 0) {
      console.log('✅ Database is already up to date\n');
    } else {
      console.log(`✅ Batch ${batchNo} run: ${migrations.length} migrations`);
      migrations.forEach((migration) => {
        console.log(`   - ${migration}`);
      });
      console.log();
    }

    // Step 4: Run seeds
    console.log('🌱 Running seed files...');
    const seedFiles = await testDb.seed.run();

    if (seedFiles && seedFiles[0].length > 0) {
      console.log(`✅ Executed ${seedFiles[0].length} seed files:`);
      seedFiles[0].forEach((file: any) => {
        console.log(`   - ${file.file}`);
      });
      console.log();
    } else {
      console.log('✅ No seed files to run\n');
    }

    // Step 5: Verify tables
    console.log('🔍 Verifying database tables...');
    const tables = await testDb
      .select('tablename')
      .from('pg_tables')
      .where('schemaname', 'public')
      .whereNot('tablename', 'like', 'knex_%');

    console.log(`✅ Found ${tables.length} tables:`);
    tables.forEach((table) => {
      console.log(`   - ${table.tablename}`);
    });
    console.log();

    console.log('🎉 Test database setup completed successfully!\n');
    console.log('You can now run E2E tests with:');
    console.log('   npm run test:e2e\n');

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error setting up test database:');
    console.error(error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Cleanup connections
    if (adminDb) {
      await adminDb.destroy();
    }
    if (testDb) {
      await testDb.destroy();
    }
  }
}

// Run the setup
setupTestDatabase();
