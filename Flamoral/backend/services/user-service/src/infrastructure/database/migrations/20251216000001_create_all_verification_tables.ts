import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ============================================================================
  // VIDEO VERIFICATIONS TABLE
  // ============================================================================
  await knex.schema.createTable('video_verifications', (table) => {
    table.string('id', 255).primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('session_id', 255).notNullable();
    table.text('video_url').notNullable();
    table.enum('status', ['pending', 'approved', 'rejected']).notNullable().defaultTo('pending');
    table.decimal('confidence_score', 5, 4);
    table.text('rejection_reason');
    table.uuid('reviewed_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('submitted_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('reviewed_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index('status');
    table.index('session_id');
    table.index('submitted_at');
  });

  // ============================================================================
  // BIOMETRIC VERIFICATIONS TABLE
  // ============================================================================
  await knex.schema.createTable('biometric_verifications', (table) => {
    table.string('id', 255).primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('session_id', 255).notNullable();
    table.enum('biometric_type', ['face_id', 'touch_id', 'fingerprint', 'iris']).notNullable();
    table.text('public_key'); // For biometric authentication
    table.enum('status', ['pending', 'approved', 'rejected']).notNullable().defaultTo('approved');
    table.timestamp('verified_at').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index('status');
    table.index('biometric_type');
    table.index('verified_at');
  });

  // ============================================================================
  // ADD VERIFICATION COLUMNS TO USERS TABLE
  // ============================================================================
  await knex.raw(`
    DO $$
    BEGIN
      -- Video verification flag
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='users' AND column_name='is_video_verified'
      ) THEN
        ALTER TABLE users ADD COLUMN is_video_verified BOOLEAN DEFAULT false;
      END IF;

      -- Video verification timestamp
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='users' AND column_name='video_verified_at'
      ) THEN
        ALTER TABLE users ADD COLUMN video_verified_at TIMESTAMP;
      END IF;

      -- Biometric verification flag
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='users' AND column_name='is_biometric_verified'
      ) THEN
        ALTER TABLE users ADD COLUMN is_biometric_verified BOOLEAN DEFAULT false;
      END IF;

      -- Biometric verification timestamp
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='users' AND column_name='biometric_verified_at'
      ) THEN
        ALTER TABLE users ADD COLUMN biometric_verified_at TIMESTAMP;
      END IF;

      -- Liveness check flag (part of photo verification but can be standalone)
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='users' AND column_name='is_liveness_verified'
      ) THEN
        ALTER TABLE users ADD COLUMN is_liveness_verified BOOLEAN DEFAULT false;
      END IF;

      -- Liveness check timestamp
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='users' AND column_name='liveness_verified_at'
      ) THEN
        ALTER TABLE users ADD COLUMN liveness_verified_at TIMESTAMP;
      END IF;
    END $$;
  `);

  // Create indexes for new verification columns
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_users_is_video_verified ON users(is_video_verified);
    CREATE INDEX IF NOT EXISTS idx_users_is_biometric_verified ON users(is_biometric_verified);
    CREATE INDEX IF NOT EXISTS idx_users_is_liveness_verified ON users(is_liveness_verified);
  `);

  // ============================================================================
  // USER_VERIFICATIONS TABLE - Consolidated verification status
  // ============================================================================
  await knex.schema.createTable('user_verifications', (table) => {
    table.uuid('user_id').primary().references('id').inTable('users').onDelete('CASCADE');

    // Email verification
    table.boolean('email_verified').defaultTo(false);
    table.timestamp('email_verified_at');

    // Phone verification
    table.boolean('phone_verified').defaultTo(false);
    table.timestamp('phone_verified_at');
    table.string('phone_number', 50);

    // Photo/Selfie verification
    table.boolean('photo_verified').defaultTo(false);
    table.timestamp('photo_verified_at');
    table.enum('photo_status', ['none', 'pending', 'approved', 'rejected']).defaultTo('none');

    // Government ID verification
    table.boolean('government_id_verified').defaultTo(false);
    table.timestamp('government_id_verified_at');
    table.enum('government_id_status', ['none', 'pending', 'approved', 'rejected']).defaultTo('none');
    table.string('government_id_provider', 50);

    // Liveness check
    table.boolean('liveness_verified').defaultTo(false);
    table.timestamp('liveness_verified_at');

    // Video verification
    table.boolean('video_verified').defaultTo(false);
    table.timestamp('video_verified_at');
    table.enum('video_status', ['none', 'pending', 'approved', 'rejected']).defaultTo('none');

    // Biometric verification
    table.boolean('biometric_verified').defaultTo(false);
    table.timestamp('biometric_verified_at');
    table.string('biometric_type', 50);

    // Overall status
    table.integer('verification_score').defaultTo(0); // 0-100
    table.enum('verification_level', ['none', 'basic', 'standard', 'full']).defaultTo('none');

    // Metadata
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('email_verified');
    table.index('phone_verified');
    table.index('photo_verified');
    table.index('government_id_verified');
    table.index('verification_level');
    table.index('verification_score');
  });

  // ============================================================================
  // POPULATE USER_VERIFICATIONS FROM USERS TABLE
  // ============================================================================
  await knex.raw(`
    INSERT INTO user_verifications (
      user_id,
      email_verified,
      email_verified_at,
      phone_verified,
      phone_verified_at,
      photo_verified,
      photo_verified_at,
      government_id_verified,
      government_id_verified_at,
      liveness_verified,
      liveness_verified_at,
      video_verified,
      video_verified_at,
      biometric_verified,
      biometric_verified_at
    )
    SELECT
      id,
      COALESCE(is_email_verified, false),
      email_verified_at,
      COALESCE(is_phone_verified, false),
      phone_verified_at,
      COALESCE(is_photo_verified, false),
      photo_verified_at,
      COALESCE(is_identity_verified, false),
      identity_verified_at,
      COALESCE(is_liveness_verified, false),
      liveness_verified_at,
      COALESCE(is_video_verified, false),
      video_verified_at,
      COALESCE(is_biometric_verified, false),
      biometric_verified_at
    FROM users
    ON CONFLICT (user_id) DO NOTHING;
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop verification tables
  await knex.schema.dropTableIfExists('user_verifications');
  await knex.schema.dropTableIfExists('biometric_verifications');
  await knex.schema.dropTableIfExists('video_verifications');

  // Drop verification columns from users table
  await knex.raw(`
    DO $$
    BEGIN
      ALTER TABLE users DROP COLUMN IF EXISTS is_video_verified;
      ALTER TABLE users DROP COLUMN IF EXISTS video_verified_at;
      ALTER TABLE users DROP COLUMN IF EXISTS is_biometric_verified;
      ALTER TABLE users DROP COLUMN IF EXISTS biometric_verified_at;
      ALTER TABLE users DROP COLUMN IF EXISTS is_liveness_verified;
      ALTER TABLE users DROP COLUMN IF EXISTS liveness_verified_at;
    END $$;
  `);
}
