#!/usr/bin/env ts-node

/**
 * Test Database Reset Script
 *
 * This script resets the test database by:
 * 1. Rolling back all migrations
 * 2. Running migrations again
 * 3. Running seed files
 *
 * Usage:
 *   npm run reset:test-db
 *   ts-node scripts/reset-test-db.ts
 */

import knex, { Knex } from 'knex';
import config from '../src/infrastructure/database/knexfile';

async function resetTestDatabase() {
  console.log('🔄 Resetting test database...\n');

  let testDb: Knex | null = null;

  try {
    // Connect to test database
    console.log('📡 Connecting to test database...');
    const testConfig = config.test;
    testDb = knex(testConfig);

    // Test connection
    await testDb.raw('SELECT 1');
    console.log('✅ Connected to test database\n');

    // Step 1: Rollback all migrations
    console.log('⏮️  Rolling back all migrations...');
    const [batchNo, migrations] = await testDb.migrate.rollback(undefined, true);

    if (migrations.length === 0) {
      console.log('✅ No migrations to rollback\n');
    } else {
      console.log(`✅ Rolled back batch ${batchNo}: ${migrations.length} migrations`);
      migrations.forEach((migration) => {
        console.log(`   - ${migration}`);
      });
      console.log();
    }

    // Step 2: Run migrations
    console.log('🔄 Running migrations...');
    const [newBatchNo, newMigrations] = await testDb.migrate.latest();

    console.log(`✅ Batch ${newBatchNo} run: ${newMigrations.length} migrations`);
    newMigrations.forEach((migration) => {
      console.log(`   - ${migration}`);
    });
    console.log();

    // Step 3: Run seeds
    console.log('🌱 Running seed files...');
    const seedFiles = await testDb.seed.run();

    if (seedFiles && seedFiles[0].length > 0) {
      console.log(`✅ Executed ${seedFiles[0].length} seed files:`);
      seedFiles[0].forEach((file: any) => {
        console.log(`   - ${file.file}`);
      });
      console.log();
    }

    console.log('🎉 Test database reset completed successfully!\n');

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error resetting test database:');
    console.error(error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (testDb) {
      await testDb.destroy();
    }
  }
}

// Run the reset
resetTestDatabase();
