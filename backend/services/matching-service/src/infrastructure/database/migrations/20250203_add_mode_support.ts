import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create mode enum type
  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE user_mode AS ENUM ('date', 'friends', 'network');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // Add mode column to matches table
  await knex.schema.alterTable('matches', (table) => {
    table.specificType('mode', 'user_mode').defaultTo('date').notNullable();
    table.index('mode');
    table.index(['user1_id', 'mode']);
    table.index(['user2_id', 'mode']);
    table.index(['user1_id', 'user2_id', 'mode']);
  });

  // Add mode column to swipes table
  await knex.schema.alterTable('swipes', (table) => {
    table.specificType('mode', 'user_mode').defaultTo('date').notNullable();
    table.index('mode');
    table.index(['swiper_id', 'mode']);
    table.index(['swiped_id', 'mode']);
  });

  // Update unique constraint on swipes to include mode
  // Users can swipe the same person in different modes
  await knex.raw('ALTER TABLE swipes DROP CONSTRAINT IF EXISTS swipes_swiper_id_swiped_id_unique');
  await knex.raw('ALTER TABLE swipes ADD CONSTRAINT swipes_swiper_swiped_mode_unique UNIQUE (swiper_id, swiped_id, mode)');

  // Add mode-specific user preferences table
  await knex.schema.createTable('user_mode_preferences', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().index();
    table.specificType('mode', 'user_mode').notNullable();
    table.integer('age_min').defaultTo(18);
    table.integer('age_max').defaultTo(100);
    table.integer('distance_max').defaultTo(50);
    table.specificType('gender_preference', 'text[]').defaultTo('{}');
    table.specificType('interests', 'text[]').defaultTo('{}');
    table.jsonb('filters').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();

    // Unique constraint: one preference set per user per mode
    table.unique(['user_id', 'mode']);
    table.index(['user_id', 'mode']);
  });
}

export async function down(knex: Knex): Promise<void> {
  // Remove mode-specific preferences table
  await knex.schema.dropTableIfExists('user_mode_preferences');

  // Revert swipes unique constraint
  await knex.raw('ALTER TABLE swipes DROP CONSTRAINT IF EXISTS swipes_swiper_swiped_mode_unique');
  await knex.raw('ALTER TABLE swipes ADD CONSTRAINT swipes_swiper_id_swiped_id_unique UNIQUE (swiper_id, swiped_id)');

  // Remove mode columns
  await knex.schema.alterTable('swipes', (table) => {
    table.dropColumn('mode');
  });

  await knex.schema.alterTable('matches', (table) => {
    table.dropColumn('mode');
  });

  // Drop mode enum (only if not used elsewhere)
  // await knex.raw('DROP TYPE IF EXISTS user_mode');
}
