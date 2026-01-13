/**
 * Migration: Add Calendar Integration Schema
 * Date: 2026-01-03
 *
 * This migration creates the PostgreSQL tables for calendar integration:
 * - calendar_connections: OAuth connections to external calendars
 * - date_proposals: Date proposals within conversations
 * - scheduled_dates: Confirmed/scheduled dates
 * - venue_bookmarks: User's saved venue suggestions
 * - date_reminders: Scheduled reminders for dates
 */

import { Knex } from 'knex';

import { createLogger } from '../../../utils/logger';

const logger = createLogger('calendar-migration');

/**
 * Run the migration
 */
export async function up(knex: Knex): Promise<void> {
  logger.info('Starting calendar integration migration...');

  // 1. Calendar Connections table
  logger.info('Creating calendar_connections table...');
  await knex.schema.createTable('calendar_connections', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().index();
    table.string('provider', 50).notNullable(); // google, outlook, apple
    table.string('email', 255).notNullable();
    table.jsonb('tokens').notNullable(); // OAuth tokens (encrypted in production)
    table.string('calendar_id', 255);
    table.boolean('is_active').defaultTo(true);
    table.boolean('share_availability').defaultTo(true);
    table.boolean('sync_enabled').defaultTo(true);
    table.timestamp('last_sync_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Unique constraint: one connection per provider per user
    table.unique(['user_id', 'provider']);
  });

  // Create indexes for calendar_connections
  await knex.raw(`
    CREATE INDEX idx_calendar_connections_user_active
    ON calendar_connections (user_id, is_active)
  `);

  logger.info('calendar_connections table created successfully');

  // 2. Date Proposals table
  logger.info('Creating date_proposals table...');
  await knex.schema.createTable('date_proposals', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('conversation_id').notNullable().index();
    table.uuid('proposer_id').notNullable().index();
    table.uuid('recipient_id').notNullable().index();
    table.timestamp('proposed_datetime').notNullable();
    table.string('timezone', 100).defaultTo('UTC');
    table.integer('duration').defaultTo(60); // Duration in minutes
    table.jsonb('venue'); // Venue suggestion details
    table.text('notes');
    table.string('status', 50).defaultTo('pending'); // pending, accepted, declined, countered, cancelled, expired
    table.uuid('original_proposal_id'); // For counter proposals
    table.uuid('counter_proposal_id'); // Link to counter proposal
    table.timestamp('expires_at');
    table.timestamp('responded_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Create indexes for date_proposals
  await knex.raw(`
    CREATE INDEX idx_date_proposals_conversation_created
    ON date_proposals (conversation_id, created_at DESC)
  `);
  await knex.raw(`
    CREATE INDEX idx_date_proposals_proposer_status
    ON date_proposals (proposer_id, status)
  `);
  await knex.raw(`
    CREATE INDEX idx_date_proposals_recipient_status
    ON date_proposals (recipient_id, status)
  `);

  logger.info('date_proposals table created successfully');

  // 3. Scheduled Dates table
  logger.info('Creating scheduled_dates table...');
  await knex.schema.createTable('scheduled_dates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('conversation_id').notNullable().index();
    table.uuid('proposal_id').index();
    table.specificType('participant_ids', 'uuid[]').notNullable(); // Array of participant user IDs
    table.timestamp('scheduled_at').notNullable();
    table.string('timezone', 100).defaultTo('UTC');
    table.integer('duration').defaultTo(60); // Duration in minutes
    table.jsonb('venue'); // Venue details
    table.text('notes');
    table.string('status', 50).defaultTo('confirmed'); // confirmed, cancelled, completed, no_show
    table.uuid('cancelled_by');
    table.text('cancellation_reason');
    table.jsonb('calendar_event_ids'); // Map of userId -> {provider, eventId}
    table.specificType('reminder_ids', 'uuid[]'); // Array of reminder IDs
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Create indexes for scheduled_dates
  await knex.raw(`
    CREATE INDEX idx_scheduled_dates_scheduled_status
    ON scheduled_dates (scheduled_at, status)
  `);
  await knex.raw(`
    CREATE INDEX idx_scheduled_dates_participants
    ON scheduled_dates USING GIN (participant_ids)
  `);

  logger.info('scheduled_dates table created successfully');

  // 4. Venue Bookmarks table
  logger.info('Creating venue_bookmarks table...');
  await knex.schema.createTable('venue_bookmarks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().index();
    table.jsonb('venue').notNullable(); // Full venue details
    table.string('category', 50); // restaurant, cafe, bar, park, etc.
    table.text('notes');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Create indexes for venue_bookmarks
  await knex.raw(`
    CREATE INDEX idx_venue_bookmarks_user_category
    ON venue_bookmarks (user_id, category)
  `);
  await knex.raw(`
    CREATE INDEX idx_venue_bookmarks_user_created
    ON venue_bookmarks (user_id, created_at DESC)
  `);

  logger.info('venue_bookmarks table created successfully');

  // 5. Date Reminders table
  logger.info('Creating date_reminders table...');
  await knex.schema.createTable('date_reminders', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('scheduled_date_id').notNullable().index();
    table.uuid('user_id').notNullable().index();
    table.timestamp('reminder_at').notNullable();
    table.integer('timing_minutes').notNullable(); // Minutes before the date
    table.boolean('sent').defaultTo(false);
    table.timestamp('sent_at');
    table.string('notification_id', 255); // External notification service ID
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Create indexes for date_reminders
  await knex.raw(`
    CREATE INDEX idx_date_reminders_reminder_sent
    ON date_reminders (reminder_at, sent)
  `);
  await knex.raw(`
    CREATE INDEX idx_date_reminders_user_reminder
    ON date_reminders (user_id, reminder_at)
  `);

  logger.info('date_reminders table created successfully');

  logger.info('Calendar integration migration completed successfully');
}

/**
 * Rollback the migration
 */
export async function down(knex: Knex): Promise<void> {
  logger.warn('Rolling back calendar integration migration...');

  // Drop tables in reverse order (to handle any foreign key dependencies)
  const tables = [
    'date_reminders',
    'venue_bookmarks',
    'scheduled_dates',
    'date_proposals',
    'calendar_connections',
  ];

  for (const tableName of tables) {
    try {
      logger.info(`Dropping table: ${tableName}`);
      await knex.schema.dropTableIfExists(tableName);
      logger.info(`Table "${tableName}" dropped successfully`);
    } catch (error: any) {
      logger.warn(`Failed to drop table ${tableName}:`, error.message);
    }
  }

  logger.info('Calendar integration migration rollback completed');
}

export default { up, down };
