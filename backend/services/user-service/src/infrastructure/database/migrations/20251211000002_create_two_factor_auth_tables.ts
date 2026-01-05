import { Knex } from 'knex';

/**
 * Create two-factor authentication tables
 * Implements secure TOTP storage with encryption
 */
export async function up(knex: Knex): Promise<void> {
  // Create user_two_factor_auth table
  await knex.schema.createTable('user_two_factor_auth', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();
    table.enum('method', ['2fa_totp', '2fa_sms', '2fa_email']).notNullable();

    // Encrypted TOTP secret (stores encrypted data in format: version:iv:authTag:encryptedData)
    table.text('secret_encrypted').nullable();

    // Phone number for SMS 2FA
    table.string('phone_number', 20).nullable();

    // Email for email 2FA
    table.string('email', 255).nullable();

    // 2FA status
    table.boolean('is_enabled').defaultTo(false);

    // Encryption metadata
    table.integer('encryption_key_version').defaultTo(1);

    // Timestamps
    table.timestamp('enabled_at').nullable();
    table.timestamp('disabled_at').nullable();
    table.timestamp('last_verified_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.unique(['user_id', 'method']);

    // Foreign key
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
  });

  // Create user_backup_codes table
  await knex.schema.createTable('user_backup_codes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();

    // Bcrypt hashed backup code
    table.string('code_hash', 255).notNullable();

    // Usage tracking
    table.boolean('is_used').defaultTo(false);
    table.timestamp('used_at').nullable();

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('expires_at').nullable();

    // Indexes
    table.index('user_id');
    table.index(['user_id', 'is_used']);

    // Foreign key
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
  });

  // Create user_verification_codes table (for SMS and Email 2FA)
  await knex.schema.createTable('user_verification_codes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();

    // Verification code (stored in plaintext as it's short-lived)
    table.string('code', 10).notNullable();

    // Type of verification
    table
      .enum('type', ['2fa_sms', '2fa_email', 'phone_verification', 'email_verification'])
      .notNullable();

    // Contact info
    table.string('phone_number', 20).nullable();
    table.string('email', 255).nullable();

    // Usage tracking
    table.boolean('is_used').defaultTo(false);
    table.timestamp('verified_at').nullable();

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('expires_at').notNullable();

    // Indexes
    table.index('user_id');
    table.index(['user_id', 'type', 'is_used']);
    table.index('expires_at');

    // Foreign key
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
  });

  // Add 2FA requirement flag to users table if not exists
  const hasColumn = await knex.schema.hasColumn('users', 'require_2fa_setup');
  if (!hasColumn) {
    await knex.schema.alterTable('users', (table) => {
      table.boolean('require_2fa_setup').defaultTo(false);
    });
  }

  // Create encryption key rotation audit table
  await knex.schema.createTable('encryption_key_rotations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.integer('old_key_version').notNullable();
    table.integer('new_key_version').notNullable();
    table.integer('records_migrated').defaultTo(0);
    table.enum('status', ['in_progress', 'completed', 'failed']).defaultTo('in_progress');
    table.text('error_message').nullable();
    table.timestamp('started_at').defaultTo(knex.fn.now());
    table.timestamp('completed_at').nullable();

    // Indexes
    table.index('new_key_version');
    table.index('status');
  });
}

export async function down(knex: Knex): Promise<void> {
  // Drop tables in reverse order (respecting foreign keys)
  await knex.schema.dropTableIfExists('encryption_key_rotations');
  await knex.schema.dropTableIfExists('user_verification_codes');
  await knex.schema.dropTableIfExists('user_backup_codes');
  await knex.schema.dropTableIfExists('user_two_factor_auth');

  // Remove 2FA flag from users table
  const hasColumn = await knex.schema.hasColumn('users', 'require_2fa_setup');
  if (hasColumn) {
    await knex.schema.alterTable('users', (table) => {
      table.dropColumn('require_2fa_setup');
    });
  }
}
