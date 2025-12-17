import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create travel destinations table
  await knex.schema.createTable('travel_destinations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    // Location details
    table.string('city', 200).notNullable();
    table.string('state', 100).nullable();
    table.string('country', 100).notNullable();
    table.string('country_code', 2).notNullable();
    table.string('airport_code', 3).nullable();
    table.decimal('latitude', 10, 8).notNullable();
    table.decimal('longitude', 11, 8).notNullable();
    table.string('timezone', 100).notNullable();

    // Travel dates
    table.timestamp('start_date').notNullable();
    table.timestamp('end_date').notNullable();

    // Status and settings
    table.enum('status', ['scheduled', 'active', 'completed', 'cancelled']).notNullable().defaultTo('scheduled');
    table.boolean('is_active').defaultTo(false);
    table.boolean('show_on_profile').defaultTo(true);
    table.boolean('match_before_arrival').defaultTo(true);

    // Premium features
    table.boolean('is_premium_travel').defaultTo(false);
    table.text('travel_notes').nullable();

    table.timestamps(true, true);

    // Indexes
    table.index('user_id');
    table.index('status');
    table.index('is_active');
    table.index(['latitude', 'longitude']);
    table.index(['start_date', 'end_date']);
    table.index('city');
    table.index('country');
  });

  // Create travel history table
  await knex.schema.createTable('travel_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('destination_id').notNullable().references('id').inTable('travel_destinations').onDelete('CASCADE');

    table.string('city', 200).notNullable();
    table.string('country', 100).notNullable();
    table.timestamp('visited_at').notNullable();
    table.integer('matches_made').defaultTo(0);
    table.integer('connections_made').defaultTo(0);

    table.timestamps(true, true);

    // Indexes
    table.index('user_id');
    table.index('destination_id');
    table.index('visited_at');
  });

  // Create popular destinations table
  await knex.schema.createTable('popular_destinations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    table.string('city', 200).notNullable();
    table.string('state', 100).nullable();
    table.string('country', 100).notNullable();
    table.string('country_code', 2).notNullable();
    table.string('airport_code', 3).nullable();
    table.decimal('latitude', 10, 8).notNullable();
    table.decimal('longitude', 11, 8).notNullable();
    table.string('timezone', 100).notNullable();

    // Statistics
    table.integer('traveler_count').defaultTo(0);
    table.integer('active_travelers').defaultTo(0);
    table.decimal('popularity_score', 5, 2).defaultTo(0);

    // Display info
    table.string('display_name', 200).notNullable();
    table.string('image_url', 500).nullable();
    table.text('description').nullable();
    table.jsonb('tags').defaultTo('[]'); // e.g., ["beach", "nightlife", "culture"]

    table.timestamps(true, true);

    // Indexes
    table.index('city');
    table.index('country');
    table.index('popularity_score');
    table.index(['latitude', 'longitude']);

    // Unique constraint
    table.unique(['city', 'country']);
  });

  // Create travel buddy preferences table
  await knex.schema.createTable('travel_buddy_preferences', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    table.boolean('looking_for_travel_buddy').defaultTo(false);
    table.jsonb('travel_style').defaultTo('[]'); // ["adventure", "relaxation", "culture", "nightlife"]
    table.jsonb('preferred_activities').defaultTo('[]');
    table.integer('budget_range_min').nullable();
    table.integer('budget_range_max').nullable();
    table.string('budget_currency', 3).defaultTo('USD');

    table.timestamps(true, true);

    // Indexes
    table.index('user_id');
    table.unique('user_id');
  });

  // Create passport/location changes table (for unlimited passport feature)
  await knex.schema.createTable('location_changes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    table.string('city', 200).notNullable();
    table.string('country', 100).notNullable();
    table.decimal('latitude', 10, 8).notNullable();
    table.decimal('longitude', 11, 8).notNullable();

    table.enum('change_type', ['travel_mode', 'passport', 'physical_location']).notNullable();
    table.boolean('is_premium').defaultTo(false);
    table.timestamp('changed_at').defaultTo(knex.fn.now()).notNullable();

    table.timestamps(true, true);

    // Indexes
    table.index('user_id');
    table.index('changed_at');
    table.index('change_type');
  });

  // Create travel mode settings table
  await knex.schema.createTable('travel_mode_settings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    // Feature flags
    table.boolean('travel_mode_enabled').defaultTo(false);
    table.boolean('unlimited_passport_enabled').defaultTo(false);
    table.boolean('auto_location_switch').defaultTo(true);
    table.boolean('notify_local_matches').defaultTo(true);
    table.boolean('show_travel_badge').defaultTo(true);

    // Premium features
    table.integer('max_simultaneous_destinations').defaultTo(1); // Premium can have multiple
    table.integer('passport_changes_remaining').defaultTo(0); // For limited passport feature
    table.timestamp('passport_reset_date').nullable();

    // Notification preferences
    table.boolean('notify_before_arrival').defaultTo(true);
    table.integer('notify_days_before').defaultTo(3);

    table.timestamps(true, true);

    // Indexes
    table.index('user_id');
    table.unique('user_id');
  });

  // Create triggers for updated_at
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  const tables = [
    'travel_destinations',
    'travel_history',
    'popular_destinations',
    'travel_buddy_preferences',
    'location_changes',
    'travel_mode_settings'
  ];

  for (const table of tables) {
    await knex.raw(`
      CREATE TRIGGER update_${table}_updated_at
        BEFORE UPDATE ON ${table}
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);
  }
}

export async function down(knex: Knex): Promise<void> {
  const tables = [
    'location_changes',
    'travel_buddy_preferences',
    'travel_history',
    'travel_destinations',
    'popular_destinations',
    'travel_mode_settings'
  ];

  for (const table of tables) {
    await knex.raw(`DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table}`);
    await knex.schema.dropTableIfExists(table);
  }
}
