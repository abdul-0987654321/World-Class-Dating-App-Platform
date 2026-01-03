import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create speed_dating_events table
  await knex.schema.createTable('speed_dating_events', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Event details
    table.string('name', 255).notNullable();
    table.text('description').notNullable();
    table.timestamp('start_time').notNullable().index();
    table.timestamp('end_time').notNullable();

    // Capacity
    table.integer('max_participants').notNullable().defaultTo(20);
    table.integer('current_participants').notNullable().defaultTo(0);

    // Round configuration
    table.integer('round_duration').notNullable().defaultTo(180); // seconds
    table.integer('break_duration').notNullable().defaultTo(60); // seconds
    table.integer('total_rounds').notNullable().defaultTo(0);
    table.integer('current_round').notNullable().defaultTo(0);

    // Status
    table.enum('status', ['upcoming', 'active', 'completed', 'cancelled'])
      .notNullable()
      .defaultTo('upcoming')
      .index();

    // Theme and categorization
    table.string('theme', 100).nullable();
    table.jsonb('age_range').nullable(); // { min: number, max: number }
    table.string('location', 255).notNullable().defaultTo('virtual');

    // Requirements and fees
    table.jsonb('requirements').nullable(); // { minAge, maxAge, gender, verified, premium }
    table.jsonb('entry_fee').nullable(); // { coins, gems, free }

    // Media
    table.string('cover_image', 500).nullable();

    // Host
    table.uuid('host_id').nullable();

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();

    // Indexes
    table.index(['status', 'start_time']);
    table.index(['theme']);
    table.index(['location']);
  });

  // Create speed_dating_participants table
  await knex.schema.createTable('speed_dating_participants', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Foreign keys
    table.uuid('event_id').notNullable()
      .references('id').inTable('speed_dating_events')
      .onDelete('CASCADE');
    table.uuid('user_id').notNullable().index();

    // Status
    table.enum('status', ['registered', 'checked_in', 'waiting', 'in_round', 'completed', 'left', 'removed'])
      .notNullable()
      .defaultTo('registered')
      .index();

    // Round tracking
    table.integer('current_round').notNullable().defaultTo(0);
    table.uuid('current_partner_id').nullable();

    // Match history as JSON
    table.jsonb('match_history').notNullable().defaultTo('[]');

    // Timestamps
    table.timestamp('joined_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('checked_in_at').nullable();
    table.timestamp('completed_at').nullable();
    table.timestamp('left_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();

    // Unique constraint: user can only join an event once
    table.unique(['event_id', 'user_id']);

    // Indexes
    table.index(['event_id', 'status']);
    table.index(['user_id', 'status']);
  });

  // Create speed_dating_interests table (tracks individual interest expressions)
  await knex.schema.createTable('speed_dating_interests', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Foreign keys
    table.uuid('event_id').notNullable()
      .references('id').inTable('speed_dating_events')
      .onDelete('CASCADE');
    table.integer('round_number').notNullable();

    // Participant who expressed interest
    table.uuid('participant_id').notNullable()
      .references('id').inTable('speed_dating_participants')
      .onDelete('CASCADE');
    table.uuid('user_id').notNullable();

    // Target of interest
    table.uuid('target_participant_id').notNullable()
      .references('id').inTable('speed_dating_participants')
      .onDelete('CASCADE');
    table.uuid('target_user_id').notNullable();

    // Interest decision
    table.boolean('interested').notNullable();

    // Timestamp
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();

    // Unique constraint: one decision per user per round per target
    table.unique(['event_id', 'round_number', 'participant_id', 'target_participant_id']);

    // Indexes
    table.index(['event_id', 'round_number']);
    table.index(['participant_id']);
    table.index(['target_participant_id']);
  });

  // Create speed_dating_matches table
  await knex.schema.createTable('speed_dating_matches', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Foreign keys
    table.uuid('event_id').notNullable()
      .references('id').inTable('speed_dating_events')
      .onDelete('CASCADE');

    // Participants (alphabetically sorted by user_id to prevent duplicates)
    table.uuid('participant_a_id').notNullable()
      .references('id').inTable('speed_dating_participants')
      .onDelete('CASCADE');
    table.uuid('participant_b_id').notNullable()
      .references('id').inTable('speed_dating_participants')
      .onDelete('CASCADE');
    table.uuid('user_a_id').notNullable().index();
    table.uuid('user_b_id').notNullable().index();

    // Round info
    table.integer('round_number').notNullable();

    // Match status
    table.boolean('mutual_interest').notNullable().defaultTo(false);
    table.boolean('conversation_started').notNullable().defaultTo(false);

    // Link to regular match (if created)
    table.boolean('regular_match_created').notNullable().defaultTo(false);
    table.uuid('regular_match_id').nullable();

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();

    // Unique constraint: prevent duplicate matches
    table.unique(['event_id', 'user_a_id', 'user_b_id']);

    // Indexes
    table.index(['event_id', 'mutual_interest']);
    table.index(['user_a_id', 'mutual_interest']);
    table.index(['user_b_id', 'mutual_interest']);
  });

  // Create speed_dating_rounds table (tracks round pairings)
  await knex.schema.createTable('speed_dating_rounds', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Foreign keys
    table.uuid('event_id').notNullable()
      .references('id').inTable('speed_dating_events')
      .onDelete('CASCADE');

    // Round info
    table.integer('round_number').notNullable();

    // Participants paired
    table.uuid('participant_a_id').notNullable()
      .references('id').inTable('speed_dating_participants')
      .onDelete('CASCADE');
    table.uuid('participant_b_id').notNullable()
      .references('id').inTable('speed_dating_participants')
      .onDelete('CASCADE');
    table.uuid('user_a_id').notNullable();
    table.uuid('user_b_id').notNullable();

    // Status
    table.enum('status', ['scheduled', 'active', 'completed', 'skipped'])
      .notNullable()
      .defaultTo('scheduled');

    // Timing
    table.timestamp('started_at').nullable();
    table.timestamp('ended_at').nullable();

    // Video room (if applicable)
    table.string('room_id', 255).nullable();

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();

    // Unique constraint
    table.unique(['event_id', 'round_number', 'participant_a_id']);

    // Indexes
    table.index(['event_id', 'round_number']);
    table.index(['participant_a_id', 'round_number']);
    table.index(['participant_b_id', 'round_number']);
  });

  // Create updated_at trigger function if not exists
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_speed_dating_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  // Create triggers for updated_at
  await knex.raw(`
    CREATE TRIGGER update_speed_dating_events_updated_at
      BEFORE UPDATE ON speed_dating_events
      FOR EACH ROW
      EXECUTE FUNCTION update_speed_dating_updated_at();
  `);

  await knex.raw(`
    CREATE TRIGGER update_speed_dating_participants_updated_at
      BEFORE UPDATE ON speed_dating_participants
      FOR EACH ROW
      EXECUTE FUNCTION update_speed_dating_updated_at();
  `);

  await knex.raw(`
    CREATE TRIGGER update_speed_dating_matches_updated_at
      BEFORE UPDATE ON speed_dating_matches
      FOR EACH ROW
      EXECUTE FUNCTION update_speed_dating_updated_at();
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop triggers
  await knex.raw('DROP TRIGGER IF EXISTS update_speed_dating_matches_updated_at ON speed_dating_matches');
  await knex.raw('DROP TRIGGER IF EXISTS update_speed_dating_participants_updated_at ON speed_dating_participants');
  await knex.raw('DROP TRIGGER IF EXISTS update_speed_dating_events_updated_at ON speed_dating_events');

  // Drop function
  await knex.raw('DROP FUNCTION IF EXISTS update_speed_dating_updated_at');

  // Drop tables in reverse order (due to foreign key constraints)
  await knex.schema.dropTableIfExists('speed_dating_rounds');
  await knex.schema.dropTableIfExists('speed_dating_matches');
  await knex.schema.dropTableIfExists('speed_dating_interests');
  await knex.schema.dropTableIfExists('speed_dating_participants');
  await knex.schema.dropTableIfExists('speed_dating_events');
}
