import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('matches', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // User references (alphabetically sorted to avoid duplicates)
    table.uuid('user1_id').notNullable().index();
    table.uuid('user2_id').notNullable().index();

    // Match metadata
    table
      .enum('status', ['pending', 'matched', 'unmatched', 'blocked'])
      .defaultTo('matched')
      .notNullable()
      .index();

    table.decimal('compatibility_score', 5, 2).nullable();

    // Timestamps
    table.timestamp('matched_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('last_activity_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('unmatched_at').nullable();

    // Composite indexes
    table.index(['user1_id', 'status']);
    table.index(['user2_id', 'status']);
    table.index(['user1_id', 'user2_id']);

    // Unique constraint: ensure no duplicate matches
    table.unique(['user1_id', 'user2_id']);
  });

  // Create updated_at trigger
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_last_activity()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.last_activity_at = NOW();
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  await knex.raw(`
    CREATE TRIGGER update_matches_activity
      BEFORE UPDATE ON matches
      FOR EACH ROW
      EXECUTE FUNCTION update_last_activity();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TRIGGER IF EXISTS update_matches_activity ON matches');
  await knex.raw('DROP FUNCTION IF EXISTS update_last_activity');
  await knex.schema.dropTableIfExists('matches');
}
