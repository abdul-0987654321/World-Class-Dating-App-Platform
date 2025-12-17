import { Knex } from 'knex';

/**
 * Migration: Create Matching Tables
 * Description: Swipes, matches, and user preferences for the matching system
 */
export async function up(knex: Knex): Promise<void> {
  // Create swipes table
  await knex.schema.createTable('swipes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().index();
    table.uuid('target_user_id').notNullable().index();

    // Swipe action
    table.enum('action', ['like', 'pass', 'super_like']).notNullable();

    // Is this a super like?
    table.boolean('is_super_like').defaultTo(false);

    // Timestamp
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();

    // Composite indexes
    table.index(['user_id', 'target_user_id']);
    table.index(['target_user_id', 'action']);
    table.index(['user_id', 'created_at']);

    // Unique constraint: user can only swipe once on a target
    table.unique(['user_id', 'target_user_id']);
  });

  // Create partial index for likes only
  await knex.raw(`
    CREATE INDEX idx_swipes_like_actions
    ON swipes(target_user_id, action)
    WHERE action IN ('like', 'super_like');
  `);

  // Create matches table
  await knex.schema.createTable('matches', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // User references (ensure user1_id < user2_id for consistency)
    table.uuid('user1_id').notNullable().index();
    table.uuid('user2_id').notNullable().index();

    // Match metadata
    table.enum('status', ['active', 'unmatched', 'expired'])
      .defaultTo('active')
      .notNullable()
      .index();

    table.decimal('compatibility_score', 5, 2).nullable();

    // Timestamps
    table.timestamp('matched_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('last_activity_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('unmatched_at').nullable();
    table.uuid('unmatched_by').nullable(); // User who initiated unmatch

    // Composite indexes
    table.index(['user1_id', 'status']);
    table.index(['user2_id', 'status']);
    table.index(['user1_id', 'user2_id']);
    table.index('matched_at');
    table.index('last_activity_at');

    // Unique constraint: ensure no duplicate matches
    table.unique(['user1_id', 'user2_id']);

    // Check constraint: ensure user1_id < user2_id
    table.check('user1_id < user2_id');
  });

  // Create user_preferences table
  await knex.schema.createTable('user_preferences', (table) => {
    table.uuid('user_id').primary()
      .references('id').inTable('users').onDelete('CASCADE');

    // Age preferences
    table.integer('age_min').notNullable().defaultTo(18);
    table.integer('age_max').notNullable().defaultTo(99);

    // Distance preference (in kilometers)
    table.integer('max_distance').notNullable().defaultTo(50);

    // Gender preferences (stored as JSONB array)
    table.jsonb('gender_preference').notNullable().defaultTo('["any"]');

    // Relationship type preferences
    table.jsonb('relationship_type_preference').nullable();

    // Interests and dealbreakers
    table.jsonb('interests').nullable();
    table.jsonb('dealbreakers').nullable();

    // Advanced preferences
    table.boolean('show_me_on_discover').notNullable().defaultTo(true);
    table.boolean('premium_only').notNullable().defaultTo(false);
    table.boolean('verified_only').notNullable().defaultTo(false);

    // Height preferences (in cm)
    table.integer('min_height').nullable();
    table.integer('max_height').nullable();

    // Education preference
    table.jsonb('education_preference').nullable();

    // Timestamps
    table.timestamps(true, true);

    // Indexes
    table.index('show_me_on_discover');
  });

  // Create triggers for automatic updates
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_match_activity()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.last_activity_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER update_matches_activity
      BEFORE UPDATE ON matches
      FOR EACH ROW
      EXECUTE FUNCTION update_match_activity();
  `);

  await knex.raw(`
    CREATE TRIGGER update_user_preferences_updated_at
      BEFORE UPDATE ON user_preferences
      FOR EACH ROW
      EXECUTE FUNCTION update_match_activity();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences');
  await knex.raw('DROP TRIGGER IF EXISTS update_matches_activity ON matches');
  await knex.raw('DROP FUNCTION IF EXISTS update_match_activity');
  await knex.schema.dropTableIfExists('user_preferences');
  await knex.schema.dropTableIfExists('matches');
  await knex.schema.dropTableIfExists('swipes');
}
