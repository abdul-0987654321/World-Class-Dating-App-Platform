import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create identity_verifications table
  await knex.schema.createTable('identity_verifications', (table) => {
    table.string('id', 255).primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('provider', 50).notNullable(); // stripe, persona, onfido, jumio, manual
    table.enum('status', ['pending', 'approved', 'rejected', 'requires_review']).notNullable().defaultTo('pending');
    table.decimal('confidence_score', 5, 4); // 0.0000 to 9.9999
    table.text('rejection_reason');
    table.uuid('reviewed_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('submitted_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('reviewed_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index('status');
    table.index('provider');
    table.index('submitted_at');
  });

  // Add KYC columns to users table if they don't exist
  await knex.schema.alterTable('users', (table) => {
    // Check if columns exist before adding (using raw query to avoid errors)
  });

  // Add columns using raw SQL to avoid errors if they already exist
  await knex.raw(`
    DO $$
    BEGIN
      -- Email verification timestamp
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='users' AND column_name='email_verified_at'
      ) THEN
        ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMP;
      END IF;

      -- Phone verification timestamp
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='users' AND column_name='phone_verified_at'
      ) THEN
        ALTER TABLE users ADD COLUMN phone_verified_at TIMESTAMP;
      END IF;

      -- Photo verification timestamp
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='users' AND column_name='photo_verified_at'
      ) THEN
        ALTER TABLE users ADD COLUMN photo_verified_at TIMESTAMP;
      END IF;

      -- Identity verification flag
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='users' AND column_name='is_identity_verified'
      ) THEN
        ALTER TABLE users ADD COLUMN is_identity_verified BOOLEAN DEFAULT false;
      END IF;

      -- Identity verification timestamp
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='users' AND column_name='identity_verified_at'
      ) THEN
        ALTER TABLE users ADD COLUMN identity_verified_at TIMESTAMP;
      END IF;

      -- KYC provider
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='users' AND column_name='kyc_provider'
      ) THEN
        ALTER TABLE users ADD COLUMN kyc_provider VARCHAR(50);
      END IF;

      -- KYC reference ID
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='users' AND column_name='kyc_reference_id'
      ) THEN
        ALTER TABLE users ADD COLUMN kyc_reference_id VARCHAR(255);
      END IF;
    END $$;
  `);

  // Create indexes for verification columns
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_users_is_identity_verified ON users(is_identity_verified);
    CREATE INDEX IF NOT EXISTS idx_users_kyc_provider ON users(kyc_provider);
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop identity_verifications table
  await knex.schema.dropTableIfExists('identity_verifications');

  // Drop KYC columns from users table
  await knex.raw(`
    DO $$
    BEGIN
      ALTER TABLE users DROP COLUMN IF EXISTS email_verified_at;
      ALTER TABLE users DROP COLUMN IF EXISTS phone_verified_at;
      ALTER TABLE users DROP COLUMN IF EXISTS photo_verified_at;
      ALTER TABLE users DROP COLUMN IF EXISTS is_identity_verified;
      ALTER TABLE users DROP COLUMN IF EXISTS identity_verified_at;
      ALTER TABLE users DROP COLUMN IF EXISTS kyc_provider;
      ALTER TABLE users DROP COLUMN IF EXISTS kyc_reference_id;
    END $$;
  `);
}
