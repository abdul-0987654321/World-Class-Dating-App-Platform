import { Knex } from 'knex';

/**
 * Migration: Add Swipe Rewind Tables
 *
 * Creates tables for:
 * 1. swipe_history - Stores history of user swipes for rewind functionality
 * 2. rewind_usage - Tracks daily rewind usage per user by subscription tier
 */
export async function up(knex: Knex): Promise<void> {
  // Create swipe_history table to store swipe history for rewind
  await knex.schema.createTable('swipe_history', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // User who performed the swipe
    table.uuid('user_id').notNullable().index();

    // Target user who was swiped on
    table.uuid('target_user_id').notNullable();

    // The action taken (like, pass, super_like)
    table.enum('action', ['like', 'pass', 'super_like']).notNullable();

    // Original swipe ID (reference to swipes table)
    table.uuid('original_swipe_id').nullable();

    // Whether this swipe has been rewound
    table.boolean('rewound').defaultTo(false).notNullable();

    // When the rewind happened (null if not rewound)
    table.timestamp('rewound_at').nullable();

    // Whether a match was created from this swipe
    table.boolean('resulted_in_match').defaultTo(false).notNullable();

    // Match ID if one was created (for cleanup during rewind)
    table.uuid('match_id').nullable();

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();

    // Indexes for efficient querying
    table.index(['user_id', 'created_at']);
    table.index(['user_id', 'rewound']);
  });

  // Create rewind_usage table to track daily rewind usage
  await knex.schema.createTable('rewind_usage', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // User who used the rewind
    table.uuid('user_id').notNullable();

    // Reference to the swipe_history entry that was rewound
    table
      .uuid('swipe_history_id')
      .notNullable()
      .references('id')
      .inTable('swipe_history')
      .onDelete('CASCADE');

    // Date of the rewind (for daily limit tracking)
    table.date('usage_date').notNullable();

    // User's subscription tier at time of rewind
    table.string('subscription_tier', 50).notNullable();

    // Timestamp
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();

    // Composite index for efficient daily usage queries
    table.index(['user_id', 'usage_date']);

    // Index for tier analytics
    table.index(['subscription_tier', 'usage_date']);
  });

  // Create index for finding last non-rewound swipe quickly
  await knex.raw(`
    CREATE INDEX idx_swipe_history_last_active
    ON swipe_history(user_id, created_at DESC)
    WHERE rewound = false;
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop indexes first
  await knex.raw('DROP INDEX IF EXISTS idx_swipe_history_last_active');

  // Drop tables in reverse order (due to foreign key)
  await knex.schema.dropTableIfExists('rewind_usage');
  await knex.schema.dropTableIfExists('swipe_history');
}
