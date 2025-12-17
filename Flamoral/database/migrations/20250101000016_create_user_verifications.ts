import { Knex } from 'knex';

/**
 * Migration: Create User Verifications Table
 * Description: Tracks various user verification types (email, phone, photo, ID, etc.)
 */
export async function up(knex: Knex): Promise<void> {
  // Create user_verifications table
  await knex.schema.createTable('user_verifications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE');

    // Verification type
    table.enum('type', [
      'email',
      'phone',
      'photo',
      'id_document',
      'government_id',
      'selfie',
      'social_media',
      'income',
      'education',
      'occupation',
      'background_check'
    ]).notNullable();

    // Verification status
    table.enum('status', [
      'pending',
      'in_progress',
      'verified',
      'rejected',
      'expired',
      'revoked'
    ]).notNullable().defaultTo('pending');

    // Provider/method used for verification
    table.string('provider', 100).nullable(); // e.g., 'twilio', 'sendgrid', 'aws_rekognition', 'stripe_identity'
    table.string('provider_verification_id', 255).nullable(); // External verification ID

    // Verification metadata
    table.jsonb('metadata').defaultTo('{}'); // Store verification details, scores, etc.
    table.text('rejection_reason').nullable();
    table.decimal('confidence_score', 5, 4).nullable(); // 0.0000 to 1.0000

    // Document information (for ID verifications)
    table.string('document_type', 50).nullable(); // 'passport', 'drivers_license', 'national_id'
    table.string('document_number', 100).nullable(); // Encrypted
    table.date('document_expiry').nullable();
    table.string('document_country', 2).nullable(); // ISO country code

    // Verification timestamps
    table.timestamp('submitted_at').nullable();
    table.timestamp('verified_at').nullable();
    table.timestamp('rejected_at').nullable();
    table.timestamp('expires_at').nullable();
    table.timestamp('revoked_at').nullable();

    // Verified by (admin/moderator)
    table.uuid('verified_by').nullable()
      .references('id').inTable('users').onDelete('SET NULL');

    // Timestamps
    table.timestamps(true, true);

    // Indexes
    table.index('user_id');
    table.index('type');
    table.index('status');
    table.index(['user_id', 'type']);
    table.index(['user_id', 'status']);
    table.index(['type', 'status']);
    table.index('provider');
    table.index('expires_at');

    // Unique constraint: One active verification per user per type
    table.unique(['user_id', 'type', 'status']);
  });

  // Create function to update user verification flags
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_user_verification_flags()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.status = 'verified' AND NEW.type = 'email' THEN
        UPDATE users SET is_email_verified = true WHERE id = NEW.user_id;
      END IF;

      IF NEW.status = 'verified' AND NEW.type = 'phone' THEN
        UPDATE users SET is_phone_verified = true WHERE id = NEW.user_id;
      END IF;

      IF NEW.status = 'verified' AND NEW.type IN ('photo', 'selfie') THEN
        UPDATE users SET is_photo_verified = true WHERE id = NEW.user_id;
      END IF;

      -- Revoke verification flags if status changes
      IF OLD.status = 'verified' AND NEW.status IN ('rejected', 'revoked', 'expired') THEN
        IF NEW.type = 'email' THEN
          UPDATE users SET is_email_verified = false WHERE id = NEW.user_id;
        ELSIF NEW.type = 'phone' THEN
          UPDATE users SET is_phone_verified = false WHERE id = NEW.user_id;
        ELSIF NEW.type IN ('photo', 'selfie') THEN
          UPDATE users SET is_photo_verified = false WHERE id = NEW.user_id;
        END IF;
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trigger_update_user_verification_flags
    AFTER INSERT OR UPDATE OF status ON user_verifications
    FOR EACH ROW
    EXECUTE FUNCTION update_user_verification_flags();
  `);

  // Migrate existing verification data from verification_tokens
  await knex.raw(`
    INSERT INTO user_verifications (user_id, type, status, submitted_at, verified_at, created_at, updated_at)
    SELECT
      user_id,
      type::text::user_verifications_type_enum,
      CASE
        WHEN is_used = true THEN 'verified'::user_verifications_status_enum
        WHEN expires_at < NOW() THEN 'expired'::user_verifications_status_enum
        ELSE 'pending'::user_verifications_status_enum
      END,
      created_at,
      used_at,
      created_at,
      updated_at
    FROM verification_tokens
    WHERE type IN ('email', 'phone')
    ON CONFLICT (user_id, type, status) DO NOTHING;
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop trigger and function
  await knex.raw('DROP TRIGGER IF EXISTS trigger_update_user_verification_flags ON user_verifications');
  await knex.raw('DROP FUNCTION IF EXISTS update_user_verification_flags');

  // Drop table
  await knex.schema.dropTableIfExists('user_verifications');
}
