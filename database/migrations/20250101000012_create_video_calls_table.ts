import { Knex } from 'knex';

/**
 * Migration: Create video_calls table
 * Handles video/voice call tracking, history, and premium features
 */
export async function up(knex: Knex): Promise<void> {
  // Create video_calls table
  await knex.schema.createTable('video_calls', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Participants
    table.uuid('caller_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('receiver_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    // Call details
    table.enum('call_type', ['video', 'audio']).notNullable();
    table.string('channel_name', 255).notNullable().unique();

    // Status tracking
    table.enum('status', [
      'initiated',      // Call created, waiting for receiver
      'ringing',        // Receiver's device is ringing
      'active',         // Call is in progress
      'completed',      // Call ended normally
      'declined',       // Receiver declined
      'cancelled',      // Caller cancelled before answer
      'missed',         // Receiver didn't answer
      'failed'          // Technical failure
    ]).notNullable().defaultTo('initiated');

    // Quality settings (for premium features)
    table.enum('video_quality', ['sd', 'hd', 'full_hd']).defaultTo('sd');
    table.boolean('hd_enabled').defaultTo(false);
    table.boolean('screen_share_used').defaultTo(false);

    // Duration tracking
    table.timestamp('initiated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('started_at').nullable(); // When call was answered
    table.timestamp('ended_at').nullable();
    table.integer('duration_seconds').defaultTo(0);

    // Billing information
    table.integer('coins_charged').defaultTo(0);
    table.boolean('was_premium_call').defaultTo(false); // Was caller premium at time of call?

    // Connection quality metrics
    table.integer('avg_bitrate').nullable();
    table.integer('packet_loss_percentage').nullable();
    table.enum('connection_quality', ['poor', 'fair', 'good', 'excellent']).nullable();

    // Metadata
    table.jsonb('metadata').nullable(); // Store additional call metadata
    table.string('disconnect_reason', 100).nullable();

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('caller_id');
    table.index('receiver_id');
    table.index('status');
    table.index('initiated_at');
    table.index(['caller_id', 'receiver_id']);
  });

  // Create call_duration_limits table for free users
  await knex.schema.createTable('call_duration_limits', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    // Daily limits for free users
    table.integer('daily_video_minutes_used').defaultTo(0);
    table.integer('daily_audio_minutes_used').defaultTo(0);
    table.date('limit_date').notNullable(); // Date for the limit tracking

    // Limits configuration (can be adjusted)
    table.integer('daily_video_limit').defaultTo(30); // 30 minutes video per day for free
    table.integer('daily_audio_limit').defaultTo(60); // 60 minutes audio per day for free

    // Reset tracking
    table.timestamp('last_reset_at').defaultTo(knex.fn.now());

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes and constraints
    table.unique(['user_id', 'limit_date']); // One record per user per day
    table.index('user_id');
    table.index('limit_date');
  });

  // Create call_recordings table (for premium feature)
  await knex.schema.createTable('call_recordings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    table.uuid('call_id').notNullable().references('id').inTable('video_calls').onDelete('CASCADE');
    table.uuid('requested_by').notNullable().references('id').inTable('users').onDelete('CASCADE');

    // Recording details
    table.string('recording_url', 500).notNullable();
    table.string('storage_path', 500).notNullable();
    table.integer('file_size_bytes').notNullable();
    table.integer('duration_seconds').notNullable();
    table.string('format', 20).defaultTo('mp4');

    // Access control
    table.boolean('is_encrypted').defaultTo(true);
    table.timestamp('expires_at').nullable(); // Auto-delete after expiry
    table.boolean('is_deleted').defaultTo(false);

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    // Indexes
    table.index('call_id');
    table.index('requested_by');
    table.index('expires_at');
  });

  // Create trigger to update updated_at timestamp
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  await knex.raw(`
    CREATE TRIGGER update_video_calls_updated_at
    BEFORE UPDATE ON video_calls
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);

  await knex.raw(`
    CREATE TRIGGER update_call_duration_limits_updated_at
    BEFORE UPDATE ON call_duration_limits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop triggers
  await knex.raw('DROP TRIGGER IF EXISTS update_video_calls_updated_at ON video_calls');
  await knex.raw('DROP TRIGGER IF EXISTS update_call_duration_limits_updated_at ON call_duration_limits');

  // Drop tables in reverse order
  await knex.schema.dropTableIfExists('call_recordings');
  await knex.schema.dropTableIfExists('call_duration_limits');
  await knex.schema.dropTableIfExists('video_calls');
}
