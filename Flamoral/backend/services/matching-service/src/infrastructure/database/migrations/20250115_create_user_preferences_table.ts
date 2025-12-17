import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('user_preferences', (table) => {
    // Primary key (user_id)
    table.uuid('user_id').primary();

    // Age preferences
    table.integer('age_min').notNullable().defaultTo(18);
    table.integer('age_max').notNullable().defaultTo(99);

    // Distance preference (in kilometers)
    table.integer('max_distance').notNullable().defaultTo(50);

    // Gender preferences (array stored as JSONB)
    table.jsonb('gender_preference').notNullable().defaultTo('["any"]');

    // Interests and dealbreakers
    table.jsonb('interests').nullable();
    table.jsonb('dealbreakers').nullable();

    // Advanced preferences
    table.boolean('show_me_on_discover').notNullable().defaultTo(true);
    table.boolean('premium_only').notNullable().defaultTo(false);
    table.boolean('verified_only').notNullable().defaultTo(false);

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();
  });

  // Create updated_at trigger
  await knex.raw(`
    CREATE TRIGGER update_user_preferences_updated_at
      BEFORE UPDATE ON user_preferences
      FOR EACH ROW
      EXECUTE FUNCTION update_last_activity();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences');
  await knex.schema.dropTableIfExists('user_preferences');
}
