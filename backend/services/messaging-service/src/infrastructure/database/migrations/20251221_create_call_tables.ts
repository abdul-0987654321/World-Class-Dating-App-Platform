/**
 * Migration: Create Call Tables
 * Creates call_sessions and call_events tables for audio/video calling
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create call_sessions table
  await knex.schema.createTable('call_sessions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(gen_random_uuid())'));
    table.string('channel_name', 255).notNullable().unique();
    table.uuid('caller_id').notNullable();
    table.string('caller_name', 255).notNullable();
    table.string('caller_avatar', 500);
    table.uuid('callee_id').notNullable();
    table.string('callee_name', 255).notNullable();
    table.string('callee_avatar', 500);
    table.enum('call_type', ['video', 'audio']).notNullable();
    table
      .enum('status', [
        'initiated',
        'ringing',
        'connected',
        'ended',
        'rejected',
        'missed',
        'failed',
      ])
      .notNullable()
      .defaultTo('initiated');
    table.timestamp('start_time').notNullable().defaultTo(knex.fn.now());
    table.timestamp('connected_at');
    table.timestamp('end_time');
    table.integer('duration_seconds').defaultTo(0); // Call duration in seconds
    table.boolean('recording_enabled').defaultTo(false);
    table.jsonb('recording_consent').defaultTo('{}');
    table.string('end_reason', 100); // 'completed', 'caller_ended', 'callee_ended', 'timeout', 'error'
    table.jsonb('quality_metrics').defaultTo('{}'); // Store call quality data
    table.jsonb('metadata').defaultTo('{}'); // Additional call metadata
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Indexes for efficient querying
    table.index('caller_id', 'idx_call_sessions_caller_id');
    table.index('callee_id', 'idx_call_sessions_callee_id');
    table.index('status', 'idx_call_sessions_status');
    table.index('start_time', 'idx_call_sessions_start_time');
    table.index(['caller_id', 'status'], 'idx_call_sessions_caller_status');
    table.index(['callee_id', 'status'], 'idx_call_sessions_callee_status');
  });

  // Create call_events table for detailed event logging
  await knex.schema.createTable('call_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(gen_random_uuid())'));
    table
      .uuid('call_id')
      .notNullable()
      .references('id')
      .inTable('call_sessions')
      .onDelete('CASCADE');
    table.uuid('user_id').notNullable(); // User who triggered the event
    table
      .enum('event_type', [
        'initiated',
        'ringing',
        'accepted',
        'rejected',
        'ended',
        'missed',
        'failed',
        'ice_candidate',
        'sdp_offer',
        'sdp_answer',
        'quality_update',
        'recording_consent',
        'reconnecting',
        'reconnected',
        'muted',
        'unmuted',
        'video_enabled',
        'video_disabled',
        'screen_share_started',
        'screen_share_stopped',
      ])
      .notNullable();
    table.jsonb('event_data').defaultTo('{}'); // Event-specific data
    table.string('ip_address', 45); // IPv4 or IPv6
    table.string('user_agent', 500);
    table.string('device_type', 50); // 'mobile', 'desktop', 'tablet'
    table.string('platform', 50); // 'ios', 'android', 'web'
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    // Indexes for efficient querying
    table.index('call_id', 'idx_call_events_call_id');
    table.index('user_id', 'idx_call_events_user_id');
    table.index('event_type', 'idx_call_events_event_type');
    table.index('created_at', 'idx_call_events_created_at');
    table.index(['call_id', 'event_type'], 'idx_call_events_call_event_type');
  });

  // Create trigger for updating updated_at on call_sessions
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_call_sessions_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trigger_update_call_sessions_updated_at
    BEFORE UPDATE ON call_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_call_sessions_updated_at();
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop trigger first
  await knex.raw(`
    DROP TRIGGER IF EXISTS trigger_update_call_sessions_updated_at ON call_sessions;
    DROP FUNCTION IF EXISTS update_call_sessions_updated_at();
  `);

  // Drop tables in reverse order (due to foreign key)
  await knex.schema.dropTableIfExists('call_events');
  await knex.schema.dropTableIfExists('call_sessions');
}
